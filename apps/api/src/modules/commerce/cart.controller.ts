import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  UseGuards,
} from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import {
  addToCartSchema,
  updateCartItemSchema,
  type AddToCart,
  type CartDto,
  type UpdateCartItem,
} from "@marketplace/shared";
import { ZodValidationPipe } from "../../common/zod-validation.pipe";
import { CurrentUser } from "../auth/current-user.decorator";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import type { AccessTokenPayload } from "../auth/tokens.service";
import { CartService } from "./cart.service";

@ApiTags("commerce")
@Controller("cart")
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class CartController {
  constructor(private readonly cart: CartService) {}

  @Get()
  @ApiOperation({ summary: "Моя корзина" })
  get(@CurrentUser() user: AccessTokenPayload): Promise<CartDto> {
    return this.cart.getCart(user.sub);
  }

  @Post("items")
  @ApiOperation({ summary: "Добавить товар в корзину" })
  add(
    @CurrentUser() user: AccessTokenPayload,
    @Body(new ZodValidationPipe(addToCartSchema)) dto: AddToCart,
  ): Promise<CartDto> {
    return this.cart.add(user.sub, dto);
  }

  @Patch("items/:id")
  @ApiOperation({ summary: "Изменить количество" })
  updateQty(
    @CurrentUser() user: AccessTokenPayload,
    @Param("id", new ParseUUIDPipe()) id: string,
    @Body(new ZodValidationPipe(updateCartItemSchema)) dto: UpdateCartItem,
  ): Promise<CartDto> {
    return this.cart.updateQty(user.sub, id, dto);
  }

  @Delete("items/:id")
  @ApiOperation({ summary: "Удалить позицию" })
  remove(
    @CurrentUser() user: AccessTokenPayload,
    @Param("id", new ParseUUIDPipe()) id: string,
  ): Promise<CartDto> {
    return this.cart.remove(user.sub, id);
  }

  @Delete()
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: "Очистить корзину" })
  async clear(@CurrentUser() user: AccessTokenPayload): Promise<void> {
    await this.cart.clear(user.sub);
  }
}
