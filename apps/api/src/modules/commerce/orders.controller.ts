import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  UseGuards,
} from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import {
  checkoutSchema,
  type Checkout,
  type OrderDto,
} from "@marketplace/shared";
import { ZodValidationPipe } from "../../common/zod-validation.pipe";
import { CurrentUser } from "../auth/current-user.decorator";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import type { AccessTokenPayload } from "../auth/tokens.service";
import { OrdersService } from "./orders.service";

@ApiTags("commerce")
@Controller("orders")
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class OrdersController {
  constructor(private readonly orders: OrdersService) {}

  @Post("checkout")
  @ApiOperation({ summary: "Оформить заказ из текущей корзины" })
  checkout(
    @CurrentUser() user: AccessTokenPayload,
    @Body(new ZodValidationPipe(checkoutSchema)) dto: Checkout,
  ): Promise<OrderDto> {
    return this.orders.checkout(user.sub, dto);
  }

  @Get()
  @ApiOperation({ summary: "Мои заказы" })
  listMine(@CurrentUser() user: AccessTokenPayload): Promise<OrderDto[]> {
    return this.orders.listMine(user.sub);
  }

  @Get(":id")
  @ApiOperation({ summary: "Детали заказа" })
  getMine(
    @CurrentUser() user: AccessTokenPayload,
    @Param("id", new ParseUUIDPipe()) id: string,
  ): Promise<OrderDto> {
    return this.orders.getMine(user.sub, id);
  }

  @Post(":id/cancel")
  @ApiOperation({ summary: "Отменить заказ (пока PENDING)" })
  cancel(
    @CurrentUser() user: AccessTokenPayload,
    @Param("id", new ParseUUIDPipe()) id: string,
  ): Promise<OrderDto> {
    return this.orders.cancel(user.sub, id);
  }
}
