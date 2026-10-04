import {
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  UseGuards,
} from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import type { ListingCardDto } from "@marketplace/shared";
import { CurrentUser } from "../auth/current-user.decorator";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import type { AccessTokenPayload } from "../auth/tokens.service";
import { FavoritesService } from "./favorites.service";

@ApiTags("commerce")
@Controller("favorites")
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class FavoritesController {
  constructor(private readonly favorites: FavoritesService) {}

  @Get("ids")
  @ApiOperation({ summary: "ID моих избранных товаров (для быстрой проверки)" })
  listIds(@CurrentUser() user: AccessTokenPayload): Promise<string[]> {
    return this.favorites.listIds(user.sub);
  }

  @Get()
  @ApiOperation({ summary: "Мои избранные товары" })
  list(@CurrentUser() user: AccessTokenPayload): Promise<ListingCardDto[]> {
    return this.favorites.listWithData(user.sub);
  }

  @Post(":listingId/toggle")
  @ApiOperation({ summary: "Добавить/удалить из избранного" })
  toggle(
    @CurrentUser() user: AccessTokenPayload,
    @Param("listingId", new ParseUUIDPipe()) listingId: string,
  ): Promise<{ inFavorites: boolean }> {
    return this.favorites.toggle(user.sub, listingId);
  }
}
