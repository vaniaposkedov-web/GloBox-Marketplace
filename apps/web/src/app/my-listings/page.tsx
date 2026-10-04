"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Pencil, Trash2, Plus } from "lucide-react";
import { SiteHeader } from "@/widgets/header";
import { deleteListing, fetchMyListings } from "@/features/catalog";
import { canSell, useSession } from "@/shared/auth";
import {
  formatPrice,
  type ListingCardDto,
  type ListingStatus,
} from "@/shared/lib";
import { ApiError } from "@/shared/api/client";

const STATUS_LABEL: Record<ListingStatus, string> = {
  DRAFT: "Черновик",
  PUBLISHED: "Опубликовано",
  SOLD: "Продано",
  ARCHIVED: "В архиве",
};

const STATUS_CLASS: Record<ListingStatus, string> = {
  DRAFT: "bg-border text-muted",
  PUBLISHED: "bg-success/15 text-success",
  SOLD: "bg-amber-100 text-amber-800",
  ARCHIVED: "bg-border text-muted",
};

export default function MyListingsPage() {
  const router = useRouter();
  const { user, hydrated } = useSession();
  const [listings, setListings] = useState<ListingCardDto[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  useEffect(() => {
    if (!hydrated) return;
    if (!user) {
      router.replace("/login?next=/my-listings");
      return;
    }
    if (!canSell(user.role)) {
      router.replace("/profile");
      return;
    }
    fetchMyListings()
      .then(setListings)
      .catch((err: ApiError) => setError(err.message));
  }, [hydrated, user, router]);

  async function handleDelete(id: string) {
    if (!confirm("Удалить товар безвозвратно?")) return;
    setBusyId(id);
    try {
      await deleteListing(id);
      setListings((prev) => prev?.filter((l) => l.id !== id) ?? null);
    } catch (err) {
      if (err instanceof ApiError) setError(err.payload.message);
    } finally {
      setBusyId(null);
    }
  }

  if (!hydrated || !user) {
    return (
      <div className="min-h-screen flex flex-col">
        <SiteHeader />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      <SiteHeader />
      <main className="flex-1 max-w-5xl w-full mx-auto px-4 py-6">
        <div className="flex items-center justify-between gap-4 mb-6">
          <h1 className="text-2xl font-bold">Мои товары</h1>
          <Link
            href="/new-listing"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-white text-sm font-medium hover:bg-primary-hover transition"
          >
            <Plus className="w-4 h-4" />
            Добавить
          </Link>
        </div>

        {error && <p className="text-danger text-sm mb-4">{error}</p>}

        {!listings && !error && (
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => (
              <div
                key={i}
                className="h-24 rounded-xl bg-border/40 animate-pulse"
              />
            ))}
          </div>
        )}

        {listings && listings.length === 0 && (
          <div className="text-center py-16 space-y-3 text-muted">
            <div className="text-5xl">📦</div>
            <p>Вы ещё не размещали товары</p>
            <Link
              href="/new-listing"
              className="inline-block text-primary hover:underline"
            >
              Разместить первое объявление
            </Link>
          </div>
        )}

        {listings && listings.length > 0 && (
          <div className="space-y-3">
            {listings.map((l) => (
              <div
                key={l.id}
                className="flex gap-3 rounded-xl border border-border p-3 hover:border-primary/30 transition"
              >
                <Link
                  href={`/listings/${l.id}`}
                  className="w-20 h-20 shrink-0 rounded-lg bg-border/30 overflow-hidden"
                >
                  {l.imageUrl && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={l.imageUrl}
                      alt={l.title}
                      className="w-full h-full object-cover"
                    />
                  )}
                </Link>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start gap-2 flex-wrap">
                    <Link
                      href={`/listings/${l.id}`}
                      className="font-medium hover:text-primary line-clamp-2"
                    >
                      {l.title}
                    </Link>
                    <span
                      className={`text-xs px-2 py-0.5 rounded font-medium ${STATUS_CLASS[l.status]}`}
                    >
                      {STATUS_LABEL[l.status]}
                    </span>
                  </div>
                  <div className="mt-1 text-sm text-muted flex items-center gap-3 flex-wrap">
                    <span className="font-semibold text-foreground">
                      {formatPrice(l.price, l.currency)}
                    </span>
                    <span>· {l.category.name}</span>
                    {l.city && <span>· {l.city}</span>}
                    <span>· Остаток: {l.stock}</span>
                  </div>
                </div>
                <div className="flex flex-col gap-2 shrink-0">
                  <Link
                    href={`/listings/${l.id}/edit`}
                    className="inline-flex items-center gap-1 px-3 py-1.5 text-sm rounded-md border border-border hover:bg-black/5"
                  >
                    <Pencil className="w-3.5 h-3.5" />
                    Изменить
                  </Link>
                  <button
                    type="button"
                    onClick={() => handleDelete(l.id)}
                    disabled={busyId === l.id}
                    className="inline-flex items-center gap-1 px-3 py-1.5 text-sm rounded-md border border-danger/30 text-danger hover:bg-danger/5 disabled:opacity-50"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    Удалить
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
