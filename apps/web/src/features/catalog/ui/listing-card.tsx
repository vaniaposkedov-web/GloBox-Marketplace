"use client";

import { useState } from "react";
import Link from "next/link";
import { Tag } from "antd";
import { StarFilled } from "@ant-design/icons";
import { Loader2 } from "lucide-react";
import { formatPrice, type ListingCardDto } from "@/shared/lib";
import { FavoriteButton } from "@/features/commerce";

interface ExtendedListing extends ListingCardDto {
  oldPrice?: number;
  rating?: number;
  reviewsCount?: number;
  badge?: "new" | "hot" | "sale" | "best";
  gradient?: string;
  emoji?: string;
}

interface Props {
  listing: ExtendedListing;
  onAttach?: (listingId: string) => Promise<void>;
}

const BADGE_MAP: Record<
  NonNullable<ExtendedListing["badge"]>,
  { label: string; color: string }
> = {
  new: { label: "NEW", color: "#22c55e" },
  hot: { label: "HOT", color: "#ef4444" },
  sale: { label: "SALE", color: "#d97706" },
  best: { label: "TOP", color: "#a855f7" },
};

export function ListingCard({ listing, onAttach }: Props) {
  const [attaching, setAttaching] = useState(false);

  const discount =
    listing.oldPrice && listing.oldPrice > listing.price
      ? Math.round(100 - (listing.price / listing.oldPrice) * 100)
      : null;

  const badge = listing.badge ? BADGE_MAP[listing.badge] : null;

  async function handleAttach(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (attaching || !onAttach) return;
    setAttaching(true);
    try {
      await onAttach(listing.id);
    } catch {
      setAttaching(false);
    }
  }

  return (
    <div className="group relative flex flex-col rounded-2xl border border-border bg-white overflow-hidden hover:border-fuchsia-400 hover:shadow-xl hover:shadow-fuchsia-500/15 transition-all duration-300">
      <div className="absolute top-2.5 left-2.5 z-10 flex flex-col gap-1">
        {discount && (
          <span className="inline-flex items-center justify-center rounded-full bg-rose-500 text-white text-[11px] font-bold px-2.5 py-1 shadow-md shadow-rose-500/30">
            -{discount}%
          </span>
        )}
        {badge && (
          <span
            className="inline-flex items-center justify-center rounded-full text-white text-[10px] font-bold px-2 py-1 shadow"
            style={{ backgroundColor: badge.color }}
          >
            {badge.label}
          </span>
        )}
      </div>

      <div className="absolute top-2.5 right-2.5 z-10">
        <FavoriteButton listingId={listing.id} variant="icon" />
      </div>

      <Link
        href={`/listings/${listing.id}`}
        className="flex flex-col flex-1"
      >
        <div
          className={`aspect-square overflow-hidden relative bg-gradient-to-br ${
            listing.gradient ?? "from-amber-100 via-orange-100 to-rose-100"
          }`}
        >
          {listing.imageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={listing.imageUrl}
              alt={listing.title}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-7xl sm:text-8xl group-hover:scale-110 transition-transform duration-500 select-none">
              {listing.emoji ?? "🛍"}
            </div>
          )}
        </div>

        <div className="p-3 sm:p-3.5 flex flex-col flex-1 gap-1.5">
          <div className="flex items-baseline gap-2">
            <span className="font-extrabold text-lg sm:text-xl tracking-tight text-foreground leading-none">
              {formatPrice(listing.price, listing.currency)}
            </span>
            {listing.oldPrice && (
              <span className="text-xs text-muted line-through leading-none">
                {formatPrice(listing.oldPrice, listing.currency)}
              </span>
            )}
          </div>

          <div className="text-[13px] sm:text-sm line-clamp-2 min-h-[2.4rem] leading-snug text-foreground/90">
            {listing.title}
          </div>

          <div className="flex items-center gap-2 text-xs">
            {listing.rating ? (
              <span className="inline-flex items-center gap-1 font-medium text-foreground">
                <StarFilled style={{ color: "#f59e0b", fontSize: 12 }} />
                {listing.rating.toFixed(1)}
                {listing.reviewsCount ? (
                  <span className="text-muted">· {listing.reviewsCount}</span>
                ) : null}
              </span>
            ) : null}
          </div>

          <div className="flex items-center justify-between text-xs text-muted pt-1 mt-auto">
            <Tag
              color="purple"
              className="!m-0 !rounded-full !border-0 !bg-fuchsia-50 !text-fuchsia-700"
            >
              {listing.category.name}
            </Tag>
            {listing.city && <span className="truncate">{listing.city}</span>}
          </div>
        </div>
      </Link>

      {onAttach && (
        <button
          type="button"
          onClick={handleAttach}
          disabled={attaching}
          className="mx-3 mb-3 flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-bold text-white bg-amber-500 hover:bg-amber-600 active:scale-95 transition-all disabled:opacity-60"
        >
          {attaching
            ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
            : <><span>📦</span><span>Прикрепить как аналог</span></>
          }
        </button>
      )}
    </div>
  );
}
