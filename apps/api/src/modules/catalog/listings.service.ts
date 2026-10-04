import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { Prisma } from "@prisma/client";
import type {
  CreateListing,
  ListingCardDto,
  ListingDetailDto,
  ListingsPage,
  ListListingsQuery,
  UpdateListing,
} from "@marketplace/shared";
import { PrismaService } from "../prisma/prisma.service";

/** Поле include для Prisma-запросов. */
const listingInclude = {
  category: { select: { id: true, slug: true, name: true } },
  images: { orderBy: { order: "asc" as const } },
  seller: {
    select: { id: true, firstName: true, lastName: true, createdAt: true },
  },
};

type ListingWithRelations = Prisma.ListingGetPayload<{
  include: typeof listingInclude;
}>;

@Injectable()
export class ListingsService {
  constructor(private readonly prisma: PrismaService) {}

  async list(query: ListListingsQuery): Promise<ListingsPage> {
    const where: Prisma.ListingWhereInput = { status: "PUBLISHED" };
    if (query.categoryId) where.categoryId = query.categoryId;
    if (query.sellerId) where.sellerId = query.sellerId;
    if (query.q) {
      where.OR = [
        { title: { contains: query.q, mode: "insensitive" } },
        { description: { contains: query.q, mode: "insensitive" } },
      ];
    }

    const [total, rows] = await this.prisma.$transaction([
      this.prisma.listing.count({ where }),
      this.prisma.listing.findMany({
        where,
        include: listingInclude,
        orderBy: { createdAt: "desc" },
        skip: (query.page - 1) * query.limit,
        take: query.limit,
      }),
    ]);

    return {
      items: rows.map(toCard),
      total,
      page: query.page,
      limit: query.limit,
      pages: Math.max(1, Math.ceil(total / query.limit)),
    };
  }

  /**
   * Все товары продавца, в том числе DRAFT/SOLD/ARCHIVED.
   * Для личного кабинета.
   */
  async quickSearch(q: string) {
    const [listings, mediators] = await Promise.all([
      this.prisma.listing.findMany({
        where: {
          status: "PUBLISHED",
          OR: [
            { title: { contains: q, mode: "insensitive" } },
            { description: { contains: q, mode: "insensitive" } },
          ],
        },
        include: listingInclude,
        orderBy: { viewCount: "desc" },
        take: 5,
      }),
      this.prisma.mediatorProfile.findMany({
        where: {
          status: "APPROVED",
          OR: [
            { firstName: { contains: q, mode: "insensitive" } },
            { lastName: { contains: q, mode: "insensitive" } },
          ],
        },
        include: { user: { select: { id: true, avatarUrl: true } } },
        take: 4,
      }),
    ]);
    return {
      listings: listings.map(toCard),
      mediators: mediators.map((m: any) => ({
        id: m.id,
        userId: m.userId,
        firstName: m.firstName,
        lastName: m.lastName,
        avatarUrl: m.avatarUrl ?? m.user?.avatarUrl ?? null,
        commissionRate: Number(m.commissionRate),
      })),
    };
  }

  async listMine(sellerId: string): Promise<ListingCardDto[]> {
    const rows = await this.prisma.listing.findMany({
      where: { sellerId },
      include: listingInclude,
      orderBy: { updatedAt: "desc" },
    });
    return rows.map(toCard);
  }

  async getById(
    id: string,
    viewerKey?: string,
  ): Promise<ListingDetailDto> {
    const row = await this.prisma.listing.findUnique({
      where: { id },
      include: listingInclude,
    });
    if (!row) throw new NotFoundException("Объявление не найдено");

    // Анти-накрутка: один viewerKey может засчитать просмотр не чаще раза в сутки.
    if (viewerKey) {
      const viewDate = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
      try {
        await this.prisma.listingView.create({
          data: { listingId: id, viewerKey, viewDate },
        });
        // Если запись создалась — инкрементим счётчик
        void this.prisma.listing
          .update({ where: { id }, data: { viewCount: { increment: 1 } } })
          .catch(() => undefined);
      } catch {
        // P2002 — уже был просмотр за эти сутки; не инкрементим
      }
    }
    return toDetail(row);
  }

  async create(
    sellerId: string,
    dto: CreateListing,
  ): Promise<ListingDetailDto> {
    // проверим категорию
    const category = await this.prisma.category.findUnique({
      where: { id: dto.categoryId },
    });
    if (!category) throw new NotFoundException("Категория не найдена");

    const listing = await this.prisma.listing.create({
      data: {
        title: dto.title,
        description: dto.description,
        price: dto.price,
        currency: dto.currency ?? "RUB",
        categoryId: dto.categoryId,
        sellerId,
        city: dto.city,
        stock: dto.stock ?? 1,
        images: {
          create: dto.imageUrls.map((url, idx) => ({ url, order: idx })),
        },
      },
      include: listingInclude,
    });
    return toDetail(listing);
  }

  async update(
    id: string,
    sellerId: string,
    dto: UpdateListing,
  ): Promise<ListingDetailDto> {
    const existing = await this.prisma.listing.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException("Объявление не найдено");
    if (existing.sellerId !== sellerId) {
      throw new ForbiddenException("Недостаточно прав");
    }

    const data: Prisma.ListingUpdateInput = {};
    if (dto.title !== undefined) data.title = dto.title;
    if (dto.description !== undefined) data.description = dto.description;
    if (dto.price !== undefined) data.price = dto.price;
    if (dto.currency !== undefined) data.currency = dto.currency;
    if (dto.city !== undefined) data.city = dto.city;
    if (dto.status !== undefined) data.status = dto.status;
    if (dto.stock !== undefined) data.stock = dto.stock;
    if (dto.categoryId !== undefined) {
      data.category = { connect: { id: dto.categoryId } };
    }

    // Картинки: если пришли — полностью пересобираем
    if (dto.imageUrls !== undefined) {
      await this.prisma.listingImage.deleteMany({ where: { listingId: id } });
    }

    const updated = await this.prisma.listing.update({
      where: { id },
      data: {
        ...data,
        ...(dto.imageUrls !== undefined
          ? {
              images: {
                create: dto.imageUrls.map((url, idx) => ({
                  url,
                  order: idx,
                })),
              },
            }
          : {}),
      },
      include: listingInclude,
    });
    return toDetail(updated);
  }

  async delete(id: string, sellerId: string): Promise<void> {
    const existing = await this.prisma.listing.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException("Объявление не найдено");
    if (existing.sellerId !== sellerId) {
      throw new ForbiddenException("Недостаточно прав");
    }
    await this.prisma.listing.delete({ where: { id } });
  }
}

function toCard(l: ListingWithRelations): ListingCardDto {
  return {
    id: l.id,
    title: l.title,
    price: l.price,
    currency: l.currency,
    status: l.status,
    city: l.city ?? null,
    imageUrl: l.images[0]?.url ?? null,
    stock: l.stock,
    category: l.category,
    createdAt: l.createdAt.toISOString(),
  };
}

function toDetail(l: ListingWithRelations): ListingDetailDto {
  return {
    ...toCard(l),
    description: l.description,
    images: l.images.map((i) => i.url),
    viewCount: l.viewCount,
    seller: {
      id: l.seller.id,
      firstName: l.seller.firstName ?? "",
      lastName: l.seller.lastName ?? "",
      createdAt: l.seller.createdAt.toISOString(),
    },
  };
}
