"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Package, ChevronRight, ChevronDown, ChevronUp, Sparkles, ArrowLeft,
  CheckCircle2, Clock, XCircle, Search, Users,
  ShoppingBag, Truck, AlertCircle, Send, Shield,
  MessageCircle, Info, ArrowDown, Star, Paperclip,
  X, FileText, ImageIcon, Bell, Loader2,
  ChevronLeft, Eye, MapPin,
} from "lucide-react";
import { SiteHeader } from "@/widgets/header";
import { MobileBottomNav } from "@/widgets/mobile-nav";
import { NotifModal } from "@/shared/ui";
import { api } from "@/shared/api/client";
import {
  getMyMediatorOrders, getOrderChats, getChatMessages, sendChatMessage,
  completeMediatorOrder, cancelMediatorOrder, selectExecutor,
  getOrderRequests, getOrderRequest, cancelOrderRequest,
  getOrderRequestChatMessages, sendOrderRequestChatMessage, updateOrderRequestItemStatus,
  setAnalogueItem,
} from "@/features/commerce";
import { fetchListings, fetchCategories, fetchListing } from "@/features/catalog";
import type { ListingDetailDto } from "@/shared/lib";
import { useSession } from "@/shared/auth";
import { formatPrice } from "@/shared/lib";

// ── Analogue tag helpers ──────────────────────────────────────────

const ANALOGUE_RE = /\[analogue:([0-9a-f-]+):([0-9a-f-]+)\]/i;

function parseAnalogueMeta(text: string): { orderId: string; itemId: string; cleanText: string } | null {
  const m = ANALOGUE_RE.exec(text);
  if (!m) return null;
  return { orderId: m[1], itemId: m[2], cleanText: text.replace(ANALOGUE_RE, "").trim() };
}

// ── Chat attachment helpers ───────────────────────────────────────

