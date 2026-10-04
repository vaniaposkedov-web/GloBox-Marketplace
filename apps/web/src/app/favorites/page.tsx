"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Heart, Sparkles, ArrowLeft, Grid2x2, List } from "lucide-react";
import { SiteHeader } from "@/widgets/header";
import { getFavorites } from "@/features/commerce";
import { ListingCard } from "@/features/catalog";
import { useSession } from "@/shared/auth";
import type { ListingCardDto } from "@/shared/lib";

export default function FavoritesPage() {
  const router = useRouter();
  const { user, hydrated } = useSession();
  const [listings, setListings] = useState<ListingCardDto[] | null>(null);

  useEffect(() => {
    if (!hydrated) return;
    if (!user) {
      router.replace("/login?next=/favorites");
      return;
    }
    getFavorites()
      .then(setListings)
      .catch(() => setListings([]));
  }, [hydrated, user, router]);

  if (!hydrated || !user) {
    return (
      <div className="min-h-screen flex flex-col">
        <SiteHeader />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col" style={{ background: "linear-gradient(135deg, #fdf4ff 0%, #fff1f2 50%, #fafaf9 100%)" }}>
      <SiteHeader />
      <main className="flex-1 max-w-6xl w-full mx-auto px-4 py-4 sm:py-6">

        {/* Header */}
        <div className="flex items-center gap-3 mb-5 sm:mb-6 fade-in-up">
          <button
            type="button"
            onClick={() => router.push("/profile")}
            className="w-9 h-9 rounded-xl bg-white border border-stone-200 flex items-center justify-center hover:bg-stone-100 transition sm:hidden"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div className="flex-1">
            <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight">Избранное</h1>
            {listings && listings.length > 0 && (
              <p className="text-sm text-muted mt-0.5">
                {listings.length} {pluralize(listings.length, "товар", "товара", "товаров")}
              </p>
            )}
          </div>
        </div>

        {/* Loading skeleton */}
        {!listings && (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4 fade-in-up">
            {[0, 1, 2, 3].map((i) => (
              <div
                key={i}
                className="rounded-2xl border border-stone-200 bg-white overflow-hidden animate-pulse"
              >
                <div className="aspect-[4/3] bg-stone-100" />
                <div className="p-3 space-y-2">
                  <div className="h-4 w-3/4 bg-stone-100 rounded" />
                  <div className="h-5 w-1/2 bg-stone-100 rounded" />
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Empty state */}
        {listings && listings.length === 0 && (
          <div className="text-center py-20 fade-in-up">
            <div className="w-20 h-20 mx-auto rounded-3xl bg-gradient-to-br from-fuchsia-100 to-rose-50 flex items-center justify-center mb-5 shadow-lg shadow-fuchsia-200/30">
              <Heart className="w-10 h-10 text-fuchsia-400" />
            </div>
            <h2 className="text-xl font-bold text-foreground">В избранном пусто</h2>
            <p className="text-sm text-muted mt-2 max-w-xs mx-auto">
              Нажмите на сердечко у товара, чтобы добавить его сюда
            </p>
            <Link
              href="/listings"
              className="inline-flex items-center gap-1.5 mt-5 px-5 py-2.5 rounded-xl bg-gradient-to-r from-fuchsia-500 to-rose-500 text-white text-sm font-semibold shadow-md shadow-fuchsia-500/20 hover:shadow-lg hover:-translate-y-0.5 transition-all"
            >
              <Sparkles className="w-4 h-4" />
              Перейти в каталог
            </Link>
          </div>
        )}

        {/* Grid */}
        {listings && listings.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4 fade-in-up" style={{ animationDelay: "0.05s" }}>
            {listings.map((l, idx) => (
              <div
                key={l.id}
                className="fade-in-up"
                style={{ animationDelay: `${idx * 0.04}s` }}
              >
                <ListingCard listing={l} />
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

function pluralize(n: number, one: string, few: string, many: string): string {
  const abs = Math.abs(n) % 100;
  const lastDigit = abs % 10;
  if (abs > 10 && abs < 20) return many;
  if (lastDigit > 1 && lastDigit < 5) return few;
  if (lastDigit === 1) return one;
  return many;
}
