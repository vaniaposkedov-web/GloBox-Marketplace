import { api } from "@/shared/api/client";
import {
  mockCategories,
  mockListings,
  mockListingsPage,
  type CategoryDto,
  type CreateListing,
  type ListingDetailDto,
  type ListingsPage,
  type UpdateListing,
} from "@/shared/lib";

export interface ListingsQuery {
  categoryId?: string;
  q?: string;
  sellerId?: string;
  page?: number;
  limit?: number;
}

function qs(params: Record<string, string | number | undefined>): string {
  const entries = Object.entries(params).filter(
    ([, v]) => v !== undefined && v !== "",
  );
  if (entries.length === 0) return "";
  const sp = new URLSearchParams();
  for (const [k, v] of entries) sp.append(k, String(v));
  return "?" + sp.toString();
}

export async function fetchCategories(): Promise<CategoryDto[]> {
  try {
    const data = await api.get<CategoryDto[]>("/categories");
    if (Array.isArray(data) && data.length > 0) return data;
    return mockCategories;
  } catch {
    return mockCategories;
  }
}

export async function fetchListings(
  query: ListingsQuery = {},
): Promise<ListingsPage> {
  try {
    const data = await api.get<ListingsPage>(
      `/listings${qs(query as Record<string, string | number | undefined>)}`,
    );
    if (data && data.items && data.items.length > 0) return data;
    return mockListingsPage(query);
  } catch {
    return mockListingsPage(query);
  }
}

export async function fetchMockListing(
  id: string,
): Promise<ListingDetailDto | null> {
  const item = mockListings.find((l) => l.id === id);
  if (!item) return null;
  return {
    ...item,
    description:
      "Это демо-товар. Подробное описание будет доступно после подключения реального каталога.",
    images: [],
    viewCount: Math.floor(Math.random() * 3000) + 100,
    seller: {
      id: "mock-seller",
      firstName: "Демо",
      lastName: "Продавец",
      createdAt: new Date().toISOString(),
    },
  };
}

export function fetchMyListings(): Promise<
  import("@/shared/lib").ListingCardDto[]
> {
  return api.get("/listings/me/all");
}

export async function fetchListing(id: string): Promise<ListingDetailDto> {
  try {
    return await api.get<ListingDetailDto>(`/listings/${id}`);
  } catch {
    const mock = await fetchMockListing(id);
    if (mock) return mock;
    throw new Error("Товар не найден");
  }
}

export function createListing(dto: CreateListing): Promise<ListingDetailDto> {
  return api.post("/listings", dto);
}

export function updateListing(
  id: string,
  dto: UpdateListing,
): Promise<ListingDetailDto> {
  return api.patch(`/listings/${id}`, dto);
}

export function deleteListing(id: string): Promise<void> {
  return api.del(`/listings/${id}`);
}
