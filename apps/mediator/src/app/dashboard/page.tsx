"use client";

import { useRef, useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  Zap, Check, WifiOff, ChevronRight, Power,
  Package, Globe, Lock, Users, RefreshCw,
  X, Sparkles, TrendingUp, Clock, Send,
} from "lucide-react";
import { BottomNav } from "@/components/BottomNav";
import { VerificationBanner } from "@/components/VerificationBanner";
import { useMediator } from "@/hooks/useMediator";
import { api } from "@/lib/api";

// ─── Keyframes ────────────────────────────────────────────────────────────────

const STYLES = `
  @keyframes ring-expand {
    0%   { transform: scale(0.9); opacity: 0.4; }
    100% { transform: scale(1.8); opacity: 0;   }
  }
  @keyframes chevron-flow {
    0%,100% { opacity: 0.2; transform: translateX(0);    }
    50%      { opacity: 0.6;  transform: translateX(4px); }
  }
  @keyframes online-in {
    0%   { opacity: 0; transform: translateY(10px); }
    100% { opacity: 1; transform: translateY(0); }
  }
  @keyframes glow-pulse {
    0%,100% { box-shadow: 0 0 0 0 rgba(22,163,74,0.2); }
    50%     { box-shadow: 0 0 0 8px rgba(22,163,74,0); }
  }
  @keyframes modal-up {
    from { transform: translateY(100%); opacity: 0; }
    to   { transform: translateY(0);    opacity: 1; }
  }
  @keyframes badge-pop {
    0%   { transform: scale(0.8); opacity: 0; }
    70%  { transform: scale(1.1); }
    100% { transform: scale(1);   opacity: 1; }
  }
`;

// ─── Types ────────────────────────────────────────────────────────────────────

interface OrderItem {
  id: string;
  name: string;
  clarification?: string | null;
  quantity: number;
  price: number;
  imageUrl?: string | null;
  pavilionNumber?: string | null;
  locationName?: string | null;
}

interface NewDirectRequest {
  id: string;
  zid: string;
  buyerName: string;
  buyerAvatar?: string | null;
  description: string;
  items: OrderItem[];
  itemsCount: number;
  totalAmount: number;
  commission: number;
  createdAt: string;
  comment?: string | null;
}

interface AvailableOrder {
  id: string;
  zid: string;
  buyerName: string;
  buyerAvatar?: string | null;
  description: string;
  items: OrderItem[];
  totalAmount: number;
  commissionRate: number;
  estimatedCommission: number;
  createdAt: string;
  respondersCount: number;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const MAX_ACTIVE = 5;

function fmt(n: number) {
  return n.toLocaleString("ru-RU") + " ₽";
}

const PAV_ROWS = ["А", "Б", "В", "Г", "Д", "С", "К", "М"];
function pavilionPlaceholder(itemId: string): string {
  let h = 0;
  for (let i = 0; i < itemId.length; i++) h = (h * 31 + itemId.charCodeAt(i)) & 0xffff;
  const row = PAV_ROWS[h % PAV_ROWS.length];
  const num = (h % 15) + 1;
  const pos = ((h >> 4) % 5) + 1;
  return `${row}${num}-П${pos}`;
}

const AVATAR_GRADIENTS = [
  "linear-gradient(135deg,#f97316,#ef4444)",
  "linear-gradient(135deg,#6366f1,#a855f7)",
  "linear-gradient(135deg,#0ea5e9,#6366f1)",
  "linear-gradient(135deg,#10b981,#0ea5e9)",
  "linear-gradient(135deg,#ec4899,#a855f7)",
  "linear-gradient(135deg,#14b8a6,#6366f1)",
];
function avatarGradient(name: string): string {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) & 0xffff;
  return AVATAR_GRADIENTS[h % AVATAR_GRADIENTS.length];
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("ru-RU", {
    day: "numeric", month: "short", hour: "2-digit", minute: "2-digit",
  });
}

function kopToRub(n: number) { return Math.round(n / 100); }

