"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Trash2, ShoppingBag, ArrowLeft, Package, Star,
  CheckCircle2, ChevronRight, AlertCircle, Sparkles,
  MessageCircle, X, Minus, Plus, Zap, Search, ArrowUp,
  Globe, Wifi, Filter, Users,
} from "lucide-react";
import { MobileBottomNav } from "@/widgets/mobile-nav";
import { SiteHeader } from "@/widgets/header";
import {
  emitCartChanged, getCart, removeCartItem,
  updateCartItem, createMediatorOrder, getMediatorList, createOrderRequest,
} from "@/features/commerce";
import { useSession } from "@/shared/auth";
import { formatPrice, type CartDto, type CartItemDto } from "@/shared/lib";
import { ApiError } from "@/shared/api/client";

// ─── Types ────────────────────────────────────────────────────────

type View = "cart" | "select_mediator" | "broadcast_confirm" | "success";
type OrderMode = "direct" | "broadcast";

interface MediatorItem {
  id: string;
  firstName: string;
  lastName: string;
  avatarUrl?: string | null;
  commissionRate: number;
  minOrderAmount: number;
  rating?: number;
  completedOrders?: number;
  activeOrders?: number;
  isOnline?: boolean;
  description?: string | null;
  negotiableRate?: boolean;
  tags?: string[];
  highlights?: string[];
  compactBadges?: string[];
  reviewRating?: number | null;
  reviewCount?: number;
}


// ─── Animation hook ───────────────────────────────────────────────

function useViewAnimate(view: View) {
  const [visible, setVisible] = useState(false);
  const prev = useRef(view);
  useEffect(() => {
    if (prev.current !== view) {
      setVisible(false);
      const t = setTimeout(() => setVisible(true), 40);
      prev.current = view;
      return () => clearTimeout(t);
    }
    const t = setTimeout(() => setVisible(true), 60);
    return () => clearTimeout(t);
  }, [view]);
  return visible;
}

// ─── Main ─────────────────────────────────────────────────────────

