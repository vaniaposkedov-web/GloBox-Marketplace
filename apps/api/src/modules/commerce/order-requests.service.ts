import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { NotificationService } from "../notifications/notification.service";

@Injectable()
export class OrderRequestsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationService,
  ) {}

  /**
   * Создать заявку из текущей корзины покупателя.
   * Корзина → snapshot товаров → OrderRequest + items → Chat → очистка корзины.
   * Всё в одной транзакции.
   */
  async createFromCart(
    buyerId: string,
    mediatorId: string,
    comment?: string,
  ) {
    return this.prisma.$transaction(async (tx) => {
      // 1. Найти профиль посредника
      const mediatorProfile = await tx.mediatorProfile.findUnique({
        where: { id: mediatorId },
        include: { user: { select: { id: true } } },
      });
      if (!mediatorProfile || mediatorProfile.status !== "APPROVED") {
        throw new NotFoundException("Посредник не найден или не одобрен");
      }
      const mediatorUserId = mediatorProfile.user.id;

      if (mediatorUserId === buyerId) {
        throw new BadRequestException(
          "Нельзя создать заявку самому себе",
        );
      }

      // 2. Получить корзину
      const cartItems = await tx.cartItem.findMany({
        where: { userId: buyerId },
        include: {
          listing: {
            include: { images: { orderBy: { order: "asc" }, take: 1 } },
          },
        },
      });
      if (cartItems.length === 0) {
        throw new BadRequestException("Корзина пуста");
      }

      // 3. Проверить доступность
      for (const ci of cartItems) {
        if (ci.listing.status !== "PUBLISHED") {
          throw new BadRequestException(
            `Товар «${ci.listing.title}» недоступен`,
          );
        }
      }

      // 4. Рассчитать суммы
      const currency = cartItems[0].listing.currency;
      const totalItemsPrice = cartItems.reduce(
        (s, ci) => s + ci.listing.price * ci.qty,
        0,
      );

      // Проверить минимальную сумму заказа посредника
      if (totalItemsPrice < mediatorProfile.minOrderAmount) {
        throw new BadRequestException(
          `Минимальная сумма заказа у этого посредника — ${mediatorProfile.minOrderAmount} ₽`,
        );
      }

      const commissionRate = Number(mediatorProfile.commissionRate);
      const totalCommission = Math.round(
        totalItemsPrice * (commissionRate / 100),
      );
      const totalAmount = totalItemsPrice + totalCommission;

      // 5. Создать заявку + items
      const orderRequest = await tx.orderRequest.create({
        data: {
          buyerId,
          mediatorId: mediatorUserId,
          totalItemsPrice,
          totalCommission,
          totalAmount,
          currency,
          comment: comment ?? null,
          items: {
            create: cartItems.map((ci) => ({
              listingId: ci.listingId,
              sellerId: ci.listing.sellerId,
              titleSnapshot: ci.listing.title,
              priceSnapshot: ci.listing.price,
              imageUrlSnapshot: ci.listing.images[0]?.url ?? null,
              selectedPhotoUrl: (ci as any).selectedPhotoUrl ?? null,
              clarification: (ci as any).clarification ?? null,
              qty: ci.qty,
            })),
          },
        },
        include: { items: true },
      });

      // 6. Создать чат
      await tx.orderRequestChat.create({
        data: {
          orderRequestId: orderRequest.id,
          buyerId,
          mediatorId: mediatorUserId,
          messages: {
            create: {
              senderId: buyerId,
              text: `Здравствуйте! Создана заявка на ${cartItems.length} товар(ов) на сумму ${Math.round(totalItemsPrice / 100).toLocaleString("ru-RU")} ₽ + комиссия ${Math.round(totalCommission / 100).toLocaleString("ru-RU")} ₽. Итого: ${Math.round(totalAmount / 100).toLocaleString("ru-RU")} ₽.`,
            },
          },
        },
      });

      // 7. Очистить корзину
      await tx.cartItem.deleteMany({ where: { userId: buyerId } });

      // 8. Notify mediator
      const totalFormatted = Math.round(totalAmount / 100).toLocaleString("ru-RU");
      this.notifications.notify(
        mediatorUserId,
        `📦 Новая прямая заявка от покупателя!\n\nТоваров: ${cartItems.length} шт., сумма: ~${totalFormatted} ₽.\nОткройте приложение, чтобы рассмотреть заявку.`,
      ).catch(() => {});

      return this.formatOrderRequest(orderRequest);
    });
  }

  async listMine(userId: string) {
    const requests = await this.prisma.orderRequest.findMany({
      where: {
        OR: [{ buyerId: userId }, { mediatorId: userId }],
      },
      include: {
        items: true,
        buyer: {
          select: { id: true, firstName: true, lastName: true, avatarUrl: true, phone: true },
        },
        mediator: {
          select: { id: true, firstName: true, lastName: true, avatarUrl: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    const supplierMap = await this.buildSupplierMap(
      requests.flatMap((r) => r.items.map((i: any) => i.sellerId)),
    );

    const chats = await this.prisma.orderRequestChat.findMany({
      where: { orderRequestId: { in: requests.map((r) => r.id) } },
      select: { id: true, orderRequestId: true },
    });
    const chatMap = new Map(chats.map((c) => [c.orderRequestId, c.id]));

    return requests.map((r) => {
      const isMediator = r.mediatorId === userId;
      return {
        ...this.formatOrderRequestFull(r, isMediator, supplierMap),
        chatId: chatMap.get(r.id) ?? null,
      };
    });
  }

  async getMine(userId: string, id: string) {
    const request = await this.prisma.orderRequest.findUnique({
      where: { id },
      include: {
        items: true,
        buyer: {
          select: { id: true, firstName: true, lastName: true, avatarUrl: true, phone: true },
        },
        mediator: {
          select: { id: true, firstName: true, lastName: true, avatarUrl: true },
        },
        chat: { select: { id: true } },
      },
    });
    if (!request) throw new NotFoundException("Заявка не найдена");
    if (request.buyerId !== userId && request.mediatorId !== userId) {
      throw new ForbiddenException("Нет доступа к этой заявке");
    }
    const isMediator = request.mediatorId === userId;
    const supplierMap = isMediator
      ? await this.buildSupplierMap((request.items as any[]).map((i) => i.sellerId))
      : new Map<string, any>();
    return {
      ...this.formatOrderRequestFull(request, isMediator, supplierMap),
      chatId: request.chat?.id ?? null,
    };
  }

  private async buildSupplierMap(sellerIds: (string | null | undefined)[]) {
    const ids = [...new Set(sellerIds.filter(Boolean))] as string[];
    if (ids.length === 0) return new Map<string, any>();
    const profiles = await this.prisma.supplierProfile.findMany({
      where: { userId: { in: ids } },
      include: { location: true },
    });
    return new Map(profiles.map((p) => [p.userId, p]));
  }

  async accept(userId: string, id: string) {
    const request = await this.prisma.orderRequest.findUnique({
      where: { id },
      include: { items: true },
    });
    if (!request) throw new NotFoundException("Заявка не найдена");
    if (request.mediatorId !== userId) {
      throw new ForbiddenException("Только посредник может принять заявку");
    }
    if (request.status !== "CREATED") {
      throw new BadRequestException("Заявку уже нельзя принять");
    }

    const updated = await this.prisma.orderRequest.update({
      where: { id },
      data: { status: "ACCEPTED" },
      include: { items: true },
    });
    return this.formatOrderRequest(updated);
  }

  async updateItemStatus(userId: string, requestId: string, itemId: string, status: string) {
    const MEDIATOR_STATUSES = ["FOUND", "NOT_FOUND", "REPLACEMENT_REQUESTED", "PENDING"];
    const BUYER_STATUSES = ["REPLACEMENT_APPROVED", "REPLACEMENT_REJECTED"];
    const request = await this.prisma.orderRequest.findUnique({
      where: { id: requestId },
      include: { items: true },
    });
    if (!request) throw new NotFoundException("Заявка не найдена");

    const isMediator = request.mediatorId === userId;
    const isBuyer = request.buyerId === userId;
    if (!isMediator && !isBuyer) throw new ForbiddenException("Нет доступа");

    if (isMediator && !MEDIATOR_STATUSES.includes(status)) {
      throw new BadRequestException("Недопустимый статус для посредника");
    }
    if (isBuyer && !BUYER_STATUSES.includes(status)) {
      throw new BadRequestException("Недопустимый статус для покупателя");
    }

    const item = (request.items as any[]).find((i) => i.id === itemId);
    if (!item) throw new NotFoundException("Товар не найден в заявке");

    const updated = await this.prisma.orderRequestItem.update({
      where: { id: itemId },
      data: { mediatorStatus: status },
    });

    // Send a system message to the chat
    const chat = await this.prisma.orderRequestChat.findUnique({
      where: { orderRequestId: requestId },
    });
    if (chat) {
      const STATUS_TEXT: Record<string, string> = {
        FOUND: `✅ Нашёл товар: «${item.titleSnapshot}»`,
        NOT_FOUND: `❌ Товар не найден у поставщика: «${item.titleSnapshot}»`,
        REPLACEMENT_REQUESTED: `🔍 Посредник ищет «${item.titleSnapshot}» у другого поставщика — подтвердите продолжение поиска`,
        REPLACEMENT_APPROVED: `✅ Вы разрешили посреднику продолжить поиск «${item.titleSnapshot}»`,
        REPLACEMENT_REJECTED: `❌ Вы отклонили продолжение поиска «${item.titleSnapshot}»`,
        PENDING: `🔄 Статус «${item.titleSnapshot}» сброшен`,
      };
      await this.prisma.orderRequestMessage.create({
        data: {
          chatId: chat.id,
          senderId: userId,
          text: STATUS_TEXT[status] ?? `Статус обновлён: ${status}`,
        },
      });
    }

    return { id: updated.id, mediatorStatus: (updated as any).mediatorStatus };
  }

  async listChatsForUser(userId: string) {
    const chats = await this.prisma.orderRequestChat.findMany({
      where: { OR: [{ buyerId: userId }, { mediatorId: userId }] },
      include: {
        orderRequest: { select: { id: true, status: true } },
        messages: { orderBy: { createdAt: "desc" }, take: 1 },
      },
      orderBy: { createdAt: "desc" },
    });

    const partnerIds = [...new Set(
      chats.map((c) => (c.buyerId === userId ? c.mediatorId : c.buyerId)),
    )];
    const partners = partnerIds.length > 0
      ? await this.prisma.user.findMany({
          where: { id: { in: partnerIds } },
          select: { id: true, firstName: true, lastName: true, avatarUrl: true },
        })
      : [];
    const partnerMap = new Map(partners.map((p) => [p.id, p]));

    return chats.map((c) => {
      const partnerId = c.buyerId === userId ? c.mediatorId : c.buyerId;
      const partner = partnerMap.get(partnerId);
      const partnerName = partner
        ? `${partner.firstName ?? ""} ${partner.lastName ?? ""}`.trim() || "Клиент"
        : "Клиент";
      const lastMsg = c.messages[0];
      return {
        id: c.id,
        orderRequestId: c.orderRequestId,
        zid: `R-${c.orderRequestId.slice(-4)}`,
        partnerName,
        partnerAvatarUrl: partner?.avatarUrl ?? null,
        status: c.orderRequest.status,
        lastMessage: lastMsg?.text ?? null,
        lastMessageAt: lastMsg ? (lastMsg.createdAt instanceof Date ? lastMsg.createdAt.toISOString() : lastMsg.createdAt) : null,
      };
    });
  }

  async getOrderRequestChatMessages(userId: string, chatId: string) {
    const chat = await this.prisma.orderRequestChat.findUnique({
      where: { id: chatId },
      include: { messages: { orderBy: { createdAt: "asc" } } },
    });
    if (!chat) throw new NotFoundException("Чат не найден");
    if (chat.buyerId !== userId && chat.mediatorId !== userId) {
      throw new ForbiddenException("Нет доступа к этому чату");
    }
    return chat.messages.map((m: any) => ({
      id: m.id,
      chatId: m.chatId,
      senderId: m.senderId,
      text: m.text,
      createdAt: m.createdAt instanceof Date ? m.createdAt.toISOString() : m.createdAt,
    }));
  }

  async sendOrderRequestChatMessage(userId: string, chatId: string, text: string) {
    const chat = await this.prisma.orderRequestChat.findUnique({ where: { id: chatId } });
    if (!chat) throw new NotFoundException("Чат не найден");
    if (chat.buyerId !== userId && chat.mediatorId !== userId) {
      throw new ForbiddenException("Нет доступа к этому чату");
    }
    const msg = await this.prisma.orderRequestMessage.create({
      data: { chatId, senderId: userId, text },
    });
    return {
      id: msg.id,
      chatId: msg.chatId,
      senderId: msg.senderId,
      text: msg.text,
      createdAt: msg.createdAt instanceof Date ? msg.createdAt.toISOString() : msg.createdAt,
    };
  }

  async cancel(userId: string, id: string) {
    const request = await this.prisma.orderRequest.findUnique({
      where: { id },
      include: { items: true },
    });
    if (!request) throw new NotFoundException("Заявка не найдена");
    if (request.buyerId !== userId && request.mediatorId !== userId) {
      throw new ForbiddenException("Нет доступа к этой заявке");
    }
    if (request.status === "COMPLETED" || request.status === "CANCELLED") {
      throw new BadRequestException("Заявку уже нельзя отменить");
    }

    const updated = await this.prisma.orderRequest.update({
      where: { id },
      data: { status: "CANCELLED" },
      include: { items: true },
    });

    const chat = await this.prisma.orderRequestChat.findUnique({
      where: { orderRequestId: id },
    });
    if (chat) {
      const isMediator = request.mediatorId === userId;
      await this.prisma.orderRequestMessage.create({
        data: {
          chatId: chat.id,
          senderId: userId,
          text: isMediator
            ? "❌ Посредник отменил заявку"
            : "❌ Покупатель отменил заявку",
        },
      });
    }

    return this.formatOrderRequest(updated);
  }

  async complete(userId: string, id: string) {
    const request = await this.prisma.orderRequest.findUnique({
      where: { id },
      include: { items: true },
    });
    if (!request) throw new NotFoundException("Заявка не найдена");
    if (request.mediatorId !== userId) {
      throw new ForbiddenException("Только посредник может завершить заявку");
    }
    if (request.status !== "ACCEPTED") {
      throw new BadRequestException("Заявку нельзя завершить из текущего статуса");
    }

    const updated = await this.prisma.orderRequest.update({
      where: { id },
      data: { status: "COMPLETED" },
      include: { items: true },
    });

    const chat = await this.prisma.orderRequestChat.findUnique({
      where: { orderRequestId: id },
    });
    if (chat) {
      await this.prisma.orderRequestMessage.create({
        data: {
          chatId: chat.id,
          senderId: userId,
          text: "🎉 Заказ завершён! Спасибо за покупку.",
        },
      });
    }

    // Increment completed orders counter
    await this.prisma.mediatorProfile.updateMany({
      where: { userId },
      data: { completedOrdersCount: { increment: 1 } },
    });

    return this.formatOrderRequest(updated);
  }

  async sendSystemMessage(userId: string, id: string, text: string) {
    const request = await this.prisma.orderRequest.findUnique({
      where: { id },
    });
    if (!request) throw new NotFoundException("Заявка не найдена");
    if (request.buyerId !== userId && request.mediatorId !== userId) {
      throw new ForbiddenException("Нет доступа");
    }
    const chat = await this.prisma.orderRequestChat.findUnique({
      where: { orderRequestId: id },
    });
    if (!chat) throw new NotFoundException("Чат не найден");
    await this.prisma.orderRequestMessage.create({
      data: { chatId: chat.id, senderId: userId, text },
    });
    return { ok: true };
  }

  async setAnalogue(buyerId: string, requestId: string, itemId: string, listingId: string) {
    const request = await this.prisma.orderRequest.findUnique({
      where: { id: requestId },
      include: { chat: true },
    });
    if (!request) throw new NotFoundException("Заявка не найдена");
    if (request.buyerId !== buyerId) throw new ForbiddenException("Только покупатель может выбрать аналог");

    const listing = await this.prisma.listing.findUnique({
      where: { id: listingId },
      include: { images: { orderBy: { order: "asc" }, take: 1 } },
    });
    if (!listing) throw new NotFoundException("Товар не найден");

    await this.prisma.orderRequestItem.update({
      where: { id: itemId },
      data: {
        listingId: listing.id,
        sellerId: listing.sellerId,
        titleSnapshot: listing.title,
        priceSnapshot: listing.price,
        imageUrlSnapshot: listing.images[0]?.url ?? null,
        mediatorStatus: "PENDING",
      },
    });

    if (request.chat) {
      await this.prisma.orderRequestMessage.create({
        data: {
          chatId: request.chat.id,
          senderId: buyerId,
          text: `📦 Покупатель выбрал аналог: «${listing.title}»`,
        },
      });
    }

    return { ok: true };
  }

  private formatOrderRequest(r: any, isMediator = false, supplierMap?: Map<string, any>) {
    return {
      id: r.id,
      status: r.status,
      totalItemsPrice: r.totalItemsPrice,
      totalCommission: r.totalCommission,
      totalAmount: r.totalAmount,
      currency: r.currency,
      comment: r.comment,
      items: r.items.map((i: any) => {
        const supplier = isMediator ? supplierMap?.get(i.sellerId) : null;
        return {
          id: i.id,
          listingId: i.listingId,
          title: i.titleSnapshot,
          price: i.priceSnapshot,
          imageUrl: i.selectedPhotoUrl ?? i.imageUrlSnapshot,
          imageUrlSnapshot: i.imageUrlSnapshot,
          selectedPhotoUrl: i.selectedPhotoUrl ?? null,
          clarification: i.clarification ?? null,
          qty: i.qty,
          mediatorStatus: i.mediatorStatus ?? "PENDING",
          ...(supplier
            ? {
                pavilionNumber: supplier.pavilionNumber ?? null,
                locationName: supplier.location?.name ?? null,
              }
            : {}),
        };
      }),
      createdAt: r.createdAt instanceof Date ? r.createdAt.toISOString() : r.createdAt,
      updatedAt: r.updatedAt instanceof Date ? r.updatedAt.toISOString() : r.updatedAt,
    };
  }

  private formatOrderRequestFull(r: any, isMediator = false, supplierMap?: Map<string, any>) {
    return {
      ...this.formatOrderRequest(r, isMediator, supplierMap),
      buyer: r.buyer,
      mediator: r.mediator,
    };
  }
}