function relativeTime(iso?: string): string {
  if (!iso) return "";
  const m = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (m < 1) return "сейчас";
  if (m < 60) return `${m} мин назад`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} ч назад`;
  return new Date(iso).toLocaleDateString("ru-RU", { day: "numeric", month: "short" });
}

function shortBuyerName(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2 && parts[1]?.length > 0) return `${parts[0]} ${parts[1][0]}.`;
  return parts[0] || "Клиент";
}

function mapDirectRequest(o: any): NewDirectRequest {
  const buyerName = o.buyer
    ? `${o.buyer.firstName ?? ""} ${o.buyer.lastName ?? ""}`.trim() || "Клиент"
    : "Клиент";
  return {
    id: o.id,
    zid: `R-${o.id.slice(-4)}`,
    buyerName,
    buyerAvatar: o.buyer?.avatarUrl ?? null,
    items: (o.items || []).map((i: any) => ({
      id: i.id,
      name: i.title || i.titleSnapshot || "Товар",
      clarification: i.comment || i.note || null,
      quantity: i.qty || 1,
      price: kopToRub(i.price || 0),
      imageUrl: i.imageUrl ?? i.imageUrlSnapshot ?? null,
      pavilionNumber: i.pavilionNumber ?? null,
      locationName: i.locationName ?? null,
    })),
    itemsCount: (o.items || []).length,
    totalAmount: kopToRub(o.totalItemsPrice || o.totalAmount || 0),
    commission: kopToRub(o.totalCommission || 0),
    description: o.comment || (o.items?.[0] ? (o.items[0].title || o.items[0].titleSnapshot || "") : ""),
    createdAt: o.createdAt,
    comment: o.comment ?? null,
  };
}

function mapAvailableOrder(o: any, commissionRate = 0): AvailableOrder {
  const totalAmount = kopToRub(o.totalEstimatedAmount || 0);
  const buyerName =
    o.buyerName ||
    (o.buyer ? `${o.buyer.firstName ?? ""} ${o.buyer.lastName ?? ""}`.trim() : "") ||
    o.buyer?.name ||
    "Клиент";
  return {
    id: o.id,
    zid: o.zid || `Z-${o.id.slice(-4)}`,
    buyerName,
    buyerAvatar: o.buyerAvatar ?? null,
    items: (o.items || []).map((i: any) => ({
      id: i.id,
      name: i.title || i.categoryName || i.clarification || "Товар",
      clarification: i.clarification || null,
      quantity: i.qty || 1,
      price: kopToRub(i.originalPrice || i.price || 0),
      imageUrl: i.selectedPhotoUrl ?? i.imageUrl ?? null,
      pavilionNumber: i.pavilionNumber ?? null,
      locationName: i.locationName ?? null,
    })),
    totalAmount,
    commissionRate,
    estimatedCommission: commissionRate > 0 ? Math.round(totalAmount * commissionRate / 100) : 0,
    description: (o.items || [])[0]?.clarification || (o.items || [])[0]?.title || "",
    createdAt: o.createdAt,
    respondersCount: o.responsesCount || 0,
  };
}

// ─── Order Detail Modal ───────────────────────────────────────────────────────

interface ModalState {
  order: NewDirectRequest | AvailableOrder;
  isAvailable: boolean;
}

// Deterministic badge color by pavilion string
const PAV_COLORS = [
  { bg: "#fef3c7", text: "#92400e" },
  { bg: "#dcfce7", text: "#166534" },
  { bg: "#ede9fe", text: "#5b21b6" },
  { bg: "#fce7f3", text: "#9d174d" },
  { bg: "#dbeafe", text: "#1e40af" },
  { bg: "#ffedd5", text: "#9a3412" },
];
function pavColor(pav: string) {
  let h = 0;
  for (let i = 0; i < pav.length; i++) h = (h * 31 + pav.charCodeAt(i)) & 0xffff;
  return PAV_COLORS[h % PAV_COLORS.length];
}

function NewOrderModal({
  state, canTake, onClose, onTake, onAcceptDirect,
}: {
  state: ModalState;
  canTake: boolean;
  onClose: () => void;
  onTake: (id: string) => Promise<void>;
  onAcceptDirect: (id: string) => Promise<void>;
}) {
  const { order, isAvailable } = state;
  const direct = !isAvailable ? (order as NewDirectRequest) : null;
  const avail  =  isAvailable ? (order as AvailableOrder) : null;
  const [busy, setBusy] = useState(false);

  const handleAction = async (fn: () => Promise<void>) => {
    setBusy(true);
    try { await fn(); } catch {}
    setBusy(false);
  };

  const itemsList = isAvailable ? avail!.items : (direct?.items ?? []);
  const count = itemsList.length || direct?.itemsCount || 0;
  const commission = isAvailable
    ? (avail!.estimatedCommission > 0 ? fmt(avail!.estimatedCommission) : "По ставке")
    : (direct!.commission > 0 ? fmt(direct!.commission) : "—");

  return (
    <div
      className="fixed inset-0 z-50 flex items-end"
      style={{ background: "rgba(0,0,0,0.45)", backdropFilter: "blur(4px)" }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        className="w-full max-w-lg mx-auto flex flex-col"
        style={{
          background: "#fff",
          borderRadius: "24px 24px 0 0",
          boxShadow: "0 -8px 48px rgba(0,0,0,0.16)",
          animation: "modal-up 0.28s cubic-bezier(0.32,0.72,0,1) both",
          maxHeight: "92vh",
          overflow: "hidden",
        }}
      >
        {/* ── Sticky header ── */}
        <div
          className="shrink-0"
          style={{ background: "#fff", borderBottom: "1px solid var(--border)" }}
        >
          {/* Drag handle */}
          <div className="flex justify-center pt-3 pb-2">
            <div className="w-9 h-1 rounded-full" style={{ background: "#e0e0e5" }} />
          </div>

          {/* Title row */}
          <div className="flex items-start justify-between px-5 pb-3">
            <div className="flex items-center gap-3">
              {/* Buyer avatar */}
              {order.buyerAvatar ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={order.buyerAvatar}
                  alt=""
                  className="w-10 h-10 rounded-full object-cover shrink-0"
                  style={{ border: "1px solid var(--border)" }}
                />
              ) : (
                <div
                  className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm shrink-0"
                  style={{ background: avatarGradient(order.buyerName) }}
                >
                  {order.buyerName[0]?.toUpperCase()}
                </div>
              )}
              <div>
                <p className="text-base font-bold text-foreground leading-tight">
                  {order.buyerName !== "Клиент" ? order.buyerName : order.zid}
                </p>
                <p className="text-xs text-muted mt-0.5">
                  {order.buyerName !== "Клиент" ? `${order.zid} · ` : ""}{fmtDate(order.createdAt)}
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full flex items-center justify-center shrink-0"
              style={{ background: "var(--accent)" }}
            >
              <X className="w-4 h-4 text-muted" />
            </button>
          </div>

          {/* Type badge */}
          <div className="px-5 pb-3">
            <span
              className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1 rounded-full"
              style={isAvailable
                ? { background: "#eef2ff", color: "#4338ca" }
                : { background: "#f5f3ff", color: "#6d28d9" }}
            >
              {isAvailable
                ? <><Globe className="w-3.5 h-3.5" />Биржа</>
                : <><Sparkles className="w-3.5 h-3.5" />Прямая заявка</>}
            </span>
          </div>
        </div>

        {/* ── Scrollable items ── */}
        <div className="overflow-y-auto flex-1 px-5">

          {/* Items header */}
          <p className="text-[11px] font-semibold uppercase tracking-wider pt-4 pb-3" style={{ color: "var(--muted)" }}>
            Товары · {count} {count === 1 ? "позиция" : count < 5 ? "позиции" : "позиций"}
          </p>

          {itemsList.length > 0 ? (
            <div>
              {itemsList.map((item, idx) => {
                const isRealPav = !!item.pavilionNumber;
                const pav = item.pavilionNumber || pavilionPlaceholder(item.id);
                const pc = pavColor(pav);
                const location = item.locationName
                  ? item.locationName.replace(/садовод\s*[—–-]?\s*/i, "").trim()
                  : null;
                const pavLabel = isRealPav
                  ? [pav, location].filter(Boolean).join(" ")
                  : pav;

                return (
                  <div
                    key={item.id}
                    className="flex items-start gap-3 py-3"
                    style={idx < itemsList.length - 1 ? { borderBottom: "1px solid var(--border)" } : {}}
                  >
                    {/* Image */}
                    {item.imageUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={item.imageUrl}
                        alt={item.name}
                        className="w-16 h-16 rounded-xl object-cover shrink-0"
                        style={{ border: "1px solid var(--border)" }}
                      />
                    ) : (
                      <div
                        className="w-16 h-16 rounded-xl shrink-0 flex items-center justify-center"
                        style={{ background: "var(--accent)", border: "1px solid var(--border)" }}
                      >
                        <Package className="w-5 h-5" style={{ color: "var(--muted)", opacity: 0.5 }} />
                      </div>
                    )}

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      {/* Name + Price */}
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-sm font-semibold text-foreground leading-snug">{item.name}</p>
                        <p className="text-sm font-bold text-foreground shrink-0">{fmt(item.price)}</p>
                      </div>

                      {/* Qty + Pavilion label */}
                      <div className="flex items-center justify-between mt-0.5">
                        <p className="text-xs text-muted">× {item.quantity} шт.</p>
                        <p className="text-[11px] text-muted">Павильон</p>
                      </div>

                      {/* Clarification + Pavilion badge */}
                      <div className="flex items-end justify-between gap-2 mt-1">
                        {item.clarification ? (
                          <p className="text-xs leading-snug flex-1" style={{ color: "#4f46e5" }}>
                            {item.clarification}
                          </p>
                        ) : <span className="flex-1" />}
                        <div className="flex flex-col items-end gap-0.5 shrink-0">
                          <span
                            className="text-[11px] font-bold px-2 py-0.5 rounded-full whitespace-nowrap"
                            style={{ background: pc.bg, color: pc.text }}
                          >
                            {pavLabel}
                          </span>
                          {!isRealPav && (
                            <span className="text-[9px] text-muted">примерный</span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-sm text-muted py-2">{direct?.itemsCount ?? 0} позиции в заказе</p>
          )}

          {/* Comment */}
          {direct?.comment && (
            <div
              className="rounded-xl px-4 py-3 my-3"
              style={{ background: "#f5f3ff", border: "1px solid #ddd6fe" }}
            >
              <p className="text-[10px] font-semibold uppercase tracking-wider mb-1" style={{ color: "#7c3aed" }}>
                Комментарий покупателя
              </p>
              <p className="text-sm text-foreground leading-snug">{direct.comment}</p>
            </div>
          )}

          {/* Respondents count */}
          {isAvailable && avail!.respondersCount > 0 && (
            <div className="flex items-center gap-1.5 py-2 mb-1">
              <Users className="w-3.5 h-3.5 text-muted" />
              <p className="text-xs text-muted">
                Уже откликнулись: <span className="font-semibold text-foreground">{avail!.respondersCount}</span>
              </p>
            </div>
          )}
        </div>

        {/* ── Sticky footer ── */}
        <div
          className="shrink-0 px-5 pt-4 pb-8"
          style={{ borderTop: "1px solid var(--border)", background: "#fff" }}
        >
          {/* Summary row */}
          <div className="flex items-start justify-between mb-4">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wider text-muted">Сумма заказа</p>
              <p className="text-xl font-black text-foreground mt-0.5">{fmt(order.totalAmount)}</p>
            </div>
            <div className="text-right">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-muted">
                {isAvailable ? "Ориент. комиссия" : "Ваша комиссия"}
              </p>
              <p className="text-xl font-black mt-0.5" style={{ color: "#16a34a" }}>{commission}</p>
            </div>
          </div>

          {/* Action button */}
          {canTake ? (
            <button
              onClick={() => handleAction(isAvailable ? () => onTake(order.id) : () => onAcceptDirect(order.id))}
              disabled={busy}
              className="w-full py-4 rounded-2xl font-bold text-base flex items-center justify-center gap-2.5 transition active:scale-[0.97] disabled:opacity-60"
              style={{
                background: "linear-gradient(135deg,#7c3aed,#6366f1)",
                color: "#fff",
                boxShadow: "0 4px 20px rgba(99,102,241,0.35)",
              }}
            >
              {busy ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <Send className="w-5 h-5" />
              )}
              {busy ? "Отправляем..." : "Отправить заявку"}
            </button>
          ) : (
            <div
              className="w-full py-4 rounded-2xl text-sm font-semibold flex items-center justify-center gap-2 cursor-not-allowed"
              style={{ background: "var(--accent)", border: "1px solid var(--border)", color: "var(--muted)" }}
            >
              <Lock className="w-4 h-4" />
              {isAvailable ? "Достигнут лимит активных заказов" : "Завершите один заказ чтобы принять заявку"}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Cards ────────────────────────────────────────────────────────────────────

function DirectRequestCard({ order, onClick }: { order: NewDirectRequest; onClick: () => void }) {
  const firstImg = order.items.find((i) => i.imageUrl)?.imageUrl;
  return (
    <button
      onClick={onClick}
      className="w-full flex items-start gap-3 p-3.5 rounded-2xl text-left transition active:scale-[0.99]"
      style={{
        background: "var(--background)",
        border: "1px solid var(--border)",
        borderLeft: "4px solid #7c3aed",
        boxShadow: "0 1px 6px rgba(0,0,0,0.06)",
      }}
    >
      {firstImg ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={firstImg} alt="" className="w-14 h-14 rounded-xl object-cover shrink-0" style={{ border: "1px solid var(--border)" }} />
      ) : (
        <div
          className="w-14 h-14 rounded-xl flex items-center justify-center shrink-0"
          style={{ background: "linear-gradient(135deg, #f5f3ff, #ede9fe)", border: "1px solid #ddd6fe" }}
        >
          <Package className="w-6 h-6" style={{ color: "#7c3aed", opacity: 0.7 }} />
        </div>
      )}
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2 mb-0.5">
          <p className="text-[14px] font-bold text-foreground">
            {shortBuyerName(order.buyerName)}
          </p>
          <span
            className="text-[10px] font-bold px-2 py-0.5 rounded-full text-white shrink-0"
            style={{ background: "#7c3aed", animation: "badge-pop 0.3s ease both" }}
          >
            Новая
          </span>
        </div>
        {order.description ? (
          <p className="text-[12px] text-muted line-clamp-2 mb-1.5">{order.description}</p>
        ) : (
          <p className="text-[12px] text-muted mb-1.5">
            {order.itemsCount} {order.itemsCount === 1 ? "товар" : order.itemsCount < 5 ? "товара" : "товаров"} · {fmt(order.totalAmount)}
          </p>
        )}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1 text-[11px] text-muted">
            <Clock className="w-3 h-3" />
            <span>{relativeTime(order.createdAt)}</span>
          </div>
          {order.commission > 0 && (
            <span className="text-[12px] font-bold" style={{ color: "#16a34a" }}>+{fmt(order.commission)}</span>
          )}
        </div>
      </div>
    </button>
  );
}

function AvailableCard({ order, canTake, onClick }: { order: AvailableOrder; canTake: boolean; onClick: () => void }) {
  const firstImg = order.items.find((i) => i.imageUrl)?.imageUrl;
  return (
    <button
      onClick={onClick}
      className="w-full flex items-start gap-3 p-3.5 rounded-2xl text-left transition active:scale-[0.99]"
      style={{
        background: "var(--background)",
        border: "1px solid var(--border)",
        borderLeft: "4px solid #4f46e5",
        boxShadow: "0 1px 6px rgba(0,0,0,0.06)",
        opacity: canTake ? 1 : 0.55,
      }}
    >
      {firstImg ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={firstImg} alt="" className="w-14 h-14 rounded-xl object-cover shrink-0" style={{ border: "1px solid var(--border)" }} />
      ) : (
        <div
          className="w-14 h-14 rounded-xl flex items-center justify-center shrink-0"
          style={{ background: "linear-gradient(135deg,#eef2ff,#e0e7ff)", border: "1px solid #c7d2fe" }}
        >
          <Globe className="w-6 h-6" style={{ color: "#4f46e5", opacity: 0.7 }} />
        </div>
      )}
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2 mb-0.5">
          <p className="text-[14px] font-bold text-foreground">{shortBuyerName(order.buyerName)}</p>
          <ChevronRight className="w-4 h-4 text-muted shrink-0 mt-0.5" style={{ opacity: 0.4 }} />
        </div>
        {order.description ? (
          <p className="text-[12px] text-muted line-clamp-2 mb-1.5">{order.description}</p>
        ) : (
          <p className="text-[12px] text-muted mb-1.5">{order.zid}</p>
        )}
        <div className="flex items-center justify-between">
          <span className="text-[14px] font-bold text-foreground">{fmt(order.totalAmount)}</span>
          <div className="flex items-center gap-1 text-[11px] text-muted">
            <Clock className="w-3 h-3" />
            <span>{relativeTime(order.createdAt)}</span>
          </div>
        </div>
      </div>
    </button>
  );
}

// ─── Slot Bar ─────────────────────────────────────────────────────────────────

function SlotBar({ active, max }: { active: number; max: number }) {
  const free = max - active;
  const full = active >= max;
  return (
    <div className="mt-1">
      <div className="flex gap-1.5 mb-1">
        {Array.from({ length: max }).map((_, i) => (
          <div
            key={i}
            className="w-3 h-3 rounded-full transition-all duration-500 shrink-0"
            style={{
              background: i < active ? (full ? "#ef4444" : "#16a34a") : "var(--border)",
              boxShadow: i < active
                ? (full ? "0 0 6px rgba(239,68,68,0.5)" : "0 0 6px rgba(22,163,74,0.5)")
                : "none",
            }}
          />
        ))}
      </div>
      <p className="text-[11px] font-medium leading-tight" style={{ color: full ? "#ef4444" : "var(--muted)" }}>
        {full
          ? "Лимит достигнут"
          : free === max
            ? `${max} слотов свободно`
            : `${free} из ${max} свободно`}
      </p>
    </div>
  );
}

// ─── Online Indicator ─────────────────────────────────────────────────────────

function OnlineIndicator({ onGoOffline, activeCount, maxActive }: {
  onGoOffline: () => void;
  activeCount: number;
  maxActive: number;
}) {
  return (
    <div
      className="flex items-center justify-between px-4 py-3 rounded-2xl"
      style={{
        background: "linear-gradient(135deg,#f0fdf4,#dcfce7)",
        border: "1px solid #bbf7d0",
        animation: "online-in 0.4s ease both",
      }}
    >
      <div className="flex items-center gap-3">
        <div className="relative shrink-0" style={{ width: 44, height: 44 }}>
          <div style={{ position: "absolute", inset: 0, borderRadius: "50%", overflow: "hidden", pointerEvents: "none" }}>
            {[0, 1].map((i) => (
              <div key={i} style={{
                position: "absolute", inset: 0, borderRadius: "50%",
                border: "2px solid rgba(22,163,74,0.4)",
                animation: `ring-expand 2.4s ease-out ${i * 1.1}s infinite`,
              }} />
            ))}
          </div>
          <div className="absolute inset-0 flex items-center justify-center">
            <div
              className="w-10 h-10 rounded-full flex items-center justify-center"
              style={{
                background: "#16a34a",
                animation: "glow-pulse 2.5s ease-in-out infinite",
              }}
            >
              <Check className="w-5 h-5 text-white" strokeWidth={2.5} />
            </div>
          </div>
        </div>

        <div>
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full animate-pulse" style={{ background: "#16a34a", boxShadow: "0 0 6px rgba(22,163,74,0.8)" }} />
            <p className="text-[15px] font-bold text-foreground">Вы на линии</p>
          </div>
          <SlotBar active={activeCount} max={maxActive} />
        </div>
      </div>

      <button
        onClick={onGoOffline}
        className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold transition-all active:scale-95 shrink-0"
        style={{
          background: "var(--background)",
          border: "1px solid var(--border)",
          color: "var(--muted)",
          boxShadow: "0 1px 4px rgba(0,0,0,0.06)",
        }}
      >
        <WifiOff className="w-3.5 h-3.5" />
        Уйти
      </button>
    </div>
  );
}

// ─── Slide Toggle ─────────────────────────────────────────────────────────────

function SlideToggle({ onActivate }: { onActivate: () => void }) {
  const trackRef  = useRef<HTMLDivElement>(null);
  const [offset, setOffset]     = useState(0);
  const [dragging, setDragging] = useState(false);
  const [done, setDone]         = useState(false);
  const startX   = useRef(0);
  const startOff = useRef(0);

  const THUMB = 60;
  const PAD   = 6;
  const maxOff = () => Math.max(0, (trackRef.current?.offsetWidth ?? 320) - THUMB - PAD * 2);

  const onDown = (e: React.PointerEvent) => {
    setDragging(true);
    startX.current   = e.clientX;
    startOff.current = offset;
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  };
  const onMove = (e: React.PointerEvent) => {
    if (!dragging) return;
    setOffset(Math.max(0, Math.min(startOff.current + (e.clientX - startX.current), maxOff())));
  };
  const onUp = () => {
    setDragging(false);
    if (offset >= maxOff() * 0.80) {
      setOffset(maxOff());
      setDone(true);
      setTimeout(onActivate, 420);
    } else {
      setOffset(0);
    }
  };

  const progress = maxOff() > 0 ? offset / maxOff() : 0;

  if (done) {
    return (
      <div
        className="h-18 rounded-2xl flex items-center justify-center gap-3"
        style={{ background: "linear-gradient(135deg,#16a34a,#15803d)", boxShadow: "0 4px 20px rgba(22,163,74,0.35)" }}
      >
        <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ background: "rgba(255,255,255,0.25)" }}>
          <Check className="w-5 h-5 text-white" strokeWidth={3} />
        </div>
        <span className="text-white font-bold text-base tracking-wide">Вы на линии!</span>
      </div>
    );
  }

  return (
    <div
      ref={trackRef}
      className="relative h-18 rounded-2xl overflow-hidden select-none"
      style={{ background: "var(--card)", border: "1px solid var(--border)" }}
    >
      {/* Fill */}
      <div
        className="absolute inset-y-0 left-0 rounded-2xl"
        style={{
          width: `${PAD + THUMB / 2 + offset}px`,
          background: "linear-gradient(90deg, rgba(22,163,74,0.15) 0%, rgba(22,163,74,0.03) 100%)",
          transition: dragging ? "none" : "width 0.3s ease-out",
        }}
      />
      {/* Label */}
      <div
        className="absolute inset-0 flex items-center justify-center gap-1.5 pointer-events-none"
        style={{ paddingLeft: PAD + THUMB + 12, opacity: Math.max(0, 1 - progress * 2.2), transition: "opacity 0.1s" }}
      >
        {[0, 1, 2].map((i) => (
          <ChevronRight
            key={i}
            className="w-4 h-4"
            style={{ color: "var(--muted)", animation: `chevron-flow 1.4s ease-in-out ${i * 0.22}s infinite` }}
          />
        ))}
        <span className="text-sm font-semibold text-muted ml-0.5">Выйти на линию</span>
      </div>
      {/* Release hint */}
      <div
        className="absolute inset-0 flex items-center justify-center pointer-events-none"
        style={{ opacity: Math.max(0, progress * 3 - 1.6), transition: "opacity 0.1s" }}
      >
        <span className="text-sm font-bold tracking-wide" style={{ color: "#16a34a" }}>Отпустите ✓</span>
      </div>
      {/* Thumb */}
      <div
        className="absolute top-1.5 flex items-center justify-center rounded-xl touch-none cursor-grab active:cursor-grabbing z-10"
        style={{
          left: `${PAD + offset}px`,
          width: THUMB,
          height: THUMB,
          background: progress > 0.6
            ? "linear-gradient(135deg,#16a34a,#15803d)"
            : "linear-gradient(135deg,#6366f1,#8b5cf6)",
          boxShadow: progress > 0.6
            ? "0 4px 20px rgba(22,163,74,0.5)"
            : "0 4px 20px rgba(99,102,241,0.4)",
          transition: dragging ? "background 0.2s, box-shadow 0.2s" : "left 0.3s ease-out, background 0.2s, box-shadow 0.2s",
        }}
        onPointerDown={onDown}
        onPointerMove={onMove}
        onPointerUp={onUp}
        onPointerCancel={onUp}
      >
        <Zap className="w-6 h-6 text-white" fill="white" />
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function DashboardPage() {
  const { profile, user, loading: profileLoading, displayName, isApproved, refetch } = useMediator();
  const router = useRouter();

  const [online, setOnline] = useState(false);
  useEffect(() => {
    try { if (localStorage.getItem("mediator_online") === "true") setOnline(true); } catch {}
  }, []);

  const [activeCount, setActiveCount] = useState(0);
  const [newRequests, setNewRequests] = useState<NewDirectRequest[]>([]);
  const [availableOrders, setAvailableOrders] = useState<AvailableOrder[]>([]);
  const [ordersLoading, setOrdersLoading] = useState(false);
  const [modal, setModal] = useState<ModalState | null>(null);

  const loadOrders = useCallback(async (silent = false) => {
    if (!silent) setOrdersLoading(true);
    try {
      const [availRaw, directRaw, broadcastRaw] = await Promise.all([
        api.get<any>("/mediator-orders/mediator/available").catch(() => ({ orders: [] })),
        api.get<any[]>("/order-requests").catch(() => []),
        api.get<any[]>("/mediator-orders/mediator/my").catch(() => []),
      ]);
      const myDirects = (directRaw || []).filter((o: any) => o.mediator?.id === user?.id);
      const newOnes = myDirects.filter((o: any) => o.status === "CREATED").map(mapDirectRequest);
      setNewRequests(newOnes);
      const activeDirect = myDirects.filter((o: any) => o.status === "ACCEPTED").length;
      const activeBroadcast = (broadcastRaw || []).filter((o: any) =>
        ["SEARCHING","SELECTING","ASSIGNED","AWAITING_PURCHASE_DATE","PURCHASING","DELIVERING"].includes(o.status)
      ).length;
      setActiveCount(activeDirect + activeBroadcast);
      const rate = profile?.commissionRate ?? 0;
      setAvailableOrders((availRaw?.orders || []).map((o: any) => mapAvailableOrder(o, rate)));
    } catch {}
    if (!silent) setOrdersLoading(false);
  }, [profile?.commissionRate, user?.id]);

  useEffect(() => {
    if (online && isApproved) loadOrders(false);
  }, [online, isApproved, loadOrders]);

  useEffect(() => {
    if (!online || !isApproved) return;
    const id = setInterval(() => loadOrders(true), 15000);
    return () => clearInterval(id);
  }, [online, isApproved, loadOrders]);

  const goOnline = useCallback(() => {
    setOnline(true);
    try { localStorage.setItem("mediator_online", "true"); } catch {}
    api.post("/mediator/ping").catch(() => {});
  }, []);

  const goOffline = useCallback(() => {
    setOnline(false);
    try { localStorage.setItem("mediator_online", "false"); } catch {}
  }, []);

  useEffect(() => {
    if (!online) return;
    const id = setInterval(() => api.post("/mediator/ping").catch(() => {}), 10 * 60 * 1000);
    return () => clearInterval(id);
  }, [online]);

  // Auto-offline: poll status every 30s when online — force offline if account under review
  useEffect(() => {
    if (!online) return;
    const check = () => {
      api.get<{ profile: { status: string } | null }>("/mediator/me")
        .then(d => {
          const s = d.profile?.status;
          if (s && s !== "APPROVED") {
            goOffline();
            refetch();
          }
        })
        .catch(() => {});
    };
    const id = setInterval(check, 30_000);
    return () => clearInterval(id);
  }, [online, goOffline, refetch]);

  useEffect(() => {
    if (online) api.post("/mediator/ping").catch(() => {});
  }, [online]);

  const handleTakeOrder = useCallback(async (orderId: string) => {
    await api.post(`/mediator-orders/${orderId}/respond`);
    await loadOrders();
    setModal(null);
    router.push(`/orders/${orderId}`);
  }, [loadOrders, router]);

  const handleAcceptDirectRequest = useCallback(async (requestId: string) => {
    await api.post(`/order-requests/${requestId}/accept`);
    await loadOrders();
    setModal(null);
    router.push(`/orders/${requestId}`);
  }, [loadOrders, router]);

  const canTake = activeCount < MAX_ACTIVE;

  if (profileLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="w-8 h-8 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: "#6366f1", borderTopColor: "transparent" }} />
      </div>
    );
  }

  return (
    <>
      <style>{STYLES}</style>

      <div className="min-h-screen pb-24 bg-background">
        <VerificationBanner status={profile?.status ?? null} rejectionReason={profile?.rejectionReason} />

        {/* Header */}
        <div
          className="sticky top-0 z-40 px-4 py-3"
          style={{
            background: "rgba(255,255,255,0.92)",
            backdropFilter: "blur(16px)",
            borderBottom: "1px solid var(--border)",
          }}
        >
          <div className="flex items-center justify-between max-w-lg mx-auto">
            <div>
              <p className="text-xs text-muted">Добро пожаловать</p>
              <h1 className="text-lg font-bold text-foreground leading-tight">{displayName}</h1>
            </div>
            {online && (
              <div
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full"
                style={{ background: "#f0fdf4", border: "1px solid #bbf7d0" }}
              >
                <span className="w-2 h-2 rounded-full animate-pulse" style={{ background: "#16a34a" }} />
                <span className="text-xs font-semibold" style={{ color: "#16a34a" }}>В сети</span>
              </div>
            )}
          </div>
        </div>

        <div className="px-4 pt-5 max-w-lg mx-auto space-y-5">
          {online ? (
            <>
              <OnlineIndicator onGoOffline={goOffline} activeCount={activeCount} maxActive={MAX_ACTIVE} />

              {/* Active orders CTA */}
              {activeCount > 0 && (
                <button
                  type="button"
                  onClick={() => router.push("/orders")}
                  className="w-full flex items-center gap-3 p-4 rounded-2xl text-left transition active:scale-[0.99]"
                  style={{
                    background: "linear-gradient(135deg,#f5f3ff,#ede9fe)",
                    border: "1px solid #ddd6fe",
                    boxShadow: "0 2px 8px rgba(124,58,237,0.1)",
                  }}
                >
                  <div
                    className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0"
                    style={{ background: "rgba(124,58,237,0.15)" }}
                  >
                    <TrendingUp className="w-5 h-5" style={{ color: "#7c3aed" }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-foreground">
                      У вас {activeCount} {activeCount === 1 ? "активный заказ" : activeCount < 5 ? "активных заказа" : "активных заказов"}
                    </p>
                    <p className="text-xs text-muted mt-0.5">Перейти к работе</p>
                  </div>
                  <ChevronRight className="w-5 h-5 shrink-0" style={{ color: "#7c3aed" }} />
                </button>
              )}

              {/* New direct requests */}
              <section className="space-y-2">
                <div className="flex items-center justify-between px-1">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4" style={{ color: "#7c3aed" }} />
                    <h2 className="text-sm font-bold text-foreground">Новые заявки</h2>
                    {newRequests.length > 0 && (
                      <span
                        className="text-[10px] font-bold px-2 py-0.5 rounded-full text-white"
                        style={{ background: "#7c3aed" }}
                      >
                        {newRequests.length}
                      </span>
                    )}
                  </div>
                  <button
                    onClick={() => loadOrders(false)}
                    className={`w-7 h-7 rounded-lg flex items-center justify-center transition ${ordersLoading ? "animate-spin" : ""}`}
                    style={{ background: "var(--accent)" }}
                  >
                    <RefreshCw className="w-3.5 h-3.5 text-muted" />
                  </button>
                </div>

                {ordersLoading ? (
                  <div className="space-y-2">
                    {[0, 1].map((i) => (
                      <div key={i} className="h-20 rounded-2xl animate-pulse" style={{ background: "var(--card)", border: "1px solid var(--border)" }} />
                    ))}
                  </div>
                ) : newRequests.length === 0 ? (
                  <div
                    className="flex flex-col items-center py-8 gap-2 rounded-2xl"
                    style={{ background: "var(--card)", border: "1px dashed var(--border)" }}
                  >
                    <Sparkles className="w-7 h-7 text-muted" style={{ opacity: 0.3 }} />
                    <p className="text-xs text-muted">Новых прямых заявок пока нет</p>
                  </div>
                ) : (
                  newRequests.map((o) => (
                    <DirectRequestCard key={o.id} order={o} onClick={() => setModal({ order: o, isAvailable: false })} />
                  ))
                )}
              </section>

              {/* Exchange orders */}
              <section className="space-y-2">
                <div className="flex items-center justify-between px-1">
                  <div className="flex items-center gap-2">
                    <Globe className="w-4 h-4" style={{ color: "#4f46e5" }} />
                    <h2 className="text-sm font-bold text-foreground">Биржа заказов</h2>
                    {availableOrders.length > 0 && (
                      <span
                        className="text-[10px] font-bold px-2 py-0.5 rounded-full text-white"
                        style={{ background: "#4f46e5" }}
                      >
                        {availableOrders.length}
                      </span>
                    )}
                  </div>
                </div>

                {!canTake && (
                  <div
                    className="flex items-center gap-2 px-3 py-2.5 rounded-xl text-xs"
                    style={{ background: "#fef2f2", border: "1px solid #fecaca" }}
                  >
                    <Lock className="w-3.5 h-3.5 shrink-0" style={{ color: "#ef4444" }} />
                    <span style={{ color: "#dc2626" }}>Завершите один из заказов, чтобы взять новый</span>
                  </div>
                )}

                {ordersLoading ? (
                  <div className="space-y-2">
                    {[0, 1].map((i) => (
                      <div key={i} className="h-20 rounded-2xl animate-pulse" style={{ background: "var(--card)", border: "1px solid var(--border)" }} />
                    ))}
                  </div>
                ) : availableOrders.length === 0 ? (
                  <div
                    className="flex flex-col items-center py-8 gap-2 rounded-2xl"
                    style={{ background: "var(--card)", border: "1px dashed var(--border)" }}
                  >
                    <Globe className="w-7 h-7 text-muted" style={{ opacity: 0.3 }} />
                    <p className="text-xs text-muted">Биржа пуста — заказы скоро появятся</p>
                  </div>
                ) : (
                  availableOrders.map((o) => (
                    <AvailableCard key={o.id} order={o} canTake={canTake} onClick={() => setModal({ order: o, isAvailable: true })} />
                  ))
                )}
              </section>
            </>
          ) : (
            /* Offline state */
            <div className="flex flex-col items-center pt-10 space-y-8">
              <div className="flex flex-col items-center gap-4 text-center">
                <div
                  className="w-20 h-20 rounded-3xl flex items-center justify-center"
                  style={{
                    background: "linear-gradient(135deg,#f5f3ff,#ede9fe)",
                    border: "1px solid #ddd6fe",
                    boxShadow: "0 4px 20px rgba(99,102,241,0.1)",
                  }}
                >
                  <Power className="w-9 h-9" style={{ color: "#6366f1", opacity: 0.6 }} />
                </div>
                <div className="space-y-1">
                  <p className="text-xl font-bold text-foreground">Вы офлайн</p>
                  <p className="text-sm text-muted">Потяните вправо, чтобы начать принимать заказы</p>
                </div>
              </div>

              {isApproved ? (
                <div
                  className="w-full rounded-3xl p-4"
                  style={{
                    background: "var(--card)",
                    border: "1px solid var(--border)",
                    boxShadow: "0 2px 12px rgba(0,0,0,0.04)",
                  }}
                >
                  <SlideToggle onActivate={goOnline} />
                </div>
              ) : (
                <div
                  className="w-full rounded-2xl p-4 text-center text-sm text-muted"
                  style={{ background: "var(--card)", border: "1px solid var(--border)" }}
                >
                  Доступно после одобрения аккаунта
                </div>
              )}
            </div>
          )}
        </div>

        <BottomNav />
      </div>

      {modal && (
        <NewOrderModal
          state={modal}
          canTake={canTake}
          onClose={() => setModal(null)}
          onTake={handleTakeOrder}
          onAcceptDirect={handleAcceptDirectRequest}
        />
      )}
    </>
  );
}
