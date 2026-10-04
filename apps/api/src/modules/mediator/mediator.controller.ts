import * as path from "path";
import * as fs from "fs";
import * as crypto from "crypto";
import {
  BadRequestException,
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
  UsePipes,
} from "@nestjs/common";
import type { Request } from "express";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import { Throttle } from "@nestjs/throttler";
import {
  mediatorApplicationSchema,
  mediatorMaxRequestSchema,
  mediatorMaxVerifySchema,
  mediatorSettingsUpdateSchema,
  type MediatorApplication,
  type MediatorMaxRequest,
  type MediatorMaxVerify,
  type MediatorSettingsUpdate,
} from "@marketplace/shared";
import { z } from "zod";
import { ZodValidationPipe } from "../../common/zod-validation.pipe";
import { MediatorService } from "./mediator.service";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { CurrentUser } from "../auth/current-user.decorator";
import type { AccessTokenPayload } from "../auth/tokens.service";

const verifyWithPhoneSchema = mediatorMaxVerifySchema.extend({
  phone: z.string().min(1),
});

@ApiTags("mediator")
@Controller("mediator")
export class MediatorController {
  constructor(private readonly mediator: MediatorService) {}

  // ——— Публичные эндпоинты для покупателей ———

  @Get("list")
  @ApiOperation({ summary: "Список одобренных посредников (для покупателей)" })
  async listMediators(
    @Query("minRating") minRating?: string,
    @Query("maxCommission") maxCommission?: string,
    @Query("minOrder") minOrder?: string,
    @Query("q") q?: string,
    @Query("limit") limit?: string,
  ) {
    return this.mediator.listApprovedMediators({
      minRating: minRating ? Number(minRating) : undefined,
      maxCommission: maxCommission ? Number(maxCommission) : undefined,
      q: q || undefined,
      limit: limit ? Number(limit) : undefined,
      minOrder: minOrder ? Number(minOrder) : undefined,
    });
  }

  @Get("profile/:id")
  @ApiOperation({ summary: "Публичный профиль посредника" })
  async getMediatorProfile(
    @Param("id", new ParseUUIDPipe()) id: string,
  ) {
    return this.mediator.getPublicProfile(id);
  }

  @Post("register")
  @HttpCode(HttpStatus.CREATED)
  @Throttle({ default: { limit: 5, ttl: 3_600_000 } })
  @ApiOperation({ summary: "Простая регистрация посредника (email+пароль)" })
  async register(
    @Body()
    dto: {
      firstName: string;
      lastName: string;
      phone: string;
      email: string;
      password: string;
    },
  ) {
    return this.mediator.simpleRegister(dto);
  }

