import { Injectable } from "@nestjs/common";
import type { ListingCardDto } from "@marketplace/shared";
import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class FavoritesService {
  constructor(private readonly prisma: PrismaService) {}

  async listIds(userId: string): Promise<string[]> {
    const rows = await this.prisma.favorite.findMany({
      where: { userId },
      select: { listingId: true },
    });
    return rows.map((r) => r.listingId);
  }

  async listWithData(userId: string): Promise<ListingCardDto[]> {
    const rows = await this.prisma.favorite.findMany({
      where: { userId },
      include: {
        listing: {
          include: {
            category: { select: { id: true, slug: true, name: true } },
            images: { orderBy: { order: "asc" }, take: 1 },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });
    return rows
      .filter((r) => r.listing.status === "PUBLISHED")
      .map((r) => ({
        id: r.listing.id,
        title: r.listing.title,
        price: r.listing.price,
        currency: r.listing.currency,
        status: r.listing.status,
        city: r.listing.city,
        imageUrl: r.listing.images[0]?.url ?? null,
        stock: r.listing.stock,
        category: r.listing.category,
        createdAt: r.listing.createdAt.toISOString(),
      }));
  }

  async toggle(
    userId: string,
    listingId: string,
  ): Promise<{ inFavorites: boolean }> {
    const existing = await this.prisma.favorite.findUnique({
      where: { userId_listingId: { userId, listingId } },
    });
    if (existing) {
      await this.prisma.favorite.delete({ where: { id: existing.id } });
      return { inFavorites: false };
    }
    await this.prisma.favorite.create({ data: { userId, listingId } });
    return { inFavorites: true };
  }
}