type WebSeg = { kind: "text"; text: string } | { kind: "img"; url: string } | { kind: "file"; name: string; url: string };
function parseWebMsg(raw: string): WebSeg[] {
  const segs: WebSeg[] = [];
  let rest = raw;
  const imgRe  = /\[img:(https?:\/\/[^\]\s]+)\]/;
  const fileRe = /\[file:([^\]]*?):(https?:\/\/[^\]\s]+)\]/;
  while (rest.length > 0) {
    const mi = imgRe.exec(rest);
    const mf = fileRe.exec(rest);
    let first: { idx: number; seg: WebSeg; len: number } | null = null;
    if (mi && (!mf || mi.index <= mf.index))
      first = { idx: mi.index, seg: { kind: "img", url: mi[1] }, len: mi[0].length };
    else if (mf)
      first = { idx: mf.index, seg: { kind: "file", name: mf[1], url: mf[2] }, len: mf[0].length };
    if (!first) { segs.push({ kind: "text", text: rest }); break; }
    if (first.idx > 0) segs.push({ kind: "text", text: rest.slice(0, first.idx) });
    segs.push(first.seg);
    rest = rest.slice(first.idx + first.len);
  }
  return segs.filter((s) => s.kind !== "text" || (s as { kind: "text"; text: string }).text.trim());
}
function WebMsgContent({ text, isOwn }: { text: string; isOwn: boolean }) {
  const segs = parseWebMsg(text);
  return (
    <div className="space-y-1.5">
      {segs.map((s, i) => {
        if (s.kind === "img") return (
          <a key={i} href={s.url} target="_blank" rel="noopener noreferrer" className="block">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={s.url} alt="фото" className="max-w-60 max-h-80 rounded-xl object-cover" />
          </a>
        );
        if (s.kind === "file") return (
          <a key={i} href={s.url} target="_blank" rel="noopener noreferrer"
            className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium transition hover:opacity-80 ${
              isOwn ? "bg-white/20 text-white" : "bg-gray-100 text-gray-700"
            }`}
          >
            <span>📎</span>
            <span className="truncate max-w-44">{s.name || "Файл"}</span>
            <span className={`shrink-0 text-[10px] ${isOwn ? "text-white/60" : "text-gray-400"}`}>↓</span>
          </a>
        );
        return <p key={i} className="text-sm whitespace-pre-wrap break-words">{(s as { kind: "text"; text: string }).text}</p>;
      })}
    </div>
  );
}

// ── Status config ────────────────────────────────────────────────

const STATUS_CFG: Record<string, {
  label: string; icon: React.ReactNode;
  bg: string; text: string; isActive: boolean;
}> = {
  SEARCHING:              { label: "Поиск посредника",    icon: <Search className="w-3.5 h-3.5" />,       bg: "bg-blue-50",    text: "text-blue-600",   isActive: true },
  SELECTING:              { label: "Выбор посредника",    icon: <Users className="w-3.5 h-3.5" />,        bg: "bg-indigo-50",  text: "text-indigo-600", isActive: true },
  ASSIGNED:               { label: "Посредник назначен",  icon: <CheckCircle2 className="w-3.5 h-3.5" />, bg: "bg-purple-50",  text: "text-purple-600", isActive: true },
  AWAITING_PURCHASE_DATE: { label: "Ожидание закупки",    icon: <Clock className="w-3.5 h-3.5" />,        bg: "bg-amber-50",   text: "text-amber-600",  isActive: true },
  PURCHASING:             { label: "Идёт закупка",        icon: <ShoppingBag className="w-3.5 h-3.5" />,  bg: "bg-orange-50",  text: "text-orange-600", isActive: true },
  DELIVERING:             { label: "Передача заказа",     icon: <Truck className="w-3.5 h-3.5" />,        bg: "bg-cyan-50",    text: "text-cyan-600",   isActive: true },
  COMPLETED:              { label: "Завершён",            icon: <CheckCircle2 className="w-3.5 h-3.5" />, bg: "bg-emerald-50", text: "text-emerald-600",isActive: false },
  CANCELLED:              { label: "Отменён",             icon: <XCircle className="w-3.5 h-3.5" />,      bg: "bg-stone-100",  text: "text-stone-400",  isActive: false },
  DISPUTE:                { label: "Спор",                icon: <AlertCircle className="w-3.5 h-3.5" />,  bg: "bg-rose-50",    text: "text-rose-600",   isActive: false },
  NOT_FOUND:              { label: "Не найден",           icon: <XCircle className="w-3.5 h-3.5" />,      bg: "bg-stone-100",  text: "text-stone-400",  isActive: false },
};

const ITEM_STATUS_CFG_BUYER: Record<string, { label: string; icon: React.ReactNode; color: string; bg: string }> = {
  PENDING:               { label: "Проверяется",      icon: <Clock className="w-3 h-3" />,         color: "text-gray-500",    bg: "bg-gray-100" },
  FOUND:                 { label: "Найден",            icon: <CheckCircle2 className="w-3 h-3" />,  color: "text-emerald-600", bg: "bg-emerald-50" },
  NOT_FOUND:             { label: "Нет в наличии",     icon: <XCircle className="w-3 h-3" />,       color: "text-red-500",     bg: "bg-red-50" },
  REPLACEMENT_REQUESTED: { label: "Ищет у другого поставщика", icon: <AlertCircle className="w-3 h-3" />,   color: "text-amber-600",   bg: "bg-amber-50" },
  REPLACEMENT_APPROVED:  { label: "Поиск одобрен",             icon: <CheckCircle2 className="w-3 h-3" />,  color: "text-blue-600",    bg: "bg-blue-50" },
  REPLACEMENT_REJECTED:  { label: "Поиск отклонён",            icon: <XCircle className="w-3 h-3" />,       color: "text-red-500",     bg: "bg-red-50" },
};

type TabKey = "active" | "completed" | "archive";

// ── Listing Detail Modal ──────────────────────────────────────────

function ListingDetailModal({ listingId, orderId, itemId, onClose, onAttached }: {
  listingId: string; orderId: string; itemId: string;
  onClose: () => void; onAttached: () => void;
}) {
  const [listing, setListing] = useState<ListingDetailDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeImg, setActiveImg] = useState(0);
  const [attaching, setAttaching] = useState(false);

  useEffect(() => {
    setLoading(true);
    setActiveImg(0);
    fetchListing(listingId)
      .then(setListing)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [listingId]);

  async function handleAttach() {
    if (attaching) return;
    setAttaching(true);
    try {
      await setAnalogueItem(orderId, itemId, listingId);
      onAttached();
    } catch {
      setAttaching(false);
    }
  }

  const images = listing
    ? [...(listing.images?.length ? listing.images : []), ...(listing.imageUrl ? [listing.imageUrl] : [])]
        .filter((v, i, arr) => arr.indexOf(v) === i)
    : [];

  return (
    <div
      className="fixed inset-0 flex items-end sm:items-center justify-center"
      style={{ zIndex: 60, background: "rgba(0,0,0,0.7)", backdropFilter: "blur(6px)" }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        className="w-full sm:max-w-lg bg-white sm:rounded-3xl rounded-t-3xl flex flex-col"
        style={{ maxHeight: "94vh", boxShadow: "0 -4px 40px rgba(0,0,0,0.3)", animation: "slideUpModal 0.25s cubic-bezier(0.32,0.72,0,1) both" }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-4 pb-2 shrink-0">
          <button type="button" onClick={onClose}
            className="flex items-center gap-1 text-sm font-semibold text-gray-500 hover:text-gray-900 transition"
          >
            <ChevronLeft className="w-4 h-4" /> Назад к каталогу
          </button>
          <button type="button" onClick={onClose}
            className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center hover:bg-gray-200 transition"
          >
            <X className="w-4 h-4 text-gray-500" />
          </button>
        </div>

        {loading ? (
          <div className="flex-1 flex items-center justify-center py-24">
            <Loader2 className="w-8 h-8 text-amber-500 animate-spin" />
          </div>
        ) : listing ? (
          <div className="flex-1 overflow-y-auto">
            {/* Image gallery */}
            <div className="relative bg-gray-100 overflow-hidden" style={{ aspectRatio: "1/1" }}>
              {images.length > 0 ? (
                <>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={images[activeImg]} alt={listing.title} className="w-full h-full object-cover" />
                  {images.length > 1 && (
                    <>
                      <button type="button"
                        onClick={() => setActiveImg((p) => (p - 1 + images.length) % images.length)}
                        className="absolute left-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-black/40 backdrop-blur flex items-center justify-center text-white hover:bg-black/60 transition"
                      >
                        <ChevronLeft className="w-5 h-5" />
                      </button>
                      <button type="button"
                        onClick={() => setActiveImg((p) => (p + 1) % images.length)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-black/40 backdrop-blur flex items-center justify-center text-white hover:bg-black/60 transition"
                      >
                        <ChevronRight className="w-5 h-5" />
                      </button>
                      <div className="absolute bottom-3 left-0 right-0 flex justify-center gap-1.5">
                        {images.map((_, i) => (
                          <button key={i} type="button" onClick={() => setActiveImg(i)}
                            className={`w-2 h-2 rounded-full transition-all ${i === activeImg ? "bg-white scale-125" : "bg-white/50"}`}
                          />
                        ))}
                      </div>
                    </>
                  )}
                </>
              ) : (
                <div className="w-full h-full flex items-center justify-center text-8xl select-none">🛍</div>
              )}
            </div>

            {/* Thumbnail strip */}
            {images.length > 1 && (
              <div className="flex gap-2 px-5 pt-3 overflow-x-auto no-scrollbar" style={{ scrollbarWidth: "none" }}>
                {images.map((url, i) => (
                  <button key={i} type="button" onClick={() => setActiveImg(i)}
                    className={`shrink-0 w-14 h-14 rounded-xl overflow-hidden border-2 transition-all ${i === activeImg ? "border-amber-400" : "border-transparent opacity-60 hover:opacity-100"}`}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={url} alt="" className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            )}

            {/* Details */}
            <div className="px-5 pt-4 pb-6 space-y-4">
              {/* Category + stock */}
              <div className="flex items-center gap-2 flex-wrap">
                <span className="px-2.5 py-1 rounded-full text-[11px] font-semibold bg-fuchsia-50 text-fuchsia-700">
                  {listing.category.name}
                </span>
                {listing.stock > 0 ? (
                  <span className="px-2.5 py-1 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700">
                    В наличии
                  </span>
                ) : (
                  <span className="px-2.5 py-1 rounded-full text-[11px] font-semibold bg-red-50 text-red-600">
                    Нет в наличии
                  </span>
                )}
              </div>

              {/* Title */}
              <h2 className="text-lg font-extrabold text-gray-900 leading-snug">{listing.title}</h2>

              {/* Price */}
              <p className="text-2xl font-extrabold text-gray-900">{formatPrice(listing.price, listing.currency)}</p>

              {/* Meta */}
              <div className="flex items-center gap-4 text-xs text-gray-400">
                {listing.city && (
                  <span className="flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5 shrink-0" />{listing.city}
                  </span>
                )}
                {listing.viewCount > 0 && (
                  <span className="flex items-center gap-1">
                    <Eye className="w-3.5 h-3.5 shrink-0" />{listing.viewCount.toLocaleString("ru")} просмотров
                  </span>
                )}
              </div>

              {/* Description */}
              {listing.description && (
                <div>
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">Описание</p>
                  <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-line">{listing.description}</p>
                </div>
              )}

              {/* Seller */}
              <div>
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">Продавец</p>
                <div className="flex items-center gap-3 p-3 rounded-2xl bg-gray-50 border border-gray-100">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-fuchsia-400 to-rose-500 flex items-center justify-center text-white font-bold text-sm shrink-0">
                    {listing.seller.firstName[0]}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-gray-900">{listing.seller.firstName} {listing.seller.lastName}</p>
                    <p className="text-xs text-gray-400">
                      С {new Date(listing.seller.createdAt).toLocaleDateString("ru-RU", { year: "numeric", month: "long" })}
                    </p>
                  </div>
                  <span className="text-[10px] font-semibold px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700">Продавец</span>
                </div>
              </div>

              {/* Trust badges */}
              <div className="grid grid-cols-2 gap-2">
                <div className="flex items-center gap-2 p-2.5 rounded-xl bg-blue-50">
                  <Shield className="w-4 h-4 text-blue-500 shrink-0" />
                  <p className="text-[11px] font-semibold text-blue-700 leading-tight">Безопасная сделка</p>
                </div>
                <div className="flex items-center gap-2 p-2.5 rounded-xl bg-emerald-50">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                  <p className="text-[11px] font-semibold text-emerald-700 leading-tight">Проверен системой</p>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex-1 flex items-center justify-center py-20 text-gray-400 text-sm">
            Товар не найден
          </div>
        )}

        {/* Sticky CTA */}
        {listing && (
          <div className="px-5 pb-6 pt-3 border-t border-gray-100 shrink-0 bg-white">
            <button
              type="button" onClick={handleAttach} disabled={attaching || listing.stock === 0}
              className="w-full py-3.5 rounded-2xl text-sm font-bold text-amber-800 bg-amber-100 border border-amber-200 transition-all active:scale-[0.98] disabled:opacity-60 flex items-center justify-center gap-2"
            >
              {attaching
                ? <Loader2 className="w-4 h-4 animate-spin" />
                : <><span>📦</span><span>Прикрепить как аналог</span></>
              }
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Analogue Picker Modal ─────────────────────────────────────────

function AnaloguePickerModal({ orderId, itemId, itemTitle, onClose, onAttached }: {
  orderId: string; itemId: string; itemTitle: string;
  onClose: () => void; onAttached: () => void;
}) {
  const [q, setQ] = useState(itemTitle);
  const [categoryId, setCategoryId] = useState<string | undefined>(undefined);
  const [categories, setCategories] = useState<any[]>([]);
  const [listings, setListings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [attaching, setAttaching] = useState<string | null>(null);
  const [detailListingId, setDetailListingId] = useState<string | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    fetchCategories().then(setCategories).catch(() => {});
  }, []);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    setLoading(true);
    debounceRef.current = setTimeout(async () => {
      try {
        const data = await fetchListings({ q: q.trim() || undefined, categoryId, limit: 24, page: 1 });
        setListings(data.items);
      } catch {}
      setLoading(false);
    }, 350);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [q, categoryId]);

  async function handleAttach(listingId: string) {
    if (attaching) return;
    setAttaching(listingId);
    try {
      await setAnalogueItem(orderId, itemId, listingId);
      onAttached();
    } catch {
      setAttaching(null);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center"
      style={{ background: "rgba(0,0,0,0.55)", backdropFilter: "blur(4px)" }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        className="w-full sm:max-w-2xl bg-white sm:rounded-3xl rounded-t-3xl flex flex-col"
        style={{ maxHeight: "92vh", boxShadow: "0 -4px 40px rgba(0,0,0,0.18)", animation: "slideUpModal 0.3s cubic-bezier(0.32,0.72,0,1) both" }}
      >
        {/* ── Header ── */}
        <div className="px-5 pt-5 pb-0 shrink-0">
          <div className="flex items-start justify-between gap-3 mb-4">
            <div className="min-w-0">
              <p className="text-[10px] font-bold text-amber-600 uppercase tracking-widest mb-0.5">Выберите аналог</p>
              <p className="text-[15px] font-extrabold text-gray-900 leading-snug line-clamp-1">«{itemTitle}»</p>
            </div>
            <button type="button" onClick={onClose}
              className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center hover:bg-gray-200 transition shrink-0 mt-0.5"
            >
              <X className="w-4 h-4 text-gray-500" />
            </button>
          </div>

          {/* Search */}
          <div className="relative mb-3">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
            <input
              type="text"
              placeholder="Поиск товара..."
              value={q}
              onChange={(e) => setQ(e.target.value)}
              autoFocus
              className="w-full pl-9 pr-9 py-2.5 rounded-xl border border-gray-200 text-sm bg-gray-50 focus:bg-white focus:outline-none focus:border-amber-400 transition"
            />
            {q && (
              <button type="button" onClick={() => setQ("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-300 hover:text-gray-500 transition"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Category chips */}
          <div className="flex gap-1.5 overflow-x-auto no-scrollbar pb-3" style={{ scrollbarWidth: "none" }}>
            <button type="button" onClick={() => setCategoryId(undefined)}
              className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${!categoryId ? "bg-amber-500 text-white shadow-sm shadow-amber-200" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}
            >
              Все
            </button>
            {categories.map((c) => (
              <button key={c.id} type="button" onClick={() => setCategoryId(categoryId === c.id ? undefined : c.id)}
                className={`shrink-0 flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${categoryId === c.id ? "bg-amber-500 text-white shadow-sm shadow-amber-200" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}
              >
                {c.icon && <span>{c.icon}</span>}
                <span>{c.name}</span>
              </button>
            ))}
          </div>

          <div style={{ borderTop: "1px solid #f3f4f6" }} />
        </div>

        {/* ── Listings grid ── */}
        <div className="flex-1 overflow-y-auto px-4 pt-3 pb-6">
          {loading && (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="rounded-2xl bg-gray-100 animate-pulse" style={{ height: 220 }} />
              ))}
            </div>
          )}

          {!loading && listings.length === 0 && (
            <div className="flex flex-col items-center justify-center py-16 text-gray-400">
              <Package className="w-12 h-12 mb-3 text-gray-200" />
              <p className="text-sm font-medium">Ничего не найдено</p>
              <button type="button" onClick={() => { setQ(""); setCategoryId(undefined); }}
                className="mt-3 text-xs text-amber-600 underline"
              >Сбросить фильтры</button>
            </div>
          )}

          {!loading && listings.length > 0 && (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {listings.map((l: any) => (
                <div
                  key={l.id}
                  className="rounded-2xl border border-gray-100 bg-white overflow-hidden flex flex-col shadow-sm hover:shadow-md hover:border-amber-200 transition-all duration-200 cursor-pointer"
                  onClick={() => setDetailListingId(l.id)}
                >
                  {/* Image */}
                  <div className="aspect-square bg-gray-50 overflow-hidden relative">
                    {l.imageUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={l.imageUrl} alt={l.title} className="w-full h-full object-cover hover:scale-105 transition-transform duration-300" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-5xl select-none">🛍</div>
                    )}
                    <div className="absolute bottom-1.5 right-1.5 bg-black/40 backdrop-blur rounded-full px-1.5 py-0.5 flex items-center gap-1">
                      <Eye className="w-2.5 h-2.5 text-white/80" />
                      <span className="text-[9px] text-white/80 font-medium">подробнее</span>
                    </div>
                  </div>
                  {/* Info */}
                  <div className="p-2.5 flex flex-col flex-1">
                    <p className="text-[12px] font-semibold text-gray-800 line-clamp-2 leading-snug mb-1 min-h-[2.4rem]">{l.title}</p>
                    <p className="text-[14px] font-extrabold text-gray-900 mb-2">{formatPrice(l.price, l.currency)}</p>
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); handleAttach(l.id); }}
                      disabled={!!attaching}
                      className="mt-auto w-full py-2 rounded-xl text-[11px] font-bold text-amber-800 bg-amber-100 border border-amber-200 transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center gap-1"
                    >
                      {attaching === l.id
                        ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        : <><span>📦</span><span>Прикрепить</span></>
                      }
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <style>{`
        @keyframes slideUpModal {
          from { transform: translateY(40px); opacity: 0; }
          to   { transform: translateY(0);    opacity: 1; }
        }
      `}</style>

      {detailListingId && (
        <ListingDetailModal
          listingId={detailListingId}
          orderId={orderId}
          itemId={itemId}
          onClose={() => setDetailListingId(null)}
          onAttached={() => {
            setDetailListingId(null);
            onAttached();
          }}
        />
      )}
    </div>
  );
}

