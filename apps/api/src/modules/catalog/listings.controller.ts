import {
  Body,
  Controller,
  Delete,
  Get,
  Headers,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import {
  createListingSchema,
  listListingsQuerySchema,
  updateListingSchema,
  type CreateListing,
  type ListListingsQuery,
  type ListingDetailDto,
  type ListingsPage,
  type UpdateListing,
} from "@marketplace/shared";
import { ZodValidationPipe } from "../../common/zod-validation.pipe";
import { CurrentUser } from "../auth/current-user.decorator";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { TokensService, type AccessTokenPayload } from "../auth/tokens.service";
import { ListingsService } from "./listings.service";

@ApiTags("catalog")
@Controller("listings")
export class ListingsController {
  constructor(
    private readonly listings: ListingsService,
    private readonly tokens: TokensService,
  ) {}

  @Get()
  @ApiOperation({ summary: "Лента объявлений" })
  async list(
    @Query(new ZodValidationPipe(listListingsQuerySchema))
    query: ListListingsQuery,
  ): Promise<ListingsPage> {
    return this.listings.list(query);
  }

  @Get("quick-search")
  @ApiOperation({ summary: "Быстрый поиск (автокомплит)" })
  async quickSearch(@Query("q") q: string) {
    if (!q || q.trim().length < 2) return { listings: [], mediators: [] };
    return this.listings.quickSearch(q.trim());
  }

  @Get("me/all")
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Мои товары всех статусов" })
  async listMine(@CurrentUser() user: AccessTokenPayload) {
    return this.listings.listMine(user.sub);
  }

  @Get(":id")
  @ApiOperation({ summary: "Детальная карточка объявления" })
  async getOne(
    @Param("id", new ParseUUIDPipe()) id: string,
    @Headers("authorization") auth: string | undefined,
    @Headers("x-forwarded-for") xff: string | undefined,
    @Req() req: { ip?: string },
  ): Promise<ListingDetailDto> {
    // viewerKey: userId (если есть jwt) или IP-хэш (для анонимов)
    let viewerKey: string | undefined;
    if (auth && auth.startsWith("Bearer ")) {
      try {
        const payload = await this.tokens.verifyAccessToken(
          auth.slice("Bearer ".length).trim(),
        );
        viewerKey = `u:${payload.sub}`;
      } catch {
        // невалидный токен — считаем анонимом
      }
    }
    if (!viewerKey) {
      const ip = (xff?.split(",")[0] ?? req.ip ?? "anon").trim();
      viewerKey = `ip:${ip}`;
    }
    return this.listings.getById(id, viewerKey);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Создать объявление" })
  async create(
    @CurrentUser() user: AccessTokenPayload,
    @Body(new ZodValidationPipe(createListingSchema)) dto: CreateListing,
  ): Promise<ListingDetailDto> {
    return this.listings.create(user.sub, dto);
  }

  @Patch(":id")
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Обновить собственное объявление" })
  async update(
    @CurrentUser() user: AccessTokenPayload,
    @Param("id", new ParseUUIDPipe()) id: string,
    @Body(new ZodValidationPipe(updateListingSchema)) dto: UpdateListing,
  ): Promise<ListingDetailDto> {
    return this.listings.update(id, user.sub, dto);
  }

  @Delete(":id")
  @HttpCode(HttpStatus.NO_CONTENT)
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Удалить собственное объявление" })
  async remove(
    @CurrentUser() user: AccessTokenPayload,
    @Param("id", new ParseUUIDPipe()) id: string,
  ): Promise<void> {
    await this.listings.delete(id, user.sub);
  }
}
