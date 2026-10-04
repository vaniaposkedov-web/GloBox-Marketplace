import {
  Body,
  Controller,
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
import { CurrentUser } from "../auth/current-user.decorator";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import type { AccessTokenPayload } from "../auth/tokens.service";
import { OrderRequestsService } from "./order-requests.service";

@ApiTags("commerce")
@Controller("order-requests")
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class OrderRequestsController {
  constructor(private readonly orderRequests: OrderRequestsService) {}

  @Post("from-cart")
  @ApiOperation({ summary: "Создать заявку из корзины + выбранный посредник" })
  createFromCart(
    @CurrentUser() user: AccessTokenPayload,
    @Body() dto: { mediatorId: string; comment?: string },
  ) {
    return this.orderRequests.createFromCart(
      user.sub,
      dto.mediatorId,
      dto.comment,
    );
  }

  @Get()
  @ApiOperation({ summary: "Мои заявки (покупатель или посредник)" })
  listMine(@CurrentUser() user: AccessTokenPayload) {
    return this.orderRequests.listMine(user.sub);
  }

  @Get("chats")
  @ApiOperation({ summary: "Мои чаты по прямым заявкам" })
  listChats(@CurrentUser() user: AccessTokenPayload) {
    return this.orderRequests.listChatsForUser(user.sub);
  }

  @Get("chats/:chatId/messages")
  @ApiOperation({ summary: "Сообщения в чате прямой заявки" })
  getChatMessages(
    @CurrentUser() user: AccessTokenPayload,
    @Param("chatId", new ParseUUIDPipe()) chatId: string,
  ) {
    return this.orderRequests.getOrderRequestChatMessages(user.sub, chatId);
  }

  @Post("chats/:chatId/messages")
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: "Отправить сообщение в чат прямой заявки" })
  sendChatMessage(
    @CurrentUser() user: AccessTokenPayload,
    @Param("chatId", new ParseUUIDPipe()) chatId: string,
    @Body() dto: { text: string },
  ) {
    return this.orderRequests.sendOrderRequestChatMessage(user.sub, chatId, dto.text);
  }

  @Get(":id")
  @ApiOperation({ summary: "Детали заявки" })
  getMine(
    @CurrentUser() user: AccessTokenPayload,
    @Param("id", new ParseUUIDPipe()) id: string,
  ) {
    return this.orderRequests.getMine(user.sub, id);
  }

  @Patch(":id/items/:itemId/status")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Обновить статус товара в заявке" })
  updateItemStatus(
    @CurrentUser() user: AccessTokenPayload,
    @Param("id", new ParseUUIDPipe()) id: string,
    @Param("itemId", new ParseUUIDPipe()) itemId: string,
    @Body() dto: { status: string },
  ) {
    return this.orderRequests.updateItemStatus(user.sub, id, itemId, dto.status);
  }

  @Post(":id/accept")
  @ApiOperation({ summary: "Посредник принимает заявку" })
  accept(
    @CurrentUser() user: AccessTokenPayload,
    @Param("id", new ParseUUIDPipe()) id: string,
  ) {
    return this.orderRequests.accept(user.sub, id);
  }

  @Post(":id/cancel")
  @ApiOperation({ summary: "Отменить заявку" })
  cancel(
    @CurrentUser() user: AccessTokenPayload,
    @Param("id", new ParseUUIDPipe()) id: string,
  ) {
    return this.orderRequests.cancel(user.sub, id);
  }

  @Post(":id/complete")
  @ApiOperation({ summary: "Завершить заявку (посредник)" })
  complete(
    @CurrentUser() user: AccessTokenPayload,
    @Param("id", new ParseUUIDPipe()) id: string,
  ) {
    return this.orderRequests.complete(user.sub, id);
  }

  @Post(":id/system-message")
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: "Отправить системное сообщение в чат заявки" })
  systemMessage(
    @CurrentUser() user: AccessTokenPayload,
    @Param("id", new ParseUUIDPipe()) id: string,
    @Body() dto: { text: string },
  ) {
    return this.orderRequests.sendSystemMessage(user.sub, id, dto.text);
  }

  @Post(":id/items/:itemId/set-analogue")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Покупатель прикрепляет аналог для товара в заявке" })
  setAnalogue(
    @CurrentUser() user: AccessTokenPayload,
    @Param("id", new ParseUUIDPipe()) id: string,
    @Param("itemId", new ParseUUIDPipe()) itemId: string,
    @Body() dto: { listingId: string },
  ) {
    return this.orderRequests.setAnalogue(user.sub, id, itemId, dto.listingId);
  }
}
