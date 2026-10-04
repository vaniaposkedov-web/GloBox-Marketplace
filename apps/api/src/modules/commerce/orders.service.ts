import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import type { Prisma } from "@prisma/client";
import type {
  Checkout,
  OrderDto,
  OrderItemDto,
} from "@marketplace/shared";
import { PrismaService } from "../prisma/prisma.service";

const orderInclude = {
  items: true,
};

type OrderWithItems = Prisma.OrderGetPayload<{ include: typeof orderInclude }>;

function toOrderDto(o: OrderWithItems): OrderDto {
  const items: OrderItemDto[] = o.items.map((i) => ({
    id: i.id,
    listingId: i.listingId,
    title: i.titleSnapshot,
    price: i.priceSnapshot,
    imageUrl: i.imageUrlSnapshot,
    qty: i.qty,
  }));
  return {
    id: o.id,
    status: o.status,
    deliveryMethod: o.deliveryMethod,
    deliveryAddress: o.deliveryAddress,
    contactPhone: o.contactPhone,
    totalAmount: o.totalAmount,
    currency: o.currency,
    comment: o.comment,
    items,
    createdAt: o.createdAt.toISOString(),
    updatedAt: o.updatedAt.toISOString(),
  };
}

@Injectable()
export class OrdersService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Оформление заказа: берём корзину, создаём заказ, списываем остатки, чистим корзину.
   * Всё в одной транзакции.
   */
  async checkout(userId: string, dto: Checkout): Promise<OrderDto> {
    return this.prisma.$transaction(async (tx) => {
      const cartItems = await tx.cartItem.findMany({
        where: { userId },
        include: {
          listing: {
            include: { images: { orderBy: { order: "asc" }, take: 1 } },
          },
        },
      });
      if (cartItems.length === 0) {
        throw new BadRequestException("Корзина пуста");
      }

      // Проверяем доступность всех позиций
      for (const ci of cartItems) {
        if (ci.listing.status !== "PUBLISHED") {
          throw new BadRequestException(
            `Товар «${ci.listing.title}» недоступен`,
          );
        }
        if (ci.qty > ci.listing.stock) {
          throw new BadRequestException(
            `Товара «${ci.listing.title}» осталось только ${ci.listing.stock}`,
          );
        }
      }

      // Валюта — по первому товару; если смешано, используем первую.
      // (Для простоты MVP; позже: отдельный заказ на каждую валюту.)
      const currency = cartItems[0].listing.currency;
      const totalAmount = cartItems.reduce(
        (s, ci) => s + ci.listing.price * ci.qty,
        0,
      );

      // Создаём заказ + items
      const order = await tx.order.create({
        data: {
          buyerId: userId,
          deliveryMethod: dto.deliveryMethod,
          deliveryAddress: dto.deliveryAddress,
          contactPhone: dto.contactPhone,
          comment: dto.comment ?? null,
          totalAmount,
          currency,
          items: {
            create: cartItems.map((ci) => ({
              listingId: ci.listingId,
              titleSnapshot: ci.listing.title,
              priceSnapshot: ci.listing.price,
              imageUrlSnapshot: ci.listing.images[0]?.url ?? null,
              qty: ci.qty,
            })),
          },
        },
        include: orderInclude,
      });

      // Списываем остатки
      for (const ci of cartItems) {
        await tx.listing.update({
          where: { id: ci.listingId },
          data: { stock: { decrement: ci.qty } },
        });
      }

      // Чистим корзину
      await tx.cartItem.deleteMany({ where: { userId } });

      return toOrderDto(order);
    });
  }

  async listMine(userId: string): Promise<OrderDto[]> {
    const orders = await this.prisma.order.findMany({
      where: { buyerId: userId },
      include: orderInclude,
      orderBy: { createdAt: "desc" },
    });
    return orders.map(toOrderDto);
  }

  async getMine(userId: string, orderId: string): Promise<OrderDto> {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: orderInclude,
    });
    if (!order) throw new NotFoundException("Заказ не найден");
    if (order.buyerId !== userId) {
      throw new ForbiddenException("Это не ваш заказ");
    }
    return toOrderDto(order);
  }

  /** Покупатель отменяет заказ (только пока PENDING). */
  async cancel(userId: string, orderId: string): Promise<OrderDto> {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: orderInclude,
    });
    if (!order) throw new NotFoundException("Заказ не найден");
    if (order.buyerId !== userId) {
      throw new ForbiddenException("Это не ваш заказ");
    }
    if (order.status !== "PENDING") {
      throw new BadRequestException("Заказ уже в обработке, отмена невозможна");
    }

    // Возвращаем остатки на склад
    return this.prisma.$transaction(async (tx) => {
      for (const it of order.items) {
        await tx.listing.update({
          where: { id: it.listingId },
          data: { stock: { increment: it.qty } },
        });
      }
      const updated = await tx.order.update({
        where: { id: orderId },
        data: { status: "CANCELLED" },
        include: orderInclude,
      });
      return toOrderDto(updated);
    });
  }
}