const TRIGGER_PATTERNS = [
  /\+?\d[\d\s\-()]{8,}/,
  /телеграм|telegram|whatsapp|вотсап|ватсап|вайбер|viber/i,
  /напиши\s*(мне\s*)?(в|на)\s*(тг|телегу|ватсап|вотсап)/i,
  /перевод|переведи|скинь\s*на\s*карту|номер\s*карты/i,
];

function detectTrigger(text: string): boolean {
  return TRIGGER_PATTERNS.some((p) => p.test(text));
}

// ── Order Item Road Map ───────────────────────────────────────────

const DONE_STATUSES_RM = ["FOUND", "NOT_FOUND", "REPLACEMENT_REJECTED"];

function OrderItemRoadMap({ items, onUpdateStatus }: {
  items: any[];
  onUpdateStatus: (itemId: string, status: string) => void;
}) {
  const needsAction = items.some((i: any) => i.mediatorStatus === "REPLACEMENT_REQUESTED");
  const [collapsed, setCollapsed] = useState(!needsAction);

  useEffect(() => {
    if (needsAction) setCollapsed(false);
  }, [needsAction]);

  const foundCount = items.filter((i: any) => i.mediatorStatus === "FOUND").length;
  const doneCount = items.filter((i: any) => DONE_STATUSES_RM.includes(i.mediatorStatus ?? "PENDING")).length;
  const allDone = doneCount === items.length;
  const anyNotFound = items.some((i: any) => i.mediatorStatus === "NOT_FOUND" || i.mediatorStatus === "REPLACEMENT_REJECTED");

  /* ── Single roadmap — Step 2 ── */
  const step2Pulse = !allDone && !needsAction;
  const step2Bg =
    needsAction ? "#f59e0b" :
    allDone     ? "#10b981" :
    "#3b82f6";
  const step2Shadow =
    needsAction ? "0 2px 10px rgba(245,158,11,0.45)" :
    allDone     ? "0 2px 10px rgba(16,185,129,0.35)" :
    "0 2px 10px rgba(59,130,246,0.45)";
  const step2Label =
    needsAction ? "Ждёт ответа" :
    allDone     ? "Поискал" :
    "Ищет";

  /* ── Single roadmap — Step 3 ── */
  const step3Bg = allDone ? (anyNotFound ? "#ef4444" : "#10b981") : null;
  const step3Icon = allDone ? (anyNotFound ? "❌" : "✅") : null;
  const step3Label = allDone
    ? `Найдено ${foundCount}/${items.length}`
    : "Итог";
  const line2Bg = allDone ? (anyNotFound ? "#ef4444" : "#10b981") : "#e5e7eb";

  return (
    <div className="border-b border-gray-100 shrink-0">
      <button
        type="button"
        onClick={() => setCollapsed((p) => !p)}
        className="w-full px-4 py-2.5 flex items-center justify-between bg-gray-50 hover:bg-gray-100 transition"
      >
        <div className="flex items-center gap-2 flex-wrap">
          <Package className="w-3.5 h-3.5 text-gray-400" />
          <span className="text-xs font-semibold text-gray-600">Прогресс поиска</span>
          <span className="text-[10px] text-gray-400 font-medium">
            {foundCount}/{items.length} найдено
          </span>
          {needsAction && (
            <span className="inline-flex items-center gap-0.5 text-[10px] text-amber-600 font-bold animate-pulse">
              <AlertCircle className="w-3 h-3" /> Нужен ваш ответ
            </span>
          )}
        </div>
        {collapsed
          ? <ChevronDown className="w-3.5 h-3.5 text-gray-400 shrink-0" />
          : <ChevronUp className="w-3.5 h-3.5 text-gray-400 shrink-0" />
        }
      </button>

      {!collapsed && (
        <div className="bg-white px-4 py-3 space-y-4">
          {/* ── Single combined roadmap track ── */}
          <div className="flex items-start">
            {/* Step 1 — Принята */}
            <div className="flex flex-col items-center gap-1 shrink-0">
              <div
                className="w-9 h-9 rounded-full bg-emerald-500 flex items-center justify-center shadow-md"
                style={{ boxShadow: "0 2px 10px rgba(16,185,129,0.45)" }}
              >
                <CheckCircle2 className="w-4 h-4 text-white" />
              </div>
              <span className="text-[10px] font-bold text-emerald-600 text-center leading-tight">Принята</span>
            </div>

            {/* Connector 1→2 */}
            <div className="flex-1 h-1 rounded-full bg-emerald-400 mt-4 mx-2 min-w-0" />

            {/* Step 2 — Поиск */}
            <div className="flex flex-col items-center gap-1 shrink-0">
              <div
                className={`w-9 h-9 rounded-full flex items-center justify-center shadow-md ${step2Pulse ? "animate-pulse" : ""}`}
                style={{ background: step2Bg, boxShadow: step2Shadow }}
              >
                <Search className="w-4 h-4 text-white" />
              </div>
              <span className="text-[10px] font-bold text-center leading-tight" style={{ color: step2Bg }}>
                {step2Label}
              </span>
            </div>

            {/* Connector 2→3 */}
            <div
              className="flex-1 h-1 rounded-full mt-4 mx-2 min-w-0 transition-colors duration-500"
              style={{ background: line2Bg }}
            />

            {/* Step 3 — Итог */}
            <div className="flex flex-col items-center gap-1 shrink-0">
              {allDone && step3Bg ? (
                <div
                  className="w-9 h-9 rounded-full flex items-center justify-center text-lg shadow-md"
                  style={{ background: step3Bg, boxShadow: `0 2px 10px ${step3Bg}66` }}
                >
                  {step3Icon}
                </div>
              ) : (
                <div className="w-9 h-9 rounded-full flex items-center justify-center border-2 border-dashed border-gray-300 bg-gray-50">
                  <span className="text-gray-400 text-[11px] font-bold">?</span>
                </div>
              )}
              <span
                className="text-[10px] font-bold text-center leading-tight"
                style={{ color: allDone && step3Bg ? step3Bg : "#9ca3af" }}
              >
                {step3Label}
              </span>
            </div>
          </div>

          {/* ── Items list — compact status per item ── */}
          <div className="space-y-2 max-h-48 overflow-y-auto">
            {items.map((item: any) => {
              const status = item.mediatorStatus ?? "PENDING";
              const cfg = ITEM_STATUS_CFG_BUYER[status] ?? ITEM_STATUS_CFG_BUYER.PENDING;
              const isNeedsAction = status === "REPLACEMENT_REQUESTED";

              return (
                <div key={item.id} className="space-y-2">
                  <div className="flex items-center gap-2">
                    {item.imageUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={item.imageUrl} alt="" className="w-8 h-8 rounded-lg object-cover shrink-0 border border-gray-100" />
                    ) : (
                      <div className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center shrink-0">
                        <Package className="w-3.5 h-3.5 text-gray-300" />
                      </div>
                    )}
                    <p className="text-xs font-semibold text-gray-800 truncate flex-1">
                      {item.title ?? item.titleSnapshot ?? "Товар"}
                    </p>
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold shrink-0 ${cfg.bg} ${cfg.color}`}>
                      {cfg.icon}{cfg.label}
                    </span>
                  </div>

                  {isNeedsAction && (
                    <div className="ml-10 rounded-2xl overflow-hidden border border-amber-200 bg-amber-50">
                      <div className="px-3.5 py-3">
                        <p className="text-[11px] font-bold text-amber-800 mb-2.5">
                          Посредник не нашёл товар — разрешить искать у другого поставщика?
                        </p>
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() => onUpdateStatus(item.id, "REPLACEMENT_APPROVED")}
                            className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-[12px] font-bold text-emerald-800 bg-emerald-100 border border-emerald-200 active:scale-[0.97] transition"
                          >
                            <CheckCircle2 className="w-4 h-4 shrink-0" />
                            Да, искать
                          </button>
                          <button
                            type="button"
                            onClick={() => onUpdateStatus(item.id, "REPLACEMENT_REJECTED")}
                            className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-[12px] font-bold text-rose-700 bg-rose-100 border border-rose-200 active:scale-[0.97] transition"
                          >
                            <XCircle className="w-4 h-4 shrink-0" />
                            Не нужно
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Main ─────────────────────────────────────────────────────────

export default function OrdersPage() {
  const router = useRouter();
  const { user, hydrated } = useSession();
  const [orders, setOrders] = useState<any[] | null>(null);
  const [tab, setTab] = useState<TabKey>("active");
  const [selectedOrder, setSelectedOrder] = useState<any | null>(null);
  const selectedOrderRef = useRef<any>(null);
  const [chatId, setChatId] = useState<string | null>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [msgInput, setMsgInput] = useState("");
  const [sending, setSending] = useState(false);
  const [showWarning, setShowWarning] = useState(true);
  const [triggerWarning, setTriggerWarning] = useState<string | null>(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showNotifyModal, setShowNotifyModal] = useState(false);
  const [attachments, setAttachments] = useState<{ file: File; preview: string }[]>([]);
  const [selectingMediator, setSelectingMediator] = useState<string | null>(null);
  const [searchQ, setSearchQ] = useState("");
  const [orderRequests, setOrderRequests] = useState<any[] | null>(null);
  const [selectedRequest, setSelectedRequest] = useState<any | null>(null);
  const [reqMessages, setReqMessages] = useState<any[]>([]);
  const [reqInput, setReqInput] = useState("");
  const [reqSending, setReqSending] = useState(false);
  const [reqItems, setReqItems] = useState<any[]>([]);
  const [analogueModal, setAnalogueModal] = useState<{ orderId: string; itemId: string; itemTitle: string } | null>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Show notification modal on every visit until at least 1 messenger connected
  useEffect(() => {
    if (!hydrated || !user) return;
    api.get<{ channel: string; active: boolean }[]>("/notifications/my")
      .then((subs) => {
        if (!subs.some((s) => s.active)) {
          setTimeout(() => setShowNotifyModal(true), 1500);
        }
      })
      .catch(() => {
        // If check fails, show modal anyway so user can connect
        setTimeout(() => setShowNotifyModal(true), 1500);
      });
  }, [hydrated, user]);

  // Keep ref in sync for use inside polling closure
  useEffect(() => { selectedOrderRef.current = selectedOrder; }, [selectedOrder]);

  const loadData = useCallback(async () => {
    try {
      const [ordersData, reqsData] = await Promise.all([
        getMyMediatorOrders().catch(() => [] as any[]),
        getOrderRequests().catch(() => [] as any[]),
      ]);
      const newOrders: any[] = ordersData ?? [];
      setOrders((prev) => {
        // Auto-select first active order on first load
        if (prev === null && newOrders.length > 0 && !selectedOrderRef.current) {
          const active = newOrders.find((o: any) => STATUS_CFG[o.status]?.isActive);
          if (active) setSelectedOrder(active);
        }
        return newOrders;
      });
      setOrderRequests(reqsData ?? []);

      // Update selectedOrder if status or responders changed
      const current = selectedOrderRef.current;
      if (current) {
        const updated = newOrders.find((o: any) => o.id === current.id);
        if (updated && (
          updated.status !== current.status ||
          (updated.responses?.length ?? 0) !== (current.responses?.length ?? 0)
        )) {
          setSelectedOrder(updated);
        }
      }
    } catch {}
  }, []);

  // Load orders + order requests
  useEffect(() => {
    if (!hydrated) return;
    if (!user) { router.replace("/login?next=/orders"); return; }
    loadData();
  }, [hydrated, user, router, loadData]);

  // Poll every 10s to catch real-time status changes
  useEffect(() => {
    if (!hydrated || !user) return;
    const id = setInterval(loadData, 10000);
    return () => clearInterval(id);
  }, [hydrated, user, loadData]);

  // Load chat when order selected
  useEffect(() => {
    if (!selectedOrder) return;
    setChatId(null);
    setMessages([]);
    getOrderChats(selectedOrder.id)
      .then((chats) => {
        if (chats && chats.length > 0) {
          setChatId(chats[0].id);
          return getChatMessages(chats[0].id);
        }
        setMessages([{
          id: "system-1", type: "system",
          content: "Заказ оформлен. Данные отправлены посреднику.",
          createdAt: selectedOrder.createdAt,
        }]);
        return null;
      })
      .then((msgs) => { if (msgs) setMessages(msgs); })
      .catch(() => {});
  }, [selectedOrder]);

  // Scroll to bottom whenever messages change (both chat types)
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "instant" });
  }, [messages]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "instant" });
  }, [reqMessages]);

  // Poll broadcast order chat messages every 5s when chat is open
  useEffect(() => {
    if (!chatId) return;
    const poll = async () => {
      try {
        const msgs = await getChatMessages(chatId);
        if (Array.isArray(msgs)) setMessages(msgs);
      } catch {}
    };
    const id = setInterval(poll, 5000);
    return () => clearInterval(id);
  }, [chatId]);

  // Load direct request chat when request selected
  useEffect(() => {
    if (!selectedRequest?.chatId) { setReqMessages([]); setReqItems([]); return; }
    setReqItems(selectedRequest.items ?? []);
    getOrderRequestChatMessages(selectedRequest.chatId)
      .then((msgs) => setReqMessages(Array.isArray(msgs) ? msgs : []))
      .catch(() => setReqMessages([]));
  }, [selectedRequest]);

  // Poll messages + item statuses while request chat is open
  useEffect(() => {
    const chatId = selectedRequest?.chatId;
    const requestId = selectedRequest?.id;
    if (!chatId || !requestId) return;
    const poll = async () => {
      try {
        const [msgs, req] = await Promise.all([
          getOrderRequestChatMessages(chatId),
          getOrderRequest(requestId).catch(() => null),
        ]);
        setReqMessages(Array.isArray(msgs) ? msgs : []);
        if (req?.items) setReqItems(req.items);
      } catch {}
    };
    const id = setInterval(poll, 8000);
    return () => clearInterval(id);
  }, [selectedRequest?.chatId, selectedRequest?.id]);

  const handleReqSend = useCallback(async () => {
    if (!reqInput.trim() || !selectedRequest?.chatId || reqSending) return;
    const text = reqInput.trim();
    setReqSending(true);
    setReqInput("");
    const optimistic = { id: `temp-${Date.now()}`, senderId: user?.id, text, createdAt: new Date().toISOString() };
    setReqMessages((prev) => [...prev, optimistic]);
    try {
      const sent = await sendOrderRequestChatMessage(selectedRequest.chatId, text);
      setReqMessages((prev) => prev.map((m) => m.id === optimistic.id ? sent : m));
    } catch {}
    setReqSending(false);
  }, [reqInput, selectedRequest, reqSending, user]);

  const updateReqItemStatus = useCallback(async (itemId: string, status: string) => {
    if (!selectedRequest) return;
    try {
      await updateOrderRequestItemStatus(selectedRequest.id, itemId, status);
      setReqItems((prev) => prev.map((i) => i.id === itemId ? { ...i, mediatorStatus: status } : i));
      if (selectedRequest.chatId) {
        const msgs = await getOrderRequestChatMessages(selectedRequest.chatId);
        setReqMessages(Array.isArray(msgs) ? msgs : []);
      }
    } catch {}
  }, [selectedRequest]);

  // Handle file selection
  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    const newAttachments: { file: File; preview: string }[] = [];
    Array.from(files).forEach((file) => {
      if (file.type.startsWith("image/")) {
        newAttachments.push({ file, preview: URL.createObjectURL(file) });
      } else {
        newAttachments.push({ file, preview: "" });
      }
    });
    setAttachments((prev) => [...prev, ...newAttachments]);
    e.target.value = "";
  }, []);

  const removeAttachment = useCallback((idx: number) => {
    setAttachments((prev) => {
      const next = [...prev];
      if (next[idx]?.preview) URL.revokeObjectURL(next[idx].preview);
      next.splice(idx, 1);
      return next;
    });
  }, []);

  // Send message
  const handleSend = useCallback(async () => {
    if ((!msgInput.trim() && attachments.length === 0) || !chatId || sending) return;
    const text = msgInput.trim();
    setSending(true);
    setMsgInput("");

    if (text && detectTrigger(text)) {
      setTriggerWarning("Внимание! Обнаружены контактные данные или предложение перейти в сторонний мессенджер. Для вашей безопасности оставайтесь в чате на платформе.");
      setTimeout(() => setTriggerWarning(null), 8000);
    }

    // Build attachment names for display
    const attachNames = attachments.map((a) => `📎 ${a.file.name}`).join("\n");
    const fullContent = [text, attachNames].filter(Boolean).join("\n");

    const optimistic = {
      id: `temp-${Date.now()}`, content: fullContent,
      senderId: user?.id, createdAt: new Date().toISOString(), type: "user",
      attachmentPreviews: attachments.map((a) => ({ name: a.file.name, preview: a.preview, isImage: a.file.type.startsWith("image/") })),
    };
    setMessages((prev) => [...prev, optimistic]);
    attachments.forEach((a) => { if (a.preview) URL.revokeObjectURL(a.preview); });
    setAttachments([]);

    try {
      const sent = await sendChatMessage(chatId, fullContent);
      setMessages((prev) => prev.map((m) => m.id === optimistic.id ? { ...sent, attachmentPreviews: optimistic.attachmentPreviews } : m));
    } catch {}
    setSending(false);
  }, [msgInput, chatId, sending, user, attachments]);

  if (!hydrated || !user) {
    return <div className="min-h-screen flex flex-col"><div className="hidden sm:block"><SiteHeader /></div><MobileBottomNav /></div>;
  }

  const matchesSearch = (o: any) => {
    if (!searchQ.trim()) return true;
    const q = searchQ.toLowerCase();
    const title = (o.items ?? []).map((i: any) => i.listing?.title ?? i.title ?? "").join(" ").toLowerCase();
    const medName = o.mediator ? `${o.mediator.firstName ?? ""} ${o.mediator.lastName ?? ""}`.toLowerCase() : "";
    return title.includes(q) || medName.includes(q);
  };

  const activeOrders = orders?.filter((o) => STATUS_CFG[o.status]?.isActive && matchesSearch(o)) ?? [];
  const completedOrders = orders?.filter((o) => o.status === "COMPLETED" && matchesSearch(o)) ?? [];
  const archiveOrders = orders?.filter((o) => (o.status === "CANCELLED" || o.status === "NOT_FOUND" || o.status === "DISPUTE") && matchesSearch(o)) ?? [];
  const displayed = tab === "active" ? activeOrders : tab === "completed" ? completedOrders : archiveOrders;

  // Active direct requests (CREATED = awaiting, ACCEPTED = mediator accepted)
  const pendingRequests   = orderRequests?.filter((r: any) => r.status === "CREATED" || r.status === "ACCEPTED") ?? [];
  const completedRequests = orderRequests?.filter((r: any) => r.status === "COMPLETED") ?? [];
  const declinedRequests  = orderRequests?.filter((r: any) => r.status === "DECLINED" || r.status === "CANCELLED") ?? [];

  const activeTotalCount = activeOrders.length + pendingRequests.length;

  const TABS: { key: TabKey; label: string; count: number }[] = [
    { key: "active",    label: "Открытые",    count: activeTotalCount },
    { key: "completed", label: "Выполненные", count: completedOrders.length + completedRequests.length },
    { key: "archive",   label: "Архив",       count: archiveOrders.length + declinedRequests.length },
  ];

  async function handleSelectExecutor(orderId: string, mediatorId: string) {
    setSelectingMediator(mediatorId);
    try {
      await selectExecutor(orderId, mediatorId);
      const data = await getMyMediatorOrders();
      setOrders(data ?? []);
      const updated = data?.find((o: any) => o.id === orderId);
      if (updated) setSelectedOrder(updated);
    } catch {}
    setSelectingMediator(null);
  }

  const med = selectedOrder?.mediator;
  const mediatorName = med ? `${med.firstName} ${med.lastName}` : null;
  const mediatorRating = med?.mediatorProfile?.rating ?? med?.rating ?? null;
  const mediatorAvatar = med?.avatarUrl ?? null;
  const isWaitingMediator = selectedOrder && (selectedOrder.status === "SEARCHING" || selectedOrder.status === "SELECTING");
  const responders: any[] = selectedOrder?.responses ?? [];

  return (
    <div className="min-h-screen flex flex-col" style={{ background: "linear-gradient(135deg, #fdf4ff 0%, #fff1f2 50%, #fafaf9 100%)" }}>
      <div className="hidden sm:block"><SiteHeader /></div>
      <MobileBottomNav />

      {/* ═══ NOTIFICATION MODAL ═══ */}
      {showNotifyModal && <NotifModal onClose={() => setShowNotifyModal(false)} />}

      {/* ═══ ORDER DETAILS MODAL ═══ */}
      {showDetailsModal && selectedOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm animate-[fadeIn_0.25s_ease-out]" onClick={() => setShowDetailsModal(false)}>
          <div className="bg-white rounded-3xl shadow-2xl max-w-md w-[92%] mx-auto max-h-[85vh] overflow-hidden animate-[slideUp_0.35s_cubic-bezier(0.16,1,0.3,1)]" onClick={(e) => e.stopPropagation()}>
            {/* Header gradient */}
            <div className="relative bg-gradient-to-br from-fuchsia-400 via-rose-500 to-fuchsia-600 px-5 pt-5 pb-12">
              <button type="button" onClick={() => setShowDetailsModal(false)} className="absolute top-3 right-3 w-8 h-8 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center transition-all backdrop-blur">
                <X className="w-4 h-4 text-white" />
              </button>
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-1 rounded-full bg-white/20 backdrop-blur text-[10px] font-semibold text-white">
                  {STATUS_CFG[selectedOrder.status]?.label}
                </span>
                <span className="text-xs text-white/60">
                  {new Date(selectedOrder.createdAt).toLocaleDateString("ru-RU", { day: "numeric", month: "short" })}
                </span>
              </div>
              <p className="text-white font-bold text-lg mt-2">{formatPrice(selectedOrder.totalEstimatedAmount ?? selectedOrder.totalActualAmount ?? 0, "RUB")}</p>
              <p className="text-white/60 text-xs mt-0.5">{(selectedOrder.items ?? []).length} {(selectedOrder.items ?? []).length === 1 ? "товар" : "товара"}</p>
            </div>

            {/* Content overlapping header */}
            <div className="-mt-6 bg-white rounded-t-3xl overflow-y-auto" style={{ maxHeight: "calc(85vh - 120px)" }}>
              {/* Mediator card */}
              {med && (
                <div className="mx-5 -mt-0 mb-3 mt-4 flex items-center gap-3 p-3 rounded-2xl bg-gradient-to-r from-gray-50 to-white border border-gray-100 shadow-sm">
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-fuchsia-400 to-rose-500 flex items-center justify-center text-white font-bold text-sm shrink-0 overflow-hidden shadow-md">
                    {mediatorAvatar ? <Image src={mediatorAvatar} alt="" width={48} height={48} className="w-full h-full object-cover" /> : (mediatorName?.[0] ?? "П")}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-gray-900">{mediatorName}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      {mediatorRating && (
                        <span className="flex items-center gap-0.5 text-xs text-fuchsia-500">
                          <Star className="w-3 h-3 fill-fuchsia-400 text-fuchsia-400" />
                          {mediatorRating.toFixed(1)}
                        </span>
                      )}
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-600 font-medium">Посредник</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Items */}
              <div className="px-5 pb-4 pt-2">
                <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest mb-2">Товары</p>
                <div className="space-y-2">
                  {(selectedOrder.items ?? []).map((item: any, idx: number) => (
                    <div key={item.id} className="flex items-center gap-3 p-2.5 rounded-xl bg-gray-50/80 transition-all hover:bg-gray-50" style={{ animationDelay: `${idx * 60}ms` }}>
                      {item.selectedPhotoUrl ? (
                        <Image src={item.selectedPhotoUrl} alt="" width={44} height={44} className="w-11 h-11 rounded-xl object-cover shrink-0 shadow-sm" />
                      ) : (
                        <div className="w-11 h-11 rounded-xl bg-gray-100 flex items-center justify-center shrink-0">
                          <Package className="w-4 h-4 text-gray-300" />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium text-gray-900 truncate">{item.listing?.title ?? "Товар"}</p>
                        {item.clarification && item.clarification !== "-" && (
                          <p className="text-[10px] text-gray-400 truncate mt-0.5">{item.clarification}</p>
                        )}
                      </div>
                      <span className="text-xs font-bold text-gray-900 shrink-0">
                        {formatPrice(item.currentPrice ?? item.originalPrice ?? 0, "RUB")}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Recipient */}
              <div className="px-5 pb-4">
                <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest mb-2">Получатель</p>
                <div className="p-3 rounded-xl bg-gray-50/80 text-xs space-y-1.5">
                  <div className="flex justify-between"><span className="text-gray-400">Имя</span><span className="font-medium text-gray-900">{selectedOrder.recipientFirstName} {selectedOrder.recipientLastName}</span></div>
                  <div className="flex justify-between"><span className="text-gray-400">Телефон</span><span className="font-medium text-gray-900">{selectedOrder.recipientPhone}</span></div>
                  {selectedOrder.deliveryAddress && (
                    <div className="flex justify-between"><span className="text-gray-400">Адрес</span><span className="font-medium text-gray-900 text-right max-w-[60%]">{selectedOrder.deliveryAddress}</span></div>
                  )}
                  {selectedOrder.commentToMediator && (
                    <div className="flex justify-between"><span className="text-gray-400">Комментарий</span><span className="font-medium text-gray-900 text-right max-w-[60%]">{selectedOrder.commentToMediator}</span></div>
                  )}
                </div>
              </div>

              {/* Desired purchase date */}
              {selectedOrder.desiredPurchaseDate && (
                <div className="px-5 pb-5">
                  <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-blue-50/80 text-xs">
                    <Clock className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                    <span className="text-blue-700">Желаемая дата закупки: <span className="font-semibold">{new Date(selectedOrder.desiredPurchaseDate).toLocaleDateString("ru-RU", { day: "numeric", month: "long" })}</span></span>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <main className="flex-1 flex items-start justify-center px-3 sm:px-6 py-3 sm:py-6 overflow-hidden h-[calc(100vh-56px)] sm:h-[calc(100vh-64px)]">
        <div className="w-full sm:max-w-5xl h-[calc(100%-24px)] sm:h-[calc(100vh-64px-48px)] flex rounded-2xl shadow-xl border border-gray-200 overflow-hidden bg-white transition-all duration-300">

        {/* ═══ LEFT PANEL: Order List ═══ */}
        <div className={`w-full sm:w-96 sm:min-w-[340px] sm:max-w-[400px] border-r border-gray-100 flex flex-col bg-white transition-all duration-300 ${selectedOrder ? "hidden sm:flex" : "flex"}`}>

          <div className="px-4 pt-4 pb-2">
            <h1 className="text-lg font-extrabold text-gray-900">Мои заказы</h1>
          </div>

          <div className="flex gap-1 px-4 pb-3 overflow-x-auto no-scrollbar">
            {TABS.map((t) => (
              <button key={t.key} type="button" onClick={() => setTab(t.key)}
                className={`shrink-0 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  tab === t.key ? "bg-fuchsia-100 text-fuchsia-700 shadow-sm" : "bg-gray-100 text-gray-500 hover:bg-gray-200"
                }`}
              >
                {t.label} {t.count > 0 && <span className="ml-1 opacity-70">{t.count}</span>}
              </button>
            ))}
          </div>

          <div className="px-4 pb-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
              <input type="search" value={searchQ} onChange={(e) => setSearchQ(e.target.value)} placeholder="Поиск по товару или посреднику" className="w-full pl-9 pr-3 py-2 rounded-lg border border-gray-200 text-xs bg-gray-50 focus:outline-none focus:border-fuchsia-400" />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto px-2 pb-20 sm:pb-4">
            {!orders && (
              <div className="space-y-2 px-2">
                {[0,1,2].map((i) => <div key={i} className="h-20 rounded-xl bg-gray-100 animate-pulse" />)}
              </div>
            )}

            {/* ── Direct order requests (CREATED = waiting, ACCEPTED = in progress) ── */}
            {tab === "active" && pendingRequests.map((req: any) => {
              const medName = req.mediator ? `${req.mediator.firstName ?? ""} ${req.mediator.lastName ?? ""}`.trim() : "Посредник";
              const itemsArr: any[] = req.items ?? [];
              const title = itemsArr.map((i: any) => i.listing?.title ?? i.title ?? "Товар").join(", ") || "Заказ";
              const isAccepted = req.status === "ACCEPTED";
              const isSelected = selectedRequest?.id === req.id;
              return (
                <button key={req.id} type="button"
                  onClick={() => { if (isAccepted) { setSelectedRequest(req); setSelectedOrder(null); } }}
                  className={`w-full text-left p-3 rounded-xl mb-1 border transition-all ${
                    isSelected ? "border-fuchsia-300 bg-fuchsia-100/60 shadow-sm" :
                    isAccepted ? "border-fuchsia-100 bg-fuchsia-50/50 hover:bg-fuchsia-50" :
                    "border-fuchsia-100 bg-fuchsia-50/50"
                  } ${isAccepted ? "cursor-pointer" : "cursor-default"}`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        {isAccepted ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold bg-fuchsia-50 text-fuchsia-600 border border-fuchsia-200">
                            <CheckCircle2 className="w-3 h-3" />
                            Посредник принял
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold bg-fuchsia-50 text-fuchsia-600 border border-fuchsia-200">
                            <div className="w-1.5 h-1.5 rounded-full bg-fuchsia-500 animate-pulse" />
                            Ожидает ответа
                          </span>
                        )}
                      </div>
                      <p className="text-sm font-medium text-gray-900 truncate">{title || "Заявка посреднику"}</p>
                      <div className="flex items-center gap-1.5 mt-1">
                        <div className="w-5 h-5 rounded-full bg-gradient-to-br from-fuchsia-400 to-rose-500 flex items-center justify-center text-white text-[9px] font-bold shrink-0">
                          {medName[0]}
                        </div>
                        <span className="text-xs font-medium truncate text-fuchsia-700">{medName}</span>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="text-xs font-bold text-gray-900">
                        {formatPrice(req.totalItemsPrice || req.totalAmount || 0, "RUB")}
                      </div>
                      <div className="text-[10px] text-gray-400 mt-0.5">
                        {new Date(req.createdAt).toLocaleDateString("ru-RU", { day: "numeric", month: "short" })}
                      </div>
                      {!isAccepted && (
                        <button type="button"
                          onClick={(e) => { e.stopPropagation(); cancelOrderRequest(req.id).then(() => getOrderRequests().then((d) => setOrderRequests(d ?? []))); }}
                          className="mt-1.5 px-2.5 py-1 rounded-lg text-[10px] font-semibold text-red-600 bg-red-50 border border-red-200 hover:bg-red-100 transition-colors"
                        >
                          Отменить
                        </button>
                      )}
                      {isAccepted && (
                        <span className="text-[10px] text-fuchsia-500 mt-1 block">Нажмите для чата →</span>
                      )}
                    </div>
                  </div>
                </button>
              );
            })}

            {orders && displayed.length === 0 && pendingRequests.length === 0 && (
              <div className="text-center py-12 text-gray-400 text-sm">
                {tab === "active" ? "Нет активных заказов" : tab === "completed" ? "Нет выполненных" : "Архив пуст"}
              </div>
            )}

            {displayed.map((o: any) => {
              const cfg = STATUS_CFG[o.status] ?? STATUS_CFG.SEARCHING;
              const isSelected = selectedOrder?.id === o.id;
              const total = o.totalEstimatedAmount ?? o.totalActualAmount ?? 0;
              const items: any[] = o.items ?? [];
              const title = items.map((i: any) => i.listing?.title ?? i.title ?? "Товар").join(", ") || "Заказ";
              const oMed = o.mediator;
              const oMedName = oMed ? `${oMed.firstName} ${oMed.lastName}` : null;

              return (
                <button key={o.id} type="button"
                  onClick={() => setSelectedOrder(o)}
                  className={`w-full text-left p-3 rounded-xl mb-1 transition-all duration-200 ${
                    isSelected ? "bg-fuchsia-50 border border-fuchsia-200 shadow-sm" : "hover:bg-gray-50 border border-transparent"
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold ${cfg.bg} ${cfg.text}`}>
                          {cfg.icon} {cfg.label}
                        </span>
                      </div>
                      <p className="text-sm font-medium text-gray-900 truncate">{title}</p>
                      {oMedName ? (
                        <div className="flex items-center gap-1.5 mt-1">
                          <div className="w-5 h-5 rounded-full bg-gradient-to-br from-fuchsia-400 to-rose-500 flex items-center justify-center text-white text-[9px] font-bold shrink-0 overflow-hidden">
                            {oMed.avatarUrl ? <Image src={oMed.avatarUrl} alt="" width={20} height={20} className="w-full h-full object-cover" /> : oMedName[0]}
                          </div>
                          <span className="text-xs text-gray-600 font-medium truncate">{oMedName}</span>
                          {(oMed.mediatorProfile?.rating ?? oMed.rating) && (
                            <span className="flex items-center gap-0.5 text-[10px] text-fuchsia-500">
                              <Star className="w-2.5 h-2.5 fill-fuchsia-400 text-fuchsia-400" />
                              {(oMed.mediatorProfile?.rating ?? oMed.rating).toFixed(1)}
                            </span>
                          )}
                        </div>
                      ) : (
                        <p className="text-xs text-gray-400 mt-0.5">{STATUS_CFG[o.status]?.label ?? "В работе"}</p>
                      )}
                    </div>
                    <div className="text-right shrink-0">
                      <div className="text-xs font-bold text-gray-900">{formatPrice(total, "RUB")}</div>
                      <div className="text-[10px] text-gray-400 mt-0.5">
                        {new Date(o.createdAt).toLocaleDateString("ru-RU", { day: "numeric", month: "short" })}
                      </div>
                    </div>
                  </div>
                </button>
              );
            })}

            {/* ── Completed direct requests in "Выполненные" tab ── */}
            {tab === "completed" && completedRequests.map((req: any) => {
              const medName = req.mediator ? `${req.mediator.firstName ?? ""} ${req.mediator.lastName ?? ""}`.trim() : "Посредник";
              const itemsArr: any[] = req.items ?? [];
              const title = itemsArr.map((i: any) => i.listing?.title ?? i.title ?? "Товар").join(", ") || "Заказ";
              return (
                <div key={req.id} className="w-full text-left p-3 rounded-xl mb-1 border border-transparent">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-50 text-emerald-700 mb-1">
                        <CheckCircle2 className="w-3 h-3" /> Выполнен
                      </span>
                      <p className="text-sm font-medium text-gray-900 truncate">{title || "Прямая заявка"}</p>
                      <div className="flex items-center gap-1.5 mt-1">
                        <div className="w-5 h-5 rounded-full bg-gradient-to-br from-fuchsia-400 to-rose-500 flex items-center justify-center text-white text-[9px] font-bold shrink-0">
                          {medName[0]}
                        </div>
                        <span className="text-xs text-gray-600 font-medium truncate">{medName}</span>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="text-xs font-bold text-gray-900">{formatPrice(req.totalItemsPrice || req.totalAmount || 0, "RUB")}</div>
                      <div className="text-[10px] text-gray-400 mt-0.5">
                        {new Date(req.createdAt).toLocaleDateString("ru-RU", { day: "numeric", month: "short" })}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}

            {/* ── Declined/cancelled direct requests in "Архив" tab ── */}
            {tab === "archive" && declinedRequests.map((req: any) => {
              const medName = req.mediator ? `${req.mediator.firstName ?? ""} ${req.mediator.lastName ?? ""}`.trim() : "Посредник";
              const itemsArr: any[] = req.items ?? [];
              const title = itemsArr.map((i: any) => i.listing?.title ?? i.title ?? "Товар").join(", ") || "Заказ";
              return (
                <div key={req.id} className="w-full text-left p-3 rounded-xl mb-1 border border-transparent opacity-70">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold bg-stone-100 text-stone-500 mb-1">
                        <XCircle className="w-3 h-3" /> {req.status === "CANCELLED" ? "Отменена" : "Отклонена"}
                      </span>
                      <p className="text-sm font-medium text-gray-900 truncate">{title || "Прямая заявка"}</p>
                      <div className="flex items-center gap-1.5 mt-1">
                        <div className="w-5 h-5 rounded-full bg-gradient-to-br from-fuchsia-400 to-rose-500 flex items-center justify-center text-white text-[9px] font-bold shrink-0">
                          {medName[0]}
                        </div>
                        <span className="text-xs text-gray-600 font-medium truncate">{medName}</span>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="text-xs font-bold text-gray-900">{formatPrice(req.totalItemsPrice || req.totalAmount || 0, "RUB")}</div>
                      <div className="text-[10px] text-gray-400 mt-0.5">
                        {new Date(req.createdAt).toLocaleDateString("ru-RU", { day: "numeric", month: "short" })}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {orders && orders.length === 0 && (
            <div className="p-4 border-t">
              <Link href="/listings"
                className="flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-gradient-to-r from-fuchsia-500 to-rose-500 text-white text-sm font-semibold shadow-md"
              >
                <Sparkles className="w-4 h-4" /> Перейти в каталог
              </Link>
            </div>
          )}
        </div>

        {/* ═══ RIGHT PANEL: Chat ═══ */}
        <div className={`flex flex-col bg-white ${
          (selectedOrder || selectedRequest)
            ? "fixed inset-0 z-20 sm:relative sm:inset-auto sm:z-auto sm:flex-1"
            : "hidden sm:flex sm:flex-1"
        }`}>

          {selectedRequest ? (
            /* ─── Direct request chat ─── */
            <>
              <div className="px-4 py-3 border-b border-gray-100 flex items-center gap-3 bg-white shrink-0">
                <button type="button" onClick={() => { setSelectedRequest(null); setReqMessages([]); }}
                  className="sm:hidden w-8 h-8 rounded-lg border border-gray-200 flex items-center justify-center"
                >
                  <ArrowLeft className="w-4 h-4" />
                </button>
                <div className="w-11 h-11 rounded-full bg-gradient-to-br from-fuchsia-400 to-rose-500 flex items-center justify-center text-white font-bold text-sm shrink-0">
                  {(selectedRequest.mediator ? `${selectedRequest.mediator.firstName ?? ""} ${selectedRequest.mediator.lastName ?? ""}`.trim() : "П")[0]}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-sm font-bold text-gray-900 truncate">
                    {selectedRequest.mediator ? `${selectedRequest.mediator.firstName ?? ""} ${selectedRequest.mediator.lastName ?? ""}`.trim() || "Посредник" : "Посредник"}
                  </h3>
                  <p className="text-xs text-fuchsia-600 font-medium">Прямая заявка · Принята</p>
                </div>
                <span className="shrink-0 px-2.5 py-1 rounded-full text-[10px] font-semibold bg-fuchsia-50 text-fuchsia-700 border border-fuchsia-200">
                  {formatPrice(selectedRequest.totalItemsPrice || selectedRequest.totalAmount || 0, "RUB")}
                </span>
              </div>

              {/* Item road map */}
              {reqItems.length > 0 && (
                <OrderItemRoadMap items={reqItems} onUpdateStatus={updateReqItemStatus} />
              )}

              <div ref={chatContainerRef} className="flex-1 overflow-y-auto px-4 py-4 space-y-3" style={{ backgroundImage: "radial-gradient(circle at 1px 1px, #f3f4f6 1px, transparent 0)", backgroundSize: "24px 24px" }}>
                {/* Safety system message */}
                <div className="flex justify-center">
                  <div className="flex items-center gap-2 px-4 py-2 rounded-2xl bg-white/80 border border-gray-100 shadow-sm max-w-[88%] text-center">
                    <Shield className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                    <p className="text-[11px] text-gray-500 leading-snug">
                      Ведите переговоры только здесь — не переходите в Telegram, WhatsApp. Так мы сможем вас защитить при споре.
                    </p>
                  </div>
                </div>

                {reqMessages.length === 0 && (
                  <div className="text-center py-12 text-gray-400 text-sm">
                    <MessageCircle className="w-8 h-8 mx-auto mb-2 text-gray-200" />
                    Начните общение с посредником
                  </div>
                )}
                {reqMessages.map((msg: any) => {
                  const isOwn = msg.senderId === user?.id;
                  const rawText = msg.text ?? msg.content ?? "";
                  const analogue = parseAnalogueMeta(rawText);
                  const displayText = analogue ? analogue.cleanText : rawText;
                  const titleMatch = /для:\s*«([^»]+)»/.exec(displayText);
                  const itemTitle = titleMatch ? titleMatch[1] : "";
                  return (
                    <div key={msg.id} className={`flex ${isOwn ? "justify-end" : "justify-start"} animate-[slideUp_0.3s_ease-out]`}>
                      <div className={`max-w-[75%] rounded-2xl px-4 py-2.5 shadow-sm ${
                        isOwn
                          ? "bg-gradient-to-br from-fuchsia-400 to-rose-500 text-white rounded-br-md"
                          : "bg-white text-gray-900 rounded-bl-md border border-gray-100"
                      }`}>
                        <WebMsgContent text={displayText} isOwn={isOwn} />
                        {analogue && !isOwn && (
                          <button
                            type="button"
                            onClick={() => setAnalogueModal({ orderId: analogue.orderId, itemId: analogue.itemId, itemTitle })}
                            className="mt-2 w-full flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl text-xs font-bold text-amber-800 bg-amber-100 border border-amber-200 transition active:scale-95"
                          >
                            📦 Выбрать аналог в каталоге →
                          </button>
                        )}
                        <p className={`text-[10px] mt-1 ${isOwn ? "text-white/60" : "text-gray-400"} text-right`}>
                          {new Date(msg.createdAt).toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" })}
                        </p>
                      </div>
                    </div>
                  );
                })}
                <div ref={chatEndRef} />
              </div>
              <div className="px-4 py-3 border-t border-gray-100 bg-white shrink-0">
                <div className="flex items-end gap-2">
                  <div className="flex-1">
                    <textarea
                      value={reqInput}
                      onChange={(e) => setReqInput(e.target.value)}
                      onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleReqSend(); } }}
                      placeholder="Сообщение посреднику..."
                      rows={1}
                      onInput={(e) => { const el = e.currentTarget; el.style.height = "auto"; el.style.height = Math.min(el.scrollHeight, 120) + "px"; }}
                      className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm bg-gray-50 focus:bg-white focus:outline-none focus:border-fuchsia-400 resize-none placeholder:text-gray-400 transition"
                    />
                  </div>
                  <button type="button" onClick={handleReqSend}
                    disabled={!reqInput.trim() || reqSending}
                    className="w-10 h-10 rounded-xl flex items-center justify-center text-violet-700 bg-violet-100 border border-violet-200 disabled:opacity-50 transition-all active:scale-95 shrink-0"
                  >
                    {reqSending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            </>
          ) : !selectedOrder ? (
            <div className="flex-1 flex items-center justify-center text-gray-400 text-sm">
              <div className="text-center">
                <MessageCircle className="w-12 h-12 mx-auto mb-3 text-gray-200" />
                <p>Выберите заказ для просмотра чата</p>
              </div>
            </div>
          ) : isWaitingMediator ? (
            /* ═══ RESPONDERS PANEL (SEARCHING / SELECTING) ═══ */
            <div className="flex-1 flex flex-col bg-white overflow-hidden">
              {/* Header */}
              <div className="px-4 py-3 border-b border-gray-100 flex items-center gap-3 bg-white shrink-0">
                <button type="button" onClick={() => setSelectedOrder(null)} className="sm:hidden w-8 h-8 rounded-lg border border-gray-200 flex items-center justify-center">
                  <ArrowLeft className="w-4 h-4" />
                </button>
                <div className="flex-1 min-w-0">
                  <h3 className="text-sm font-bold text-gray-900">
                    {selectedOrder.status === "SEARCHING" ? "Поиск посредника" : "Выберите посредника"}
                  </h3>
                  <p className="text-xs text-gray-400">
                    {selectedOrder.status === "SEARCHING"
                      ? "Ожидаем первых откликов..."
                      : `${responders.length} ${responders.length === 1 ? "посредник готов помочь" : responders.length < 5 ? "посредника готовы помочь" : "посредников готовы помочь"}`}
                  </p>
                </div>
                <button type="button" onClick={() => setShowDetailsModal(true)}
                  className="px-3 py-1.5 rounded-lg text-xs font-semibold text-fuchsia-600 hover:bg-fuchsia-50 border border-fuchsia-200 transition-all shrink-0"
                >
                  Детали
                </button>
              </div>

              {/* Order mini-summary */}
              <div className="px-4 py-3 bg-gradient-to-r from-fuchsia-50 to-rose-50 border-b border-fuchsia-100/60 shrink-0">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-fuchsia-600 font-semibold">{(selectedOrder.items ?? []).length} {(selectedOrder.items ?? []).length === 1 ? "товар" : "товара"}</p>
                    <p className="text-base font-extrabold text-gray-900">{formatPrice(selectedOrder.totalEstimatedAmount ?? 0, "RUB")}</p>
                  </div>
                  <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold ${STATUS_CFG[selectedOrder.status]?.bg} ${STATUS_CFG[selectedOrder.status]?.text}`}>
                    {STATUS_CFG[selectedOrder.status]?.icon}
                    {STATUS_CFG[selectedOrder.status]?.label}
                  </span>
                </div>
              </div>

              {/* Responders list */}
              <div className="flex-1 overflow-y-auto px-4 py-4">
                {responders.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full gap-4 py-8">
                    <div className="relative">
                      <div className="w-20 h-20 rounded-full bg-gradient-to-br from-fuchsia-100 to-rose-100 flex items-center justify-center">
                        <Users className="w-10 h-10 text-fuchsia-300" />
                      </div>
                      <div className="absolute inset-0 rounded-full border-4 border-fuchsia-200/50 animate-ping" />
                    </div>
                    <div className="text-center">
                      <p className="font-bold text-gray-800 mb-1">Ищем посредников...</p>
                      <p className="text-sm text-gray-400 max-w-[240px]">
                        Первые отклики обычно приходят в течение 30 минут
                      </p>
                    </div>
                    <div className="flex gap-1.5 mt-2">
                      {[0, 1, 2].map((i) => (
                        <div key={i} className="w-2 h-2 rounded-full bg-fuchsia-400 animate-bounce" style={{ animationDelay: `${i * 0.15}s` }} />
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Откликнулись на ваш заказ</p>
                    {responders.map((r: any) => {
                      const m = r.mediator;
                      if (!m) return null;
                      const name = `${m.firstName ?? ""} ${m.lastName ?? ""}`.trim() || "Посредник";
                      const commission = m.commissionRate ? Math.round((selectedOrder.totalEstimatedAmount ?? 0) * m.commissionRate / 100) : null;
                      const isSelecting = selectingMediator === m.id;
                      return (
                        <div key={r.id}
                          className="flex items-center gap-3 p-3.5 rounded-2xl bg-white border border-gray-100 shadow-sm hover:shadow-md transition-all"
                        >
                          {/* Avatar */}
                          <div className="w-11 h-11 rounded-full bg-gradient-to-br from-fuchsia-400 to-rose-500 flex items-center justify-center text-white font-bold text-sm shrink-0 overflow-hidden shadow-md">
                            {m.avatarUrl
                              ? <Image src={m.avatarUrl} alt="" width={44} height={44} className="w-full h-full object-cover" />
                              : name[0]
                            }
                          </div>
                          {/* Info */}
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-bold text-gray-900 truncate">{name}</p>
                            <div className="flex items-center gap-2 mt-0.5">
                              {m.commissionRate && (
                                <span className="text-xs font-semibold text-fuchsia-700 bg-fuchsia-50 px-2 py-0.5 rounded-full">
                                  {m.commissionRate}%
                                </span>
                              )}
                              {commission && (
                                <span className="text-xs text-gray-400">≈ {formatPrice(commission, "RUB")}</span>
                              )}
                            </div>
                          </div>
                          {/* Select button */}
                          <button type="button"
                            onClick={() => handleSelectExecutor(selectedOrder.id, m.id)}
                            disabled={!!selectingMediator}
                            className="shrink-0 px-4 py-2 rounded-xl text-violet-700 text-xs font-bold bg-violet-100 border border-violet-200 transition-all active:scale-95 disabled:opacity-50"
                          >
                            {isSelecting ? (
                              <div className="w-3.5 h-3.5 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
                            ) : "Выбрать"}
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          ) : (
            <>
              {/* Chat header with mediator profile */}
              <div className="px-4 py-3 border-b border-gray-100 flex items-center gap-3 bg-white shrink-0">
                <button type="button" onClick={() => setSelectedOrder(null)}
                  className="sm:hidden w-8 h-8 rounded-lg border border-gray-200 flex items-center justify-center"
                >
                  <ArrowLeft className="w-4 h-4" />
                </button>
                <div className="w-11 h-11 rounded-full bg-gradient-to-br from-fuchsia-400 to-rose-500 flex items-center justify-center text-white font-bold text-sm shrink-0 overflow-hidden relative">
                  {mediatorAvatar ? (
                    <Image src={mediatorAvatar} alt="" width={44} height={44} className="w-full h-full object-cover" />
                  ) : (
                    <span>{mediatorName?.[0] ?? "П"}</span>
                  )}
                  {med && <span className="absolute bottom-0 right-0 w-3 h-3 rounded-full bg-green-400 border-2 border-white" />}
                </div>
                <div className="flex-1 min-w-0">
                  {mediatorName ? (
                    <>
                      <div className="flex items-center gap-2">
                        <h3 className="text-sm font-bold text-gray-900 truncate">{mediatorName}</h3>
                        {mediatorRating && (
                          <span className="flex items-center gap-0.5 text-xs text-fuchsia-500 shrink-0">
                            <Star className="w-3 h-3 fill-fuchsia-400 text-fuchsia-400" />
                            {mediatorRating.toFixed(1)}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-gray-400">
                        {STATUS_CFG[selectedOrder.status]?.label ?? "В работе"}
                      </p>
                    </>
                  ) : (
                    <>
                      <h3 className="text-sm font-bold text-gray-900">Посредник</h3>
                      <p className="text-xs text-gray-400">
                        {STATUS_CFG[selectedOrder.status]?.label ?? "В работе"}
                      </p>
                    </>
                  )}
                </div>
                <button type="button" onClick={() => setShowDetailsModal(true)}
                  className="px-3 py-1.5 rounded-lg text-xs font-semibold text-fuchsia-600 hover:bg-fuchsia-50 border border-fuchsia-200 transition-all hover:shadow-sm shrink-0"
                >
                  Детали заказа
                </button>
              </div>

              {/* Warning banner */}
              {showWarning && (
                <div className="px-4 py-2.5 bg-blue-50 border-b border-blue-100 flex items-start gap-2.5 animate-[fadeIn_0.3s_ease-out]">
                  <Shield className="w-4 h-4 text-blue-500 shrink-0 mt-0.5" />
                  <p className="text-xs text-blue-700 leading-relaxed flex-1">
                    Лучше не переходить в другие мессенджеры, а продолжить общаться в чате на сервисе. Так мы сможем вас предупредить, если заметим что-то подозрительное.
                  </p>
                  <button type="button" onClick={() => setShowWarning(false)} className="text-blue-400 hover:text-blue-600 shrink-0">
                    <XCircle className="w-4 h-4" />
                  </button>
                </div>
              )}

              {/* Trigger warning toast */}
              {triggerWarning && (
                <div className="px-4 py-2.5 bg-red-50 border-b border-red-100 flex items-start gap-2.5 animate-[slideUp_0.3s_ease-out]">
                  <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                  <p className="text-xs text-red-700 leading-relaxed flex-1">{triggerWarning}</p>
                </div>
              )}

              {/* Messages area */}
              <div ref={chatContainerRef} className="flex-1 overflow-y-auto px-4 py-4 space-y-3" style={{ backgroundImage: "radial-gradient(circle at 1px 1px, #f3f4f6 1px, transparent 0)", backgroundSize: "24px 24px" }}>
                {messages.length === 0 && !isWaitingMediator && (
                  <div className="text-center py-12 text-gray-400 text-sm">
                    <MessageCircle className="w-8 h-8 mx-auto mb-2 text-gray-200" />
                    Начните общение с посредником
                  </div>
                )}

                {messages.map((msg: any) => {
                  const isOwn = msg.senderId === user?.id || msg.type === "user";
                  const isSystem = msg.type === "system";

                  if (isSystem) {
                    return (
                      <div key={msg.id} className="flex justify-center animate-[fadeIn_0.3s_ease-out]">
                        <span className="px-3 py-1.5 rounded-full bg-white/80 backdrop-blur text-xs text-gray-500 text-center shadow-sm border border-gray-100">
                          {msg.content}
                        </span>
                      </div>
                    );
                  }

                  return (
                    <div key={msg.id} className={`flex ${isOwn ? "justify-end" : "justify-start"} animate-[slideUp_0.3s_ease-out]`}>
                      {!isOwn && (
                        <div className="w-7 h-7 rounded-full bg-gradient-to-br from-fuchsia-400 to-rose-500 flex items-center justify-center text-white text-[10px] font-bold shrink-0 mr-2 mt-auto overflow-hidden">
                          {mediatorAvatar ? <Image src={mediatorAvatar} alt="" width={28} height={28} className="w-full h-full object-cover" /> : (mediatorName?.[0] ?? "П")}
                        </div>
                      )}
                      <div className={`max-w-[70%] rounded-2xl px-4 py-2.5 shadow-sm transition-transform hover:scale-[1.01] ${
                        isOwn
                          ? "bg-gradient-to-br from-fuchsia-400 to-rose-500 text-white rounded-br-md"
                          : "bg-white text-gray-900 rounded-bl-md border border-gray-100"
                      }`}>
                        {/* Attachment previews */}
                        {msg.attachmentPreviews?.map((att: any, idx: number) => (
                          <div key={idx} className="mb-2">
                            {att.isImage ? (
                              <Image src={att.preview} alt={att.name} width={240} height={160} className="rounded-lg max-w-full h-auto" />
                            ) : (
                              <div className={`flex items-center gap-2 px-3 py-2 rounded-lg ${isOwn ? "bg-white/20" : "bg-gray-50"}`}>
                                <FileText className="w-4 h-4 shrink-0" />
                                <span className="text-xs truncate">{att.name}</span>
                              </div>
                            )}
                          </div>
                        ))}
                        <WebMsgContent text={msg.content ?? ""} isOwn={isOwn} />
                        <p className={`text-[10px] mt-1 ${isOwn ? "text-white/60" : "text-gray-400"} text-right`}>
                          {new Date(msg.createdAt).toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" })}
                        </p>
                      </div>
                    </div>
                  );
                })}
                <div ref={chatEndRef} />
              </div>

              {/* Quick actions */}
              {selectedOrder && STATUS_CFG[selectedOrder.status]?.isActive && (
                <div className="px-4 py-2 border-t border-gray-100 flex gap-2 overflow-x-auto no-scrollbar bg-gray-50/80">
                  {selectedOrder.status === "DELIVERING" && (
                    <button type="button"
                      onClick={() => completeMediatorOrder(selectedOrder.id).then(() => location.reload())}
                      className="shrink-0 px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100 transition"
                    >
                      ✓ Заказ выполнен
                    </button>
                  )}
                  <button type="button"
                    onClick={() => cancelMediatorOrder(selectedOrder.id).then(() => location.reload())}
                    className="shrink-0 px-3 py-1.5 rounded-lg text-xs font-semibold bg-white text-gray-600 border border-gray-200 hover:bg-gray-100 transition"
                  >
                    Отменить заказ
                  </button>
                </div>
              )}

              {/* Attachment previews */}
              {attachments.length > 0 && (
                <div className="px-4 pt-2 flex gap-2 flex-wrap border-t border-gray-100 bg-gray-50">
                  {attachments.map((att, idx) => (
                    <div key={idx} className="relative group">
                      {att.preview ? (
                        <Image src={att.preview} alt={att.file.name} width={64} height={64} className="w-16 h-16 rounded-lg object-cover border border-gray-200" />
                      ) : (
                        <div className="w-16 h-16 rounded-lg border border-gray-200 bg-white flex flex-col items-center justify-center gap-1">
                          <FileText className="w-5 h-5 text-gray-400" />
                          <span className="text-[8px] text-gray-400 truncate max-w-[56px]">{att.file.name}</span>
                        </div>
                      )}
                      <button type="button" onClick={() => removeAttachment(idx)}
                        className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-red-500 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition shadow"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* Input area */}
              <div className="px-4 py-3 border-t border-gray-100 bg-white shrink-0">
                <input ref={fileInputRef} type="file" className="hidden" accept="image/*,.txt,.pdf,.doc,.docx" multiple onChange={handleFileSelect} />
                <div className="flex items-end gap-2">
                  <button type="button" onClick={() => fileInputRef.current?.click()}
                    className="w-10 h-10 rounded-xl border border-gray-200 flex items-center justify-center text-gray-400 hover:text-fuchsia-500 hover:border-fuchsia-300 transition-all shrink-0"
                  >
                    <Paperclip className="w-4 h-4" />
                  </button>
                  <div className="flex-1 relative">
                    <textarea
                      value={msgInput}
                      onChange={(e) => setMsgInput(e.target.value)}
                      onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
                      placeholder="Сообщение..."
                      rows={1}
                      onInput={(e) => { const el = e.currentTarget; el.style.height = "auto"; el.style.height = Math.min(el.scrollHeight, 120) + "px"; }}
                      className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm bg-gray-50 focus:bg-white focus:outline-none focus:border-fuchsia-400 resize-none placeholder:text-gray-400 transition"
                    />
                  </div>
                  <button type="button" onClick={handleSend}
                    disabled={(!msgInput.trim() && attachments.length === 0) || sending}
                    className="w-10 h-10 rounded-xl flex items-center justify-center text-violet-700 bg-violet-100 border border-violet-200 disabled:opacity-50 transition-all active:scale-95 shrink-0"
                  >
                    {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            </>
          )}
        </div>

        </div>
      </main>

      {/* ═══ ANALOGUE PICKER MODAL ═══ */}
      {analogueModal && (
        <AnaloguePickerModal
          orderId={analogueModal.orderId}
          itemId={analogueModal.itemId}
          itemTitle={analogueModal.itemTitle}
          onClose={() => setAnalogueModal(null)}
          onAttached={async () => {
            setAnalogueModal(null);
            if (selectedRequest?.chatId) {
              try {
                const msgs = await getOrderRequestChatMessages(selectedRequest.chatId);
                setReqMessages(Array.isArray(msgs) ? msgs : []);
              } catch {}
            }
          }}
        />
      )}
    </div>
  );
}
