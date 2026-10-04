"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft, Globe, Loader2, MoreVertical,
  CheckCircle2, XCircle, ShoppingBag, Truck,
  X, Menu, Trash2, RefreshCw, MessageCircle,
} from "lucide-react";
import {
  CheckCircleOutlined,
  CloseCircleOutlined,
  RetweetOutlined,
  InboxOutlined,
  ShoppingOutlined,
  CheckOutlined,
} from "@ant-design/icons";
import { useMediator } from "@/hooks/useMediator";
import { api } from "@/lib/api";

// ── Types ─────────────────────────────────────────────────────────────────────

interface OrderItem {
  id: string;
  title: string;
  price: number;
  qty: number;
  imageUrl?: string | null;
  imageUrlSnapshot?: string | null;
  selectedPhotoUrl?: string | null;
  clarification?: string | null;
  pavilionNumber?: string | null;
  locationName?: string | null;
  mediatorStatus: string;
  replacementNote?: string | null;
}

interface OrderData {
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

const STATUS_CFG: Record<string, { label: string; color: string; dot: string; bg: string }> = {
  CREATED:                { label: "Новая заявка",  color: "#7c3aed", dot: "#7c3aed", bg: "#f5f3ff" },
  ACCEPTED:               { label: "В работе",      color: "#2563eb", dot: "#2563eb", bg: "#eff6ff" },
  SEARCHING:              { label: "Поиск",          color: "#d97706", dot: "#d97706", bg: "#fffbeb" },
  SELECTING:              { label: "Выбор",          color: "#b45309", dot: "#b45309", bg: "#fef9c3" },
  ASSIGNED:               { label: "Назначен",       color: "#d97706", dot: "#d97706", bg: "#fffbeb" },
  AWAITING_PURCHASE_DATE: { label: "Ожид. даты",    color: "#d97706", dot: "#d97706", bg: "#fffbeb" },
  PURCHASING:             { label: "Закупка",        color: "#0891b2", dot: "#0891b2", bg: "#ecfeff" },
  DELIVERING:             { label: "Доставка",       color: "#0891b2", dot: "#0891b2", bg: "#ecfeff" },
  COMPLETED:              { label: "Завершён",       color: "#16a34a", dot: "#16a34a", bg: "#f0fdf4" },
  CANCELLED:              { label: "Отменён",        color: "#dc2626", dot: "#dc2626", bg: "#fef2f2" },
};

const ACTIVE_STATUSES = ["CREATED","ACCEPTED","SEARCHING","SELECTING","ASSIGNED","AWAITING_PURCHASE_DATE","PURCHASING","DELIVERING"];
const DONE_STATUSES   = ["COMPLETED","CANCELLED"];

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmt(n: number)    { return Math.round(n / 100).toLocaleString("ru-RU") + " ₽"; }
function fmtRaw(n: number) { return n.toLocaleString("ru-RU") + " ₽"; }

function avatarGradient(name: string) {
  const g = [
    "linear-gradient(135deg,#f97316,#ef4444)",
    "linear-gradient(135deg,#6366f1,#a855f7)",
    "linear-gradient(135deg,#0ea5e9,#6366f1)",
    "linear-gradient(135deg,#10b981,#0ea5e9)",
    "linear-gradient(135deg,#ec4899,#a855f7)",
    "linear-gradient(135deg,#14b8a6,#6366f1)",
  ];
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) & 0xffff;
  return g[h % g.length];
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

const PAV_COLORS = [
  { bg: "#fef3c7", text: "#92400e", border: "#fde68a" },
  { bg: "#dcfce7", text: "#166534", border: "#bbf7d0" },
  { bg: "#ede9fe", text: "#5b21b6", border: "#ddd6fe" },
  { bg: "#fce7f3", text: "#9d174d", border: "#fbcfe8" },
  { bg: "#dbeafe", text: "#1e40af", border: "#bfdbfe" },
  { bg: "#ffedd5", text: "#9a3412", border: "#fed7aa" },
];
function pavColor(pav: string) {
  let h = 0;
  for (let i = 0; i < pav.length; i++) h = (h * 31 + pav.charCodeAt(i)) & 0xffff;
  return PAV_COLORS[h % PAV_COLORS.length];
}

function fmtTime(iso: string) {
  return new Date(iso).toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" });
}

function mapDirectOrder(o: any): OrderData {
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
      imageUrl: i.selectedPhotoUrl ?? i.imageUrl ?? i.imageUrlSnapshot ?? null,
      clarification: i.clarification ?? null,
      pavilionNumber: i.pavilionNumber ?? null,
      locationName: i.locationName ?? null,
      mediatorStatus: i.mediatorStatus ?? "PENDING",
      replacementNote: i.replacementNote ?? null,
    })),
    createdAt: o.createdAt, comment: o.comment ?? null,
  };
}

function mapBroadcastOrder(o: any): OrderData {
  return {
    id: o.id, type: "broadcast", zid: o.zid || `Z-${o.id.slice(-4)}`,
    buyerName: o.buyerName || "Клиент", status: o.status,
    totalAmount: Math.round((o.totalEstimatedAmount || o.totalActualAmount || 0) / 100),
    commission: Math.round((o.mediatorCommissionAmount || 0) / 100),
    itemsCount: o.itemsCount || (o.items?.length ?? 0),
    items: [], createdAt: o.createdAt, comment: null,
  };
}

// ── Item Card ─────────────────────────────────────────────────────────────────

