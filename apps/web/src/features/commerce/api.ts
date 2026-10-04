import { api } from "@/shared/api/client";
import type {
  AddToCart,
  CartDto,
  Checkout,
  CreateReview,
  ListingCardDto,
  MediatorPublicDto,
  MediatorProfilePublicDto,
  OrderDto,
  OrderRequestDto,
  ReviewDto,
  ReviewsSummary,
  UpdateCartItem,
} from "@/shared/lib";

// ——— Корзина ———

export function getCart(): Promise<CartDto> {
  return api.get("/cart");
}
export function addToCart(dto: AddToCart): Promise<CartDto> {
  return api.post("/cart/items", dto);
}
export function updateCartItem(
  id: string,
  dto: UpdateCartItem,
): Promise<CartDto> {
  return api.patch(`/cart/items/${id}`, dto);
}
export function removeCartItem(id: string): Promise<CartDto> {
  return api.del(`/cart/items/${id}`);
}
export function clearCart(): Promise<void> {
  return api.del("/cart");
}

// ——— Заказы ———

export function checkoutCart(dto: Checkout): Promise<OrderDto> {
  return api.post("/orders/checkout", dto);
}
export function getMyOrders(): Promise<OrderDto[]> {
  return api.get("/orders");
}
export function getOrder(id: string): Promise<OrderDto> {
  return api.get(`/orders/${id}`);
}
export function cancelOrder(id: string): Promise<OrderDto> {
  return api.post(`/orders/${id}/cancel`);
}

// ——— Избранное ———

export function getFavoriteIds(): Promise<string[]> {
  return api.get("/favorites/ids");
}
export function getFavorites(): Promise<ListingCardDto[]> {
  return api.get("/favorites");
}
export function toggleFavorite(
  listingId: string,
): Promise<{ inFavorites: boolean }> {
  return api.post(`/favorites/${listingId}/toggle`);
}

// ——— Отзывы ———

export function getReviews(listingId: string): Promise<ReviewDto[]> {
  return api.get(`/listings/${listingId}/reviews`);
}
export function getReviewsSummary(
  listingId: string,
): Promise<ReviewsSummary> {
  return api.get(`/listings/${listingId}/reviews/summary`);
}
export function createReview(
  listingId: string,
  dto: Omit<CreateReview, "listingId">,
): Promise<ReviewDto> {
  return api.post(`/listings/${listingId}/reviews`, dto);
}

// ——— Посредники (публичные) ———

export function getMediatorList(): Promise<MediatorPublicDto[]> {
  return api.get("/mediator/list");
}
export function getMediatorProfile(
  id: string,
): Promise<MediatorProfilePublicDto> {
  return api.get(`/mediator/profile/${id}`);
}

// ——— Заявки (Order Requests) ———

export function createOrderRequest(
  mediatorId: string,
): Promise<OrderRequestDto> {
  return api.post("/order-requests/from-cart", { mediatorId });
}
export function getOrderRequests(): Promise<OrderRequestDto[]> {
  return api.get("/order-requests");
}
export function getOrderRequest(id: string): Promise<OrderRequestDto> {
  return api.get(`/order-requests/${id}`);
}
export function cancelOrderRequest(id: string): Promise<OrderRequestDto> {
  return api.post(`/order-requests/${id}/cancel`);
}
export function getOrderRequestChatMessages(chatId: string): Promise<any[]> {
  return api.get(`/order-requests/chats/${chatId}/messages`);
}
export function sendOrderRequestChatMessage(chatId: string, text: string): Promise<any> {
  return api.post(`/order-requests/chats/${chatId}/messages`, { text });
}
export function updateOrderRequestItemStatus(requestId: string, itemId: string, status: string): Promise<any> {
  return api.patch(`/order-requests/${requestId}/items/${itemId}/status`, { status });
}

// ——— Заказы через посредника (Блок 5) ———

export function createMediatorOrder(dto: {
  recipientFirstName?: string;
  recipientLastName?: string;
  recipientMiddleName?: string;
  recipientPhone?: string;
  deliveryMethod?: string;
  deliveryAddress?: string;
  desiredPurchaseDate?: string;
  commentToMediator?: string;
}): Promise<any> {
  return api.post("/mediator-orders", dto);
}

export function getMyMediatorOrders(): Promise<any[]> {
  return api.get("/mediator-orders/my");
}

export function getMediatorOrder(id: string): Promise<any> {
  return api.get(`/mediator-orders/${id}`);
}

export function getRecommendedMediators(orderId: string): Promise<any[]> {
  return api.get(`/mediator-orders/${orderId}/recommended-mediators`);
}

export function selectExecutor(orderId: string, mediatorId: string): Promise<any> {
  return api.post(`/mediator-orders/${orderId}/select-executor`, { mediatorId });
}

export function completeMediatorOrder(orderId: string): Promise<any> {
  return api.post(`/mediator-orders/${orderId}/complete`);
}

export function cancelMediatorOrder(orderId: string, reason?: string): Promise<any> {
  return api.post(`/mediator-orders/${orderId}/cancel`, { reason });
}

export function respondToPriceChange(orderId: string, itemId: string, accept: boolean): Promise<any> {
  return api.post(`/mediator-orders/${orderId}/items/${itemId}/respond-price-change`, { accept });
}

export function respondToReplacement(orderId: string, itemId: string, accept: boolean): Promise<any> {
  return api.post(`/mediator-orders/${orderId}/items/${itemId}/respond-replacement`, { accept });
}

export function getOrderChats(orderId: string): Promise<any[]> {
  return api.get(`/mediator-orders/${orderId}/chats`);
}

export function getChatMessages(chatId: string): Promise<any[]> {
  return api.get(`/mediator-orders/chats/${chatId}/messages`);
}

export function sendChatMessage(chatId: string, content: string, attachments?: string[]): Promise<any> {
  return api.post(`/mediator-orders/chats/${chatId}/messages`, { content, attachments });
}

// ——— Посредник: доступные заказы ———

export function getAvailableMediatorOrders(): Promise<any> {
  return api.get("/mediator-orders/mediator/available");
}

export function respondToMediatorOrder(orderId: string): Promise<any> {
  return api.post(`/mediator-orders/${orderId}/respond`);
}

export function startPurchasing(orderId: string): Promise<any> {
  return api.post(`/mediator-orders/${orderId}/start-purchasing`);
}

export function startDelivering(orderId: string): Promise<any> {
  return api.post(`/mediator-orders/${orderId}/start-delivering`);
}

export function proposeItemPriceChange(orderId: string, itemId: string, newPrice: number, comment?: string): Promise<any> {
  return api.post(`/mediator-orders/${orderId}/items/${itemId}/price-change`, { newPrice, comment });
}

export function proposeItemReplacement(orderId: string, itemId: string, data: { photoUrl: string; price: number; description: string }): Promise<any> {
  return api.post(`/mediator-orders/${orderId}/items/${itemId}/replacement`, data);
}

export function markItemBought(orderId: string, itemId: string): Promise<any> {
  return api.post(`/mediator-orders/${orderId}/items/${itemId}/mark-bought`);
}

export function markItemNotAvailable(orderId: string, itemId: string): Promise<any> {
  return api.post(`/mediator-orders/${orderId}/items/${itemId}/mark-not-available`);
}

export function setAnalogueItem(requestId: string, itemId: string, listingId: string): Promise<any> {
  return api.post(`/order-requests/${requestId}/items/${itemId}/set-analogue`, { listingId });
}
