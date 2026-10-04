import { z } from "zod";
import { currencySchema, type Currency } from "../catalog/schemas";
import { addressSchema } from "../common/validators";
import { phoneSchema } from "../auth/schemas";

// ——— Корзина ———

export const addToCartSchema = z.object({
  listingId: z.string().uuid(),
  qty: z.number().int().min(1).max(99).default(1),
  /** Фото, выбранное клиентом (ТЗ 5.2.1 п.3) */
  selectedPhotoUrl: z.string().url().optional(),
  /** Уточнения: размер, цвет, кол-во (ТЗ 5.2.1 п.3) */
  clarification: z.string().trim().max(500).optional(),
});
export type AddToCart = z.infer<typeof addToCartSchema>;

export const updateCartItemSchema = z.object({
  qty: z.number().int().min(1).max(99),
});
export type UpdateCartItem = z.infer<typeof updateCartItemSchema>;

export interface CartItemDto {
  id: string;
  listingId: string;
  title: string;
  price: number;
  currency: Currency;
  imageUrl: string | null;
  qty: number;
  /** Макс. доступно для покупки (остаток на складе) */
  stock: number;
  /** true если в текущем количестве товар недоступен */
  unavailable: boolean;
  /** Фото, выбранное клиентом для заказа (ТЗ 5.2.1) */
  selectedPhotoUrl: string | null;
  /** Уточнения клиента (ТЗ 5.2.1) */
  clarification: string | null;
}

export interface CartDto {
  items: CartItemDto[];
  /** Сумма в минорных (копейках) */
  total: number;
  currency: Currency;
  /** Общее число позиций (сумма qty) */
  count: number;
}

// ——— Заказы ———

export const deliveryMethodSchema = z.enum(["PICKUP", "COURIER", "POST"]);
export type DeliveryMethod = z.infer<typeof deliveryMethodSchema>;

export const orderStatusSchema = z.enum([
  "PENDING",
  "CONFIRMED",
  "SHIPPED",
  "DELIVERED",
  "CANCELLED",
]);
export type OrderStatus = z.infer<typeof orderStatusSchema>;

export const checkoutSchema = z.object({
  deliveryMethod: deliveryMethodSchema,
  deliveryAddress: addressSchema,
  contactPhone: phoneSchema,
  comment: z.string().trim().max(500).optional(),
});
export type Checkout = z.infer<typeof checkoutSchema>;

export interface OrderItemDto {
  id: string;
  listingId: string;
  title: string;
  price: number;
  imageUrl: string | null;
  qty: number;
}

export interface OrderDto {
  id: string;
  status: OrderStatus;
  deliveryMethod: DeliveryMethod;
  deliveryAddress: string;
  contactPhone: string;
  totalAmount: number;
  currency: Currency;
  comment: string | null;
  items: OrderItemDto[];
  createdAt: string;
  updatedAt: string;
}

// ——— Избранное ———

export interface FavoriteDto {
  listingId: string;
  addedAt: string;
}

// ——— Отзывы ———

export const createReviewSchema = z.object({
  listingId: z.string().uuid(),
  rating: z.number().int().min(1).max(5),
  text: z.string().trim().min(5).max(2000),
});
export type CreateReview = z.infer<typeof createReviewSchema>;

export interface ReviewDto {
  id: string;
  rating: number;
  text: string;
  author: { id: string; firstName: string; lastName: string };
  createdAt: string;
}

export interface ReviewsSummary {
  average: number;
  count: number;
  /** распределение: { "5": 12, "4": 3, "3": 1, "2": 0, "1": 0 } */
  distribution: Record<"1" | "2" | "3" | "4" | "5", number>;
}
