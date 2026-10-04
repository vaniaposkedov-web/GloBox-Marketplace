import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import { NotificationService } from "../notifications/notification.service";

const MAX_ACTIVE_ORDERS_PER_MEDIATOR = 5;

const orderInclude = {
  items: { include: { listing: { include: { images: true } } } },
  responses: { include: { mediator: { include: { mediatorProfile: true } } } },
  buyer: { select: { id: true, firstName: true, lastName: true, avatarUrl: true } },
  mediator: { select: { id: true, firstName: true, lastName: true, avatarUrl: true, mediatorProfile: true } },
};

@Injectable()
export class MediatorOrdersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationService,
  ) {}

  /** Создание заказа из корзины (ТЗ 5.2.3) */
  async createOrder(buyerId: string, dto: {
    recipientFirstName?: string;
    recipientLastName?: string;
    recipientMiddleName?: string;
    recipientPhone?: string;
    deliveryMethod?: string;
    deliveryAddress?: string;
    desiredPurchaseDate?: string;
    commentToMediator?: string;
  }) {
    const cartItems = await this.prisma.cartItem.findMany({
      where: { userId: buyerId },
      include: { listing: { include: { images: { orderBy: { order: "asc" } } } } },
    });

    if (cartItems.length === 0) {
      throw new BadRequestException("Корзина пуста");
    }

    // Auto-fill selectedPhotoUrl with first listing image if not set
    for (const item of cartItems) {
      if (!item.selectedPhotoUrl && item.listing.images.length > 0) {
        await this.prisma.cartItem.update({
          where: { id: item.id },
          data: { selectedPhotoUrl: item.listing.images[0].url },
        });
        (item as any).selectedPhotoUrl = item.listing.images[0].url;
      }
    }

    const totalEstimatedAmount = cartItems.reduce(
      (sum, i) => sum + i.listing.price * i.qty,
      0,
    );

    const order = await this.prisma.mediatorOrder.create({
      data: {
        buyer: { connect: { id: buyerId } },
        totalEstimatedAmount,
        recipientFirstName: dto.recipientFirstName ?? "",
        recipientLastName: dto.recipientLastName ?? "",
        recipientMiddleName: dto.recipientMiddleName || null,
        recipientPhone: dto.recipientPhone ?? "",
        deliveryMethod: dto.deliveryMethod ?? "",
        deliveryAddress: dto.deliveryAddress ?? "",
        desiredPurchaseDate: dto.desiredPurchaseDate ? new Date(dto.desiredPurchaseDate) : new Date(Date.now() + 86400000),
        commentToMediator: dto.commentToMediator || null,
        items: {
          create: cartItems.map((ci) => ({
            listingId: ci.listingId,
            sellerId: ci.listing.sellerId,
            selectedPhotoUrl: ci.selectedPhotoUrl || (ci.listing.images[0]?.url ?? ""),
            clarification: ci.clarification || "-",
            originalPrice: ci.listing.price * ci.qty,
            currentPrice: ci.listing.price * ci.qty,
          })),
        },
      },
      include: orderInclude,
    });

    // Clear cart after order
    await this.prisma.cartItem.deleteMany({ where: { userId: buyerId } });

    return this.formatOrder(order, buyerId);
  }

  /** Получить мои заказы (для покупателя) */
  async getBuyerOrders(buyerId: string) {
    const orders = await this.prisma.mediatorOrder.findMany({
      where: { buyerId },
      include: orderInclude,
      orderBy: { createdAt: "desc" },
    });
    return orders.map((o) => this.formatOrder(o, buyerId));
  }

  /** Получить один заказ по ID */
  async getOrder(orderId: string, userId: string) {
    const order = await this.prisma.mediatorOrder.findUnique({
      where: { id: orderId },
      include: orderInclude,
    });
    if (!order) throw new NotFoundException("Заказ не найден");
    if (order.buyerId !== userId && order.mediatorId !== userId) {
      // Check if user is a responding mediator
      const isResponder = order.responses.some((r) => r.mediatorId === userId);
      if (!isResponder) throw new ForbiddenException("Нет доступа к этому заказу");
    }
    return this.formatOrder(order, userId);
  }

  /** Получить доступные заказы для посредника (ТЗ 5.3.1) */
  async getAvailableOrders(mediatorId: string) {
    const mediatorProfile = await this.prisma.mediatorProfile.findUnique({
      where: { userId: mediatorId },
    });
    if (!mediatorProfile || mediatorProfile.status !== "APPROVED") {
      throw new ForbiddenException("Вы не являетесь одобренным посредником");
    }

    // Check active orders count
    const activeCount = await this.prisma.mediatorOrder.count({
      where: {
        mediatorId,
        status: {
          notIn: ["COMPLETED", "CANCELLED", "DISPUTE", "NOT_FOUND"],
        },
      },
    });
    if (activeCount >= MAX_ACTIVE_ORDERS_PER_MEDIATOR) {
      return { orders: [], limitReached: true, activeCount };
    }

    const orders = await this.prisma.mediatorOrder.findMany({
      where: {
        status: { in: ["SEARCHING", "SELECTING"] },
        totalEstimatedAmount: { gte: mediatorProfile.minOrderAmount },
        buyerId: { not: mediatorId },
        NOT: { responses: { some: { mediatorId } } },
      },
      include: {
        items: { include: { listing: { include: { images: true } } } },
        buyer: { select: { id: true, firstName: true, lastName: true, avatarUrl: true } },
        responses: { select: { id: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    // Batch pavilion lookup for mediator (seller info per item)
    const allSellerIds = [
      ...new Set(orders.flatMap((o) => o.items.map((i) => i.sellerId)).filter(Boolean)),
    ] as string[];
    const supplierProfiles = allSellerIds.length > 0
      ? await this.prisma.supplierProfile.findMany({
          where: { userId: { in: allSellerIds } },
          include: { location: true },
        })
      : [];
    const supplierMap = new Map(supplierProfiles.map((p) => [p.userId, p]));

    return {
      orders: orders.map((o) => ({
        id: o.id,
        zid: `Z-${o.seqNumber}`,
        buyerName: `${o.buyer.firstName || ""} ${(o.buyer as any).lastName || ""}`.trim() || "Клиент",
        buyerAvatar: o.buyer.avatarUrl,
        totalEstimatedAmount: o.totalEstimatedAmount,
        currency: o.currency,
        desiredPurchaseDate: o.desiredPurchaseDate,
        itemsCount: o.items.length,
        responsesCount: o.responses.length,
        createdAt: o.createdAt,
        items: o.items.map((i) => {
          const supplier = i.sellerId ? supplierMap.get(i.sellerId) : null;
          return {
            id: i.id,
            selectedPhotoUrl: i.selectedPhotoUrl,
            clarification: i.clarification,
            originalPrice: i.originalPrice,
            pavilionNumber: supplier?.pavilionNumber ?? null,
            locationName: supplier?.location?.name ?? null,
          };
        }),
      })),
      limitReached: false,
      activeCount,
    };
  }

  /** Мои заказы (посредник) — принятые и в работе */
  async getMediatorOrders(mediatorId: string) {
    const orders = await this.prisma.mediatorOrder.findMany({
      where: { mediatorId },
      include: {
        items: true,
        buyer: { select: { id: true, firstName: true, lastName: true, avatarUrl: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    return orders.map((o) => ({
      id: o.id,
      zid: `Z-${o.seqNumber}`,
      status: o.status,
      buyerName: `${o.buyer.firstName ?? ""} ${o.buyer.lastName ?? ""}`.trim() || "Клиент",
      buyerAvatar: o.buyer.avatarUrl,
      totalEstimatedAmount: o.totalEstimatedAmount,
      totalActualAmount: o.totalActualAmount,
      mediatorCommissionAmount: o.mediatorCommissionAmount,
      mediatorCommissionRate: o.mediatorCommissionRate ? Number(o.mediatorCommissionRate) : null,
      currency: o.currency,
      itemsCount: o.items.length,
      desiredPurchaseDate: o.desiredPurchaseDate,
      createdAt: o.createdAt,
      updatedAt: o.updatedAt,
    }));
  }

  /** Посредник откликается на заказ (ТЗ 5.3.1 п.4-5) */
  async respondToOrder(orderId: string, mediatorId: string) {
    const mediatorProfile = await this.prisma.mediatorProfile.findUnique({
      where: { userId: mediatorId },
    });
    if (!mediatorProfile || mediatorProfile.status !== "APPROVED") {
      throw new ForbiddenException("Вы не являетесь одобренным посредником");
    }

    // Check active limit (TZ 5.3.2)
    const activeCount = await this.prisma.mediatorOrder.count({
      where: {
        mediatorId,
        status: { notIn: ["COMPLETED", "CANCELLED", "DISPUTE", "NOT_FOUND"] },
      },
    });
    if (activeCount >= MAX_ACTIVE_ORDERS_PER_MEDIATOR) {
      throw new BadRequestException("Превышен лимит активных заказов (5/5)");
    }

    const order = await this.prisma.mediatorOrder.findUnique({
      where: { id: orderId },
    });
    if (!order) throw new NotFoundException("Заказ не найден");
    if (!["SEARCHING", "SELECTING"].includes(order.status)) {
      throw new BadRequestException("Заказ больше не принимает отклики");
    }
    if (order.buyerId === mediatorId) {
      throw new BadRequestException("Нельзя откликнуться на свой заказ");
    }

    // Create response
    await this.prisma.mediatorOrderResponse.upsert({
      where: { orderId_mediatorId: { orderId, mediatorId } },
      create: { orderId, mediatorId },
      update: { withdrawnAt: null },
    });

    // Update order status to SELECTING if first response
    if (order.status === "SEARCHING") {
      await this.prisma.mediatorOrder.update({
        where: { id: orderId },
        data: { status: "SELECTING" },
      });
    }

    // Create chat automatically (TZ 5.4.1)
    await this.prisma.mediatorOrderChat.upsert({
      where: { orderId_mediatorId: { orderId, mediatorId } },
      create: { orderId, buyerId: order.buyerId, mediatorId },
      update: { isActive: true, closedAt: null },
    });

    // Notify buyer that a mediator responded
    const mediatorUser = await this.prisma.user.findUnique({
      where: { id: mediatorId },
      select: { firstName: true, lastName: true },
    });
    const mediatorName = [mediatorUser?.firstName, mediatorUser?.lastName].filter(Boolean).join(" ") || "Посредник";
    this.notifications.notify(
      order.buyerId,
      `🤝 Посредник «${mediatorName}» откликнулся на ваш заказ.\n\nПерейдите в раздел «Заказы», чтобы выбрать исполнителя.`,
    ).catch(() => {});

    return { success: true };
  }

  /** Клиент выбирает исполнителя (ТЗ 5.4.3–5.4.4) */
  async selectExecutor(orderId: string, buyerId: string, mediatorId: string) {
    const order = await this.prisma.mediatorOrder.findUnique({
      where: { id: orderId },
      include: { responses: true, chats: true },
    });
    if (!order) throw new NotFoundException("Заказ не найден");
    if (order.buyerId !== buyerId) throw new ForbiddenException("Это не ваш заказ");
    if (!["SEARCHING", "SELECTING"].includes(order.status)) {
      throw new BadRequestException("Невозможно выбрать исполнителя в текущем статусе");
    }

    // Verify mediator responded
    const response = order.responses.find((r) => r.mediatorId === mediatorId && !r.withdrawnAt);
    if (!response) {
      throw new BadRequestException("Этот посредник не откликался на ваш заказ");
    }

    // Get mediator's commission rate (TZ 5.9.3 — fix at selection time)
    const mediatorProfile = await this.prisma.mediatorProfile.findUnique({
      where: { userId: mediatorId },
    });
    if (!mediatorProfile) throw new NotFoundException("Профиль посредника не найден");

    const commissionRate = Number(mediatorProfile.commissionRate);
    const commissionAmount = Math.round(
      (order.totalEstimatedAmount * commissionRate) / 100,
    );

    // Update order: assign mediator + fix commission
    await this.prisma.mediatorOrder.update({
      where: { id: orderId },
      data: {
        mediatorId,
        status: "ASSIGNED",
        mediatorCommissionRate: mediatorProfile.commissionRate,
        mediatorCommissionAmount: commissionAmount,
        assignedAt: new Date(),
      },
    });

    // Close all other chats (TZ 5.4.4 p.3)
    await this.prisma.mediatorOrderChat.updateMany({
      where: { orderId, mediatorId: { not: mediatorId } },
      data: { isActive: false, closedAt: new Date() },
    });

    // Notify selected mediator
    const totalFormatted = order.totalEstimatedAmount.toLocaleString("ru-RU");
    this.notifications.notify(
      mediatorId,
      `✅ Вас выбрали исполнителем заказа!\n\nСумма заказа: ~${totalFormatted} ₽. Приступайте к закупке товаров через приложение.`,
    ).catch(() => {});

    // Add system messages (TZ 5.4.4 p.4-5)
    const selectedChat = order.chats.find((c) => c.mediatorId === mediatorId);
    if (selectedChat) {
      await this.prisma.mediatorOrderMessage.createMany({
        data: [
          {
            chatId: selectedChat.id,
            senderId: null,
            type: "SYSTEM",
            content: "⚠️ Внимание! В случае если вы будете работать с клиентом напрямую через сторонние сайты или соцсети — мы не несём ответственность за заказ. При подозрении на такие нарушения ваш аккаунт будет заблокирован. Просим вести диалог исключительно в этом чате.",
          },
          {
            chatId: selectedChat.id,
            senderId: null,
            type: "SYSTEM",
            content: "⚠️ Внимание! Мы настоятельно рекомендуем вести диалог исключительно на нашем сайте, чтобы все детали выкупа были зафиксированы. Если вы оформляете заказ или ведёте переписку с посредником на сторонних площадках или в соцсетях — мы не несём ответственность за ваш заказ, и заказ не подлежит покрытию страховой суммой 20 000 ₽.",
          },
        ],
      });
    }

    return { success: true };
  }

  /** Посредник начинает закупку (ТЗ 5.5: purchasing) */
  async startPurchasing(orderId: string, mediatorId: string) {
    const order = await this.validateMediatorAction(orderId, mediatorId);
    if (!["ASSIGNED", "AWAITING_PURCHASE_DATE"].includes(order.status)) {
      throw new BadRequestException("Невозможно начать закупку в текущем статусе");
    }
    await this.prisma.mediatorOrder.update({
      where: { id: orderId },
      data: { status: "PURCHASING" },
    });
    this.notifications.notify(
      order.buyerId,
      "🛍️ Посредник приступил к закупке ваших товаров на рынке.\n\nМы уведомим вас, когда заказ будет готов к передаче.",
    ).catch(() => {});
    return { success: true };
  }

  /** Посредник: передача заказа (ТЗ 5.11) */
  async startDelivering(orderId: string, mediatorId: string) {
    const order = await this.validateMediatorAction(orderId, mediatorId);
    if (order.status !== "PURCHASING") {
      throw new BadRequestException("Закупка ещё не начата");
    }
    await this.prisma.mediatorOrder.update({
      where: { id: orderId },
      data: { status: "DELIVERING" },
    });
    this.notifications.notify(
      order.buyerId,
      "📦 Ваш заказ закуплен и готов к передаче!\n\nСвяжитесь с посредником для получения товаров.",
    ).catch(() => {});
    return { success: true };
  }

  /** Клиент подтверждает завершение (ТЗ 5.11) */
  async completeOrder(orderId: string, buyerId: string) {
    const order = await this.prisma.mediatorOrder.findUnique({ where: { id: orderId } });
    if (!order) throw new NotFoundException("Заказ не найден");
    if (order.buyerId !== buyerId) throw new ForbiddenException("Это не ваш заказ");
    if (order.status !== "DELIVERING") {
      throw new BadRequestException("Заказ не в статусе передачи");
    }

    // Recalculate actual amount from items
    const items = await this.prisma.mediatorOrderItem.findMany({
      where: { orderId, status: "BOUGHT" },
    });
    const totalActual = items.reduce((sum, i) => sum + i.currentPrice, 0);
    const commissionRate = order.mediatorCommissionRate ? Number(order.mediatorCommissionRate) : 0;
    const commissionAmount = Math.round((totalActual * commissionRate) / 100);

    await this.prisma.mediatorOrder.update({
      where: { id: orderId },
      data: {
        status: "COMPLETED",
        totalActualAmount: totalActual,
        mediatorCommissionAmount: commissionAmount,
        completedAt: new Date(),
      },
    });

    // Increment mediator's completed orders counter
    if (order.mediatorId) {
      await this.prisma.mediatorProfile.updateMany({
        where: { userId: order.mediatorId },
        data: { completedOrdersCount: { increment: 1 } },
      });
      this.notifications.notify(
        order.mediatorId,
        `🎉 Заказ завершён! Спасибо за работу.\n\nВознаграждение: ${commissionAmount.toLocaleString("ru-RU")} ₽ (${commissionRate}% от ${totalActual.toLocaleString("ru-RU")} ₽).`,
      ).catch(() => {});
    }

    return { success: true };
  }

  /** Отмена заказа (ТЗ 5.10) */
  async cancelOrder(orderId: string, userId: string, reason?: string) {
    const order = await this.prisma.mediatorOrder.findUnique({ where: { id: orderId } });
    if (!order) throw new NotFoundException("Заказ не найден");

    let cancelledBy: "BUYER" | "MEDIATOR";
    if (order.buyerId === userId) {
      cancelledBy = "BUYER";
    } else if (order.mediatorId === userId) {
      cancelledBy = "MEDIATOR";
    } else {
      throw new ForbiddenException("Нет доступа");
    }

    if (["COMPLETED", "CANCELLED"].includes(order.status)) {
      throw new BadRequestException("Невозможно отменить заказ в текущем статусе");
    }

    // If mediator cancels after assignment — return to SEARCHING (TZ 5.10.2)
    if (cancelledBy === "MEDIATOR" && order.mediatorId) {
      await this.prisma.mediatorOrder.update({
        where: { id: orderId },
        data: {
          status: "SEARCHING",
          mediatorId: null,
          mediatorCommissionRate: null,
          mediatorCommissionAmount: null,
          assignedAt: null,
        },
      });
      this.notifications.notify(
        order.buyerId,
        "⚠️ Посредник отказался от вашего заказа.\n\nМы вернули ваш заказ в поиск — вскоре откликнется другой посредник.",
      ).catch(() => {});
      return { success: true, returnedToSearching: true };
    }

    // Buyer cancels
    await this.prisma.mediatorOrder.update({
      where: { id: orderId },
      data: { status: "CANCELLED", cancelledBy, cancellationReason: reason || null, cancelledAt: new Date() },
    });

    // Close all chats
    await this.prisma.mediatorOrderChat.updateMany({
      where: { orderId },
      data: { isActive: false, closedAt: new Date() },
    });

    // Notify mediator if buyer cancelled
    if (cancelledBy === "BUYER" && order.mediatorId) {
      this.notifications.notify(
        order.mediatorId,
        `❌ Покупатель отменил заказ.${reason ? `\n\nПричина: ${reason}` : ""}\n\nЗаказ закрыт.`,
      ).catch(() => {});
    }

    return { success: true, returnedToSearching: false };
  }

  /** Посредник: изменить цену товара (ТЗ 5.6) */
  async proposeItemPriceChange(
    orderId: string,
    itemId: string,
    mediatorId: string,
    newPrice: number,
    comment?: string,
  ) {
    await this.validateMediatorAction(orderId, mediatorId);
    const item = await this.prisma.mediatorOrderItem.findUnique({
      where: { id: itemId },
    });
    if (!item || item.orderId !== orderId) throw new NotFoundException("Товар не найден");
    if (item.status !== "PENDING") {
      throw new BadRequestException("Невозможно изменить цену в текущем статусе товара");
    }

    await this.prisma.mediatorOrderItem.update({
      where: { id: itemId },
      data: { status: "PRICE_CHANGE_OFFERED", priceChangeProposed: newPrice, priceChangeComment: comment || null },
    });
    // Notify buyer about price change proposal
    const orderForNotify = await this.prisma.mediatorOrder.findUnique({ where: { id: orderId }, select: { buyerId: true } });
    if (orderForNotify) {
      this.notifications.notify(
        orderForNotify.buyerId,
        `💰 Посредник предлагает изменить цену товара.\n\nНовая цена: ${newPrice.toLocaleString("ru-RU")} ₽.${comment ? `\nКомментарий: ${comment}` : ""}\n\nПерейдите в заказ, чтобы принять или отклонить предложение.`,
      ).catch(() => {});
    }
    return { success: true };
  }

  /** Клиент подтверждает/отклоняет изменение цены (ТЗ 5.6 п.4) */
  async respondToPriceChange(
    orderId: string,
    itemId: string,
    buyerId: string,
    accept: boolean,
  ) {
    const order = await this.prisma.mediatorOrder.findUnique({ where: { id: orderId } });
    if (!order || order.buyerId !== buyerId) throw new ForbiddenException("Нет доступа");

    const item = await this.prisma.mediatorOrderItem.findUnique({ where: { id: itemId } });
    if (!item || item.orderId !== orderId) throw new NotFoundException("Товар не найден");
    if (item.status !== "PRICE_CHANGE_OFFERED") {
      throw new BadRequestException("Нет предложения об изменении цены");
    }

    if (accept) {
      await this.prisma.mediatorOrderItem.update({
        where: { id: itemId },
        data: { status: "PENDING", currentPrice: item.priceChangeProposed!, priceChangeProposed: null, priceChangeComment: null },
      });
    } else {
      await this.prisma.mediatorOrderItem.update({
        where: { id: itemId },
        data: { status: "NOT_AVAILABLE", priceChangeProposed: null, priceChangeComment: null },
      });
    }
    // Notify mediator of buyer's decision
    if (order.mediatorId) {
      this.notifications.notify(
        order.mediatorId,
        accept
          ? "✅ Покупатель принял изменение цены товара."
          : "❌ Покупатель отклонил изменение цены. Товар отмечен как недоступный.",
      ).catch(() => {});
    }
    return { success: true };
  }

  /** Посредник: предложить замену (ТЗ 5.7) */
  async proposeReplacement(
    orderId: string,
    itemId: string,
    mediatorId: string,
    replacement: { photoUrl: string; price: number; description: string },
  ) {
    await this.validateMediatorAction(orderId, mediatorId);
    const item = await this.prisma.mediatorOrderItem.findUnique({ where: { id: itemId } });
    if (!item || item.orderId !== orderId) throw new NotFoundException("Товар не найден");

    await this.prisma.mediatorOrderItem.update({
      where: { id: itemId },
      data: { status: "REPLACEMENT_OFFERED", replacementData: replacement },
    });
    // Notify buyer about replacement proposal
    const orderForReplaceNotify = await this.prisma.mediatorOrder.findUnique({ where: { id: orderId }, select: { buyerId: true } });
    if (orderForReplaceNotify) {
      this.notifications.notify(
        orderForReplaceNotify.buyerId,
        `🔄 Посредник предлагает замену товара.\n\nЦена замены: ${replacement.price.toLocaleString("ru-RU")} ₽.\n\nПерейдите в заказ, чтобы принять или отклонить предложение.`,
      ).catch(() => {});
    }
    return { success: true };
  }

  /** Клиент принимает/отклоняет замену (ТЗ 5.7 п.4) */
  async respondToReplacement(
    orderId: string,
    itemId: string,
    buyerId: string,
    accept: boolean,
  ) {
    const order = await this.prisma.mediatorOrder.findUnique({ where: { id: orderId } });
    if (!order || order.buyerId !== buyerId) throw new ForbiddenException("Нет доступа");

    const item = await this.prisma.mediatorOrderItem.findUnique({ where: { id: itemId } });
    if (!item || item.orderId !== orderId) throw new NotFoundException("Товар не найден");
    if (item.status !== "REPLACEMENT_OFFERED") {
      throw new BadRequestException("Нет предложения о замене");
    }

    if (accept) {
      const replacementData = item.replacementData as any;
      await this.prisma.mediatorOrderItem.update({
        where: { id: itemId },
        data: {
          status: "PENDING",
          currentPrice: replacementData?.price ?? item.currentPrice,
          selectedPhotoUrl: replacementData?.photoUrl ?? item.selectedPhotoUrl,
          clarification: replacementData?.description ?? item.clarification,
          replacementData: Prisma.DbNull,
        },
      });
    } else {
      await this.prisma.mediatorOrderItem.update({
        where: { id: itemId },
        data: { status: "NOT_AVAILABLE", replacementData: Prisma.DbNull },
      });
    }
    // Notify mediator of buyer's decision on replacement
    if (order.mediatorId) {
      this.notifications.notify(
        order.mediatorId,
        accept
          ? "✅ Покупатель принял предложенную замену товара."
          : "❌ Покупатель отклонил замену. Товар отмечен как недоступный.",
      ).catch(() => {});
    }
    return { success: true };
  }

  /** Посредник: отметить товар как купленный (ТЗ 5.5) */
  async markItemBought(orderId: string, itemId: string, mediatorId: string) {
    await this.validateMediatorAction(orderId, mediatorId);
    const item = await this.prisma.mediatorOrderItem.findUnique({ where: { id: itemId } });
    if (!item || item.orderId !== orderId) throw new NotFoundException("Товар не найден");
    if (item.status !== "PENDING") {
      throw new BadRequestException("Товар не в статусе ожидания");
    }
    await this.prisma.mediatorOrderItem.update({
      where: { id: itemId },
      data: { status: "BOUGHT" },
    });
    return { success: true };
  }

  /** Посредник: отметить товар как недоступный */
  async markItemNotAvailable(orderId: string, itemId: string, mediatorId: string) {
    await this.validateMediatorAction(orderId, mediatorId);
    const item = await this.prisma.mediatorOrderItem.findUnique({ where: { id: itemId } });
    if (!item || item.orderId !== orderId) throw new NotFoundException("Товар не найден");
    await this.prisma.mediatorOrderItem.update({
      where: { id: itemId },
      data: { status: "NOT_AVAILABLE" },
    });
    return { success: true };
  }

  /** Рекомендованные посредники для заказа (ТЗ 5.3.1 п.2) */
  async getRecommendedMediators(orderId: string, buyerId: string) {
    const order = await this.prisma.mediatorOrder.findUnique({ where: { id: orderId } });
    if (!order || order.buyerId !== buyerId) throw new ForbiddenException("Нет доступа");

    const mediators = await this.prisma.mediatorProfile.findMany({
      where: {
        status: "APPROVED",
        minOrderAmount: { lte: order.totalEstimatedAmount },
        userId: { not: buyerId },
      },
      include: { user: { select: { id: true, firstName: true, lastName: true, avatarUrl: true, lastLoginAt: true } } },
      take: 10,
    });

    // Filter: < 5 active orders, shuffle, take 5
    const filtered: typeof mediators = [];
    for (const m of mediators) {
      const activeCount = await this.prisma.mediatorOrder.count({
        where: {
          mediatorId: m.userId,
          status: { notIn: ["COMPLETED", "CANCELLED", "DISPUTE", "NOT_FOUND"] },
        },
      });
      if (activeCount < MAX_ACTIVE_ORDERS_PER_MEDIATOR) {
        filtered.push(m);
      }
    }

    // Shuffle and take 5
    const shuffled = filtered.sort(() => Math.random() - 0.5).slice(0, 5);

    return shuffled.map((m) => ({
      userId: m.userId,
      firstName: m.firstName,
      lastName: m.lastName,
      avatarUrl: m.user.avatarUrl,
      commissionRate: Number(m.commissionRate),
      minOrderAmount: m.minOrderAmount,
      isOnline: m.user.lastLoginAt
        ? Date.now() - new Date(m.user.lastLoginAt).getTime() < 15 * 60 * 1000
        : false,
    }));
  }

  // ─── Chat operations ───────────────────────────────────────────────

  /** Get chats for an order (buyer view) */
  async getOrderChats(orderId: string, userId: string) {
    const order = await this.prisma.mediatorOrder.findUnique({ where: { id: orderId } });
    if (!order) throw new NotFoundException("Заказ не найден");
    if (order.buyerId !== userId && order.mediatorId !== userId) {
      throw new ForbiddenException("Нет доступа");
    }

    const chats = await this.prisma.mediatorOrderChat.findMany({
      where: { orderId, ...(order.buyerId === userId ? { buyerId: userId } : { mediatorId: userId }) },
      include: {
        mediator: { select: { id: true, firstName: true, lastName: true, avatarUrl: true, mediatorProfile: true } },
        buyer: { select: { id: true, firstName: true, lastName: true, avatarUrl: true } },
        messages: { orderBy: { createdAt: "desc" }, take: 1 },
      },
      orderBy: { createdAt: "desc" },
    });

    return chats.map((c) => ({
      id: c.id,
      orderId: c.orderId,
      mediator: {
        id: c.mediator.id,
        firstName: c.mediator.firstName,
        lastName: c.mediator.lastName,
        avatarUrl: c.mediator.avatarUrl,
        commissionRate: c.mediator.mediatorProfile ? Number(c.mediator.mediatorProfile.commissionRate) : null,
      },
      buyer: { id: c.buyer.id, firstName: c.buyer.firstName, avatarUrl: c.buyer.avatarUrl },
      isActive: c.isActive,
      lastMessage: c.messages[0] || null,
      createdAt: c.createdAt,
    }));
  }

  /** Get messages in a chat */
  async getChatMessages(chatId: string, userId: string) {
    const chat = await this.prisma.mediatorOrderChat.findUnique({ where: { id: chatId } });
    if (!chat) throw new NotFoundException("Чат не найден");
    if (chat.buyerId !== userId && chat.mediatorId !== userId) {
      throw new ForbiddenException("Нет доступа к чату");
    }

    const messages = await this.prisma.mediatorOrderMessage.findMany({
      where: { chatId },
      include: { sender: { select: { id: true, firstName: true, avatarUrl: true } } },
      orderBy: { createdAt: "asc" },
    });
    return messages;
  }

  /** Send message in chat */
  async sendMessage(chatId: string, userId: string, content: string, attachments?: string[]) {
    const chat = await this.prisma.mediatorOrderChat.findUnique({ where: { id: chatId } });
    if (!chat) throw new NotFoundException("Чат не найден");
    if (chat.buyerId !== userId && chat.mediatorId !== userId) {
      throw new ForbiddenException("Нет доступа к чату");
    }
    if (!chat.isActive) {
      throw new BadRequestException("Чат закрыт");
    }

    const message = await this.prisma.mediatorOrderMessage.create({
      data: {
        chatId,
        senderId: userId,
        type: attachments && attachments.length > 0 ? "IMAGE" : "TEXT",
        content,
        attachments: attachments || [],
      },
      include: { sender: { select: { id: true, firstName: true, avatarUrl: true } } },
    });
    return message;
  }

  // ─── Helpers ───────────────────────────────────────────────────────

  private async validateMediatorAction(orderId: string, mediatorId: string) {
    const order = await this.prisma.mediatorOrder.findUnique({ where: { id: orderId } });
    if (!order) throw new NotFoundException("Заказ не найден");
    if (order.mediatorId !== mediatorId) {
      throw new ForbiddenException("Вы не являетесь исполнителем этого заказа");
    }
    return order;
  }

  private formatOrder(order: any, viewerId: string) {
    const isBuyer = order.buyerId === viewerId;
    const isAssignedMediator = order.mediatorId === viewerId;

    return {
      id: order.id,
      zid: `Z-${order.seqNumber}`,
      status: order.status,
      totalEstimatedAmount: order.totalEstimatedAmount,
      totalActualAmount: order.totalActualAmount,
      mediatorCommissionRate: order.mediatorCommissionRate ? Number(order.mediatorCommissionRate) : null,
      mediatorCommissionAmount: order.mediatorCommissionAmount,
      currency: order.currency,
      // Recipient info only visible to buyer and assigned mediator (TZ 5.4.2)
      recipientFirstName: (isBuyer || isAssignedMediator) ? order.recipientFirstName : null,
      recipientLastName: (isBuyer || isAssignedMediator) ? order.recipientLastName : null,
      recipientMiddleName: (isBuyer || isAssignedMediator) ? order.recipientMiddleName : null,
      recipientPhone: (isBuyer || isAssignedMediator) ? order.recipientPhone : null,
      deliveryMethod: order.deliveryMethod,
      deliveryAddress: (isBuyer || isAssignedMediator) ? order.deliveryAddress : null,
      desiredPurchaseDate: order.desiredPurchaseDate,
      commentToMediator: order.commentToMediator,
      buyer: order.buyer,
      mediator: order.mediator,
      items: order.items?.map((i: any) => ({
        id: i.id,
        listingId: i.listingId,
        sellerId: i.sellerId,
        selectedPhotoUrl: i.selectedPhotoUrl,
        clarification: i.clarification,
        originalPrice: i.originalPrice,
        currentPrice: i.currentPrice,
        status: i.status,
        replacementData: i.replacementData,
        priceChangeProposed: i.priceChangeProposed,
        priceChangeComment: i.priceChangeComment,
        listing: i.listing ? { title: i.listing.title, images: i.listing.images } : null,
      })),
      responses: order.responses?.map((r: any) => ({
        id: r.id,
        mediatorId: r.mediatorId,
        mediator: r.mediator ? {
          id: r.mediator.id,
          firstName: r.mediator.firstName,
          lastName: r.mediator.lastName,
          avatarUrl: r.mediator.avatarUrl,
          commissionRate: r.mediator.mediatorProfile ? Number(r.mediator.mediatorProfile.commissionRate) : null,
        } : null,
        createdAt: r.createdAt,
      })),
      createdAt: order.createdAt,
      assignedAt: order.assignedAt,
      completedAt: order.completedAt,
      cancelledAt: order.cancelledAt,
      cancelledBy: order.cancelledBy,
      cancellationReason: order.cancellationReason,
    };
  }
}
