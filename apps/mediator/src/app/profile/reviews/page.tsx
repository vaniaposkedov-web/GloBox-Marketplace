"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Star, MessageSquare, TrendingUp, Sparkles } from "lucide-react";
import { api } from "@/lib/api";
import { getToken } from "@/lib/auth";

interface Review {
  id: string;
  buyerName: string;
  buyerAvatarUrl?: string | null;
  rating: number;
  text: string;
  createdAt: string;
}

interface ReviewsResponse {
  reviews: Review[];
  avgRating: number | null;
  total: number;
}

// ── Animated number ───────────────────────────────────────────────────────────

function useCountUp(target: number, duration = 900, decimals = 1) {
  const [value, setValue] = useState(0);
  const rafRef = useRef<number>(0);

  useEffect(() => {
    const start = performance.now();
    const animate = (now: number) => {
      const progress = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setValue(parseFloat((eased * target).toFixed(decimals)));
      if (progress < 1) rafRef.current = requestAnimationFrame(animate);
    };
    rafRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(rafRef.current);
  }, [target, duration, decimals]);

  return value;
}

// ── Animated star fill ────────────────────────────────────────────────────────

function AnimatedStars({ rating, size = "w-7 h-7", delay = 0 }: { rating: number; size?: string; delay?: number }) {
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setVisible(true), delay);
    return () => clearTimeout(t);
  }, [delay]);

  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map((s, i) => (
        <Star
          key={s}
          className={`${size} transition-all duration-500 ${
            visible && s <= Math.round(rating)
              ? "fill-warning text-warning scale-110"
              : "text-border"
          }`}
          style={{ transitionDelay: visible ? `${i * 80}ms` : "0ms" }}
        />
      ))}
    </div>
  );
}

// ── Animated bar ──────────────────────────────────────────────────────────────

