"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Modal } from "antd";
import {
  Star, Eye, MapPin, ChevronRight, Trash2, Package,
  ShieldCheck, Truck, ArrowLeft, Share2, Heart,
  Minus, Plus, AlertCircle, ChevronLeft, ShoppingCart,
} from "lucide-react";
import { SiteHeader } from "@/widgets/header";
import { fetchListing, deleteListing } from "@/features/catalog";
import { AddToCartModal, FavoriteButton, ReviewsBlock } from "@/features/commerce";
import { useSession } from "@/shared/auth";
import { ApiError } from "@/shared/api/client";
import { formatPrice, type ListingDetailDto } from "@/shared/lib";

interface ExtendedDetail extends ListingDetailDto {
  oldPrice?: number;
  rating?: number;
  reviewsCount?: number;
}

export default function ListingDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const id = params.id;
  const { user } = useSession();

  const [listing, setListing] = useState<ExtendedDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [activeImage, setActiveImage] = useState(0);
  const [deleting, setDeleting] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [cartModalOpen, setCartModalOpen] = useState(false);
  const [qty, setQty] = useState(1);
  const [imgLoaded, setImgLoaded] = useState(false);
  const [pageVisible, setPageVisible] = useState(false);

  useEffect(() => {
    setListing(null); setError(null); setImgLoaded(false); setPageVisible(false);
    fetchListing(id)
      .then((l) => { setListing(l as ExtendedDetail); setActiveImage(0); setTimeout(() => setPageVisible(true), 60); })
      .catch((err: Error) => setError(err.message));
  }, [id]);

  function handleOpenCartModal() {
    if (!user) { router.push(`/login?next=/listings/${id}`); return; }
    setCartModalOpen(true);
  }

  async function handleDelete() {
    setDeleting(true);
    try { await deleteListing(id); router.push("/listings"); }
    catch (err) {
      if (err instanceof ApiError) setError(err.payload?.message ?? "Ошибка");
      setDeleting(false); setConfirmOpen(false);
    }
  }

  const isOwner = listing && user && listing.seller.id === user.id;
  const discount = listing?.oldPrice && listing.oldPrice > listing.price
    ? Math.round(100 - (listing.price / listing.oldPrice) * 100) : null;

  // ── Loading skeleton ──
  if (!listing && !error) {
    return (
      <div className="min-h-screen flex flex-col" style={{ background: "linear-gradient(135deg, #fdf4ff 0%, #fff1f2 50%, #fafaf9 100%)" }}>
        <SiteHeader />
        <main className="flex-1 max-w-6xl mx-auto w-full px-4 py-6">
          <div className="grid lg:grid-cols-[1fr_380px] gap-6">
            <div className="space-y-4">
              <div className="aspect-square rounded-2xl bg-gray-100 animate-pulse" />
              <div className="flex gap-2">
                {[0,1,2,3].map(i => <div key={i} className="w-16 h-16 rounded-xl bg-gray-100 animate-pulse" />)}
              </div>
            </div>
            <div className="space-y-4">
              <div className="bg-white rounded-2xl p-6 space-y-4 shadow-sm border border-gray-100">
                <div className="h-6 bg-gray-100 rounded-lg w-1/3 animate-pulse" />
                <div className="h-8 bg-gray-100 rounded-lg w-full animate-pulse" />
                <div className="h-8 bg-gray-100 rounded-lg w-2/3 animate-pulse" />
                <div className="h-12 bg-gray-100 rounded-xl animate-pulse" />
                <div className="h-12 bg-gray-100 rounded-xl animate-pulse" />
              </div>
            </div>
          </div>
        </main>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex flex-col" style={{ background: "linear-gradient(135deg, #fdf4ff 0%, #fff1f2 50%, #fafaf9 100%)" }}>
        <SiteHeader />
        <main className="flex-1 flex items-center justify-center px-4">
          <div className="text-center max-w-sm">
            <div className="w-16 h-16 rounded-2xl bg-red-50 flex items-center justify-center mx-auto mb-4">
              <AlertCircle className="w-8 h-8 text-red-400" />
            </div>
            <h2 className="font-bold text-lg text-gray-900 mb-2">Товар не найден</h2>
            <p className="text-gray-500 text-sm mb-5">{error}</p>
            <Link href="/listings" className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-white text-sm font-semibold shadow-md"
              style={{ background: "linear-gradient(135deg,#d946ef,#e11d48)" }}>
              ← Вернуться в каталог
            </Link>
          </div>
        </main>
      </div>
    );
  }

  if (!listing) return null;

  return (
    <div className="min-h-screen flex flex-col" style={{ background: "linear-gradient(135deg, #fdf4ff 0%, #fff1f2 50%, #fafaf9 100%)" }}>
      <SiteHeader />

      <main
        className="flex-1 max-w-6xl mx-auto w-full px-3 sm:px-4 py-4 sm:py-6 pb-20 sm:pb-8 transition-all duration-500"
        style={{ opacity: pageVisible ? 1 : 0, transform: pageVisible ? "translateY(0)" : "translateY(16px)" }}
      >
        {/* Breadcrumb */}
        <nav className="flex items-center gap-1 text-xs text-gray-400 mb-4 overflow-x-auto whitespace-nowrap scrollbar-none pb-1">
          <Link href="/" className="hover:text-fuchsia-600 transition-colors">Главная</Link>
          <ChevronRight className="w-3 h-3 shrink-0" />
          <Link href="/listings" className="hover:text-fuchsia-600 transition-colors">Каталог</Link>
          <ChevronRight className="w-3 h-3 shrink-0" />
          <Link href={`/listings?category=${listing.category.id}`} className="hover:text-fuchsia-600 transition-colors">{listing.category.name}</Link>
          <ChevronRight className="w-3 h-3 shrink-0" />
          <span className="text-gray-600 truncate max-w-[180px]">{listing.title}</span>
        </nav>

        <div className="grid lg:grid-cols-[1fr_380px] xl:grid-cols-[1fr_400px] gap-5 lg:gap-6">

          {/* ── Left: Gallery + Description ── */}
          <div className="space-y-4">
            {/* Main image */}
            <div className="relative rounded-2xl overflow-hidden shadow-sm border border-white/80 bg-white group"
              style={{ aspectRatio: "1/1" }}>
              {listing.images[activeImage] ? (
                <img
                  key={listing.images[activeImage]}
                  src={listing.images[activeImage]}
                  alt={listing.title}
                  onLoad={() => setImgLoaded(true)}
                  className="w-full h-full object-cover transition-all duration-500"
                  style={{ transform: imgLoaded ? "scale(1)" : "scale(1.02)" }}
                />
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center text-8xl sm:text-[140px] select-none"
                  style={{ background: "linear-gradient(135deg,#fdf4ff,#fce7f3)" }}>
                  🛍
                </div>
              )}

              {/* Badges */}
              {discount && (
                <span className="absolute top-4 left-4 px-3 py-1.5 rounded-full text-white text-sm font-bold shadow-lg"
                  style={{ background: "linear-gradient(135deg,#ef4444,#dc2626)" }}>
                  -{discount}%
                </span>
              )}
              {listing.stock <= 3 && listing.stock > 0 && (
                <span className="absolute top-4 right-4 px-3 py-1.5 rounded-full text-white text-xs font-bold shadow-lg"
                  style={{ background: "linear-gradient(135deg,#d946ef,#e11d48)" }}>
                  Осталось {listing.stock} шт.
                </span>
              )}

              {/* Image nav arrows (if multiple) */}
              {listing.images.length > 1 && (
                <>
                  <button type="button"
                    onClick={() => { setImgLoaded(false); setActiveImage((i) => (i - 1 + listing.images.length) % listing.images.length); }}
                    className="absolute left-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-white/90 backdrop-blur-sm border border-white flex items-center justify-center shadow-md opacity-0 group-hover:opacity-100 transition-opacity duration-200 hover:bg-white active:scale-95">
                    <ChevronLeft className="w-4 h-4 text-gray-700" />
                  </button>
                  <button type="button"
                    onClick={() => { setImgLoaded(false); setActiveImage((i) => (i + 1) % listing.images.length); }}
                    className="absolute right-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-white/90 backdrop-blur-sm border border-white flex items-center justify-center shadow-md opacity-0 group-hover:opacity-100 transition-opacity duration-200 hover:bg-white active:scale-95">
                    <ChevronRight className="w-4 h-4 text-gray-700" />
                  </button>
                </>
              )}

              {/* Dot indicators */}
              {listing.images.length > 1 && (
                <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex items-center gap-1.5">
                  {listing.images.map((_, i) => (
                    <button key={i} type="button" onClick={() => { setImgLoaded(false); setActiveImage(i); }}
                      className="rounded-full transition-all duration-200 shadow-sm"
                      style={{ width: i === activeImage ? 20 : 6, height: 6, background: i === activeImage ? "#d946ef" : "rgba(255,255,255,.7)" }}
                    />
                  ))}
                </div>
              )}
            </div>

            {/* Thumbnails */}
            {listing.images.length > 1 && (
              <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
                {listing.images.map((url, i) => (
                  <button key={url + i} type="button" onClick={() => { setImgLoaded(false); setActiveImage(i); }}
                    className="w-16 h-16 rounded-xl overflow-hidden shrink-0 border-2 transition-all duration-200 hover:scale-105 active:scale-95"
                    style={{ borderColor: i === activeImage ? "#d946ef" : "transparent", boxShadow: i === activeImage ? "0 0 0 3px rgba(217,70,239,.2)" : "none" }}
                  >
                    <img src={url} alt="" className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            )}

            {/* Description + Reviews — desktop only, on mobile shown below the grid */}
            <div className="hidden lg:contents">
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="px-5 py-4 border-b border-gray-50"
                  style={{ background: "linear-gradient(to right, #f9fafb, #fff)" }}>
                  <h2 className="text-base font-bold text-gray-900">Описание</h2>
                </div>
                <div className="p-5">
                  <p className="text-sm text-gray-600 leading-relaxed whitespace-pre-wrap">
                    {listing.description || "Описание не указано"}
                  </p>
                </div>
              </div>
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                <ReviewsBlock listingId={listing.id} sellerId={listing.seller.id} />
              </div>
            </div>
          </div>

          {/* ── Right: Info panel ── */}
          <div className="space-y-4">

            {/* Main info card */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
              <div className="p-5 sm:p-6">
                {/* Category */}
                <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold mb-3"
                  style={{ background: "linear-gradient(135deg,#fdf4ff,#fce7f3)", color: "#86198f" }}>
                  {listing.category.name}
                </div>

                {/* Title */}
                <h1 className="text-xl sm:text-2xl font-extrabold text-gray-900 leading-tight mb-3">{listing.title}</h1>

                {/* Rating */}
                {listing.rating && (
                  <div className="flex items-center gap-2 mb-3">
                    <div className="flex items-center gap-0.5">
                      {[1,2,3,4,5].map((s) => (
                        <Star key={s} className="w-3.5 h-3.5" fill={s <= Math.round(listing.rating!) ? "#d946ef" : "none"} stroke={s <= Math.round(listing.rating!) ? "#d946ef" : "#d1d5db"} />
                      ))}
                    </div>
                    <span className="text-sm font-semibold text-gray-700">{listing.rating.toFixed(1)}</span>
                    {listing.reviewsCount && <span className="text-sm text-gray-400">· {listing.reviewsCount} отзывов</span>}
                  </div>
                )}

                {/* Price */}
                <div className="flex items-baseline gap-3 mb-4 pb-4 border-b border-gray-50">
                  <span className="text-3xl sm:text-4xl font-extrabold text-gray-900"
                    style={{ letterSpacing: "-0.02em" }}>
                    {formatPrice(listing.price, listing.currency)}
                  </span>
                  {listing.oldPrice && listing.oldPrice > listing.price && (
                    <span className="text-base text-gray-400 line-through">{formatPrice(listing.oldPrice, listing.currency)}</span>
                  )}
                  {discount && (
                    <span className="text-sm font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">-{discount}%</span>
                  )}
                </div>

                {/* Meta */}
                <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-gray-500 mb-4">
                  {listing.city && (
                    <span className="flex items-center gap-1.5">
                      <MapPin className="w-3.5 h-3.5 text-gray-400" />{listing.city}
                    </span>
                  )}
                  <span className="flex items-center gap-1.5">
                    <Eye className="w-3.5 h-3.5 text-gray-400" />{listing.viewCount.toLocaleString("ru-RU")} просмотров
                  </span>
                  <span className="flex items-center gap-1.5">
                    <Package className="w-3.5 h-3.5 text-gray-400" />{listing.stock} в наличии
                  </span>
                </div>

                {/* Qty selector (non-owner) */}
                {!isOwner && listing.stock > 0 && (
                  <div className="flex items-center gap-3 mb-4">
                    <span className="text-sm text-gray-500 font-medium">Количество:</span>
                    <div className="flex items-center gap-1 bg-gray-100 rounded-xl p-1 border border-gray-200">
                      <button type="button"
                        onClick={() => setQty((q) => Math.max(1, q - 1))}
                        className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-white transition-all active:scale-90 disabled:opacity-40"
                        disabled={qty <= 1}>
                        <Minus className="w-3.5 h-3.5 text-gray-600" />
                      </button>
                      <span className="w-10 text-center text-sm font-bold text-gray-900">{qty}</span>
                      <button type="button"
                        onClick={() => setQty((q) => Math.min(listing.stock, q + 1))}
                        className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-white transition-all active:scale-90 disabled:opacity-40"
                        disabled={qty >= listing.stock}>
                        <Plus className="w-3.5 h-3.5 text-gray-600" />
                      </button>
                    </div>
                    <span className="text-xs text-gray-400 ml-auto">Макс. {listing.stock}</span>
                  </div>
                )}

                {/* CTA buttons */}
                {!isOwner && (
                  <div className="flex flex-col gap-4">
                    {listing.stock > 0 ? (
                      <button type="button" onClick={handleOpenCartModal}
                        className="w-full py-3.5 rounded-xl text-white font-bold text-sm shadow-lg transition-all duration-200 active:scale-[.98] flex items-center justify-center gap-2"
                        style={{ background: "linear-gradient(135deg,#d946ef,#e11d48)" }}
                      >
                        <ShoppingCart className="w-4 h-4" /> Добавить в корзину
                      </button>
                    ) : (
                      <div className="w-full py-3.5 rounded-xl bg-gray-100 text-gray-400 text-sm font-semibold text-center border border-gray-200">
                        Нет в наличии
                      </div>
                    )}
                    <div className="flex gap-2">
                      <div className="flex-1">
                        <FavoriteButton listingId={listing.id} />
                      </div>
                      <button type="button"
                        onClick={() => navigator.share?.({ title: listing.title, url: window.location.href })}
                        className="w-11 h-11 rounded-xl border border-gray-200 flex items-center justify-center text-gray-500 hover:text-fuchsia-600 hover:border-fuchsia-200 hover:bg-fuchsia-50 transition-all duration-200 active:scale-90 shadow-sm">
                        <Share2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                )}

                {isOwner && (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-xs text-blue-600 font-semibold bg-blue-50 px-3 py-2 rounded-xl">
                      <Heart className="w-3.5 h-3.5" /> Это ваш товар
                    </div>
                    <button type="button" onClick={() => setConfirmOpen(true)}
                      className="w-full py-3 rounded-xl border-2 border-red-200 text-red-500 text-sm font-semibold hover:bg-red-50 transition-all duration-200 active:scale-[.98] flex items-center justify-center gap-2">
                      <Trash2 className="w-4 h-4" /> Удалить объявление
                    </button>
                  </div>
                )}
              </div>

              {/* Trust badges */}
              <div className="border-t border-gray-50 px-5 py-4 grid grid-cols-2 gap-3">
                {[
                  { icon: <ShieldCheck className="w-4 h-4 text-emerald-500" />, text: "Страховка 20 000 ₽", sub: "каждый заказ" },
                  { icon: <Truck className="w-4 h-4 text-blue-500" />, text: "Доставка", sub: "через посредника" },
                ].map((b, i) => (
                  <div key={i} className="flex items-center gap-2.5 p-3 rounded-xl" style={{ background: "#f9fafb" }}>
                    <div className="shrink-0">{b.icon}</div>
                    <div>
                      <p className="text-xs font-semibold text-gray-700">{b.text}</p>
                      <p className="text-[11px] text-gray-400">{b.sub}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Description — mobile only, after price/cart */}
            <div className="lg:hidden bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
              <div className="px-5 py-4 border-b border-gray-50"
                style={{ background: "linear-gradient(to right, #f9fafb, #fff)" }}>
                <h2 className="text-base font-bold text-gray-900">Описание</h2>
              </div>
              <div className="p-5">
                <p className="text-sm text-gray-600 leading-relaxed whitespace-pre-wrap">
                  {listing.description || "Описание не указано"}
                </p>
              </div>
            </div>

            {/* Stats card */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
              <div className="grid grid-cols-3 divide-x divide-gray-50">
                {[
                  { icon: <Eye className="w-5 h-5" />, val: listing.viewCount.toLocaleString("ru-RU"), label: "просмотров", color: "#6366f1" },
                  { icon: <Heart className="w-5 h-5" />, val: "—", label: "в избранном", color: "#ec4899" },
                  { icon: <Package className="w-5 h-5" />, val: listing.stock, label: "в наличии", color: "#10b981" },
                ].map((s, i) => (
                  <div key={i} className="flex flex-col items-center py-4 px-2 gap-1.5">
                    <div className="w-9 h-9 rounded-xl flex items-center justify-center"
                      style={{ background: `${s.color}15`, color: s.color }}>
                      {s.icon}
                    </div>
                    <p className="text-sm font-bold text-gray-900">{s.val}</p>
                    <p className="text-[10px] text-gray-400 text-center">{s.label}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Seller card */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
              <div className="px-5 py-4 border-b border-gray-50" style={{ background: "linear-gradient(to right,#f9fafb,#fff)" }}>
                <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">Продавец</p>
              </div>
              <div className="p-5 flex items-center gap-3">
                <div className="w-12 h-12 rounded-full text-white font-bold text-lg flex items-center justify-center shadow-md shrink-0"
                  style={{ background: "linear-gradient(135deg,#c026d3,#e11d48)" }}>
                  {(listing.seller.firstName[0] ?? "?").toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-gray-900 text-sm">{listing.seller.firstName} {listing.seller.lastName}</p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    На сайте с {new Date(listing.seller.createdAt).toLocaleDateString("ru-RU", { month: "long", year: "numeric" })}
                  </p>
                </div>
                <Link href={`/listings?seller=${listing.seller.id}`}
                  className="shrink-0 text-xs font-semibold text-fuchsia-600 hover:text-fuchsia-700 flex items-center gap-1 transition-colors">
                  Все товары <ChevronRight className="w-3 h-3" />
                </Link>
              </div>
            </div>

          </div>
        </div>

        {/* Reviews — mobile only, shown below the grid */}
        <div className="lg:hidden mt-4">
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <ReviewsBlock listingId={listing.id} sellerId={listing.seller.id} />
          </div>
        </div>
      </main>

      {/* ── Add to cart modal ── */}
      {listing && (
        <AddToCartModal
          open={cartModalOpen}
          onClose={() => setCartModalOpen(false)}
          listingId={listing.id}
          title={listing.title}
          images={listing.images}
          qty={qty}
        />
      )}

      {/* ── Confirm delete modal ── */}
      <Modal open={confirmOpen} onCancel={() => setConfirmOpen(false)}
        onOk={handleDelete} okText="Удалить" cancelText="Отмена"
        okButtonProps={{ danger: true, loading: deleting }}
        title="Удалить объявление?">
        <p className="text-gray-600">Это действие нельзя отменить. Объявление будет удалено навсегда.</p>
      </Modal>
    </div>
  );
}
