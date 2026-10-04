import { api } from "@/shared/api/client";
import type { AuthUser } from "@/shared/auth";
import type { UpdateProfile } from "@/shared/lib";

export type MeDto = AuthUser & {
  phone: string | null;
  emailVerified: boolean;
  phoneVerified: boolean;
  createdAt: string;
  lastLoginAt: string | null;
  marketplace?: {
    cartCount: number;
    favoritesCount: number;
    ordersCount: number;
    listingsCount: number;
  };
  supplierProfile?: {
    status: string;
    submittedAt: string;
    decidedAt: string | null;
    reviewerNote: string | null;
  } | null;
  mediatorProfile?: {
    status: string;
    submittedAt: string;
    decidedAt: string | null;
    reviewerNote: string | null;
    commissionRate: string;
    minOrderAmount: number;
  } | null;
};

/** Возвращает полный профиль пользователя по текущему JWT. */
export function fetchMe(): Promise<MeDto> {
  return api.get("/auth/me");
}

export function updateMe(dto: UpdateProfile): Promise<MeDto> {
  return api.patch("/auth/me", dto);
}
