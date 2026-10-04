import { z } from "zod";
import {
  citySchema,
  makeLongTextSchema,
  makeTitleSchema,
} from "../common/validators";

/** Валюты из enum Prisma */
export const currencySchema = z.enum(["RUB", "KZT", "BYN", "USD", "EUR"]);
export type Currency = z.infer<typeof currencySchema>;

/** Статус объявления */
export const listingStatusSchema = z.enum([
  "DRAFT",
  "PUBLISHED",
  "SOLD",
  "ARCHIVED",
]);
export type ListingStatus = z.infer<typeof listingStatusSchema>;

/** Создание объявления (без seller — seller берётся из JWT) */
export const createListingSchema = z.object({
  title: makeTitleSchema(4, 120),
  description: makeLongTextSchema(10, 5000),
  /** Цена в минорных единицах (копейки). 0 = бесплатно. */
  price: z
    .number()
    .int("Цена должна быть целым числом (копейки)")
    .min(0, "Цена не может быть отрицательной")
    .max(1_000_000_000_00, "Слишком большая цена"),
  currency: currencySchema.default("RUB"),
  categoryId: z.string().uuid("Выберите категорию"),
  city: citySchema.optional(),
  /** Доступное количество на складе */
  stock: z.number().int().min(0).max(99_999).default(1),
  imageUrls: z
    .array(z.string().url("Некорректный URL картинки"))
    .max(10, "Не более 10 картинок")
    .default([]),
});
export type CreateListing = z.infer<typeof createListingSchema>;

/** Редактирование объявления — все поля опциональны */
export const updateListingSchema = createListingSchema
  .partial()
  .extend({ status: listingStatusSchema.optional() });
export type UpdateListing = z.infer<typeof updateListingSchema>;

/** Параметры для ленты объявлений */
export const listListingsQuerySchema = z.object({
  categoryId: z.string().uuid().optional(),
  q: z.string().trim().min(1).max(100).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(60).default(24),
  /** Только объявления конкретного продавца */
  sellerId: z.string().uuid().optional(),
});
export type ListListingsQuery = z.infer<typeof listListingsQuerySchema>;

/** Описание категории в ответе API */
export interface CategoryDto {
  id: string;
  slug: string;
  name: string;
  icon: string | null;
  order: number;
}

/** Краткое объявление (для ленты) */
export interface ListingCardDto {
  id: string;
  title: string;
  price: number;
  currency: Currency;
  status: ListingStatus;
  city: string | null;
  imageUrl: string | null;
  stock: number;
  category: { id: string; slug: string; name: string };
  createdAt: string;
}

/** Детальное объявление */
export interface ListingDetailDto extends ListingCardDto {
  description: string;
  images: string[];
  viewCount: number;
  seller: {
    id: string;
    firstName: string;
    lastName: string;
    createdAt: string;
  };
}

/** Ответ на GET /listings */
export interface ListingsPage {
  items: ListingCardDto[];
  total: number;
  page: number;
  limit: number;
  pages: number;
}
