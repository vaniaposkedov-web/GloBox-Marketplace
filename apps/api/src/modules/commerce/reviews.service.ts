import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
} from "@nestjs/common";
import type {
  CreateReview,
  ReviewDto,
  ReviewsSummary,
} from "@marketplace/shared";
import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class ReviewsService {
  constructor(private readonly prisma: PrismaService) {}

  async listForListing(listingId: string): Promise<ReviewDto[]> {
    const rows = await this.prisma.review.findMany({
      where: { listingId },
      include: {
        author: { select: { id: true, firstName: true, lastName: true } },
      },
      orderBy: { createdAt: "desc" },
    });
    return rows.map((r) => ({
      id: r.id,
      rating: r.rating,
      text: r.text,
      author: {
        id: r.author.id,
        firstName: r.author.firstName ?? "",
        lastName: r.author.lastName ?? "",
      },
      createdAt: r.createdAt.toISOString(),
    }));
  }

  async summaryForListing(listingId: string): Promise<ReviewsSummary> {
    const rows = await this.prisma.review.findMany({
      where: { listingId },
      select: { rating: true },
    });
    const count = rows.length;
    const average =
      count === 0
        ? 0
        : Math.round((rows.reduce((s, r) => s + r.rating, 0) / count) * 10) /
          10;
    const distribution: Record<"1" | "2" | "3" | "4" | "5", number> = {
      "1": 0,
      "2": 0,
      "3": 0,
      "4": 0,
      "5": 0,
    };
    for (const r of rows) {
      const key = String(r.rating) as "1" | "2" | "3" | "4" | "5";
      if (distribution[key] !== undefined) distribution[key] += 1;
    }
    return { average, count, distribution };
  }

  async create(authorId: string, dto: CreateReview): Promise<ReviewDto> {
    const listing = await this.prisma.listing.findUnique({
      where: { id: dto.listingId },
    });
    if (!listing) throw new BadRequestException("Товар не найден");
    if (listing.sellerId === authorId) {
      throw new ForbiddenException("Нельзя оставить отзыв на свой товар");
    }

    try {
      const created = await this.prisma.review.create({
        data: {
          listingId: dto.listingId,
          authorId,
          rating: dto.rating,
          text: dto.text,
        },
        include: {
          author: { select: { id: true, firstName: true, lastName: true } },
        },
      });
      return {
        id: created.id,
        rating: created.rating,
        text: created.text,
        author: {
          id: created.author.id,
          firstName: created.author.firstName ?? "",
          lastName: created.author.lastName ?? "",
        },
        createdAt: created.createdAt.toISOString(),
      };
    } catch (err: unknown) {
      // unique constraint — один пользователь = один отзыв на товар
      if (
        typeof err === "object" &&
        err !== null &&
        "code" in err &&
        (err as { code?: string }).code === "P2002"
      ) {
        throw new ConflictException("Вы уже оставили отзыв на этот товар");
      }
      throw err;
    }
  }
}