export default function CartPage() {
  const router = useRouter();
  const { user, hydrated } = useSession();

  const [view, _setView] = useState<View>(() => {
    if (typeof window !== "undefined") {
      const saved = sessionStorage.getItem("cart-view") as View | null;
      if (saved && ["cart", "select_mediator", "broadcast_confirm"].includes(saved)) return saved;
    }
    return "cart";
  });
  const setView = (v: View) => {
    sessionStorage.setItem("cart-view", v);
    _setView(v);
  };

  const [cart, setCart] = useState<CartDto | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [orderMode, setOrderMode] = useState<OrderMode | null>(null);

  const [mediators, setMediators] = useState<MediatorItem[]>([]);
  const [mediatorsLoading, setMediatorsLoading] = useState(false);
  const [selectedMediator, setSelectedMediator] = useState<MediatorItem | null>(null);
  const [expandedMediatorId, setExpandedMediatorId] = useState<string | null>(null);
  const [mediatorSearch, setMediatorSearch] = useState("");
  const [mediatorSort, setMediatorSort] = useState<"rating" | "commission" | "orders">("rating");
  const [onlineOnly, setOnlineOnly] = useState(false);
  const [maxCommission, setMaxCommission] = useState(20);
  const [showFilters, setShowFilters] = useState(false);
  const [commentToMediator, setCommentToMediator] = useState("");
  const [showScrollTop, setShowScrollTop] = useState(false);

  const visible = useViewAnimate(view);

  useEffect(() => {
    const onScroll = () => setShowScrollTop((window.scrollY || document.body.scrollTop || 0) > 300);
    window.addEventListener("scroll", onScroll, { passive: true });
    document.body.addEventListener("scroll", onScroll, { passive: true });
    return () => { window.removeEventListener("scroll", onScroll); document.body.removeEventListener("scroll", onScroll); };
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    if (!user) { router.replace("/login?next=/cart"); return; }
    getCart().then(setCart).catch((e: ApiError) => setError(e.message));
  }, [hydrated, user, router]);

  useEffect(() => {
    if (view !== "select_mediator") return;
    setMediatorsLoading(true);
    getMediatorList()
      .then((data: any) => {
        const list: MediatorItem[] = (Array.isArray(data) ? data : data?.mediators || []).map((m: any) => ({
          id: m.id || m.userId,
          firstName: m.firstName,
          lastName: m.lastName,
          avatarUrl: m.avatarUrl || null,
          commissionRate: m.commissionRate != null ? parseFloat(m.commissionRate) : 8,
          minOrderAmount: m.minOrderAmount || 500,
          rating: m.rating || 4.5,
          completedOrders: m.completedOrders || 0,
          activeOrders: m.activeOrders || 0,
          isOnline: m.isOnline ?? false,
          description: m.description || null,
          negotiableRate: m.negotiableRate ?? false,
          tags: m.tags ?? [],
          highlights: m.highlights ?? [],
          compactBadges: m.compactBadges ?? [],
          reviewRating: m.reviewRating ?? null,
          reviewCount: m.reviewCount ?? 0,
        }));
        setMediators(list);
      })
      .catch(() => setMediators([]))
      .finally(() => setMediatorsLoading(false));
  }, [view]);

  async function changeQty(id: string, qty: number) {
    setBusy(id);
    try { const updated = await updateCartItem(id, { qty }); setCart(updated); emitCartChanged(); } catch {}
    setBusy(null);
  }

  async function remove(id: string) {
    setBusy(id);
    try { const updated = await removeCartItem(id); setCart(updated); emitCartChanged(); } catch {}
    setBusy(null);
  }

  function navigate(next: View) {
    setError(null);
    setView(next);
    window.scrollTo({ top: 0, behavior: "smooth" });
    document.body.scrollTo({ top: 0, behavior: "smooth" });
  }

  function goBack() {
    if (view === "cart") router.back();
    else navigate("cart");
  }

  async function submitOrder() {
    setSubmitting(true); setError(null);
    try {
      if (orderMode === "direct" && selectedMediator) {
        await createOrderRequest(selectedMediator.id);
      } else {
        await createMediatorOrder({ commentToMediator: commentToMediator || undefined });
      }
      sessionStorage.removeItem("cart-view");
      emitCartChanged();
      navigate("success");
    } catch (err) {
      setError(err instanceof ApiError ? (err.payload?.message || err.message) : "Ошибка создания заказа");
    }
    setSubmitting(false);
  }

  if (!hydrated || !user) return <div className="min-h-screen flex flex-col"><div className="hidden sm:block"><SiteHeader /></div><MobileBottomNav /></div>;

  const items = cart?.items ?? [];
  const total = cart?.total ?? 0;
  const currency = cart?.currency ?? "RUB";
  const commission = selectedMediator ? Math.round(total * selectedMediator.commissionRate / 100) : 0;

  // ── Success screen ──
  if (view === "success") {
    const DOTS = [
      { top: "14%", left: "7%",  s: 7,  d: "0s",    c: "#d946ef", dur: "2.7s" },
      { top: "28%", left: "88%", s: 5,  d: "0.4s",  c: "#e11d48", dur: "3.1s" },
      { top: "62%", left: "11%", s: 9,  d: "0.7s",  c: "#a21caf", dur: "2.4s" },
      { top: "20%", left: "73%", s: 4,  d: "0.2s",  c: "#f43f5e", dur: "3.5s" },
      { top: "74%", left: "80%", s: 6,  d: "0.9s",  c: "#d946ef", dur: "2.9s" },
      { top: "48%", left: "4%",  s: 5,  d: "0.55s", c: "#e11d48", dur: "3.3s" },
      { top: "55%", left: "93%", s: 4,  d: "1.1s",  c: "#a21caf", dur: "2.6s" },
    ];
    return (
      <div className="min-h-screen flex flex-col overflow-hidden relative" style={{ background: "linear-gradient(135deg, #fdf4ff 0%, #fff1f2 50%, #fafaf9 100%)" }}>
        <style>{`
          @keyframes gloFlyToOrders {
            0%   { transform: translate(-50%,-50%) scale(1.15); opacity: 1; }
            20%  { transform: translate(calc(-50% + 8vw), calc(-50% - 8vh)) scale(0.88); opacity: 1; }
            75%  { opacity: 0.65; }
            100% { transform: translate(calc(-50% + 22vw), calc(-50% + 47vh)) scale(0.05); opacity: 0; }
          }
          @keyframes gloBloom {
            0%   { transform: translate(-50%,-50%) scale(0.2); opacity: 0.75; }
            100% { transform: translate(-50%,-50%) scale(4); opacity: 0; }
          }
          @keyframes gloCardIn {
            0%   { opacity: 0; transform: translateY(52px) scale(0.92); }
            100% { opacity: 1; transform: translateY(0) scale(1); }
          }
          @keyframes gloPulse {
            0%   { transform: scale(0.82); opacity: 0.45; }
            100% { transform: scale(1.5);  opacity: 0; }
          }
          @keyframes gloDot {
            0%, 100% { transform: translateY(0) rotate(0deg); opacity: 0.55; }
            50%       { transform: translateY(-22px) rotate(180deg); opacity: 1; }
          }
        `}</style>

        {/* Bloom burst from center */}
        <div className="pointer-events-none" style={{ position: "fixed", left: "50%", top: "50%", zIndex: 95 }}>
          <div style={{
            width: 130, height: 130, borderRadius: "50%",
            background: "radial-gradient(circle, rgba(217,70,239,0.45) 0%, rgba(225,29,72,0.18) 60%, transparent 100%)",
            animation: "gloBloom 0.75s cubic-bezier(0.25,0.46,0.45,0.94) forwards",
          }} />
        </div>

        {/* Flying package → Orders tab */}
        <div className="pointer-events-none" style={{ position: "fixed", left: "50%", top: "50%", zIndex: 100 }}>
          <div style={{
            width: 54, height: 54, borderRadius: "50%",
            background: "linear-gradient(135deg, #d946ef, #e11d48)",
            display: "flex", alignItems: "center", justifyContent: "center",
            boxShadow: "0 0 28px rgba(217,70,239,0.6), 0 0 56px rgba(217,70,239,0.2)",
            animation: "gloFlyToOrders 0.95s cubic-bezier(0.4,0,0.2,1) 0.05s forwards",
          }}>
            <Package size={24} color="white" />
          </div>
        </div>

        {/* Floating background dots */}
        <div className="pointer-events-none fixed inset-0 overflow-hidden" style={{ zIndex: 1 }}>
          {DOTS.map((p, i) => (
            <div key={i} style={{
              position: "absolute", top: p.top, left: p.left,
              width: p.s, height: p.s, borderRadius: "50%", background: p.c,
              animation: `gloDot ${p.dur} ${p.d} ease-in-out infinite`,
            }} />
          ))}
        </div>

        <div className="hidden sm:block" style={{ position: "relative", zIndex: 10 }}><SiteHeader /></div>
        <div style={{ position: "relative", zIndex: 10 }}><MobileBottomNav /></div>

        {/* Success card — slides up in parallel with the flying element */}
        <main className="flex-1 flex flex-col items-center justify-center px-4 py-12 text-center" style={{
          position: "relative", zIndex: 10,
          animation: "gloCardIn 0.65s cubic-bezier(0.34,1.56,0.64,1) 0.12s both",
        }}>
          <div className="relative w-28 h-28 mx-auto mb-8">
            <div className="absolute inset-0 rounded-full" style={{
              background: "radial-gradient(circle, rgba(217,70,239,0.3), transparent)",
              animation: "gloPulse 1.6s ease-out 0.4s infinite",
            }} />
            <div className="absolute rounded-full" style={{
              inset: "-10px",
              background: "radial-gradient(circle, rgba(217,70,239,0.13), transparent)",
              animation: "gloPulse 1.6s ease-out 0.75s infinite",
            }} />
            <div className="relative w-full h-full rounded-full flex items-center justify-center shadow-2xl"
              style={{ background: "linear-gradient(135deg, #d946ef, #a21caf)" }}>
              <CheckCircle2 className="w-14 h-14 text-white" strokeWidth={1.5} />
            </div>
            <div className="absolute -top-2 -right-2 w-9 h-9 rounded-full bg-gradient-to-br from-fuchsia-400 to-rose-500 flex items-center justify-center shadow-lg animate-bounce">
              <Sparkles className="w-4 h-4 text-white" />
            </div>
          </div>

          <h1 className="text-3xl sm:text-4xl font-extrabold mb-3 bg-gradient-to-r from-fuchsia-600 to-rose-500 bg-clip-text text-transparent">
            {orderMode === "direct" ? "Запрос отправлен!" : "Запрос опубликован!"}
          </h1>
          <p className="text-base text-stone-600 max-w-sm mx-auto mb-2 leading-relaxed">
            {orderMode === "direct" && selectedMediator
              ? `Запрос отправлен посреднику ${selectedMediator.firstName}. Ожидайте подтверждения.`
              : "Ваш запрос увидят все посредники. Следите за откликами в разделе «Мои заказы»."}
          </p>
          <p className="text-sm text-stone-400 mb-10">Следите за статусом в разделе «Мои заказы»</p>

          <div className="flex flex-col sm:flex-row gap-3 max-w-sm mx-auto">
            <Link href="/orders"
              className="flex-1 inline-flex items-center justify-center gap-2 px-7 py-3.5 rounded-2xl text-white font-bold shadow-xl text-sm transition-all duration-200 hover:-translate-y-1 hover:shadow-2xl active:scale-95"
              style={{ background: "linear-gradient(135deg, #d946ef, #e11d48)" }}
            >
              <MessageCircle className="w-4 h-4" /> Мои заказы
            </Link>
            <Link href="/listings"
              className="flex-1 inline-flex items-center justify-center gap-2 px-7 py-3.5 rounded-2xl bg-white border-2 border-stone-200 font-semibold text-sm hover:border-fuchsia-300 hover:bg-fuchsia-50 transition-all duration-200"
            >
              Ещё покупки
            </Link>
          </div>
        </main>
      </div>
    );
  }

  const pageTitle = view === "cart" ? "Корзина" : view === "select_mediator" ? "Выберите посредника" : "Открытый запрос";

  return (
    <div className="min-h-screen flex flex-col" style={{ background: "linear-gradient(135deg, #fdf4ff 0%, #fff1f2 50%, #fafaf9 100%)" }}>
      <div className="hidden sm:block"><SiteHeader /></div>
      <MobileBottomNav />

      {/* Scroll to top */}
      <button type="button"
        onClick={() => { window.scrollTo({ top: 0, behavior: "smooth" }); document.body.scrollTo({ top: 0, behavior: "smooth" }); }}
        className="fixed right-4 z-50 transition-all duration-300 active:scale-90"
        style={{
          bottom: "136px", opacity: showScrollTop ? 1 : 0, pointerEvents: showScrollTop ? "auto" : "none",
          transform: showScrollTop ? "translateY(0) scale(1)" : "translateY(12px) scale(0.9)",
          width: 40, height: 40, borderRadius: "50%",
          background: "linear-gradient(135deg,#d946ef,#e11d48)", boxShadow: "0 4px 14px rgba(217,70,239,.4)",
          display: "flex", alignItems: "center", justifyContent: "center",
        }}
        aria-label="Наверх"
      >
        <ArrowUp className="w-4 h-4 text-white" />
      </button>

      <main className="flex-1 w-full max-w-5xl mx-auto px-3 sm:px-4 py-4 pb-48 sm:pb-10">

        {/* ── Header ── */}
        <div className="flex items-center gap-3 mb-5">
          <button type="button" onClick={goBack}
            className="w-10 h-10 rounded-2xl bg-white border border-gray-200 flex items-center justify-center hover:bg-gray-50 hover:border-gray-300 transition-all duration-200 shadow-sm active:scale-95 shrink-0"
          >
            <ArrowLeft className="w-4 h-4 text-gray-600" />
          </button>
          <div className="flex-1 min-w-0">
            <h1 className="text-lg sm:text-xl font-extrabold text-gray-900 leading-none truncate">{pageTitle}</h1>
          </div>
          {view === "cart" && items.length > 0 && (
            <span className="text-xs font-semibold text-fuchsia-700 bg-fuchsia-100 px-3 py-1.5 rounded-full shrink-0">
              {items.length} {items.length === 1 ? "товар" : items.length < 5 ? "товара" : "товаров"}
            </span>
          )}
          {view === "select_mediator" && selectedMediator && (
            <span className="text-xs font-semibold text-emerald-700 bg-emerald-100 px-3 py-1.5 rounded-full shrink-0">
              Выбран
            </span>
          )}
        </div>

        {/* ── Error ── */}
        {error && (
          <div className="mb-4 flex items-start gap-3 px-4 py-3.5 rounded-2xl bg-red-50 border border-red-100 text-sm text-red-600">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span className="flex-1">{error}</span>
            <button type="button" onClick={() => setError(null)}><X className="w-4 h-4 hover:text-red-700" /></button>
          </div>
        )}

        {/* ── Animated view wrapper ── */}
        <div className="transition-opacity duration-300" style={{ opacity: visible ? 1 : 0 }}>

          {/* ══ CART ══ */}
          {view === "cart" && (
            <>
              {!cart && <CartSkeleton />}

              {cart && items.length === 0 && (
                <div className="text-center py-16">
                  <div className="w-24 h-24 mx-auto rounded-3xl flex items-center justify-center mb-5 shadow-xl"
                    style={{ background: "linear-gradient(135deg, #fae8ff, #fce7f3)" }}>
                    <ShoppingBag className="w-12 h-12 text-fuchsia-500" />
                  </div>
                  <h2 className="text-xl font-bold text-gray-900 mb-2">Корзина пуста</h2>
                  <p className="text-sm text-gray-500 mb-7 max-w-xs mx-auto">Добавьте товары из каталога — посредник поможет с доставкой из любого магазина</p>
                  <Link href="/listings"
                    className="inline-flex items-center gap-2 px-7 py-3 rounded-2xl text-white text-sm font-bold shadow-lg transition-all duration-200 hover:-translate-y-0.5 hover:shadow-xl active:scale-95"
                    style={{ background: "linear-gradient(135deg,#d946ef,#e11d48)" }}
                  >
                    <Sparkles className="w-4 h-4" /> Перейти в каталог
                  </Link>
                </div>
              )}

              {cart && items.length > 0 && (
                <>
                  <div className="flex flex-col lg:flex-row gap-4 lg:gap-5">
                    {/* Items */}
                    <div className="flex-1 space-y-3 pb-70 lg:pb-0">
                      {items.map((item, idx) => (
                        <div key={item.id} className="transition-all duration-300"
                          style={{ transitionDelay: `${idx * 40}ms`, opacity: visible ? 1 : 0, transform: visible ? "translateY(0)" : "translateY(8px)" }}
                        >
                          <CartItemCard item={item} busy={busy === item.id}
                            onQty={(qty) => changeQty(item.id, qty)}
                            onRemove={() => remove(item.id)}
                          />
                        </div>
                      ))}
                    </div>

                    {/* Summary sidebar — desktop */}
                    <div className="hidden lg:block lg:w-80 shrink-0">
                      <div className="lg:sticky lg:top-24 rounded-3xl overflow-hidden shadow-xl"
                        style={{ border: "1px solid #f3e8ff", background: "#fff" }}
                      >
                        {/* Price block */}
                        <div className="px-6 pt-6 pb-5"
                          style={{ background: "linear-gradient(135deg,#fdf4ff 0%,#fff1f2 100%)" }}
                        >
                          <p className="text-[10px] font-bold text-fuchsia-500 uppercase tracking-widest mb-2">Итого</p>
                          <p className="text-4xl font-black text-gray-900 leading-none">{formatPrice(total, currency)}</p>
                          <div className="flex items-center gap-1.5 mt-2">
                            <Package className="w-3.5 h-3.5 text-gray-400" />
                            <p className="text-xs text-gray-400">
                              {items.length} {items.length === 1 ? "товар" : items.length < 5 ? "товара" : "товаров"} · без комиссии
                            </p>
                          </div>
                        </div>

                        {/* Section label */}
                        <div className="px-6 py-2.5 border-y border-gray-100 bg-gray-50/70">
                          <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest">Способ оформления</p>
                        </div>

                        {/* Buttons */}
                        <div className="px-5 py-5 space-y-3">
                          {/* Primary */}
                          <button type="button"
                            onClick={() => { setOrderMode("direct"); navigate("select_mediator"); }}
                            className="w-full rounded-2xl overflow-hidden transition-all duration-200 active:scale-[.98] hover:shadow-lg text-left shadow-md"
                            style={{ background: "linear-gradient(135deg,#d946ef,#e11d48)" }}
                          >
                            <div className="px-4 py-3.5 flex items-center gap-3">
                              <div className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center shrink-0">
                                <Zap className="w-4 h-4 text-white" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-white font-bold text-sm leading-snug">Выбрать посредника</p>
                                <p className="text-white/65 text-[11px] mt-0.5">Из проверенных кандидатов</p>
                              </div>
                              <ChevronRight className="w-4 h-4 text-white/50 shrink-0" />
                            </div>
                          </button>

                          {/* Secondary */}
                          <button type="button"
                            onClick={() => { setOrderMode("broadcast"); navigate("broadcast_confirm"); }}
                            className="w-full rounded-2xl overflow-hidden transition-all duration-200 active:scale-[.98] hover:border-fuchsia-300 hover:bg-fuchsia-50/60 text-left border-2 border-fuchsia-200"
                            style={{ background: "#fff" }}
                          >
                            <div className="px-4 py-3.5 flex items-center gap-3">
                              <div className="w-9 h-9 rounded-xl bg-fuchsia-100 flex items-center justify-center shrink-0">
                                <Globe className="w-4 h-4 text-fuchsia-600" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-fuchsia-700 font-bold text-sm leading-snug">Открытый запрос</p>
                                <p className="text-gray-400 text-[11px] mt-0.5">Посредники сами откликнутся</p>
                              </div>
                              <ChevronRight className="w-4 h-4 text-gray-300 shrink-0" />
                            </div>
                          </button>
                        </div>

                        {/* Trust note */}
                        <div className="px-5 pb-5">
                          <div className="flex items-start gap-2 px-3 py-2.5 rounded-xl bg-emerald-50 border border-emerald-100">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0 mt-0.5" />
                            <p className="text-[11px] text-emerald-700 leading-snug">Оплата только после получения товара</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Mobile cart footer */}
                  <div className="lg:hidden fixed bottom-14 left-0 right-0 z-40"
                    style={{ background: "#fff", borderTop: "1px solid #f3e8ff", boxShadow: "0 -8px 32px rgba(217,70,239,.08)" }}
                  >
                    <div className="px-4 pt-3 pb-4 max-w-5xl mx-auto space-y-2.5">
                      {/* Price row */}
                      <div className="flex items-center justify-between pb-1">
                        <div>
                          <p className="text-[11px] text-gray-400 leading-none mb-0.5">
                            {items.length} {items.length === 1 ? "товар" : items.length <= 4 ? "товара" : "товаров"} · без комиссии
                          </p>
                          <p className="text-[22px] font-black text-gray-900 leading-tight">{formatPrice(total, currency)}</p>
                        </div>
                        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-50 border border-emerald-100">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                          <span className="text-[11px] font-semibold text-emerald-700">Защита</span>
                        </div>
                      </div>

                      {/* Primary button */}
                      <button type="button"
                        onClick={() => { setOrderMode("direct"); navigate("select_mediator"); }}
                        className="w-full rounded-2xl text-white font-bold text-sm shadow-lg active:scale-[.98] transition-all duration-200 flex items-center gap-3 px-4"
                        style={{ background: "linear-gradient(135deg,#d946ef,#e11d48)", paddingTop: 12, paddingBottom: 12 }}
                      >
                        <div className="w-8 h-8 rounded-xl bg-white/20 flex items-center justify-center shrink-0">
                          <Zap className="w-4 h-4 text-white" />
                        </div>
                        <div className="flex-1 text-left">
                          <p className="text-sm font-bold leading-snug">Выбрать посредника</p>
                          <p className="text-white/65 text-[11px] font-normal">Из проверенных кандидатов</p>
                        </div>
                        <ChevronRight className="w-4 h-4 text-white/50 shrink-0" />
                      </button>

                      {/* Secondary button */}
                      <button type="button"
                        onClick={() => { setOrderMode("broadcast"); navigate("broadcast_confirm"); }}
                        className="w-full rounded-2xl text-fuchsia-700 font-bold text-sm border-2 border-fuchsia-200 active:scale-[.98] transition-all duration-200 flex items-center gap-3 px-4"
                        style={{ paddingTop: 10, paddingBottom: 10, background: "#fff" }}
                      >
                        <div className="w-8 h-8 rounded-xl bg-fuchsia-100 flex items-center justify-center shrink-0">
                          <Globe className="w-4 h-4 text-fuchsia-600" />
                        </div>
                        <div className="flex-1 text-left">
                          <p className="text-sm font-bold leading-snug">Открытый запрос</p>
                          <p className="text-gray-400 text-[11px] font-normal">Посредники сами откликнутся</p>
                        </div>
                        <ChevronRight className="w-4 h-4 text-gray-300 shrink-0" />
                      </button>
                    </div>
                  </div>
                </>
              )}
            </>
          )}

          {/* ══ SELECT MEDIATOR ══ */}
          {view === "select_mediator" && (
            <div className="max-w-xl mx-auto space-y-3 pb-32 sm:pb-0">
              {/* Search */}
              <div className="relative">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                <input
                  type="search" value={mediatorSearch}
                  onChange={(e) => setMediatorSearch(e.target.value)}
                  placeholder="Поиск по имени посредника..."
                  className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-200 bg-white text-sm focus:outline-none focus:border-fuchsia-400 transition-all duration-200"
                  style={{ boxShadow: "0 1px 4px rgba(0,0,0,.06)" }}
                />
              </div>

              {/* Filter row */}
              <div className="flex items-center gap-2 flex-wrap">
                {([
                  { key: "rating" as const, label: "По рейтингу" },
                  { key: "commission" as const, label: "Меньше комиссия" },
                  { key: "orders" as const, label: "Больше заказов" },
                ]).map((f) => (
                  <button key={f.key} type="button" onClick={() => setMediatorSort(f.key)}
                    className={`shrink-0 px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all duration-200 ${
                      mediatorSort === f.key
                        ? "bg-fuchsia-50 border-fuchsia-300 text-fuchsia-700 shadow-sm"
                        : "bg-white border-gray-200 text-gray-500 hover:border-gray-300"
                    }`}
                  >{f.label}</button>
                ))}
                <button type="button" onClick={() => setOnlineOnly(!onlineOnly)}
                  className={`shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all duration-200 ${
                    onlineOnly ? "bg-emerald-50 border-emerald-300 text-emerald-700" : "bg-white border-gray-200 text-gray-500 hover:border-gray-300"
                  }`}
                >
                  <Wifi className="w-3 h-3" /> Онлайн
                </button>
                <button type="button" onClick={() => setShowFilters(!showFilters)}
                  className={`shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all duration-200 ${
                    showFilters ? "bg-gray-100 border-gray-300 text-gray-700" : "bg-white border-gray-200 text-gray-500"
                  }`}
                >
                  <Filter className="w-3 h-3" /> Фильтры
                </button>
              </div>

              {/* Advanced filters */}
              {showFilters && (
                <div className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm space-y-3">
                  <div>
                    <div className="flex justify-between text-xs font-medium text-gray-600 mb-2">
                      <span>Макс. комиссия</span>
                      <span className="text-fuchsia-600 font-bold">{maxCommission}%</span>
                    </div>
                    <input type="range" min={3} max={20} value={maxCommission}
                      onChange={(e) => setMaxCommission(Number(e.target.value))}
                      className="w-full accent-fuchsia-500"
                    />
                    <div className="flex justify-between text-[10px] text-gray-400 mt-1">
                      <span>3%</span><span>20%</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Mediator list */}
              {mediatorsLoading ? (
                <div className="space-y-3">
                  {[0, 1, 2].map((i) => <MediatorSkeleton key={i} />)}
                </div>
              ) : (() => {
                const filtered = mediators
                  .filter((m) => {
                    if (mediatorSearch && !`${m.firstName} ${m.lastName}`.toLowerCase().includes(mediatorSearch.toLowerCase())) return false;
                    if (onlineOnly && !m.isOnline) return false;
                    if (m.commissionRate > maxCommission) return false;
                    if (total > 0 && total < m.minOrderAmount) return false;
                    return true;
                  })
                  .sort((a, b) => {
                    if (mediatorSort === "commission") return (a.commissionRate ?? 99) - (b.commissionRate ?? 99);
                    if (mediatorSort === "orders") return (b.completedOrders ?? 0) - (a.completedOrders ?? 0);
                    return (b.rating ?? 0) - (a.rating ?? 0);
                  });

                if (filtered.length === 0) {
                  return (
                    <div className="text-center py-10">
                      <Users className="w-10 h-10 text-gray-200 mx-auto mb-3" />
                      <p className="text-gray-400 text-sm">Посредники не найдены</p>
                      <button type="button" onClick={() => { setMediatorSearch(""); setOnlineOnly(false); setMaxCommission(20); }}
                        className="text-xs text-fuchsia-600 mt-2 underline"
                      >Сбросить фильтры</button>
                    </div>
                  );
                }

                return (
                  <div className="space-y-3">
                    {filtered.map((m, idx) => (
                      <div key={m.id} className="transition-all duration-300"
                        style={{ transitionDelay: `${idx * 50}ms`, opacity: visible ? 1 : 0, transform: visible ? "translateY(0)" : "translateY(10px)" }}
                      >
                        <MediatorCard
                          mediator={m}
                          selected={selectedMediator?.id === m.id}
                          expanded={expandedMediatorId === m.id}
                          onExpand={() => setExpandedMediatorId(expandedMediatorId === m.id ? null : m.id)}
                          onSelect={() => { setSelectedMediator(m); setExpandedMediatorId(null); }}
                          cartTotal={total}
                        />
                      </div>
                    ))}
                  </div>
                );
              })()}

              {/* Bottom action */}
              <BottomAction>
                <button type="button" onClick={submitOrder} disabled={!selectedMediator || submitting}
                  className="w-full py-4 rounded-2xl text-white font-bold text-sm shadow-lg transition-all duration-200 hover:-translate-y-0.5 hover:shadow-xl active:scale-[.98] flex items-center justify-center gap-2 disabled:opacity-50 disabled:hover:translate-y-0 disabled:cursor-not-allowed"
                  style={{ background: selectedMediator ? "linear-gradient(135deg,#d946ef,#e11d48)" : "#d6d3d1" }}
                >
                  {submitting
                    ? <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Отправляем запрос...</>
                    : selectedMediator
                      ? <><Zap className="w-4 h-4" /> Отправить запрос — {selectedMediator.firstName}</>
                      : "Выберите посредника"
                  }
                </button>
                {selectedMediator && (
                  <p className="text-center text-xs text-gray-400 mt-2">
                    Комиссия ≈ {formatPrice(commission, currency)} ({selectedMediator.commissionRate}%)
                  </p>
                )}
              </BottomAction>
            </div>
          )}

          {/* ══ BROADCAST CONFIRM ══ */}
          {view === "broadcast_confirm" && cart && (
            <div className="max-w-xl mx-auto space-y-4 pb-32 sm:pb-0">
              {/* Info banner */}
              <div className="flex items-start gap-3 px-4 py-4 rounded-2xl border"
                style={{ background: "linear-gradient(135deg, #eff6ff, #dbeafe)", borderColor: "#bfdbfe" }}
              >
                <Globe className="w-5 h-5 text-blue-500 shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-bold text-blue-800 mb-1">Как работает открытый запрос</p>
                  <p className="text-xs text-blue-700 leading-relaxed">
                    Ваш заказ появится в ленте всех посредников. Они смогут откликнуться, а вы выберете лучшего по рейтингу и комиссии.
                    Обычно первые отклики приходят в течение 30 минут.
                  </p>
                </div>
              </div>

              {/* Order summary */}
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="px-5 py-4 border-b border-gray-50" style={{ background: "linear-gradient(135deg, #fdf4ff, #fff1f2)" }}>
                  <div className="flex justify-between items-center">
                    <div>
                      <p className="text-xs font-semibold text-fuchsia-600 uppercase tracking-wider">Ваш заказ</p>
                      <p className="text-2xl font-extrabold text-gray-900 mt-0.5">{formatPrice(total, currency)}</p>
                    </div>
                    <div className="text-right">
                      <span className="text-2xl font-black text-fuchsia-500">{items.length}</span>
                      <p className="text-xs text-gray-400">{items.length === 1 ? "товар" : items.length < 5 ? "товара" : "товаров"}</p>
                    </div>
                  </div>
                </div>
                <div className="px-5 py-4 space-y-2.5 max-h-48 overflow-y-auto">
                  {items.map((item) => (
                    <div key={item.id} className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl overflow-hidden bg-gray-100 shrink-0">
                        {item.selectedPhotoUrl || item.imageUrl
                          ? <img src={item.selectedPhotoUrl || item.imageUrl!} alt="" className="w-full h-full object-cover" />
                          : <div className="w-full h-full flex items-center justify-center"><Package className="w-3.5 h-3.5 text-gray-300" /></div>
                        }
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 line-clamp-1">{item.title}</p>
                        {item.clarification && <p className="text-xs text-gray-400 line-clamp-1">{item.clarification}</p>}
                      </div>
                      <span className="text-sm font-bold text-gray-800 shrink-0">{formatPrice(item.price * item.qty, item.currency)}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Comment */}
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="px-5 py-3.5 border-b border-gray-50">
                  <p className="text-sm font-bold text-gray-900">Комментарий посредникам</p>
                  <p className="text-xs text-gray-400 mt-0.5">Пожелания по срокам, условиям или особые детали — необязательно</p>
                </div>
                <div className="p-5">
                  <textarea
                    value={commentToMediator}
                    onChange={(e) => setCommentToMediator(e.target.value)}
                    onInput={(e) => { const el = e.currentTarget; el.style.height = "auto"; el.style.height = el.scrollHeight + "px"; }}
                    placeholder='Например: "Нужно до пятницы", "Размер XL", "Можно позвонить"...'
                    rows={2} maxLength={1000}
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-fuchsia-100 focus:border-fuchsia-400 transition-all duration-200 resize-none placeholder:text-gray-400"
                  />
                  {commentToMediator.length > 800 && (
                    <p className="text-xs text-gray-400 text-right mt-1">{commentToMediator.length}/1000</p>
                  )}
                </div>
              </div>

              {/* Protection note */}
              <div className="flex items-start gap-3 px-4 py-3 rounded-xl bg-emerald-50 border border-emerald-100">
                <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                <p className="text-xs text-emerald-700 leading-relaxed">
                  Данные получателя (ФИО и телефон) вы передадите посреднику только в чате, после того как выберете его.
                </p>
              </div>

              <BottomAction>
                <button type="button" onClick={submitOrder} disabled={submitting}
                  className="w-full py-4 rounded-2xl text-white font-bold text-sm shadow-lg transition-all duration-200 hover:-translate-y-0.5 hover:shadow-xl active:scale-[.98] flex items-center justify-center gap-2 disabled:opacity-60"
                  style={{ background: "linear-gradient(135deg,#d946ef,#e11d48)" }}
                >
                  {submitting
                    ? <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Публикуем...</>
                    : <><Globe className="w-4 h-4" /> Опубликовать запрос</>
                  }
                </button>
              </BottomAction>
            </div>
          )}

        </div>
      </main>
    </div>
  );
}

// ─── Sub-components ───────────────────────────────────────────────

function CartSkeleton() {
  return (
    <div className="flex flex-col lg:flex-row gap-4">
      <div className="flex-1 space-y-3">
        {[0, 1, 2].map((i) => (
          <div key={i} className="bg-white rounded-2xl border border-gray-100 p-4 flex gap-4 shadow-sm">
            <div className="w-20 h-20 rounded-xl bg-gray-100 animate-pulse shrink-0" />
            <div className="flex-1 space-y-2 py-1">
              <div className="h-4 bg-gray-100 rounded-lg w-3/4 animate-pulse" />
              <div className="h-3 bg-gray-50 rounded-lg w-1/2 animate-pulse" />
              <div className="h-5 bg-gray-100 rounded-lg w-1/3 animate-pulse" />
              <div className="h-8 bg-gray-100 rounded-xl w-28 animate-pulse" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function CartItemCard({ item, busy, onQty, onRemove }: {
  item: CartItemDto; busy: boolean; onQty: (qty: number) => void; onRemove: () => void;
}) {
  return (
    <div className={`bg-white rounded-2xl border border-gray-100 shadow-sm transition-all duration-200 hover:shadow-md hover:border-gray-200 overflow-hidden ${busy ? "opacity-50 pointer-events-none" : ""}`}>
      <div className="p-3.5 sm:p-4 flex gap-3 sm:gap-4">
        {/* Image */}
        <div className="w-20 h-20 sm:w-22 sm:h-22 rounded-xl overflow-hidden bg-gray-50 border border-gray-100 shrink-0 relative">
          {item.selectedPhotoUrl || item.imageUrl ? (
            <div className="absolute inset-0 rounded-xl overflow-hidden">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={item.selectedPhotoUrl || item.imageUrl!}
                alt=""
                className="w-full h-full object-cover transition-transform duration-300 hover:scale-105"
              />
            </div>
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <Package className="w-6 h-6 text-gray-300" />
            </div>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0 overflow-hidden flex flex-col gap-1.5">
          {/* Title */}
          <p className="text-sm font-bold text-gray-900 line-clamp-2 leading-snug">{item.title}</p>

          {/* Clarification */}
          {item.clarification && (
            <div className="flex items-start gap-1.5 overflow-hidden">
              <MessageCircle className="w-3 h-3 text-fuchsia-400 shrink-0 mt-px" />
              <p className="text-xs text-gray-500 leading-snug line-clamp-2 break-all min-w-0 overflow-hidden">{item.clarification}</p>
            </div>
          )}

          {/* Price row */}
          <div className="flex items-center gap-2 mt-auto">
            <p className="text-[15px] font-extrabold leading-none" style={{ color: "#a21caf" }}>
              {formatPrice(item.price * item.qty, item.currency)}
            </p>
            {item.qty > 1 && (
              <span className="text-[11px] text-gray-400 leading-none">
                {formatPrice(item.price, item.currency)} × {item.qty}
              </span>
            )}
            {item.stock <= 5 && item.stock > 0 && (
              <span className="ml-auto text-[11px] text-orange-600 font-semibold bg-orange-50 px-2 py-0.5 rounded-full">
                Осталось {item.stock}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Bottom controls bar */}
      <div className="px-3.5 sm:px-4 py-2.5 border-t border-gray-50 bg-gray-50/50 flex items-center gap-2">
        {/* Qty stepper */}
        <div className="flex items-center rounded-xl border border-gray-200 bg-white overflow-hidden">
          <button
            type="button"
            onClick={() => item.qty > 1 && onQty(item.qty - 1)}
            disabled={item.qty <= 1 || busy}
            className="w-8 h-8 flex items-center justify-center text-gray-500 hover:bg-gray-100 transition-colors active:scale-90 disabled:opacity-30"
          >
            <Minus className="w-3 h-3" />
          </button>
          <span className="w-8 text-center text-sm font-bold text-gray-800 select-none">{item.qty}</span>
          <button
            type="button"
            onClick={() => onQty(item.qty + 1)}
            disabled={busy}
            className="w-8 h-8 flex items-center justify-center text-gray-500 hover:bg-gray-100 transition-colors active:scale-90"
          >
            <Plus className="w-3 h-3" />
          </button>
        </div>

        {/* Remove */}
        <button
          type="button"
          onClick={onRemove}
          disabled={busy}
          className="ml-auto flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-gray-400 hover:text-red-500 hover:bg-red-50 transition-all duration-200 active:scale-90 text-xs font-medium"
        >
          <Trash2 className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Удалить</span>
        </button>
      </div>
    </div>
  );
}

function MediatorSkeleton() {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm">
      <div className="flex items-start gap-3">
        <div className="w-12 h-12 rounded-full bg-gray-100 animate-pulse shrink-0" />
        <div className="flex-1 space-y-2">
          <div className="h-4 bg-gray-100 rounded-lg w-1/2 animate-pulse" />
          <div className="h-3 bg-gray-50 rounded-lg w-3/4 animate-pulse" />
          <div className="h-6 bg-gray-100 rounded-full w-24 animate-pulse" />
        </div>
      </div>
    </div>
  );
}

// ── Mediator card helpers ──────────────────────────────────────────

const HIGHLIGHT_MAP: Record<string, { emoji: string; text: string }> = {
  h1:  { emoji: "⚡", text: "Отвечаю в течение часа" },
  h2:  { emoji: "📸", text: "Фотоотчёт перед покупкой" },
  h3:  { emoji: "🛡️", text: "Гарантирую оригинальность" },
  h4:  { emoji: "💰", text: "Найду товар дешевле" },
  h5:  { emoji: "🚀", text: "Оформляю в день обращения" },
  h6:  { emoji: "🔄", text: "Помогаю с возвратом" },
  h7:  { emoji: "🌍", text: "Зарубежные площадки" },
  h8:  { emoji: "📦", text: "Групповые заказы" },
  h9:  { emoji: "🎯", text: "Подберу аналог" },
  h10: { emoji: "💬", text: "На связи 24/7" },
};

type BadgeKey = "rating" | "commission" | "orders" | "minOrder" | "rank";

function getBadgeLabel(key: BadgeKey, m: MediatorItem): string {
  if (key === "rating") {
    if (m.reviewRating != null) return `${m.reviewRating.toFixed(1)} ★`;
    return m.reviewCount === 0 ? "Нет отзывов" : "—";
  }
  if (key === "commission") return m.negotiableRate ? "Договорная" : `${m.commissionRate}%`;
  if (key === "orders")     return `${m.completedOrders ?? 0} заказов`;
  if (key === "minOrder")   return `от ${(m.minOrderAmount ?? 0).toLocaleString("ru-RU")} ₽`;
  return "—";
}

function MediatorCard({ mediator, selected, expanded, onExpand, onSelect, cartTotal }: {
  mediator: MediatorItem;
  selected: boolean;
  expanded: boolean;
  onExpand: () => void;
  onSelect: () => void;
  cartTotal: number;
}) {
  const commission = Math.round(cartTotal * mediator.commissionRate / 100);
  const disabled = cartTotal > 0 && cartTotal < mediator.minOrderAmount;
  const initials = mediator.firstName[0]?.toUpperCase() ?? "?";
  const hue = initials.charCodeAt(0) * 37 % 360;

  const compactBadges: BadgeKey[] = (mediator.compactBadges && mediator.compactBadges.length > 0)
    ? mediator.compactBadges as BadgeKey[]
    : ["rating", "commission", "orders"];

  return (
    <div
      className={`rounded-2xl border-2 overflow-hidden transition-all duration-200 shadow-sm ${
        disabled ? "opacity-55" : ""
      } ${selected ? "shadow-lg" : "hover:shadow-md"}`}
      style={{
        borderColor: selected ? "#d946ef" : expanded ? "#e879f9" : "#f3f4f6",
        background: "white",
      }}
    >
      {/* ── Compact header — click to select ── */}
      <div
        role="button"
        tabIndex={disabled ? -1 : 0}
        onClick={() => { if (!disabled) onSelect(); }}
        onKeyDown={(e) => { if (!disabled && (e.key === "Enter" || e.key === " ")) onSelect(); }}
        className={`p-4 ${disabled ? "cursor-not-allowed" : "cursor-pointer"}`}
      >
        <div className="flex items-center gap-3">
          {/* Avatar */}
          <div className="relative shrink-0">
            <div
              className="w-12 h-12 rounded-full overflow-hidden flex items-center justify-center text-white font-bold text-lg"
              style={{ background: mediator.avatarUrl ? undefined : `hsl(${hue},55%,52%)` }}
            >
              {mediator.avatarUrl
                ? <img src={mediator.avatarUrl} alt="" className="w-full h-full object-cover" />
                : initials
              }
            </div>
            {mediator.isOnline && (
              <div className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full bg-emerald-400 border-2 border-white" />
            )}
          </div>

          {/* Name + status */}
          <div className="flex-1 min-w-0">
            <p className="font-bold text-sm text-gray-900 truncate">{mediator.firstName} {mediator.lastName}</p>
            <div className="flex items-center gap-2 mt-0.5 flex-wrap">
              <span className="inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-full bg-emerald-50 text-emerald-600 font-medium border border-emerald-100">
                <CheckCircle2 className="w-2.5 h-2.5" /> Проверен
              </span>
              {mediator.isOnline ? (
                <span className="inline-flex items-center gap-1 text-[10px] text-emerald-500 font-medium">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" /> В сети
                </span>
              ) : (
                <span className="text-[10px] text-gray-400">Офлайн</span>
              )}
            </div>
          </div>

          {/* Checkmark when selected */}
          {selected && (
            <div className="w-7 h-7 rounded-full flex items-center justify-center shrink-0 shadow"
              style={{ background: "linear-gradient(135deg,#d946ef,#e11d48)" }}>
              <CheckCircle2 className="w-4 h-4 text-white" strokeWidth={2.5} />
            </div>
          )}
        </div>

        {/* Compact badges */}
        <div className="flex flex-wrap gap-1.5 mt-3">
          {compactBadges.map((key) => (
            <span key={key}
              className="text-[11px] px-2.5 py-1 rounded-full font-medium border"
              style={{
                background: selected ? "linear-gradient(135deg,#d946ef,#e11d48)" : "#fdf4ff",
                color: selected ? "#fff" : "#86198f",
                borderColor: selected ? "transparent" : "#f5d0fe",
              }}
            >
              {getBadgeLabel(key, mediator)}
            </span>
          ))}
          {disabled && (
            <span className="text-[11px] px-2.5 py-1 rounded-full font-medium bg-red-50 text-red-500 border border-red-100 flex items-center gap-1">
              <AlertCircle className="w-3 h-3" /> Мин. {formatPrice(mediator.minOrderAmount, "RUB")}
            </span>
          )}
        </div>
      </div>

      {/* ── "Подробнее" row ── */}
      <div className="px-4 pb-3 flex justify-end border-t border-gray-50">
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); onExpand(); }}
          disabled={disabled}
          className="mt-2 text-[11px] text-fuchsia-600 font-semibold px-2.5 py-1.5 rounded-lg bg-fuchsia-50 hover:bg-fuchsia-100 transition border border-fuchsia-100 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {expanded ? "Скрыть" : "Подробнее"}
        </button>
      </div>

      {/* ── Expanded details ── */}
      {expanded && !disabled && (
        <div className="border-t border-gray-100">
          {mediator.description && (
            <div className="px-4 pt-4">
              <p className="text-sm text-gray-600 leading-relaxed">{mediator.description}</p>
            </div>
          )}

          <div className="grid grid-cols-2 gap-2 px-4 pt-3.5 text-sm">
            <div className="bg-gray-50 rounded-xl px-3 py-2.5 border border-gray-100">
              <p className="text-[10px] text-gray-400 uppercase tracking-wide">Отзывы</p>
              {mediator.reviewRating != null ? (
                <>
                  <div className="flex items-center gap-1 mt-0.5">
                    {[1,2,3,4,5].map((s) => (
                      <svg key={s} className={`w-3 h-3 ${s <= Math.round(mediator.reviewRating!) ? "text-amber-400" : "text-gray-200"}`}
                        fill="currentColor" viewBox="0 0 20 20">
                        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                      </svg>
                    ))}
                    <span className="text-xs font-bold text-gray-800 ml-0.5">{mediator.reviewRating.toFixed(1)}</span>
                  </div>
                  <p className="text-[11px] text-gray-400 mt-0.5">{mediator.reviewCount} {(mediator.reviewCount ?? 0) === 1 ? "отзыв" : (mediator.reviewCount ?? 0) <= 4 ? "отзыва" : "отзывов"}</p>
                </>
              ) : (
                <p className="font-medium mt-0.5 text-gray-400 text-xs">Пока нет отзывов</p>
              )}
            </div>
            <div className="bg-gray-50 rounded-xl px-3 py-2.5 border border-gray-100">
              <p className="text-[10px] text-gray-400 uppercase tracking-wide">Комиссия</p>
              <p className="font-bold mt-0.5 text-gray-800">
                {mediator.negotiableRate ? "Договорная" : `${mediator.commissionRate}%`}
              </p>
              {!mediator.negotiableRate && cartTotal > 0 && (
                <p className="text-[11px] text-gray-400 mt-0.5">≈ {formatPrice(commission, "RUB")}</p>
              )}
            </div>
            <div className="bg-gray-50 rounded-xl px-3 py-2.5 border border-gray-100">
              <p className="text-[10px] text-gray-400 uppercase tracking-wide">Мин. заказ</p>
              <p className="font-bold mt-0.5 text-gray-800">от {mediator.minOrderAmount.toLocaleString("ru-RU")} ₽</p>
            </div>
            <div className="bg-gray-50 rounded-xl px-3 py-2.5 border border-gray-100">
              <p className="text-[10px] text-gray-400 uppercase tracking-wide">Выполнено</p>
              <p className="font-bold mt-0.5 text-gray-800">{mediator.completedOrders ?? 0} заказов</p>
            </div>
          </div>

          {mediator.tags && mediator.tags.length > 0 && (
            <div className="px-4 pt-3 flex flex-wrap gap-1.5">
              {mediator.tags.map((t) => (
                <span key={t} className="text-[11px] px-2.5 py-1 rounded-full bg-fuchsia-50 text-fuchsia-600 border border-fuchsia-100 font-medium">{t}</span>
              ))}
            </div>
          )}

          {mediator.highlights && mediator.highlights.length > 0 && (
            <div className="px-4 pt-3 pb-4 space-y-1.5">
              {mediator.highlights.map((id) => {
                const h = HIGHLIGHT_MAP[id];
                if (!h) return null;
                return (
                  <div key={id} className="flex items-center gap-2 text-sm text-gray-600">
                    <span className="text-base leading-none">{h.emoji}</span>
                    <span>{h.text}</span>
                  </div>
                );
              })}
            </div>
          )}

          {!mediator.highlights?.length && !mediator.tags?.length && !mediator.description && (
            <div className="pb-4" />
          )}
        </div>
      )}
    </div>
  );
}

function BottomAction({ children }: { children: React.ReactNode }) {
  return (
    <>
      <div className="sm:hidden fixed bottom-14 left-0 right-0 z-40 pointer-events-none">
        <div className="px-4 pb-4 pt-12 pointer-events-auto"
          style={{ background: "linear-gradient(to top, #fdf4ff 58%, transparent 100%)" }}
        >
          <div className="max-w-xl mx-auto">{children}</div>
        </div>
      </div>
      <div className="hidden sm:block sticky bottom-0 z-30 mt-6 -mx-1 px-1 pt-6 pb-4"
        style={{ background: "linear-gradient(to top, #fdf4ff 60%, transparent 100%)" }}
      >{children}</div>
    </>
  );
}
