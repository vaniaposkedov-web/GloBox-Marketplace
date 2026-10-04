import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Req,
  UseGuards,
} from "@nestjs/common";
import { ApiTags, ApiBearerAuth, ApiOperation } from "@nestjs/swagger";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { MediatorOrdersService } from "./mediator-orders.service";

@ApiTags("mediator-orders")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller("mediator-orders")
export class MediatorOrdersController {
  constructor(private readonly service: MediatorOrdersService) {}

  // ─── Buyer endpoints ─────────────────────────────────────────────

  @Post()
  @ApiOperation({ summary: "Создать заказ из корзины (ТЗ 5.2.3)" })
  async createOrder(@Req() req: any, @Body() dto: any) {
    return this.service.createOrder(req.user.sub, dto);
  }

  @Get("my")
  @ApiOperation({ summary: "Мои заказы (покупатель)" })
  async getMyOrders(@Req() req: any) {
    return this.service.getBuyerOrders(req.user.sub);
  }

  @Get(":id")
  @ApiOperation({ summary: "Получить заказ по ID" })
  async getOrder(@Req() req: any, @Param("id") id: string) {
    return this.service.getOrder(id, req.user.sub);
  }

  @Get(":id/recommended-mediators")
  @ApiOperation({ summary: "Рекомендованные посредники (ТЗ 5.3.1)" })
  async getRecommended(@Req() req: any, @Param("id") id: string) {
    return this.service.getRecommendedMediators(id, req.user.sub);
  }

  @Post(":id/select-executor")
  @ApiOperation({ summary: "Выбрать исполнителя (ТЗ 5.4.3)" })
  async selectExecutor(
    @Req() req: any,
    @Param("id") id: string,
    @Body() dto: { mediatorId: string },
  ) {
    return this.service.selectExecutor(id, req.user.sub, dto.mediatorId);
  }

  @Post(":id/complete")
  @ApiOperation({ summary: "Подтвердить завершение (ТЗ 5.11)" })
  async complete(@Req() req: any, @Param("id") id: string) {
    return this.service.completeOrder(id, req.user.sub);
  }

  @Post(":id/cancel")
  @ApiOperation({ summary: "Отменить заказ (ТЗ 5.10)" })
  async cancel(@Req() req: any, @Param("id") id: string, @Body() dto: { reason?: string }) {
    return this.service.cancelOrder(id, req.user.sub, dto.reason);
  }

  // ─── Item actions (buyer) ─────────────────────────────────────────

  @Post(":id/items/:itemId/respond-price-change")
  @ApiOperation({ summary: "Подтвердить/отклонить изменение цены (ТЗ 5.6)" })
  async respondPriceChange(
    @Req() req: any,
    @Param("id") id: string,
    @Param("itemId") itemId: string,
    @Body() dto: { accept: boolean },
  ) {
    return this.service.respondToPriceChange(id, itemId, req.user.sub, dto.accept);
  }

  @Post(":id/items/:itemId/respond-replacement")
  @ApiOperation({ summary: "Принять/отклонить замену товара (ТЗ 5.7)" })
  async respondReplacement(
    @Req() req: any,
    @Param("id") id: string,
    @Param("itemId") itemId: string,
    @Body() dto: { accept: boolean },
  ) {
    return this.service.respondToReplacement(id, itemId, req.user.sub, dto.accept);
  }

  // ─── Mediator endpoints ─────────────────────────────────────────

  @Get("mediator/available")
  @ApiOperation({ summary: "Доступные заказы для посредника (ТЗ 5.3.1)" })
  async getAvailable(@Req() req: any) {
    return this.service.getAvailableOrders(req.user.sub);
  }

  @Get("mediator/my")
  @ApiOperation({ summary: "Мои заказы (посредник)" })
  async getMediatorOrders(@Req() req: any) {
    return this.service.getMediatorOrders(req.user.sub);
  }

  @Post(":id/respond")
  @ApiOperation({ summary: "Откликнуться на заказ (ТЗ 5.3.1)" })
  async respond(@Req() req: any, @Param("id") id: string) {
    return this.service.respondToOrder(id, req.user.sub);
  }

  @Post(":id/start-purchasing")
  @ApiOperation({ summary: "Начать закупку (ТЗ 5.5)" })
  async startPurchasing(@Req() req: any, @Param("id") id: string) {
    return this.service.startPurchasing(id, req.user.sub);
  }

  @Post(":id/start-delivering")
  @ApiOperation({ summary: "Передача заказа (ТЗ 5.11)" })
  async startDelivering(@Req() req: any, @Param("id") id: string) {
    return this.service.startDelivering(id, req.user.sub);
  }

  @Post(":id/items/:itemId/price-change")
  @ApiOperation({ summary: "Предложить изменение цены товара (ТЗ 5.6)" })
  async proposePrice(
    @Req() req: any,
    @Param("id") id: string,
    @Param("itemId") itemId: string,
    @Body() dto: { newPrice: number; comment?: string },
  ) {
    return this.service.proposeItemPriceChange(id, itemId, req.user.sub, dto.newPrice, dto.comment);
  }

  @Post(":id/items/:itemId/replacement")
  @ApiOperation({ summary: "Предложить замену товара (ТЗ 5.7)" })
  async proposeReplacement(
    @Req() req: any,
    @Param("id") id: string,
    @Param("itemId") itemId: string,
    @Body() dto: { photoUrl: string; price: number; description: string },
  ) {
    return this.service.proposeReplacement(id, itemId, req.user.sub, dto);
  }

  @Post(":id/items/:itemId/mark-bought")
  @ApiOperation({ summary: "Отметить товар как купленный" })
  async markBought(
    @Req() req: any,
    @Param("id") id: string,
    @Param("itemId") itemId: string,
  ) {
    return this.service.markItemBought(id, itemId, req.user.sub);
  }

  @Post(":id/items/:itemId/mark-not-available")
  @ApiOperation({ summary: "Отметить товар как недоступный" })
  async markNotAvailable(
    @Req() req: any,
    @Param("id") id: string,
    @Param("itemId") itemId: string,
  ) {
    return this.service.markItemNotAvailable(id, itemId, req.user.sub);
  }

  // ─── Chat endpoints ─────────────────────────────────────────────

  @Get(":id/chats")
  @ApiOperation({ summary: "Чаты заказа" })
  async getChats(@Req() req: any, @Param("id") id: string) {
    return this.service.getOrderChats(id, req.user.sub);
  }

  @Get("chats/:chatId/messages")
  @ApiOperation({ summary: "Сообщения чата" })
  async getMessages(@Req() req: any, @Param("chatId") chatId: string) {
    return this.service.getChatMessages(chatId, req.user.sub);
  }

  @Post("chats/:chatId/messages")
  @ApiOperation({ summary: "Отправить сообщение (ТЗ 5.4.5)" })
  async sendMessage(
    @Req() req: any,
    @Param("chatId") chatId: string,
    @Body() dto: { content: string; attachments?: string[] },
  ) {
    return this.service.sendMessage(chatId, req.user.sub, dto.content, dto.attachments);
  }
}
