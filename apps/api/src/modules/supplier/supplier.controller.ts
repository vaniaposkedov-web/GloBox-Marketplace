import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Req,
  UseGuards,
} from "@nestjs/common";
import type { Request } from "express";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import * as fs from "fs";
import * as path from "path";
import * as crypto from "crypto";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { CurrentUser } from "../auth/current-user.decorator";
import type { AccessTokenPayload } from "../auth/tokens.service";
import { SupplierService, type SupplierRegisterDto, type SupplierProfileSubmitDto } from "./supplier.service";
import { CategoryAiService } from "../catalog/category-ai.service";

@ApiTags("supplier")
@Controller("supplier")
export class SupplierController {
  constructor(
    private readonly supplier: SupplierService,
    private readonly categoryAi: CategoryAiService,
  ) {}

  @Post("categories/match")
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "AI-матчинг категории: находит похожую или создаёт новую" })
  async matchCategory(@Body() dto: { query: string; parentId?: string | null }) {
    if (!dto.query?.trim()) throw new BadRequestException("Введите название категории");
    return this.categoryAi.matchOrCreate(dto.query, dto.parentId);
  }

  @Get("dicts")
  @ApiOperation({ summary: "Справочники для формы регистрации поставщика" })
  async getDicts() {
    return this.supplier.getDicts();
  }

  @Post("register")
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: "Регистрация поставщика (все шаги)" })
  async register(@Body() dto: SupplierRegisterDto) {
    return this.supplier.register(dto);
  }

  @Post("login")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Логин поставщика" })
  async login(@Body() dto: { email: string; password: string }, @Req() req: Request) {
    const ip = (req.headers["x-forwarded-for"] as string)?.split(",")[0]?.trim() ?? req.socket?.remoteAddress ?? undefined;
    const ua = req.headers["user-agent"] ?? undefined;
    return this.supplier.login(dto.email, dto.password, ip, ua);
  }

  @Get("me")
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Профиль поставщика + статус заявки" })
  async me(@CurrentUser() user: AccessTokenPayload) {
    return this.supplier.getProfile(user.sub);
  }

  @Post("profile/submit")
  @HttpCode(HttpStatus.CREATED)
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Подать заявку на верификацию поставщика" })
  async submitProfile(
    @CurrentUser() user: AccessTokenPayload,
    @Body() dto: SupplierProfileSubmitDto,
  ) {
    return this.supplier.submitProfile(user.sub, dto);
  }

  @Post("upload")
  @HttpCode(HttpStatus.CREATED)
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Загрузить файл (base64) для документов поставщика" })
  async uploadFile(@Body() dto: { data: string; ext: string }): Promise<{ url: string }> {
    if (!dto.data || !dto.ext) throw new BadRequestException("data and ext are required");
    const ext = dto.ext.toLowerCase().replace(/^\./, "").replace(/[^a-z0-9]/g, "") || "bin";
    const base64 = dto.data.replace(/^data:[^;]+;base64,/, "");
    const buffer = Buffer.from(base64, "base64");
    if (buffer.length > 15 * 1024 * 1024) throw new BadRequestException("File too large (max 15MB)");
    const filename = `${crypto.randomUUID()}.${ext}`;
    const uploadsDir = path.join(process.cwd(), "public", "uploads");
    if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });
    fs.writeFileSync(path.join(uploadsDir, filename), buffer);
    const publicUrl = process.env.PUBLIC_URL ?? "https://glo-box.ru";
    return { url: `${publicUrl}/api/uploads/${filename}` };
  }

  @Get("my-listings")
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Товары поставщика" })
  async myListings(@CurrentUser() user: AccessTokenPayload) {
    return this.supplier.getMyListings(user.sub);
  }

  @Post("listings")
  @HttpCode(HttpStatus.CREATED)
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Создать товар" })
  async createListing(
    @CurrentUser() user: AccessTokenPayload,
    @Body() dto: {
      title: string;
      shortDescription?: string;
      description: string;
      price: number;
      stock?: number;
      categoryId: string;
      imageUrls?: string[];
      characteristics?: { key: string; value: string }[];
      variantGroupId?: string | null;
    },
  ) {
    return this.supplier.createListing(user.sub, dto);
  }

  @Patch("listings/:id")
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Обновить товар" })
  async updateListing(
    @CurrentUser() user: AccessTokenPayload,
    @Param("id") id: string,
    @Body() dto: {
      title?: string;
      shortDescription?: string;
      description?: string;
      price?: number;
      stock?: number;
      status?: string;
      categoryId?: string;
      imageUrls?: string[];
      characteristics?: { key: string; value: string }[];
      variantGroupId?: string | null;
    },
  ) {
    return this.supplier.updateListing(user.sub, id, dto);
  }

  @Post("variant-groups")
  @HttpCode(HttpStatus.CREATED)
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Создать группу вариантов товара" })
  async createVariantGroup(@CurrentUser() user: AccessTokenPayload) {
    return this.supplier.createVariantGroup(user.sub);
  }

  @Delete("variant-groups/:groupId")
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Удалить группу вариантов" })
  async deleteVariantGroup(
    @CurrentUser() user: AccessTokenPayload,
    @Param("groupId") groupId: string,
  ) {
    return this.supplier.deleteVariantGroup(user.sub, groupId);
  }

  @Post("change-password")
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  async changePassword(@CurrentUser() user: AccessTokenPayload, @Body() dto: { currentPassword: string; newPassword: string }) {
    return this.supplier.changePassword(user.sub, dto.currentPassword, dto.newPassword);
  }

  @Post("change-email/request")
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  async requestEmailChange(@CurrentUser() user: AccessTokenPayload, @Body() dto: { newEmail: string }) {
    return this.supplier.requestEmailChange(user.sub, dto.newEmail);
  }

  @Post("change-email/confirm")
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  async confirmEmailChange(@CurrentUser() user: AccessTokenPayload, @Body() dto: { newEmail: string; code: string }) {
    return this.supplier.confirmEmailChange(user.sub, dto.newEmail, dto.code);
  }

  @Post("change-phone/request")
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  async requestPhoneChange(@CurrentUser() user: AccessTokenPayload, @Body() dto: { newPhone: string }) {
    return this.supplier.requestPhoneChange(user.sub, dto.newPhone);
  }

  @Post("change-phone/confirm")
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  async confirmPhoneChange(@CurrentUser() user: AccessTokenPayload, @Body() dto: { newPhone: string; code: string }) {
    return this.supplier.confirmPhoneChange(user.sub, dto.newPhone, dto.code);
  }

  @Get("login-events")
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "История входов (последние 20)" })
  async loginEvents(@CurrentUser() user: AccessTokenPayload) {
    return this.supplier.getLoginEvents(user.sub);
  }

  @Patch("avatar")
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Обновить аватар пользователя" })
  async updateAvatar(@CurrentUser() user: AccessTokenPayload, @Body() dto: { avatarUrl: string }) {
    if (!dto.avatarUrl) throw new BadRequestException("avatarUrl required");
    return this.supplier.updateAvatar(user.sub, dto.avatarUrl);
  }
}