  @Post("login")
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 10, ttl: 3_600_000 } })
  @ApiOperation({ summary: "Вход посредника по email+пароль" })
  async login(
    @Body() dto: { email: string; password: string },
    @Req() req: Request,
  ) {
    const ip = (req.headers["x-forwarded-for"] as string)?.split(",")[0]?.trim() || req.ip;
    const userAgent = req.headers["user-agent"];
    return this.mediator.loginWithEmail(dto, { ip, userAgent });
  }

  @Post("registration/request-code")
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 5, ttl: 3_600_000 } })
  @ApiOperation({ summary: "Запросить код MAX-верификации для посредника" })
  @UsePipes(new ZodValidationPipe(mediatorMaxRequestSchema))
  async requestCode(
    @Body() dto: MediatorMaxRequest,
  ): Promise<{ ok: true; devCode?: string }> {
    return this.mediator.requestMaxCode(dto);
  }

  @Post("registration/verify-code")
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 10, ttl: 3_600_000 } })
  @ApiOperation({ summary: "Подтвердить код MAX (посредник)" })
  @UsePipes(new ZodValidationPipe(verifyWithPhoneSchema))
  async verifyCode(
    @Body() dto: MediatorMaxVerify & { phone: string },
  ): Promise<{ ok: true; sessionToken: string }> {
    return this.mediator.verifyMaxCode(dto);
  }

  @Post("registration/apply")
  @HttpCode(HttpStatus.CREATED)
  @Throttle({ default: { limit: 5, ttl: 3_600_000 } })
  @ApiOperation({ summary: "Подать заявку посредника" })
  @UsePipes(new ZodValidationPipe(mediatorApplicationSchema))
  async apply(@Body() dto: MediatorApplication) {
    return this.mediator.submitApplication(dto);
  }

  @Get("me")
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Профиль текущего посредника (user + profile)" })
  async me(@CurrentUser() user: AccessTokenPayload) {
    return this.mediator.getMe(user.sub);
  }

  @Get("application/me")
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Статус заявки посредника" })
  async myApplication(@CurrentUser() user: AccessTokenPayload) {
    return this.mediator.getMyApplication(user.sub);
  }

  @Get("login-events")
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "История входов посредника" })
  async loginEvents(@CurrentUser() user: AccessTokenPayload) {
    return this.mediator.getLoginEvents(user.sub);
  }

  @Post("ping")
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Обновить статус онлайн посредника" })
  async ping(@CurrentUser() user: AccessTokenPayload) {
    return this.mediator.pingOnline(user.sub);
  }

  @Patch("settings")
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Изменить ставку и мин. сумму выкупа" })
  async updateSettings(
    @CurrentUser() user: AccessTokenPayload,
    @Body(new ZodValidationPipe(mediatorSettingsUpdateSchema)) dto: MediatorSettingsUpdate,
  ) {
    return this.mediator.updateSettings(user.sub, dto);
  }

  @Post("upload")
  @HttpCode(HttpStatus.CREATED)
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Загрузить файл (base64) → сохранить на диск → вернуть URL" })
  async uploadFile(
    @Body() dto: { data: string; ext: string },
  ): Promise<{ url: string }> {
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

  @Post("profile/submit")
  @HttpCode(HttpStatus.CREATED)
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Отправить заявку посредника на проверку (создаёт/обновляет профиль, статус → PENDING)" })
  async submitProfile(
    @CurrentUser() user: AccessTokenPayload,
    @Body() dto: {
      firstName?: string;
      lastName?: string;
      middleName?: string;
      phone?: string;
      commissionRate: number;
      minOrderAmount: number;
      passportPhotoUrl: string;
      passSelfiePhotoUrl: string;
      avatarUrl?: string;
    },
  ) {
    return this.mediator.submitProfile(user.sub, dto);
  }

  @Post("change-password")
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Сменить пароль посредника" })
  async changePassword(
    @CurrentUser() user: AccessTokenPayload,
    @Body() dto: { currentPassword: string; newPassword: string },
  ) {
    return this.mediator.changePassword(user.sub, dto.currentPassword, dto.newPassword);
  }

  @Post("change-email/request")
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Throttle({ default: { limit: 5, ttl: 3_600_000 } })
  @ApiOperation({ summary: "Запросить код для смены email" })
  async requestEmailChange(
    @CurrentUser() user: AccessTokenPayload,
    @Body() dto: { newEmail: string },
  ) {
    return this.mediator.requestEmailChange(user.sub, dto.newEmail);
  }

  @Post("change-email/confirm")
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Подтвердить смену email кодом" })
  async confirmEmailChange(
    @CurrentUser() user: AccessTokenPayload,
    @Body() dto: { newEmail: string; code: string },
  ) {
    return this.mediator.confirmEmailChange(user.sub, dto.newEmail, dto.code);
  }

  @Post("change-phone/request")
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Throttle({ default: { limit: 5, ttl: 3_600_000 } })
  @ApiOperation({ summary: "Запросить код для смены телефона" })
  async requestPhoneChange(
    @CurrentUser() user: AccessTokenPayload,
    @Body() dto: { newPhone: string },
  ) {
    return this.mediator.requestPhoneChange(user.sub, dto.newPhone);
  }

  @Post("change-phone/confirm")
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Подтвердить смену телефона кодом" })
  async confirmPhoneChange(
    @CurrentUser() user: AccessTokenPayload,
    @Body() dto: { newPhone: string; code: string },
  ) {
    return this.mediator.confirmPhoneChange(user.sub, dto.newPhone, dto.code);
  }

  @Patch("profile/documents")
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Загрузить документы для верификации (PENDING/NEEDS_REVISION)" })
  async updateDocuments(
    @CurrentUser() user: AccessTokenPayload,
    @Body() dto: { passportPhotoUrl?: string; passSelfiePhotoUrl?: string; avatarUrl?: string },
  ) {
    return this.mediator.updateDocuments(user.sub, dto);
  }

  @Patch("card-config")
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Сохранить конфигурацию публичной карточки посредника" })
  async updateCardConfig(
    @CurrentUser() user: AccessTokenPayload,
    @Body() dto: { description?: string; cardConfig?: Record<string, unknown> },
  ) {
    return this.mediator.updateCardConfig(user.sub, dto);
  }

  @Get("my-reviews")
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Отзывы о посреднике" })
  async getMyReviews(@CurrentUser() user: AccessTokenPayload) {
    return this.mediator.getMyReviews(user.sub);
  }

  @Get("leaderboard")
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Рейтинг посредников: топ-10 + место текущего" })
  async getLeaderboard(@CurrentUser() user: AccessTokenPayload) {
    return this.mediator.getLeaderboard(user.sub);
  }

  @Post("reviews/:profileId")
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: "Оставить отзыв о посреднике (публичный эндпоинт для glo-box.ru)" })
  async submitReview(
    @Param("profileId", new ParseUUIDPipe()) profileId: string,
    @Body() dto: { buyerName: string; rating: number; text: string; buyerAvatarUrl?: string },
  ) {
    return this.mediator.submitReview(profileId, dto);
  }
}
