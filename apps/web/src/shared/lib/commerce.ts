import { z } from "zod";
import type { Currency } from "./catalog";
import { addressSchema } from "./validators";
import { phoneSchema } from "./schemas";

export const addToCartSchema = z.object({
  listingId: z.string().uuid(),
  qty: z.number().int().min(1).max(99).default(1),
  selectedPhotoUrl: z.string().url().optional(),
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
  stock: number;
  unavailable: boolean;
  selectedPhotoUrl: string | null;
  clarification: string | null;
}

export interface CartDto {
  items: CartItemDto[];
  total: number;
  currency: Currency;
  count: number;
}

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
  distribution: Record<"1" | "2" | "3" | "4" | "5", number>;
}

/** Человекочитаемый статус заказа */
export const ORDER_STATUS_LABEL: Record<OrderStatus, string> = {
  PENDING: "В обработке",
  CONFIRMED: "Подтверждён",
  SHIPPED: "В доставке",
  DELIVERED: "Доставлен",
  CANCELLED: "Отменён",
};

export const DELIVERY_METHOD_LABEL: Record<DeliveryMethod, string> = {
  PICKUP: "Самовывоз",
  COURIER: "Курьер",
  POST: "Почта",
};

// ——— Публичный профиль посредника ———

export interface MediatorPublicDto {
  id: string;
  userId: string;
  firstName: string;
  lastName: string;
  middleName: string | null;
  avatarUrl: string;
  commissionRate: string; // decimal as string
  minOrderAmount: number;
  createdAt: string;
}

export interface MediatorProfilePublicDto extends MediatorPublicDto {
  bio?: string;
}

// ——— Заявки (Order Requests) ———

export const orderRequestStatusSchema = z.enum([
  "PENDING",
  "ACCEPTED",
  "REJECTED",
  "CANCELLED",
  "COMPLETED",
]);
export type OrderRequestStatus = z.infer<typeof orderRequestStatusSchema>;

export interface OrderRequestItemDto {
  id: string;
  listingId: string;
  title: string;
  price: number;
  qty: number;
  imageUrl: string | null;
  selectedPhotoUrl: string | null;
  clarification: string | null;
}

export interface OrderRequestDto {
  id: string;
  status: OrderRequestStatus;
  mediator: {
    id: string;
    firstName: string;
    lastName: string;
    avatarUrl: string;
    commissionRate: string;
  };
  items: OrderRequestItemDto[];
  totalItemsPrice: number;
  totalCommission: number;
  totalAmount: number;
  currency: Currency;
  chatId: string | null;
  createdAt: string;
  updatedAt: string;
}

export const ORDER_REQUEST_STATUS_LABEL: Record<OrderRequestStatus, string> = {
  PENDING: "Ожидает",
  ACCEPTED: "Принята",
  REJECTED: "Отклонена",
  CANCELLED: "Отменена",
  COMPLETED: "Выполнена",
};
