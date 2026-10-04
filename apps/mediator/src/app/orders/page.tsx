"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  Package, RefreshCw, Search, ChevronRight, Globe,
  BellRing, Archive, Loader2,
} from "lucide-react";
import { BottomNav } from "@/components/BottomNav";
import { VerificationBanner } from "@/components/VerificationBanner";
import { useMediator } from "@/hooks/useMediator";
import { api } from "@/lib/api";
import { markOrdersNewTabSeen } from "@/hooks/useNavBadges";

// ── Types ────────────────────────────────────────────────────────────────────

interface OrderItem {
  id: string;
  title: string;
  price: number;
  qty: number;
  imageUrl?: string | null;
  pavilionNumber?: string | null;
  locationName?: string | null;
  mediatorStatus: string;
}

interface OrderRow {
  id: string;
  type: "direct" | "broadcast";
  zid: string;
  buyerName: string;
  status: string;
  totalAmount: number;
  commission: number;
  itemsCount: number;
  items: OrderItem[];
  createdAt: string;
  comment?: string | null;
}

// ── Config ────────────────────────────────────────────────────────────────────

const STATUS_CFG: Record<string, { label: string; color: string; dotColor: string }> = {
  CREATED:                { label: "Новая",       color: "#7c3aed", dotColor: "#7c3aed" },
  ACCEPTED:               { label: "В работе",    color: "#2563eb", dotColor: "#2563eb" },
  ASSIGNED:               { label: "Назначен",    color: "#d97706", dotColor: "#d97706" },
  AWAITING_PURCHASE_DATE: { label: "Ожид. даты",  color: "#d97706", dotColor: "#d97706" },
  PURCHASING:             { label: "Закупка",     color: "#2563eb", dotColor: "#2563eb" },
  DELIVERING:             { label: "Доставка",    color: "#0891b2", dotColor: "#0891b2" },
  COMPLETED:              { label: "Завершён",    color: "#16a34a", dotColor: "#16a34a" },
  CANCELLED:              { label: "Отменён",     color: "#dc2626", dotColor: "#dc2626" },
  SEARCHING:              { label: "Поиск",       color: "#d97706", dotColor: "#d97706" },
  SELECTING:              { label: "Выбор",       color: "#b45309", dotColor: "#b45309" },
  NOT_FOUND:              { label: "Не найден",   color: "#dc2626", dotColor: "#dc2626" },
  DISPUTE:                { label: "Спор",        color: "#ea580c", dotColor: "#ea580c" },
};

const WORK_STATUSES = ["ACCEPTED","SEARCHING","SELECTING","ASSIGNED","AWAITING_PURCHASE_DATE","PURCHASING","DELIVERING"];
const DONE_STATUSES = ["COMPLETED","CANCELLED","NOT_FOUND","DISPUTE"];

type FilterKey = "active" | "new" | "done";

// ── Helpers ──────────────────────────────────────────────────────────────────

function fmtRaw(n: number) { return n.toLocaleString("ru-RU") + " ₽"; }

