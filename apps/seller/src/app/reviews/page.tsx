"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Star, MessageSquare } from "lucide-react";
import { api } from "@/lib/api";
import { getToken } from "@/lib/auth";
import { BottomNav } from "@/components/BottomNav";

interface Review {
  id: string;
  rating: number;
  comment: string;
  author: string;
  createdAt: string;
}

export default function ReviewsPage() {
  const router = useRouter();
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!getToken()) { router.replace("/login"); return; }
    api.get<Review[]>("/supplier/my-reviews")
      .then((r) => setReviews(Array.isArray(r) ? r : []))
      .catch(() => setReviews([]))
      .finally(() => setLoading(false));
  }, [router]);

  const avgRating = reviews.length
    ? (reviews.reduce((s, r) => s + r.rating, 0) / reviews.length).toFixed(1)
    : null;

  return (
    <div className="min-h-screen bg-background">

      {/* Header */}
      <div
        className="sticky top-0 z-40 px-4 py-3"
        style={{ background: "rgba(255,255,255,0.92)", backdropFilter: "blur(16px)", borderBottom: "1px solid var(--border)" }}
      >
        <div className="max-w-lg mx-auto flex items-center gap-3">
          <button
            onClick={() => router.back()}
            className="w-9 h-9 rounded-xl flex items-center justify-center hover:bg-accent transition"
          >
            <ArrowLeft className="w-5 h-5 text-foreground" />
          </button>
          <h1 className="text-lg font-bold text-foreground">Отзывы</h1>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 pt-4 pb-24 space-y-4">

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-8 h-8 rounded-full border-4 border-primary border-t-transparent animate-spin" />
          </div>
        ) : reviews.length === 0 ? (
          <>
            {/* Summary stub */}
            <div className="bg-card rounded-2xl border border-border p-5 text-center">
              <div className="flex items-center justify-center gap-1 mb-1">
                {[1, 2, 3, 4, 5].map((s) => (
                  <Star key={s} className="w-5 h-5 text-yellow-400" fill="currentColor" />
                ))}
              </div>
              <p className="text-3xl font-black text-foreground">4.8 <span className="text-muted text-lg font-normal">/ 5</span></p>
              <p className="text-xs text-muted mt-1">Рейтинг появится после первых отзывов</p>
            </div>

            {/* Empty state */}
            <div className="text-center py-10">
              <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-card border border-border flex items-center justify-center">
                <MessageSquare className="w-8 h-8 text-muted" strokeWidth={1.5} />
              </div>
              <p className="font-semibold text-foreground mb-1">Пока нет отзывов</p>
              <p className="text-sm text-muted">Отзывы покупателей появятся здесь после первых заказов</p>
            </div>
          </>
        ) : (
          <>
            {/* Summary */}
            <div className="bg-card rounded-2xl border border-border p-5 text-center">
              <div className="flex items-center justify-center gap-1 mb-1">
                {[1, 2, 3, 4, 5].map((s) => (
                  <Star
                    key={s}
                    className="w-5 h-5"
                    style={{ color: "#facc15" }}
                    fill={s <= Math.round(Number(avgRating)) ? "#facc15" : "none"}
                  />
                ))}
              </div>
              <p className="text-3xl font-black text-foreground">{avgRating} <span className="text-muted text-lg font-normal">/ 5</span></p>
              <p className="text-xs text-muted mt-1">{reviews.length} отзыв{reviews.length === 1 ? "" : reviews.length < 5 ? "а" : "ов"}</p>
            </div>

            {/* Review list */}
            <div className="space-y-3">
              {reviews.map((rev) => (
                <div key={rev.id} className="bg-card rounded-2xl border border-border p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-semibold text-foreground">{rev.author}</span>
                    <div className="flex items-center gap-0.5">
                      {[1, 2, 3, 4, 5].map((s) => (
                        <Star
                          key={s}
                          className="w-3.5 h-3.5"
                          style={{ color: "#facc15" }}
                          fill={s <= rev.rating ? "#facc15" : "none"}
                        />
                      ))}
                    </div>
                  </div>
                  {rev.comment && <p className="text-sm text-muted">{rev.comment}</p>}
                  <p className="text-[11px] text-muted mt-2">
                    {new Date(rev.createdAt).toLocaleDateString("ru-RU", { day: "numeric", month: "long", year: "numeric" })}
                  </p>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      <BottomNav />
    </div>
  );
}