function AnimatedBar({ pct, delay }: { pct: number; delay: number }) {
  const [width, setWidth] = useState(0);
  useEffect(() => {
    const t = setTimeout(() => setWidth(pct), delay + 200);
    return () => clearTimeout(t);
  }, [pct, delay]);

  return (
    <div className="flex-1 bg-accent rounded-full h-2 overflow-hidden">
      <div
        className="h-full bg-warning rounded-full transition-all duration-700 ease-out"
        style={{ width: `${width}%` }}
      />
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function ReviewsPage() {
  const router = useRouter();
  const [data, setData] = useState<ReviewsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [statsVisible, setStatsVisible] = useState(false);

  useEffect(() => {
    if (!getToken()) { router.replace("/login"); return; }
    api
      .get<ReviewsResponse>("/mediator/my-reviews")
      .then((d) => {
        setData(d);
        setTimeout(() => setStatsVisible(true), 100);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [router]);

  const reviews  = data?.reviews ?? [];
  const total    = data?.total ?? 0;
  const avgRaw   = data?.avgRating ?? 5.0;
  const avg      = total > 0 ? avgRaw : 5.0;
  const animAvg  = useCountUp(statsVisible ? avg : 0, 900, 1);

  const dist = [5, 4, 3, 2, 1].map((star) => ({
    star,
    count: reviews.filter((r) => r.rating === star).length,
    pct: total > 0 ? Math.round((reviews.filter((r) => r.rating === star).length / total) * 100) : 0,
  }));

  return (
    <div className="min-h-screen bg-background pb-24">

      {/* Header */}
      <div className="sticky top-0 z-40 bg-card/95 backdrop-blur-lg border-b border-border px-4 h-14 flex items-center gap-3">
        <button onClick={() => router.back()} className="p-1.5 rounded-lg hover:bg-accent transition">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="text-lg font-bold flex-1">Отзывы</h1>
        {total > 0 && (
          <span className="text-xs font-bold bg-primary/10 text-primary px-2.5 py-1 rounded-full">
            {total}
          </span>
        )}
      </div>

      {loading ? (
        <LoadingSkeleton />
      ) : (
        <div className="px-4 pt-5 max-w-lg mx-auto space-y-5">

          {/* ── Central rating block ── */}
          <div className={`bg-card rounded-3xl border border-border overflow-hidden transition-all duration-500 ${statsVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"}`}>

            {/* Top gradient accent */}
            <div className="h-1.5 bg-linear-to-r from-warning/60 via-warning to-orange-400" />

            <div className="p-6">
              {total === 0 ? (
                /* Empty state — still show perfect score */
                <div className="text-center space-y-4">
                  <div className="inline-flex items-center gap-2 bg-warning/10 text-warning text-xs font-semibold px-3 py-1.5 rounded-full mb-1">
                    <Sparkles className="w-3.5 h-3.5" /> Начальный рейтинг
                  </div>
                  <div>
                    <p className="text-7xl font-black text-foreground leading-none">{animAvg.toFixed(1)}</p>
                    <div className="flex justify-center mt-3">
                      <AnimatedStars rating={5} delay={300} />
                    </div>
                  </div>
                  <p className="text-sm text-muted max-w-xs mx-auto">
                    Отзывы оставляют покупатели после выполнения заказа через <span className="font-medium text-foreground">glo-box.ru</span>.
                    Первые отзывы поднимут вас в рейтинге.
                  </p>
                </div>
              ) : (
                /* Has reviews */
                <div className="flex items-center gap-6">

                  {/* Big score */}
                  <div className="text-center shrink-0">
                    <p className="text-6xl font-black leading-none tabular-nums">{animAvg.toFixed(1)}</p>
                    <div className="mt-2">
                      <AnimatedStars rating={avg} size="w-4 h-4" delay={400} />
                    </div>
                    <p className="text-[11px] text-muted mt-2 font-medium">
                      {total} {pluralizeReview(total)}
                    </p>
                  </div>

                  {/* Distribution bars */}
                  <div className="flex-1 space-y-2">
                    {dist.map(({ star, count, pct }, i) => (
                      <div key={star} className="flex items-center gap-2">
                        <span className="text-[11px] text-muted w-2.5 shrink-0 font-medium">{star}</span>
                        <Star className="w-3 h-3 text-warning fill-warning shrink-0" />
                        <AnimatedBar pct={pct} delay={i * 80} />
                        <span className="text-[11px] text-muted w-5 text-right shrink-0 font-medium">{count}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Trend badge if high rating */}
            {total > 0 && avg >= 4.5 && (
              <div className="mx-6 mb-5 flex items-center gap-2 bg-success/8 border border-success/20 rounded-xl px-4 py-2.5">
                <TrendingUp className="w-4 h-4 text-success shrink-0" />
                <p className="text-xs text-success font-medium">
                  Отличный рейтинг! Покупатели охотнее выбирают посредников с оценкой выше 4.5
                </p>
              </div>
            )}
          </div>

          {/* ── Reviews list ── */}
          {reviews.length > 0 ? (
            <div className="space-y-3">
              {reviews.map((r, i) => (
                <ReviewCard key={r.id} review={r} index={i} />
              ))}
            </div>
          ) : (
            <EmptyState />
          )}

        </div>
      )}
    </div>
  );
}

// ── ReviewCard ────────────────────────────────────────────────────────────────

function ReviewCard({ review, index }: { review: Review; index: number }) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 80 + index * 60);
    return () => clearTimeout(t);
  }, [index]);

  const initials = review.buyerName
    .split(" ")
    .map((w) => w[0] ?? "")
    .join("")
    .toUpperCase()
    .slice(0, 2);

  const date = new Date(review.createdAt).toLocaleDateString("ru-RU", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  // Generate a soft bg colour from initials
  const hue = (initials.charCodeAt(0) * 37 + (initials.charCodeAt(1) || 0) * 17) % 360;

  return (
    <div
      className={`bg-card rounded-2xl border border-border p-4 space-y-3 transition-all duration-500 ${
        visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-3"
      }`}
    >
      <div className="flex items-start gap-3">
        {/* Avatar */}
        <div
          className="w-10 h-10 rounded-full overflow-hidden flex items-center justify-center text-sm font-bold shrink-0 text-white"
          style={{ background: `hsl(${hue} 60% 55%)` }}
        >
          {review.buyerAvatarUrl ? (
            <img src={review.buyerAvatarUrl} alt="" className="w-full h-full object-cover" />
          ) : (
            initials
          )}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <p className="text-sm font-semibold truncate">{review.buyerName}</p>
            <p className="text-[11px] text-muted shrink-0">{date}</p>
          </div>
          <div className="flex gap-0.5 mt-0.5">
            {[1, 2, 3, 4, 5].map((s) => (
              <Star
                key={s}
                className={`w-3 h-3 ${s <= review.rating ? "fill-warning text-warning" : "text-border"}`}
              />
            ))}
          </div>
        </div>
      </div>

      {review.text && (
        <p className="text-sm text-foreground leading-relaxed pl-1">{review.text}</p>
      )}
    </div>
  );
}

// ── Empty state ───────────────────────────────────────────────────────────────

function EmptyState() {
  return (
    <div className="text-center py-6 space-y-3 animate-[fadeIn_0.4s_ease-out]">
      <div className="w-16 h-16 rounded-full bg-accent flex items-center justify-center mx-auto">
        <MessageSquare className="w-7 h-7 text-muted" />
      </div>
      <div>
        <p className="font-semibold text-sm">Отзывов пока нет</p>
        <p className="text-xs text-muted mt-1.5 max-w-xs mx-auto leading-relaxed">
          Первые отзывы появятся после выполнения заказов. Покупатели оставляют их через{" "}
          <span className="font-medium text-foreground">glo-box.ru</span>.
        </p>
      </div>
    </div>
  );
}

// ── Skeleton ──────────────────────────────────────────────────────────────────

function LoadingSkeleton() {
  return (
    <div className="px-4 pt-5 max-w-lg mx-auto space-y-5 animate-pulse">
      <div className="bg-card rounded-3xl border border-border p-6 space-y-4">
        <div className="flex items-center gap-6">
          <div className="space-y-2 shrink-0">
            <div className="w-20 h-14 bg-accent rounded-xl" />
            <div className="w-24 h-3 bg-accent rounded-full" />
          </div>
          <div className="flex-1 space-y-2.5">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="flex items-center gap-2">
                <div className="w-2.5 h-2 bg-accent rounded" />
                <div className="flex-1 bg-accent rounded-full h-2" />
                <div className="w-4 h-2 bg-accent rounded" />
              </div>
            ))}
          </div>
        </div>
      </div>
      {[1, 2, 3].map((i) => (
        <div key={i} className="bg-card rounded-2xl border border-border p-4 space-y-3">
          <div className="flex gap-3">
            <div className="w-10 h-10 rounded-full bg-accent shrink-0" />
            <div className="flex-1 space-y-2">
              <div className="h-3 bg-accent rounded-full w-32" />
              <div className="h-2.5 bg-accent rounded-full w-20" />
            </div>
          </div>
          <div className="space-y-1.5">
            <div className="h-3 bg-accent rounded-full w-full" />
            <div className="h-3 bg-accent rounded-full w-4/5" />
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function pluralizeReview(n: number) {
  const mod10 = n % 10, mod100 = n % 100;
  if (mod100 >= 11 && mod100 <= 19) return "отзывов";
  if (mod10 === 1) return "отзыв";
  if (mod10 >= 2 && mod10 <= 4) return "отзыва";
  return "отзывов";
}
