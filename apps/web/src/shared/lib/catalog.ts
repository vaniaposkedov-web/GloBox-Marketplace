import { z } from "zod";
import { citySchema, makeLongTextSchema, makeTitleSchema } from "./validators";

export const currencySchema = z.enum(["RUB", "KZT", "BYN", "USD", "EUR"]);
export type Currency = z.infer<typeof currencySchema>;

export const listingStatusSchema = z.enum([
  "DRAFT",
  "PUBLISHED",
  "SOLD",
  "ARCHIVED",
]);
export type ListingStatus = z.infer<typeof listingStatusSchema>;

export const createListingSchema = z.object({
  title: makeTitleSchema(4, 120),
  description: makeLongTextSchema(10, 5000),
  price: z
    .number()
    .int("Цена должна быть целым числом (копейки)")
    .min(0, "Цена не может быть отрицательной")
    .max(1_000_000_000_00, "Слишком большая цена"),
  currency: currencySchema.default("RUB"),
  categoryId: z.string().uuid("Выберите категорию"),
  city: citySchema.optional(),
  stock: z.number().int().min(0).max(99_999).default(1),
  imageUrls: z
    .array(z.string().url("Некорректный URL картинки"))
    .max(10, "Не более 10 картинок")
    .default([]),
});
export type CreateListing = z.infer<typeof createListingSchema>;

export const updateListingSchema = createListingSchema
  .partial()
  .extend({ status: listingStatusSchema.optional() });
export type UpdateListing = z.infer<typeof updateListingSchema>;

export interface CategoryDto {
  id: string;
  slug: string;
  name: string;
  icon: string | null;
  order: number;
}

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

export interface ListingsPage {
  items: ListingCardDto[];
  total: number;
  page: number;
  limit: number;
  pages: number;
}

/** Отформатировать цену: 150000 (копейки) → "1 500 ₽" */
export function formatPrice(minor: number, currency: Currency): string {
  const major = minor / 100;
  const fmt = new Intl.NumberFormat("ru-RU", {
    maximumFractionDigits: 0,
  }).format(major);
  const sign: Record<Currency, string> = {
    RUB: "₽",
    KZT: "₸",
    BYN: "Br",
    USD: "$",
    EUR: "€",
  };
  return `${fmt} ${sign[currency]}`;
}
