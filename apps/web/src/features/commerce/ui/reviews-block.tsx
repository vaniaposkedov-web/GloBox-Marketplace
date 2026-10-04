"use client";

import { useEffect, useState, type FormEvent } from "react";
import { Star } from "lucide-react";
import { createReview, getReviews, getReviewsSummary } from "../api";
import { useSession } from "@/shared/auth";
import { Button } from "@/shared/ui";
import { ApiError } from "@/shared/api/client";
import type { ReviewDto, ReviewsSummary } from "@/shared/lib";

interface Props {
  listingId: string;
  /** Чтобы не дать продавцу оставлять отзыв на свой товар */
  sellerId: string;
}

export function ReviewsBlock({ listingId, sellerId }: Props) {
  const { user } = useSession();
  const [reviews, setReviews] = useState<ReviewDto[] | null>(null);
  const [summary, setSummary] = useState<ReviewsSummary | null>(null);
  const [rating, setRating] = useState(5);
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);

  useEffect(() => {
    void Promise.all([
      getReviews(listingId).then(setReviews),
      getReviewsSummary(listingId).then(setSummary),
    ]).catch(() => undefined);
  }, [listingId]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (text.trim().length < 5) {
      setError("Отзыв должен быть не менее 5 символов");
      return;
    }
    setLoading(true);
    try {
      const created = await createReview(listingId, { rating, text: text.trim() });
      setReviews((prev) => [created, ...(prev ?? [])]);
      setText("");
      setShowForm(false);
      const s = await getReviewsSummary(listingId);
      setSummary(s);
    } catch (err) {
      setError(err instanceof ApiError ? err.payload.message : "Ошибка");
    } finally {
      setLoading(false);
    }
  }

  const userCanReview =
    user && user.id !== sellerId && !reviews?.some((r) => r.author.id === user.id);

  return (
    <section>
      <div className="px-5 py-4 border-b border-gray-50 flex items-center justify-between gap-4"
        style={{ background: "linear-gradient(to right, #f9fafb, #fff)" }}>
        <div className="flex items-center gap-3">
          <h3 className="text-base font-bold text-gray-900">Отзывы</h3>
          {summary && summary.count > 0 && (
            <div className="flex items-center gap-1.5">
              <Stars value={summary.average} />
              <span className="text-sm text-muted">
                {summary.average.toFixed(1)} · {summary.count} отзыв(ов)
              </span>
            </div>
          )}
        </div>
        {userCanReview && !showForm && (
          <button
            type="button"
            onClick={() => setShowForm(true)}
            className="text-sm text-fuchsia-600 hover:text-fuchsia-700 font-medium transition-colors"
          >
            Оставить отзыв
          </button>
        )}
      </div>

      <div className="p-5 space-y-4">

      {showForm && (
        <form
          onSubmit={handleSubmit}
          className="rounded-xl border border-border p-4 space-y-3"
        >
          <div>
            <label className="text-sm font-medium block mb-1">Оценка</label>
            <RatingInput value={rating} onChange={setRating} />
          </div>
          <div>
            <label className="text-sm font-medium block mb-1">Ваш отзыв</label>
            <textarea
              className="w-full border border-border rounded-lg px-3 py-2 bg-transparent focus:outline-none focus:border-primary min-h-[80px]"
              placeholder="Понравилось, не понравилось, что именно?"
              value={text}
              onChange={(e) => setText(e.target.value)}
              required
            />
          </div>
          {error && <p className="text-sm text-danger">{error}</p>}
          <div className="flex gap-2">
            <Button type="submit" loading={loading}>
              Опубликовать
            </Button>
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="px-4 py-2 text-sm text-muted"
            >
              Отмена
            </button>
          </div>
        </form>
      )}

      {!reviews && (
        <div className="h-20 rounded-xl bg-border/40 animate-pulse" />
      )}
      {reviews && reviews.length === 0 && (
        <p className="text-sm text-muted">
          Отзывов пока нет
          {userCanReview && " — станьте первым!"}
        </p>
      )}
      {reviews && reviews.length > 0 && (
        <div className="space-y-3">
          {reviews.map((r) => (
            <div key={r.id} className="rounded-xl border border-border p-4">
              <div className="flex items-center gap-2">
                <Stars value={r.rating} />
                <span className="font-medium text-sm">
                  {r.author.firstName} {r.author.lastName[0]}.
                </span>
                <span className="text-xs text-muted">
                  {new Date(r.createdAt).toLocaleDateString("ru-RU")}
                </span>
              </div>
              <p className="mt-2 text-[15px]">{r.text}</p>
            </div>
          ))}
        </div>
      )}
      </div>
    </section>
  );
}

function Stars({ value }: { value: number }) {
  return (
    <div className="flex">
      {[1, 2, 3, 4, 5].map((n) => (
        <Star
          key={n}
          className={`w-4 h-4 ${
            n <= Math.round(value)
              ? "text-fuchsia-400"
              : "text-border"
          }`}
          fill={n <= Math.round(value) ? "currentColor" : "none"}
        />
      ))}
    </div>
  );
}

function RatingInput({
  value,
  onChange,
}: {
  value: number;
  onChange: (v: number) => void;
}) {
  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          onClick={() => onChange(n)}
          className="p-1"
          aria-label={`${n} звезды`}
        >
          <Star
            className={`w-6 h-6 ${n <= value ? "text-fuchsia-400" : "text-border"}`}
            fill={n <= value ? "currentColor" : "none"}
          />
        </button>
      ))}
    </div>
  );
}