function relativeTime(iso?: string): string {
  if (!iso) return "";
  const m = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (m < 1) return "сейчас";
  if (m < 60) return `${m} мин назад`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} ч назад`;
  return new Date(iso).toLocaleDateString("ru-RU", { day: "numeric", month: "short" });
}

function avatarGradient(name: string): string {
  const g = [
    "linear-gradient(135deg,#6366f1,#a855f7)",
    "linear-gradient(135deg,#0ea5e9,#6366f1)",
    "linear-gradient(135deg,#10b981,#0ea5e9)",
    "linear-gradient(135deg,#f59e0b,#ef4444)",
    "linear-gradient(135deg,#ec4899,#a855f7)",
    "linear-gradient(135deg,#14b8a6,#6366f1)",
  ];
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) & 0xffff;
  return g[h % g.length];
}

function getStatusDescription(order: OrderRow): string {
  const urgentItems = order.items.filter((i) => i.mediatorStatus === "REPLACEMENT_REQUESTED");
  const foundItems  = order.items.filter((i) => ["FOUND","REPLACEMENT_APPROVED"].includes(i.mediatorStatus));
  const notFound    = order.items.filter((i) => i.mediatorStatus === "NOT_FOUND");

  if (urgentItems.length > 0)
    return `Ждёт одобрения замены · ${urgentItems.length} тов.`;
  if (order.items.length > 0 && foundItems.length === order.items.length)
    return `Все товары найдены (${foundItems.length})`;
  if (order.items.length > 0 && foundItems.length > 0)
    return `Найдено ${foundItems.length} из ${order.items.length}`;
  if (notFound.length > 0)
    return `Не найдено: ${notFound.length} тов.`;

  const map: Record<string, string> = {
    CREATED:                "Новая заявка — ожидает принятия",
    ACCEPTED:               "Оформление заказа в чате",
    SEARCHING:              "Поиск товаров на рынке",
    SELECTING:              "Выбор подходящих вариантов",
    ASSIGNED:               "Посредник назначен",
    AWAITING_PURCHASE_DATE: "Ожидание даты закупки",
    PURCHASING:             "Идёт закупка товаров",
    DELIVERING:             "Передача покупателю",
    COMPLETED:              "Заказ успешно завершён",
    CANCELLED:              "Заказ отменён",
    NOT_FOUND:              "Товары не найдены",
    DISPUTE:                "Открыт спор",
  };
  return map[order.status] ?? STATUS_CFG[order.status]?.label ?? "—";
}

function getCardAccent(order: OrderRow): { border: string; badge: string } {
  const urgent = order.items.some((i) => i.mediatorStatus === "REPLACEMENT_REQUESTED");
  if (urgent) return { border: "#f59e0b", badge: "orange" };
  if (DONE_STATUSES.includes(order.status)) return { border: "#e5e5e7", badge: "gray" };
  if (["COMPLETED"].includes(order.status)) return { border: "#16a34a", badge: "green" };
  if (["CANCELLED","NOT_FOUND"].includes(order.status)) return { border: "#dc2626", badge: "red" };
  return { border: "#6366f1", badge: "indigo" };
}

function mapDirectOrder(o: any): OrderRow {
  const buyerName = o.buyer
    ? `${o.buyer.firstName ?? ""} ${o.buyer.lastName ?? ""}`.trim() || "Клиент"
    : "Клиент";
  return {
    id: o.id, type: "direct", zid: `R-${o.id.slice(-4)}`, buyerName,
    status: o.status,
    totalAmount: Math.round((o.totalItemsPrice ?? o.totalAmount ?? 0) / 100),
    commission: Math.round((o.totalCommission ?? 0) / 100),
    itemsCount: (o.items ?? []).length,
    items: (o.items ?? []).map((i: any) => ({
      id: i.id, title: i.title ?? i.titleSnapshot ?? "Товар",
      price: i.price ?? i.priceSnapshot ?? 0, qty: i.qty ?? 1,
      imageUrl: i.imageUrl ?? i.imageUrlSnapshot ?? null,
      pavilionNumber: i.pavilionNumber ?? null, locationName: i.locationName ?? null,
      mediatorStatus: i.mediatorStatus ?? "PENDING",
    })),
    createdAt: o.createdAt, comment: o.comment ?? null,
  };
}

function mapBroadcastOrder(o: any): OrderRow {
  return {
    id: o.id, type: "broadcast",
    zid: o.zid || `Z-${o.id.slice(-4)}`,
    buyerName: o.buyerName || "Клиент",
    status: o.status,
    totalAmount: Math.round((o.totalEstimatedAmount || o.totalActualAmount || 0) / 100),
    commission: Math.round((o.mediatorCommissionAmount || 0) / 100),
    itemsCount: o.itemsCount || (o.items?.length ?? 0),
    items: [], createdAt: o.createdAt, comment: null,
  };
}

// ── Order Card ────────────────────────────────────────────────────────────────

function OrderCard({ order, onClick }: { order: OrderRow; onClick: () => void }) {
  const cfg    = STATUS_CFG[order.status];
  const accent = getCardAccent(order);
  const desc   = getStatusDescription(order);
  const urgent = order.items.some((i) => i.mediatorStatus === "REPLACEMENT_REQUESTED");
  const foundCount = order.items.filter((i) => ["FOUND","REPLACEMENT_APPROVED"].includes(i.mediatorStatus)).length;
  const progress = order.items.length > 0 ? (foundCount / order.items.length) * 100 : 0;
  const firstImg = order.items.find((i) => i.imageUrl)?.imageUrl;

  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full text-left rounded-2xl bg-background transition active:scale-[0.99] overflow-hidden"
      style={{
        border: `1px solid var(--color-border)`,
        borderLeft: `4px solid ${accent.border}`,
        boxShadow: urgent
          ? "0 2px 12px rgba(245,158,11,0.15)"
          : "0 1px 4px rgba(0,0,0,0.06)",
      }}
    >
      <div className="p-4">
        {/* Top: avatar + name + time + chevron */}
        <div className="flex items-center gap-3 mb-3">
          <div className="relative shrink-0">
            <div
              className="w-11 h-11 rounded-full flex items-center justify-center text-white font-bold text-base"
              style={{ background: avatarGradient(order.buyerName) }}
            >
              {order.buyerName[0]?.toUpperCase()}
            </div>
            {order.type === "broadcast" && (
              <div className="absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full border-2 border-background flex items-center justify-center" style={{ background: "#6366f1" }}>
                <Globe className="w-2.5 h-2.5 text-white" />
              </div>
            )}
            {order.type === "direct" && (
              <div className="absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full border-2 border-background flex items-center justify-center text-[8px] font-bold text-white" style={{ background: "#a855f7" }}>
                П
              </div>
            )}
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-0.5">
              <p className="text-[14px] font-bold truncate text-foreground">{order.buyerName}</p>
              {urgent && (
                <span className="px-1.5 py-0.5 rounded-full text-[9px] font-bold bg-amber-100 text-amber-700 shrink-0 animate-pulse">
                  Ждёт ответа
                </span>
              )}
            </div>
            <p className="text-[12px] text-muted truncate">{desc}</p>
          </div>

          <div className="flex flex-col items-end gap-1 shrink-0">
            <span className="text-[11px] text-muted">{relativeTime(order.createdAt)}</span>
            <ChevronRight className="w-4 h-4 text-muted/40" />
          </div>
        </div>

        {/* Image strip */}
        {firstImg && (
          <div className="flex gap-2 mb-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={firstImg} alt="" className="w-14 h-14 rounded-xl object-cover shrink-0" style={{ border: "1px solid var(--color-border)" }} />
            {order.items.slice(1, 3).filter((i) => i.imageUrl).map((i) => (
              // eslint-disable-next-line @next/next/no-img-element
              <img key={i.id} src={i.imageUrl!} alt="" className="w-10 h-10 rounded-lg object-cover" style={{ border: "1px solid var(--color-border)" }} />
            ))}
            {order.itemsCount > 3 && (
              <div className="w-10 h-10 rounded-lg flex items-center justify-center text-xs font-bold text-muted bg-card" style={{ border: "1px solid var(--color-border)" }}>
                +{order.itemsCount - 3}
              </div>
            )}
          </div>
        )}

        {/* Progress bar */}
        {order.type === "direct" && order.items.length > 0 && (
          <div className="mb-3">
            <div className="flex justify-between text-[10px] mb-1">
              <span className="text-muted">Товары найдены</span>
              <span className={`font-semibold ${foundCount === order.items.length ? "text-emerald-600" : "text-foreground"}`}>
                {foundCount} / {order.items.length}
              </span>
            </div>
            <div className="h-1.5 rounded-full bg-card overflow-hidden" style={{ border: "1px solid var(--color-border)" }}>
              <div
                className="h-full rounded-full transition-all duration-700"
                style={{
                  width: `${progress}%`,
                  background: foundCount === order.items.length
                    ? "linear-gradient(90deg,#16a34a,#0d9488)"
                    : "linear-gradient(90deg,#6366f1,#a855f7)",
                }}
              />
            </div>
          </div>
        )}

        {/* Footer: status + amount */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full shrink-0" style={{ background: cfg?.dotColor ?? "#6b7280" }} />
            <span className="text-[11px] font-semibold" style={{ color: cfg?.color ?? "#6b7280" }}>
              {cfg?.label ?? order.status}
            </span>
            <span className="text-[10px] text-muted/50 font-mono ml-1">{order.zid}</span>
          </div>
          <p className="text-[14px] font-bold text-foreground">{fmtRaw(order.totalAmount)}</p>
        </div>
      </div>
    </button>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function OrdersListPage() {
  const { profile, loading: profileLoading, isApproved, user } = useMediator();
  const router = useRouter();

  const [orders, setOrders]       = useState<OrderRow[]>([]);
  const [filter, setFilter]       = useState<FilterKey>("active");
  const [searchQ, setSearchQ]     = useState("");
  const [loading, setLoading]     = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadOrders = useCallback(async (silent = false) => {
    if (!isApproved || !user?.id) return;
    if (!silent) setLoading(true); else setRefreshing(true);
    try {
      const [direct, broadcast] = await Promise.all([
        api.get<any[]>("/order-requests").catch(() => []),
        api.get<any[]>("/mediator-orders/mediator/my").catch(() => []),
      ]);
      const directMapped = (Array.isArray(direct) ? direct : [])
        .filter((o: any) => o.mediator?.id === user.id)
        .map(mapDirectOrder);
      const broadcastMapped = (Array.isArray(broadcast) ? broadcast : []).map(mapBroadcastOrder);
      setOrders(
        [...directMapped, ...broadcastMapped].sort(
          (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        )
      );
    } finally { setLoading(false); setRefreshing(false); }
  }, [isApproved, user?.id]);

  useEffect(() => { if (!isApproved || profileLoading) return; loadOrders(); }, [isApproved, profileLoading, loadOrders]);
  useEffect(() => {
    if (!isApproved) return;
    const id = setInterval(() => loadOrders(true), 12000);
    return () => clearInterval(id);
  }, [isApproved, loadOrders]);

  const filtered = orders.filter((o) => {
    if (filter === "active" && !WORK_STATUSES.includes(o.status)) return false;
    if (filter === "new"    && o.status !== "CREATED") return false;
    if (filter === "done"   && !DONE_STATUSES.includes(o.status)) return false;
    if (searchQ) {
      const q = searchQ.toLowerCase();
      if (!o.buyerName.toLowerCase().includes(q) && !o.zid.toLowerCase().includes(q)) return false;
    }
    return true;
  });

  const counts = {
    active: orders.filter((o) => WORK_STATUSES.includes(o.status)).length,
    new:    orders.filter((o) => o.status === "CREATED").length,
    done:   orders.filter((o) => DONE_STATUSES.includes(o.status)).length,
  };

  if (profileLoading) return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <Loader2 className="w-7 h-7 animate-spin text-muted" />
    </div>
  );

  const FILTERS: { id: FilterKey; label: string; Icon: React.ElementType; count: number }[] = [
    { id: "active", label: "Активные", Icon: Package,   count: counts.active },
    { id: "new",    label: "Новые",    Icon: BellRing,  count: counts.new    },
    { id: "done",   label: "Архив",    Icon: Archive,   count: counts.done   },
  ];

  return (
    <div className="min-h-screen pb-24 bg-background">
      <VerificationBanner status={profile?.status ?? null} rejectionReason={profile?.rejectionReason} />

      {!isApproved ? (
        <div className="flex flex-col items-center justify-center pt-32 gap-3 text-center px-6">
          <div className="w-16 h-16 rounded-2xl bg-card flex items-center justify-center">
            <Package className="w-8 h-8 text-muted/30" />
          </div>
          <p className="text-sm text-muted">Раздел недоступен — заявка не одобрена</p>
        </div>
      ) : (
        <>
          {/* ── Sticky header ── */}
          <div
            className="sticky top-0 z-20 bg-background/95 backdrop-blur-xl"
            style={{ borderBottom: "1px solid var(--color-border)", boxShadow: "0 1px 4px rgba(0,0,0,0.06)" }}
          >
            <div className="max-w-lg mx-auto px-4 pt-4 pb-3">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <p className="text-[11px] text-muted font-medium uppercase tracking-wider">Рабочее пространство</p>
                  <h1 className="text-lg font-bold text-foreground">Мои заказы</h1>
                </div>
                <button
                  type="button"
                  onClick={() => loadOrders(true)}
                  disabled={refreshing}
                  className="w-9 h-9 rounded-xl flex items-center justify-center hover:bg-accent transition"
                >
                  <RefreshCw className={`w-4 h-4 text-muted ${refreshing ? "animate-spin" : ""}`} />
                </button>
              </div>

              {/* Search */}
              <div className="relative mb-3">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted pointer-events-none" />
                <input
                  type="search" value={searchQ} onChange={(e) => setSearchQ(e.target.value)}
                  placeholder="Поиск по имени или номеру..."
                  className="w-full rounded-xl pl-9 pr-3 py-2.5 text-[13px] outline-none bg-card placeholder:text-muted"
                  style={{ border: "1px solid var(--color-border)" }}
                />
              </div>

              {/* Filter tabs */}
              <div className="grid grid-cols-3 gap-1.5">
                {FILTERS.map((f) => {
                  const active = filter === f.id;
                  return (
                    <button
                      key={f.id}
                      type="button"
                      onClick={() => { setFilter(f.id); if (f.id === "new") markOrdersNewTabSeen(); }}
                      className="flex items-center justify-center gap-1.5 py-2 rounded-xl text-[12px] font-semibold transition"
                      style={
                        active
                          ? { background: "#6366f1", color: "#fff", boxShadow: "0 2px 8px rgba(99,102,241,0.35)" }
                          : { background: "var(--color-card)", color: "var(--color-muted)", border: "1px solid var(--color-border)" }
                      }
                    >
                      <f.Icon className="w-3.5 h-3.5" />
                      <span>{f.label}</span>
                      {f.count > 0 && (
                        <span
                          className="text-[10px] font-bold px-1 py-0.5 rounded-full"
                          style={active ? { background: "rgba(255,255,255,0.25)" } : { background: "rgba(0,0,0,0.08)" }}
                        >
                          {f.count}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* ── Content ── */}
          <div className="max-w-lg mx-auto px-4 pt-4 space-y-3">
            {loading ? (
              <div className="space-y-3">
                {[0,1,2].map((i) => (
                  <div key={i} className="h-28 rounded-2xl animate-pulse bg-card" style={{ border: "1px solid var(--color-border)" }} />
                ))}
              </div>
            ) : filtered.length === 0 ? (
              <div className="flex flex-col items-center pt-20 gap-3 text-center">
                <div className="w-18 h-18 rounded-2xl bg-card flex items-center justify-center p-5" style={{ border: "1px solid var(--color-border)" }}>
                  <Package className="w-9 h-9 text-muted/30" />
                </div>
                <p className="font-semibold text-[15px]">
                  {searchQ ? "Ничего не найдено"
                    : filter === "active" ? "Нет заказов в работе"
                    : filter === "new"    ? "Новых заявок нет"
                    : "Архив пуст"}
                </p>
                <p className="text-[13px] text-muted max-w-xs">
                  {filter === "active" && "Заказы появятся после того как вы примете заявку"}
                  {filter === "new" && "Новые прямые заявки от покупателей появятся здесь"}
                </p>
                {filter !== "active" && (
                  <button
                    type="button"
                    onClick={() => setFilter("active")}
                    className="mt-1 px-4 py-2 rounded-xl text-[13px] font-semibold bg-card text-muted"
                    style={{ border: "1px solid var(--color-border)" }}
                  >
                    Активные заказы
                  </button>
                )}
                {filter === "active" && (
                  <button
                    type="button"
                    onClick={() => router.push("/dashboard")}
                    className="mt-2 px-5 py-2.5 rounded-xl text-[13px] font-semibold text-white"
                    style={{ background: "linear-gradient(135deg,#6366f1,#a855f7)" }}
                  >
                    Перейти на биржу
                  </button>
                )}
              </div>
            ) : (
              filtered.map((o) => (
                <OrderCard key={o.id} order={o} onClick={() => router.push(`/orders/${o.id}`)} />
              ))
            )}
          </div>
        </>
      )}

      <BottomNav />
    </div>
  );
}
