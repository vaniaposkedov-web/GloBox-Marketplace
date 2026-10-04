"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Heart } from "lucide-react";
import { getFavoriteIds, toggleFavorite } from "../api";
import { useSession } from "@/shared/auth";
import { ApiError } from "@/shared/api/client";

interface Props {
  listingId: string;
  variant?: "icon" | "button";
}

export function FavoriteButton({ listingId, variant = "button" }: Props) {
  const router = useRouter();
  const { user, hydrated } = useSession();
  const [isFav, setIsFav] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!hydrated || !user) return;
    getFavoriteIds()
      .then((ids) => setIsFav(ids.includes(listingId)))
      .catch(() => undefined);
  }, [listingId, user, hydrated]);

  async function handleClick() {
    if (!user) {
      router.push(`/login?next=/listings/${listingId}`);
      return;
    }
    setLoading(true);
    try {
      const res = await toggleFavorite(listingId);
      setIsFav(res.inFavorites);
    } catch (err) {
      if (err instanceof ApiError) {
        // noop
      }
    } finally {
      setLoading(false);
    }
  }

  if (variant === "icon") {
    return (
      <button
        type="button"
        onClick={handleClick}
        disabled={loading}
        aria-label={isFav ? "Убрать из избранного" : "В избранное"}
        className={`w-9 h-9 rounded-full border border-border bg-background/80 backdrop-blur flex items-center justify-center transition ${
          isFav
            ? "text-danger border-danger/40"
            : "text-muted hover:text-foreground"
        } disabled:opacity-50`}
      >
        <Heart
          className="w-4 h-4"
          fill={isFav ? "currentColor" : "none"}
        />
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={loading}
      className={`w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border text-sm shadow-sm transition-all duration-200 ${
        isFav
          ? "border-danger text-danger hover:bg-danger/5"
          : "border-gray-200 text-gray-500 hover:text-fuchsia-600 hover:border-fuchsia-200 hover:bg-fuchsia-50"
      } disabled:opacity-50`}
    >
      <Heart className="w-4 h-4" fill={isFav ? "currentColor" : "none"} />
      {isFav ? "В избранном" : "В избранное"}
    </button>
  );
}
