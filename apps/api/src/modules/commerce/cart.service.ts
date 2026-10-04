import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import type {
  AddToCart,
  CartDto,
  CartItemDto,
  UpdateCartItem,
} from "@marketplace/shared";
import { PrismaService } from "../prisma/prisma.service";

const cartItemInclude = {
  listing: {
    include: { images: { orderBy: { order: "asc" as const }, take: 1 } },
  },
};

@Injectable()
export class CartService {
  constructor(private readonly prisma: PrismaService) {}

  async getCart(userId: string): Promise<CartDto> {
    const items = await this.prisma.cartItem.findMany({
      where: { userId },
      include: cartItemInclude,
      orderBy: { addedAt: "desc" },
    });

    const cartItems: CartItemDto[] = items.map((i) => ({
      id: i.id,
      listingId: i.listingId,
      title: i.listing.title,
      price: i.listing.price,
      currency: i.listing.currency,
      imageUrl: i.listing.images[0]?.url ?? null,
      qty: i.qty,
      stock: i.listing.stock,
      unavailable:
        i.listing.status !== "PUBLISHED" ||
        i.listing.stock === 0 ||
        i.qty > i.listing.stock,
      selectedPhotoUrl: i.selectedPhotoUrl ?? null,
      clarification: i.clarification ?? null,
    }));

    // Если корзина пуста — валюта RUB по дефолту
    const currency = cartItems[0]?.currency ?? "RUB";
    const total = cartItems
      .filter((ci) => !ci.unavailable)
      .reduce((sum, ci) => sum + ci.price * ci.qty, 0);
    const count = cartItems.reduce((s, ci) => s + ci.qty, 0);

    return { items: cartItems, total, currency, count };
  }

  async add(userId: string, dto: AddToCart): Promise<CartDto> {
    const listing = await this.prisma.listing.findUnique({
      where: { id: dto.listingId },
    });
    if (!listing || listing.status !== "PUBLISHED") {
      throw new NotFoundException("Товар не найден или снят с продажи");
    }
    if (listing.sellerId === userId) {
      throw new BadRequestException("Нельзя добавить в корзину свой товар");
    }
    if (listing.stock <= 0) {
      throw new BadRequestException("Товара нет в наличии");
    }

    const existing = await this.prisma.cartItem.findUnique({
      where: {
        userId_listingId: { userId, listingId: dto.listingId },
      },
    });

    const desiredQty = Math.min(
      (existing?.qty ?? 0) + dto.qty,
      listing.stock,
    );

    await this.prisma.cartItem.upsert({
      where: {
        userId_listingId: { userId, listingId: dto.listingId },
      },
      create: {
        userId,
        listingId: dto.listingId,
        qty: desiredQty,
        selectedPhotoUrl: dto.selectedPhotoUrl ?? null,
        clarification: dto.clarification ?? null,
      },
      update: {
        qty: desiredQty,
        ...(dto.selectedPhotoUrl !== undefined && { selectedPhotoUrl: dto.selectedPhotoUrl }),
        ...(dto.clarification !== undefined && { clarification: dto.clarification }),
      },
    });

    return this.getCart(userId);
  }

  async updateQty(
    userId: string,
    itemId: string,
    dto: UpdateCartItem,
  ): Promise<CartDto> {
    const item = await this.prisma.cartItem.findUnique({
      where: { id: itemId },
      include: { listing: true },
    });
    if (!item || item.userId !== userId) {
      throw new NotFoundException("Позиция не найдена");
    }
    const qty = Math.min(dto.qty, item.listing.stock);
    await this.prisma.cartItem.update({ where: { id: itemId }, data: { qty } });
    return this.getCart(userId);
  }

  async remove(userId: string, itemId: string): Promise<CartDto> {
    const item = await this.prisma.cartItem.findUnique({
      where: { id: itemId },
    });
    if (!item || item.userId !== userId) {
      throw new NotFoundException("Позиция не найдена");
    }
    await this.prisma.cartItem.delete({ where: { id: itemId } });
    return this.getCart(userId);
  }

  async clear(userId: string): Promise<void> {
    await this.prisma.cartItem.deleteMany({ where: { userId } });
  }
}