function ItemCard({ item, orderId, onUpdate, orderLocked }: {
  item: OrderItem; orderId: string;
  onUpdate: (id: string, status: string, note?: string) => void;
  orderLocked?: boolean;
}) {
  const [busy, setBusy] = useState<string | null>(null);
  const [showReplacementInput, setShowReplacementInput] = useState(false);
  const [replacementText, setReplacementText] = useState(item.replacementNote ?? "");

  const pav = item.pavilionNumber || pavilionPlaceholder(item.id);
  const pc  = pavColor(pav);
  const img = item.imageUrl ?? item.imageUrlSnapshot ?? item.selectedPhotoUrl;
  const isPlaceholderPav = !item.pavilionNumber;

  async function setStatus(status: string, note?: string) {
    if (busy || item.mediatorStatus === status) return;
    setBusy(status);
    try {
      await api.patch(`/order-requests/${orderId}/items/${item.id}/status`, { status });
      onUpdate(item.id, status, note);
    } catch {}
    setBusy(null);
  }

  async function submitReplacement() {
    if (busy || !replacementText.trim()) return;
    setBusy("REPLACEMENT_REQUESTED");
    try {
      await api.post(`/order-requests/${orderId}/system-message`, {
        text: `🔄 Замена для «${item.title}»: ${replacementText.trim()}`,
      });
      await api.patch(`/order-requests/${orderId}/items/${item.id}/status`, {
        status: "REPLACEMENT_REQUESTED",
      });
      onUpdate(item.id, "REPLACEMENT_REQUESTED", replacementText.trim());
      setShowReplacementInput(false);
    } catch {}
    setBusy(null);
  }

  const st = item.mediatorStatus;
  const isUrgent = st === "REPLACEMENT_REQUESTED" || st === "REPLACEMENT_APPROVED";

  return (
    <div
      className="rounded-2xl overflow-hidden bg-white"
      style={{
        border: isUrgent ? "1.5px solid #fde68a" : "1px solid var(--color-border)",
        boxShadow: isUrgent ? "0 2px 12px rgba(245,158,11,0.1)" : "0 1px 4px rgba(0,0,0,0.05)",
      }}
    >
      {/* ── Item info ── */}
      <div className="flex gap-3 p-4">
        {img ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={img} alt=""
            className="w-20 h-20 rounded-xl object-cover shrink-0"
            style={{ border: "1px solid var(--color-border)" }}
          />
        ) : (
          <div
            className="w-20 h-20 rounded-xl shrink-0 flex flex-col items-center justify-center gap-1"
            style={{ background: "#f4f5f8", border: "1px solid var(--color-border)" }}
          >
            <ShoppingOutlined style={{ fontSize: 24, color: "#9ca3af" }} />
          </div>
        )}

        <div className="flex-1 min-w-0">
          <p className="text-[14px] font-bold text-foreground leading-snug mb-1">{item.title}</p>

          {/* Pavilion badge */}
          <div className="flex items-center gap-1.5 mb-2">
            <span
              className="text-[11px] font-semibold px-2 py-0.5 rounded-full"
              style={{ background: pc.bg, color: pc.text, border: `1px solid ${pc.border}` }}
            >
              {pav}
            </span>
            {isPlaceholderPav && (
              <span className="text-[10px] text-muted">примерный адрес</span>
            )}
            {item.locationName && !isPlaceholderPav && (
              <span className="text-[11px] text-muted truncate">
                {item.locationName.replace(/садовод\s*[—–-]?\s*/i, "").trim()}
              </span>
            )}
          </div>

          <p className="text-[12px] text-muted">× {item.qty} шт. · {fmt(item.price)}</p>

          {/* Clarification */}
          {item.clarification && (
            <div
              className="mt-2 px-3 py-2 rounded-xl"
              style={{ background: "#eef2ff", border: "1px solid #c7d2fe" }}
            >
              <p className="text-[12px] leading-snug" style={{ color: "#4338ca" }}>
                <span className="font-semibold">Клиент:</span> {item.clarification}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* ── Action area ── */}
      {orderLocked ? (
        <div
          className="flex items-center justify-center gap-2 py-3 text-[12px] font-medium text-muted"
          style={{ background: "#f9fafb", borderTop: "1px solid var(--color-border)" }}
        >
          🔒 Сначала примите заявку
        </div>

      ) : st === "FOUND" ? (
        <div
          className="flex items-center gap-2 px-4 py-3"
          style={{ background: "#f0fdf4", borderTop: "1px solid #bbf7d0" }}
        >
          <CheckCircleOutlined style={{ color: "#16a34a", fontSize: 16 }} />
          <span className="text-[13px] font-semibold text-green-700">Выкуплен</span>
          <button
            type="button"
            onClick={() => setStatus("PENDING")}
            className="ml-auto text-[11px] text-muted underline"
          >
            Отменить
          </button>
        </div>

      ) : st === "NOT_FOUND" ? (
        <div
          className="flex items-center gap-2 px-4 py-3"
          style={{ background: "#fff7ed", borderTop: "1px solid #fed7aa" }}
        >
          <CloseCircleOutlined style={{ color: "#ea580c", fontSize: 16 }} />
          <span className="text-[13px] font-semibold text-orange-700">Нет в наличии</span>
          <button
            type="button"
            onClick={() => setStatus("PENDING")}
            className="ml-auto text-[11px] text-muted underline"
          >
            Отменить
          </button>
        </div>

      ) : st === "REPLACEMENT_REQUESTED" ? (
        <div style={{ borderTop: "1px solid #fde68a" }}>
          <div className="px-4 py-3" style={{ background: "#fffbeb" }}>
            <div className="flex items-center gap-1.5 mb-1.5">
              <RetweetOutlined style={{ color: "#d97706", fontSize: 14 }} />
              <p className="text-[12px] font-bold text-amber-800">Замена предложена</p>
            </div>
            {(item.replacementNote) && (
              <p className="text-[12px] text-amber-700 leading-snug mb-2">{item.replacementNote}</p>
            )}
            <div className="flex items-center justify-between">
              <p className="text-[10px] text-amber-600">Ожидаем ответа покупателя...</p>
              <button
                type="button"
                onClick={() => { setReplacementText(item.replacementNote ?? ""); setShowReplacementInput(true); }}
                className="text-[11px] font-semibold px-3 py-1.5 rounded-lg text-white"
                style={{ background: "#d97706" }}
              >
                Изменить
              </button>
            </div>
          </div>
        </div>

      ) : st === "REPLACEMENT_APPROVED" ? (
        <div style={{ borderTop: "1px solid #bbf7d0" }}>
          <div className="px-4 py-3" style={{ background: "#f0fdf4" }}>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-1.5">
                <CheckOutlined style={{ color: "#16a34a", fontSize: 14 }} />
                <p className="text-[12px] font-bold text-green-800">Клиент одобрил замену</p>
              </div>
            </div>
            {(item.replacementNote) && (
              <p className="text-[12px] text-green-700 leading-snug mb-2">{item.replacementNote}</p>
            )}
            <div className="flex gap-2 mt-2">
              {[
                { s: "NOT_FOUND", label: "Не нашёл", style: { background: "#fff7ed", color: "#ea580c", border: "1.5px solid #fed7aa" } },
                { s: "FOUND",     label: "Нашёл!",   style: { background: "#f0fdf4", color: "#16a34a", border: "1.5px solid #86efac" } },
              ].map(({ s, label, style }) => (
                <button
                  key={s} type="button"
                  onClick={() => setStatus(s)} disabled={!!busy}
                  className="flex-1 py-2.5 rounded-xl text-[12px] font-semibold transition active:scale-95 disabled:opacity-50"
                  style={style}
                >
                  {busy === s ? <Loader2 className="w-3.5 h-3.5 animate-spin mx-auto" /> : label}
                </button>
              ))}
            </div>
          </div>
        </div>

      ) : st === "REPLACEMENT_REJECTED" ? (
        <div
          className="flex items-center gap-2 px-4 py-3"
          style={{ background: "#fef2f2", borderTop: "1px solid #fecaca" }}
        >
          <CloseCircleOutlined style={{ color: "#dc2626", fontSize: 16 }} />
          <span className="text-[13px] font-semibold text-red-700">Клиент отказал в замене</span>
        </div>

      ) : (
        /* Default PENDING: 3 action buttons */
        <div
          className="grid grid-cols-3 gap-2 px-4 pb-4 pt-3"
          style={{ borderTop: "1px solid var(--color-border)" }}
        >
          <button
            type="button"
            onClick={() => setStatus("FOUND")}
            disabled={!!busy}
            className="flex flex-col items-center gap-1.5 py-2.5 rounded-xl text-[11px] font-semibold transition active:scale-95 disabled:opacity-50"
            style={{ background: "#f0fdf4", color: "#16a34a", border: "1.5px solid #bbf7d0" }}
          >
            {busy === "FOUND"
              ? <Loader2 className="w-4 h-4 animate-spin" />
              : <CheckCircleOutlined style={{ fontSize: 18 }} />
            }
            Выкупил
          </button>

          <button
            type="button"
            onClick={() => setStatus("NOT_FOUND")}
            disabled={!!busy}
            className="flex flex-col items-center gap-1.5 py-2.5 rounded-xl text-[11px] font-semibold transition active:scale-95 disabled:opacity-50"
            style={{ background: "#fff7ed", color: "#ea580c", border: "1.5px solid #fed7aa" }}
          >
            {busy === "NOT_FOUND"
              ? <Loader2 className="w-4 h-4 animate-spin" />
              : <CloseCircleOutlined style={{ fontSize: 18 }} />
            }
            Нет в наличии
          </button>

          <button
            type="button"
            onClick={() => setShowReplacementInput(true)}
            disabled={!!busy}
            className="flex flex-col items-center gap-1.5 py-2.5 rounded-xl text-[11px] font-semibold transition active:scale-95 disabled:opacity-50"
            style={{ background: "#eef2ff", color: "#4338ca", border: "1.5px solid #c7d2fe" }}
          >
            <RetweetOutlined style={{ fontSize: 18 }} />
            Замена
          </button>
        </div>
      )}

      {/* Replacement text input */}
      {showReplacementInput && (
        <div
          className="px-4 pb-4 pt-3 space-y-2"
          style={{ borderTop: "1px solid #c7d2fe", background: "#f5f3ff" }}
        >
          <p className="text-[11px] font-semibold text-indigo-700 uppercase tracking-wide">Опишите замену</p>
          <textarea
            value={replacementText}
            onChange={(e) => setReplacementText(e.target.value)}
            placeholder="Например: Есть синее худи такого же размера без принта..."
            rows={3}
            className="w-full rounded-xl px-3 py-2.5 text-[13px] outline-none resize-none"
            style={{ background: "white", border: "1.5px solid #c7d2fe", color: "var(--foreground)" }}
          />
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => { setShowReplacementInput(false); setReplacementText(item.replacementNote ?? ""); }}
              className="flex-1 py-2.5 rounded-xl text-[12px] font-semibold"
              style={{ background: "white", border: "1px solid var(--color-border)", color: "var(--muted)" }}
            >
              Отмена
            </button>
            <button
              type="button"
              onClick={submitReplacement}
              disabled={!!busy || !replacementText.trim()}
              className="flex-[1.5] py-2.5 rounded-xl text-[12px] font-bold text-white flex items-center justify-center gap-1.5 disabled:opacity-50"
              style={{ background: "linear-gradient(135deg,#6366f1,#8b5cf6)" }}
            >
              {busy === "REPLACEMENT_REQUESTED"
                ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                : <RetweetOutlined />
              }
              Предложить замену
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Actions Sheet ─────────────────────────────────────────────────────────────

function ActionsSheet({ order, onClose, onAccept, onComplete, onCancel, onStartPurchasing, onStartDelivering, busy }: {
  order: OrderData; onClose: () => void;
  onAccept: () => void; onComplete: () => void; onCancel: () => void;
  onStartPurchasing: () => void; onStartDelivering: () => void; busy: boolean;
}) {
  const [confirm, setConfirm] = useState<"complete" | "cancel" | null>(null);

  const actions: { label: string; sub?: string; Icon: React.ElementType; onClick: () => void; style: React.CSSProperties }[] = [];
  if (order.type === "direct" && order.status === "CREATED") {
    actions.push({ label: "Принять заявку", sub: "Перейти в работу", Icon: CheckCircle2, onClick: onAccept, style: { background: "linear-gradient(135deg,#6366f1,#8b5cf6)", color: "#fff" } });
    actions.push({ label: "Отказать", Icon: XCircle, onClick: () => setConfirm("cancel"), style: { background: "#fef2f2", color: "#dc2626", border: "1.5px solid #fecaca" } });
  } else if (order.type === "direct" && order.status === "ACCEPTED") {
    actions.push({ label: "Завершить заказ", sub: "Покупатель получит уведомление", Icon: CheckCircle2, onClick: () => setConfirm("complete"), style: { background: "linear-gradient(135deg,#16a34a,#0d9488)", color: "#fff" } });
    actions.push({ label: "Отменить заказ", Icon: Trash2, onClick: () => setConfirm("cancel"), style: { background: "#fef2f2", color: "#dc2626", border: "1.5px solid #fecaca" } });
  } else if (order.type === "broadcast" && ["ASSIGNED","AWAITING_PURCHASE_DATE"].includes(order.status)) {
    actions.push({ label: "Начать закупку", Icon: ShoppingBag, onClick: onStartPurchasing, style: { background: "linear-gradient(135deg,#6366f1,#8b5cf6)", color: "#fff" } });
  } else if (order.type === "broadcast" && order.status === "PURCHASING") {
    actions.push({ label: "Передать клиенту", Icon: Truck, onClick: onStartDelivering, style: { background: "linear-gradient(135deg,#0891b2,#6366f1)", color: "#fff" } });
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end"
      style={{ background: "rgba(0,0,0,0.4)", backdropFilter: "blur(4px)" }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        className="w-full max-w-lg mx-auto rounded-t-3xl bg-white"
        style={{ boxShadow: "0 -4px 32px rgba(0,0,0,0.12)", animation: "sheet-up 0.25s cubic-bezier(0.32,0.72,0,1) both" }}
      >
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-9 h-1 rounded-full" style={{ background: "#e0e0e5" }} />
        </div>
        <div className="px-5 py-3 flex items-center justify-between" style={{ borderBottom: "1px solid var(--color-border)" }}>
          <p className="text-[15px] font-bold">Действия с заказом</p>
          <button onClick={onClose} className="w-8 h-8 rounded-full flex items-center justify-center" style={{ background: "var(--accent)" }}>
            <X className="w-4 h-4 text-muted" />
          </button>
        </div>

        {confirm ? (
          <div className="px-5 py-5 space-y-3">
            <p className="text-[14px] font-semibold text-center text-foreground">
              {confirm === "complete" ? "Подтвердите завершение заказа" : "Подтвердите отмену заказа"}
            </p>
            <p className="text-[12px] text-muted text-center">
              {confirm === "complete" ? "Покупатель получит уведомление. Это действие необратимо." : "Заказ будет отменён. Это действие необратимо."}
            </p>
            <div className="flex gap-3 pt-1">
              <button type="button" onClick={() => setConfirm(null)}
                className="flex-1 py-3.5 rounded-2xl text-[14px] font-semibold transition active:scale-[0.98]"
                style={{ background: "var(--card)", color: "var(--muted)", border: "1px solid var(--color-border)" }}
              >
                Назад
              </button>
              <button type="button"
                onClick={() => { setConfirm(null); confirm === "complete" ? onComplete() : onCancel(); }}
                disabled={busy}
                className="flex-[1.4] py-3.5 rounded-2xl text-[14px] font-bold text-white flex items-center justify-center gap-2 transition active:scale-[0.98] disabled:opacity-60"
                style={{ background: confirm === "complete" ? "#16a34a" : "#dc2626" }}
              >
                {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : confirm === "complete" ? <CheckCircle2 className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
                {confirm === "complete" ? "Завершить" : "Отменить заказ"}
              </button>
            </div>
          </div>
        ) : (
          <div className="px-5 py-4 space-y-2.5">
            {actions.length === 0 ? (
              <p className="text-center text-[13px] text-muted py-4">Для текущего статуса нет доступных действий</p>
            ) : actions.map((a, i) => (
              <button key={i} type="button" onClick={a.onClick} disabled={busy}
                className="w-full py-4 rounded-2xl text-[14px] font-bold flex items-center gap-3 px-5 transition active:scale-[0.98] disabled:opacity-60"
                style={a.style}
              >
                {busy ? <Loader2 className="w-5 h-5 animate-spin" /> : <a.Icon className="w-5 h-5" />}
                <span className="flex-1 text-left">
                  {a.label}
                  {a.sub && <p className="text-[11px] font-normal opacity-75 mt-0.5">{a.sub}</p>}
                </span>
              </button>
            ))}
          </div>
        )}
        <div className="h-6" />
      </div>
    </div>
  );
}

// ── Switcher Sheet ────────────────────────────────────────────────────────────

function SwitcherSheet({ currentId, orders, onClose, onSelect }: {
  currentId: string; orders: OrderData[]; onClose: () => void; onSelect: (id: string) => void;
}) {
  const active = orders.filter((o) => ACTIVE_STATUSES.includes(o.status));
  return (
    <div
      className="fixed inset-0 z-50 flex items-end"
      style={{ background: "rgba(0,0,0,0.4)", backdropFilter: "blur(4px)" }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        className="w-full max-w-lg mx-auto rounded-t-3xl bg-white"
        style={{ maxHeight: "80vh", boxShadow: "0 -4px 32px rgba(0,0,0,0.12)", animation: "sheet-up 0.25s cubic-bezier(0.32,0.72,0,1) both" }}
      >
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-9 h-1 rounded-full" style={{ background: "#e0e0e5" }} />
        </div>
        <div className="px-5 py-3 flex items-center justify-between" style={{ borderBottom: "1px solid var(--color-border)" }}>
          <p className="text-[15px] font-bold">Переключить заказ</p>
          <button onClick={onClose} className="w-8 h-8 rounded-full flex items-center justify-center" style={{ background: "var(--accent)" }}>
            <X className="w-4 h-4 text-muted" />
          </button>
        </div>
        <div className="overflow-y-auto pb-8" style={{ maxHeight: "calc(80vh - 70px)" }}>
          {active.length === 0 ? (
            <div className="flex flex-col items-center py-12 gap-3">
              <InboxOutlined style={{ fontSize: 36, color: "#d1d5db" }} />
              <p className="text-[13px] text-muted">Других активных заказов нет</p>
            </div>
          ) : (
            <div className="px-4 py-3 space-y-2">
              {active.map((o) => {
                const cfg = STATUS_CFG[o.status];
                const isCurrent = o.id === currentId;
                const firstImg = o.items.find((i) => i.imageUrl)?.imageUrl;
                return (
                  <button key={o.id} type="button"
                    onClick={() => !isCurrent && onSelect(o.id)} disabled={isCurrent}
                    className="w-full flex items-center gap-3 p-3 rounded-2xl text-left transition active:scale-[0.98]"
                    style={isCurrent
                      ? { background: "#eef2ff", border: "1.5px solid #c7d2fe" }
                      : { background: "white", border: "1px solid var(--color-border)" }
                    }
                  >
                    {firstImg ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={firstImg} alt="" className="w-12 h-12 rounded-xl object-cover shrink-0" />
                    ) : (
                      <div className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0" style={{ background: "var(--accent)" }}>
                        {o.type === "broadcast" ? <Globe className="w-5 h-5 text-indigo-400" /> : <ShoppingOutlined style={{ fontSize: 20, color: "#9ca3af" }} />}
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-[13px] font-bold truncate text-foreground mb-0.5">{o.buyerName}</p>
                      <div className="flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: cfg?.dot ?? "#6b7280" }} />
                        <span className="text-[11px] font-medium" style={{ color: cfg?.color ?? "#6b7280" }}>{cfg?.label}</span>
                        <span className="text-[10px] text-muted font-mono ml-1">{o.zid}</span>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Main Page ──────────────────────────────────────────────────────────────────

export default function OrderWorkspacePage() {
  const params  = useParams<{ id: string }>();
  const router  = useRouter();
  const { loading: profileLoading, isApproved, user } = useMediator();
  const myUserId = user?.id ?? null;

  const [order, setOrder]           = useState<OrderData | null>(null);
  const [loading, setLoading]       = useState(true);
  const [notFound, setNotFound]     = useState(false);
  const [allOrders, setAllOrders]   = useState<OrderData[]>([]);
  const [activeSheet, setActiveSheet] = useState<"actions" | "switcher" | null>(null);
  const [actionBusy, setActionBusy] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [inlineConfirm, setInlineConfirm] = useState<"complete" | "cancel" | null>(null);

  const loadOrder = useCallback(async (silent = false) => {
    if (!params?.id || !myUserId) return;
    if (!silent) setLoading(true);
    try {
      try {
        const r = await api.get<any>(`/order-requests/${params.id}`);
        if (r?.mediator?.id === myUserId || r?.mediatorId === myUserId) {
          setOrder(mapDirectOrder(r)); setLoading(false); return;
        }
      } catch {}
      try {
        const broadcast = await api.get<any[]>("/mediator-orders/mediator/my");
        const found = (Array.isArray(broadcast) ? broadcast : []).find((o: any) => o.id === params.id);
        if (found) { setOrder(mapBroadcastOrder(found)); setLoading(false); return; }
      } catch {}
      setNotFound(true); setLoading(false);
    } catch { setNotFound(true); setLoading(false); }
  }, [params?.id, myUserId]);

  const loadAllOrders = useCallback(async () => {
    if (!myUserId) return;
    try {
      const [direct, broadcast] = await Promise.all([
        api.get<any[]>("/order-requests").catch(() => []),
        api.get<any[]>("/mediator-orders/mediator/my").catch(() => []),
      ]);
      const dm = (Array.isArray(direct) ? direct : []).filter((o: any) => o.mediator?.id === myUserId).map(mapDirectOrder);
      const bm = (Array.isArray(broadcast) ? broadcast : []).map(mapBroadcastOrder);
      setAllOrders([...dm, ...bm].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
    } catch {}
  }, [myUserId]);

  useEffect(() => {
    if (!isApproved || profileLoading) return;
    loadOrder(); loadAllOrders();
  }, [isApproved, profileLoading, loadOrder, loadAllOrders]);

  useEffect(() => {
    if (!isApproved || !order) return;
    const id = setInterval(() => loadOrder(true), 12000);
    return () => clearInterval(id);
  }, [isApproved, order, loadOrder]);

  const handleItemUpdate = useCallback((itemId: string, status: string, note?: string) => {
    setOrder((prev) => prev ? {
      ...prev,
      items: prev.items.map((i) =>
        i.id === itemId ? { ...i, mediatorStatus: status, replacementNote: note ?? i.replacementNote } : i
      ),
    } : prev);
  }, []);

  const doAction = useCallback(async (fn: () => Promise<void>) => {
    setActionBusy(true);
    try { await fn(); } catch {}
    await loadOrder(true);
    setActionBusy(false);
    setActiveSheet(null);
  }, [loadOrder]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadOrder(true);
    setRefreshing(false);
  };

  const handleAccept          = () => order?.type === "direct" && doAction(async () => { await api.post(`/order-requests/${order.id}/accept`); });
  const handleComplete        = () => { if (!order) return; doAction(async () => { if (order.type === "direct") await api.post(`/order-requests/${order.id}/complete`); }); };
  const handleCancel          = () => { if (!order) return; doAction(async () => { if (order.type === "direct") await api.post(`/order-requests/${order.id}/cancel`); }); };
  const handleStartPurchasing = () => doAction(async () => { if (!order || order.type !== "broadcast") return; await api.post(`/mediator-orders/${order.id}/start-purchasing`); });
  const handleStartDelivering = () => doAction(async () => { if (!order || order.type !== "broadcast") return; await api.post(`/mediator-orders/${order.id}/start-delivering`); });

  // ── States ──

  if (profileLoading || loading) return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="flex flex-col items-center gap-3">
        <Loader2 className="w-7 h-7 animate-spin" style={{ color: "#6366f1" }} />
        <p className="text-sm text-muted">Загружаем заказ...</p>
      </div>
    </div>
  );

  if (!isApproved) return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-4 px-6 text-center bg-background">
      <InboxOutlined style={{ fontSize: 48, color: "#d1d5db" }} />
      <p className="text-[13px] text-muted">Раздел недоступен — заявка не одобрена</p>
      <button onClick={() => router.push("/dashboard")} className="text-[13px] font-semibold" style={{ color: "#6366f1" }}>На главную</button>
    </div>
  );

  if (notFound || !order) return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-4 px-6 text-center bg-background">
      <InboxOutlined style={{ fontSize: 48, color: "#d1d5db" }} />
      <p className="font-semibold text-foreground">Заказ не найден</p>
      <p className="text-[13px] text-muted">Возможно, заказ был удалён или у вас нет доступа</p>
      <button onClick={() => router.push("/orders")}
        className="px-5 py-2.5 rounded-xl text-[13px] font-semibold text-white"
        style={{ background: "linear-gradient(135deg,#6366f1,#8b5cf6)" }}
      >
        К списку заказов
      </button>
    </div>
  );

  const cfg        = STATUS_CFG[order.status];
  const isActive   = ACTIVE_STATUSES.includes(order.status);
  const isDone     = DONE_STATUSES.includes(order.status);
  const isDirect   = order.type === "direct";
  const foundCount = order.items.filter((i) => i.mediatorStatus === "FOUND").length;
  const progress   = order.items.length > 0 ? (foundCount / order.items.length) * 100 : 0;
  const urgentCount = order.items.filter((i) => ["REPLACEMENT_REQUESTED","REPLACEMENT_APPROVED"].includes(i.mediatorStatus)).length;
  const orderLocked = isDirect && order.status === "CREATED";
  const hasActions  =
    (isDirect && ["CREATED","ACCEPTED"].includes(order.status)) ||
    (!isDirect && ["ASSIGNED","AWAITING_PURCHASE_DATE","PURCHASING"].includes(order.status));

  return (
    <>
      <style>{`
        @keyframes sheet-up {
          from { transform: translateY(100%); opacity: 0; }
          to   { transform: translateY(0);    opacity: 1; }
        }
      `}</style>

      <div className="h-screen overflow-hidden flex flex-col" style={{ background: "#f4f5f8" }}>

        {/* ══ HEADER ══ */}
        <div className="shrink-0 bg-white" style={{ borderBottom: "1px solid var(--color-border)", boxShadow: "0 1px 6px rgba(0,0,0,0.06)" }}>
          <div className="flex items-center gap-2 px-3 py-2.5">
            <button type="button" onClick={() => router.push("/orders")}
              className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
              style={{ background: "var(--accent)" }}
            >
              <ArrowLeft className="w-4 h-4 text-foreground" />
            </button>

            {/* Avatar */}
            <div className="relative shrink-0">
              <div
                className="w-9 h-9 rounded-full flex items-center justify-center text-white font-bold text-sm"
                style={{ background: avatarGradient(order.buyerName) }}
              >
                {order.buyerName[0]?.toUpperCase()}
              </div>
              <div
                className="absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full border-2 border-white flex items-center justify-center"
                style={{ background: isDirect ? "#a855f7" : "#6366f1" }}
              >
                {isDirect
                  ? <span className="text-[7px] font-bold text-white">П</span>
                  : <Globe className="w-2.5 h-2.5 text-white" />
                }
              </div>
            </div>

            {/* Name + status */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5">
                <p className="text-[13.5px] font-bold truncate text-foreground">{order.buyerName}</p>
                {urgentCount > 0 && (
                  <span className="px-1.5 py-0.5 rounded-full text-[9px] font-bold animate-pulse shrink-0" style={{ background: "#fef3c7", color: "#92400e" }}>
                    {urgentCount} ждут!
                  </span>
                )}
              </div>
              <div className="flex items-center gap-1.5 mt-0.5">
                {cfg && <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: cfg.dot }} />}
                <span className="text-[11px] font-medium" style={{ color: cfg?.color ?? "#6b7280" }}>{cfg?.label ?? order.status}</span>
                <span className="text-[10px] text-muted font-mono ml-0.5">{order.zid}</span>
                {isDirect && order.items.length > 0 && (
                  <span className={`text-[10px] font-bold ml-1 ${foundCount === order.items.length ? "text-emerald-600" : "text-muted"}`}>
                    · {foundCount}/{order.items.length}
                  </span>
                )}
              </div>
            </div>

            <button
              type="button"
              onClick={() => router.push(`/chats?orderId=${order.id}`)}
              className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
              style={{ background: "#eef2ff" }}
              title="Перейти в чат"
            >
              <MessageCircle className="w-4 h-4" style={{ color: "#6366f1" }} />
            </button>

            <button type="button" onClick={() => setActiveSheet("switcher")}
              className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0" style={{ background: "var(--accent)" }}>
              <Menu className="w-4 h-4 text-muted" />
            </button>

            <button type="button" onClick={() => setActiveSheet("actions")}
              className="relative w-9 h-9 rounded-xl flex items-center justify-center shrink-0" style={{ background: "var(--accent)" }}>
              <MoreVertical className="w-4 h-4 text-muted" />
              {hasActions && <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full" style={{ background: "#6366f1" }} />}
            </button>
          </div>

          {/* Progress bar */}
          {isDirect && isActive && order.items.length > 0 && (
            <div className="px-4 pb-2.5">
              <div className="h-1.5 rounded-full overflow-hidden" style={{ background: "var(--accent)", border: "1px solid var(--color-border)" }}>
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
        </div>

        {/* ══ CONTENT ══ */}
        <div className="flex-1 overflow-y-auto">
          <div className="px-4 pt-4 pb-32 space-y-3 max-w-lg mx-auto">

            {/* Summary card */}
            <div className="rounded-2xl bg-white p-4" style={{ border: "1px solid var(--color-border)" }}>
              {order.comment && (
                <div className="mb-3 pb-3" style={{ borderBottom: "1px solid var(--color-border)" }}>
                  <p className="text-[10px] text-muted uppercase tracking-wider mb-1.5 font-semibold">Комментарий покупателя</p>
                  <p className="text-[13px] text-foreground leading-snug">{order.comment}</p>
                </div>
              )}
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <p className="text-[10px] text-muted uppercase tracking-wider mb-1 font-semibold">Сумма</p>
                  <p className="text-[16px] font-black text-foreground">{fmtRaw(order.totalAmount)}</p>
                </div>
                <div>
                  <p className="text-[10px] text-muted uppercase tracking-wider mb-1 font-semibold">Комиссия</p>
                  <p className="text-[16px] font-black" style={{ color: "#16a34a" }}>
                    {order.commission > 0 ? fmtRaw(order.commission) : "—"}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] text-muted uppercase tracking-wider mb-1 font-semibold">Товаров</p>
                  <p className="text-[16px] font-black text-foreground">{order.itemsCount}</p>
                </div>
              </div>
            </div>

            {/* Lock banner */}
            {orderLocked && (
              <div className="rounded-2xl bg-white flex items-center gap-3 px-4 py-3.5" style={{ border: "1.5px solid #c7d2fe" }}>
                <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0" style={{ background: "#eef2ff" }}>
                  <span className="text-lg">🔒</span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] font-bold text-foreground">Примите заявку</p>
                  <p className="text-[11px] text-muted mt-0.5">После принятия вы сможете отмечать товары</p>
                </div>
                <button type="button" onClick={() => setActiveSheet("actions")}
                  className="px-3 py-2 rounded-xl text-[12px] font-bold text-white shrink-0"
                  style={{ background: "linear-gradient(135deg,#6366f1,#a855f7)" }}
                >
                  Принять
                </button>
              </div>
            )}

            {/* Order # + status badge */}
            {order.items.length > 0 && (
              <div className="flex items-center justify-between px-1">
                <p className="text-[14px] font-bold text-foreground">Заказ #{order.zid}</p>
                {cfg && (
                  <span
                    className="text-[11px] font-semibold px-3 py-1 rounded-full"
                    style={{ background: cfg.bg, color: cfg.color }}
                  >
                    {cfg.label}
                  </span>
                )}
              </div>
            )}

            {/* Broadcast placeholder */}
            {!isDirect && order.items.length === 0 && (
              <div className="rounded-2xl bg-white p-8 text-center" style={{ border: "1px solid var(--color-border)" }}>
                <ShoppingOutlined style={{ fontSize: 40, color: "#c7d2fe" }} />
                <p className="text-[13px] font-semibold text-foreground mt-3 mb-1">Сводный заказ</p>
                <p className="text-[11px] text-muted">Список товаров недоступен — общайтесь в чате</p>
              </div>
            )}

            {/* Items */}
            {order.items.map((item) => (
              <ItemCard
                key={item.id} item={item} orderId={order.id}
                onUpdate={handleItemUpdate}
                orderLocked={orderLocked}
              />
            ))}

            {/* Done banner */}
            {isDone && (
              <div className="flex items-center justify-center gap-2 py-4 rounded-2xl bg-white" style={{ border: "1px solid var(--color-border)" }}>
                {order.status === "COMPLETED"
                  ? <><CheckCircle2 className="w-4 h-4" style={{ color: "#16a34a" }} /><span className="text-[13px] font-semibold" style={{ color: "#16a34a" }}>Заказ завершён</span></>
                  : <><XCircle className="w-4 h-4 text-red-400" /><span className="text-[13px] font-semibold text-red-500">Заказ отменён</span></>
                }
              </div>
            )}

            {/* Broadcast actions */}
            {!isDirect && hasActions && (
              <button type="button" onClick={() => setActiveSheet("actions")}
                className="w-full py-4 rounded-2xl text-[14px] font-bold text-white flex items-center justify-center gap-2"
                style={{ background: "linear-gradient(135deg,#6366f1,#a855f7)", boxShadow: "0 4px 16px rgba(99,102,241,0.3)" }}
              >
                Действия с заказом
              </button>
            )}

            {/* Inline confirm for direct */}
            {isDirect && order.status === "ACCEPTED" && inlineConfirm && (
              <div className="rounded-2xl bg-white p-5 space-y-3" style={{ border: `2px solid ${inlineConfirm === "complete" ? "#86efac" : "#fca5a5"}` }}>
                <p className="text-[14px] font-bold text-center text-foreground">
                  {inlineConfirm === "complete" ? "Подтвердите завершение" : "Подтвердите отмену"}
                </p>
                <p className="text-[12px] text-muted text-center">
                  {inlineConfirm === "complete" ? "Покупатель получит уведомление. Действие необратимо." : "Заказ будет отменён. Действие необратимо."}
                </p>
                <div className="flex gap-3">
                  <button type="button" onClick={() => setInlineConfirm(null)}
                    className="flex-1 py-3 rounded-2xl text-[13px] font-semibold"
                    style={{ background: "var(--card)", color: "var(--muted)", border: "1px solid var(--color-border)" }}
                  >
                    Назад
                  </button>
                  <button type="button"
                    onClick={() => { setInlineConfirm(null); if (inlineConfirm === "complete") handleComplete(); else handleCancel(); }}
                    disabled={actionBusy}
                    className="flex-[1.4] py-3 rounded-2xl text-[13px] font-bold text-white flex items-center justify-center gap-2 disabled:opacity-60"
                    style={{ background: inlineConfirm === "complete" ? "#16a34a" : "#dc2626" }}
                  >
                    {actionBusy ? <Loader2 className="w-4 h-4 animate-spin" /> : inlineConfirm === "complete" ? "Завершить" : "Отменить"}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ══ STICKY FOOTER ══ */}
        <div
          className="shrink-0 px-4 py-3 max-w-lg mx-auto w-full"
          style={{ background: "white", borderTop: "1px solid var(--color-border)", boxShadow: "0 -2px 12px rgba(0,0,0,0.06)" }}
        >
          {isDirect && order.status === "ACCEPTED" && !inlineConfirm ? (
            <div className="grid grid-cols-2 gap-3">
              <button type="button" onClick={() => setInlineConfirm("complete")} disabled={actionBusy}
                className="flex items-center justify-center gap-1.5 py-3.5 rounded-2xl text-[13px] font-bold text-white disabled:opacity-60"
                style={{ background: "linear-gradient(135deg,#16a34a,#0d9488)", boxShadow: "0 3px 12px rgba(22,163,74,0.3)" }}
              >
                <CheckCircle2 className="w-4 h-4" />
                Завершить заказ
              </button>
              <button type="button" onClick={() => setInlineConfirm("cancel")} disabled={actionBusy}
                className="flex items-center justify-center gap-1.5 py-3.5 rounded-2xl text-[13px] font-bold disabled:opacity-60"
                style={{ background: "#fef2f2", color: "#dc2626", border: "1.5px solid #fca5a5" }}
              >
                <XCircle className="w-4 h-4" />
                Отменить
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={handleRefresh}
              disabled={refreshing}
              className="w-full py-4 rounded-2xl text-[15px] font-bold flex items-center justify-center gap-2 transition active:scale-[0.98] disabled:opacity-60"
              style={{
                background: "linear-gradient(135deg,#6366f1,#8b5cf6)",
                color: "#fff",
                boxShadow: "0 4px 16px rgba(99,102,241,0.3)",
              }}
            >
              {refreshing
                ? <Loader2 className="w-5 h-5 animate-spin" />
                : <RefreshCw className="w-5 h-5" />
              }
              {refreshing ? "Обновляем..." : "Обновить заказ"}
            </button>
          )}
        </div>

      </div>

      {/* ══ SHEETS ══ */}
      {activeSheet === "actions" && order && (
        <ActionsSheet
          order={order} onClose={() => setActiveSheet(null)}
          onAccept={handleAccept} onComplete={handleComplete} onCancel={handleCancel}
          onStartPurchasing={handleStartPurchasing} onStartDelivering={handleStartDelivering}
          busy={actionBusy}
        />
      )}
      {activeSheet === "switcher" && (
        <SwitcherSheet
          currentId={order.id} orders={allOrders}
          onClose={() => setActiveSheet(null)}
          onSelect={(id) => { setActiveSheet(null); router.push(`/orders/${id}`); }}
        />
      )}
    </>
  );
}
