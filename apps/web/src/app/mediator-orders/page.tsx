"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Package, MessageSquare, Search, Users, ShoppingBag,
  Clock, Truck, CheckCircle2, XCircle, ChevronRight,
  CalendarDays, Plus,
} from "lucide-react";
import { SiteHeader } from "@/widgets/header";
import { useSession } from "@/shared/auth";
import { getMyMediatorOrders } from "@/features/commerce";
import { formatPrice } from "@/shared/lib";

// ─── Status config ────────────────────────────────────────────────

const STATUS = {
  SEARCHING:             { label: "Ищем посредника",    color: "bg-blue-100 text-blue-700",    dot: "bg-blue-400",    icon: Search },
  SELECTING:             { label: "Выбор посредника",   color: "bg-indigo-100 text-indigo-700", dot: "bg-indigo-400",  icon: Users },
  ASSIGNED:              { label: "Исполнитель выбран", color: "bg-purple-100 text-purple-700", dot: "bg-purple-400",  icon: CheckCircle2 },
  AWAITING_PURCHASE_DATE:{ label: "Ожидание даты",      color: "bg-amber-100 text-amber-700",   dot: "bg-amber-400",   icon: Clock },
  PURCHASING:            { label: "Идёт закупка",       color: "bg-orange-100 text-orange-700", dot: "bg-orange-400",  icon: ShoppingBag },
  DELIVERING:            { label: "Передача заказа",    color: "bg-cyan-100 text-cyan-700",     dot: "bg-cyan-400",    icon: Truck },
  COMPLETED:             { label: "Завершён",            color: "bg-emerald-100 text-emerald-700",dot: "bg-emerald-400",icon: CheckCircle2 },
  CANCELLED:             { label: "Отменён",             color: "bg-red-100 text-red-700",      dot: "bg-red-400",     icon: XCircle },
  DISPUTE:               { label: "Спор",                color: "bg-rose-100 text-rose-700",     dot: "bg-rose-400",    icon: XCircle },
  NOT_FOUND:             { label: "Не нашли посредника",color: "bg-gray-100 text-gray-600",    dot: "bg-gray-400",    icon: XCircle },
} as const;

type StatusKey = keyof typeof STATUS;

const ACTIVE: StatusKey[] = ["SEARCHING","SELECTING","ASSIGNED","AWAITING_PURCHASE_DATE","PURCHASING","DELIVERING"];
const DONE:   StatusKey[] = ["COMPLETED","CANCELLED","DISPUTE","NOT_FOUND"];

type Tab = "active" | "done";

// ─── Page ─────────────────────────────────────────────────────────

export default function MediatorOrdersPage() {
  const router = useRouter();
  const { user, hydrated } = useSession();
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<Tab>("active");

  useEffect(() => {
    if (!hydrated) return;
    if (!user) { router.replace("/login?next=/mediator-orders"); return; }
    getMyMediatorOrders().then(setOrders).finally(() => setLoading(false));
  }, [hydrated, user, router]);

  if (!hydrated || !user) return <div className="min-h-screen flex flex-col"><SiteHeader /></div>;

  const filtered = orders.filter((o) =>
    tab === "active" ? ACTIVE.includes(o.status) : DONE.includes(o.status)
  );
  const activeCount = orders.filter((o) => ACTIVE.includes(o.status)).length;
  const doneCount   = orders.filter((o) => DONE.includes(o.status)).length;

  return (
    <div className="min-h-screen flex flex-col bg-stone-50/40">
      <SiteHeader />

      <main className="flex-1 max-w-2xl w-full mx-auto px-4 py-5">

        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <div>
            <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight">Мои заказы</h1>
            <p className="text-xs text-muted mt-0.5">Заказы с посредниками</p>
          </div>
          <Link
            href="/cart"
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 text-white text-xs font-bold shadow-md shadow-amber-500/20 hover:shadow-lg hover:-translate-y-0.5 transition-all"
          >
            <Plus className="w-3.5 h-3.5" /> Новый
          </Link>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 p-1 rounded-xl bg-stone-100 mb-5">
          {([["active","Активные",activeCount],["done","История",doneCount]] as const).map(([t,label,count]) => (
            <button
              key={t}
              type="button"
              onClick={() => setTab(t as Tab)}
              className={`flex-1 py-2 rounded-lg text-sm font-semibold transition flex items-center justify-center gap-1.5 ${
                tab === t ? "bg-white shadow-sm text-foreground" : "text-muted"
              }`}
            >
              {label}
              {count > 0 && (
                <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ${
                  tab === t ? "bg-amber-100 text-amber-700" : "bg-stone-200 text-stone-500"
                }`}>
                  {count}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Loading */}
        {loading && (
          <div className="space-y-3">
            {[0,1,2].map((i) => (
              <div key={i} className="h-28 rounded-2xl bg-white border border-border/40 animate-pulse" />
            ))}
          </div>
        )}

        {/* Empty */}
        {!loading && filtered.length === 0 && (
          <div className="flex flex-col items-center text-center py-16">
            <div className="w-16 h-16 rounded-2xl bg-stone-100 flex items-center justify-center mb-4">
              {tab === "active" ? <Package className="w-8 h-8 text-stone-300" /> : <CheckCircle2 className="w-8 h-8 text-stone-300" />}
            </div>
            <h3 className="font-bold text-base">{tab === "active" ? "Нет активных заказов" : "Нет завершённых заказов"}</h3>
            <p className="text-sm text-muted mt-1 max-w-xs">
              {tab === "active" ? "Оформите заказ через корзину, и посредник свяжется с вами" : "Завершённые заказы появятся здесь"}
            </p>
            {tab === "active" && (
              <Link
                href="/cart"
                className="mt-4 inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 text-white text-sm font-semibold shadow-md"
              >
                <ShoppingBag className="w-4 h-4" /> Перейти в корзину
              </Link>
            )}
          </div>
        )}

        {/* Orders list */}
        {!loading && filtered.length > 0 && (
          <div className="space-y-3">
            {filtered.map((order) => <OrderCard key={order.id} order={order} />)}
          </div>
        )}
      </main>
    </div>
  );
}

// ─── Order Card ───────────────────────────────────────────────────

function OrderCard({ order }: { order: any }) {
  const s = STATUS[order.status as StatusKey] || STATUS.SEARCHING;
  const Icon = s.icon;
  const isActive = ACTIVE.includes(order.status);

  const hasChat = order.chats?.length > 0 || order.mediator;
  const lastMsg = order.lastChatMessage?.content;

  return (
    <Link
      href={`/mediator-orders/${order.id}`}
      className="block rounded-2xl bg-white border border-border/40 p-4 hover:shadow-md hover:border-amber-200/60 active:scale-[0.99] transition-all group"
    >
      {/* Top row */}
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex items-center gap-2.5">
          {/* Status dot */}
          <div className={`w-2 h-2 rounded-full shrink-0 ${s.dot} ${isActive ? "ring-2 ring-offset-1 ring-current opacity-60" : ""}`} />
          <div>
            <div className="flex items-center gap-2">
              <span className="font-extrabold text-sm">{order.zid}</span>
              <span className={`inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full ${s.color}`}>
                <Icon className="w-3 h-3" />
                {s.label}
              </span>
            </div>
            <p className="text-[11px] text-muted mt-0.5">
              {new Date(order.createdAt).toLocaleDateString("ru-RU", { day:"2-digit", month:"long", year:"numeric" })}
            </p>
          </div>
        </div>

        <div className="text-right shrink-0">
          <div className="font-extrabold text-sm">{formatPrice(order.totalEstimatedAmount, order.currency)}</div>
          {order.responses?.length > 0 && ["SEARCHING","SELECTING"].includes(order.status) && (
            <span className="text-[11px] text-amber-600 font-medium">{order.responses.length} откл.</span>
          )}
        </div>
      </div>

      {/* Items thumbnails */}
      {order.items?.length > 0 && (
        <div className="flex gap-1.5 mb-2.5">
          {order.items.slice(0,5).map((item: any) => (
            <div key={item.id} className="w-10 h-10 rounded-lg border border-border/40 overflow-hidden bg-stone-50 shrink-0">
              {item.selectedPhotoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={item.selectedPhotoUrl} alt="" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <Package className="w-3.5 h-3.5 text-stone-300" />
                </div>
              )}
            </div>
          ))}
          {order.items.length > 5 && (
            <div className="w-10 h-10 rounded-lg border border-border/40 bg-stone-100 flex items-center justify-center text-[10px] font-bold text-muted shrink-0">
              +{order.items.length - 5}
            </div>
          )}
          <span className="self-center text-xs text-muted ml-1">{order.items.length} товаров</span>
        </div>
      )}

      {/* Mediator + last message */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 min-w-0">
          {order.mediator ? (
            <>
              <div className="w-6 h-6 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 text-white text-[10px] font-bold flex items-center justify-center shrink-0">
                {order.mediator.firstName?.[0]}
              </div>
              <span className="text-xs text-muted font-medium truncate">
                {order.mediator.firstName} {order.mediator.lastName}
              </span>
            </>
          ) : (
            <span className="text-xs text-muted italic">
              {["SEARCHING","SELECTING"].includes(order.status) ? "Ожидаем откликов..." : "Посредник не назначен"}
            </span>
          )}
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {hasChat && (
            <div className="flex items-center gap-1 text-[11px] text-amber-600 font-medium">
              <MessageSquare className="w-3.5 h-3.5" />
              <span>Чат</span>
            </div>
          )}
          {order.desiredPurchaseDate && (
            <div className="flex items-center gap-1 text-[11px] text-muted">
              <CalendarDays className="w-3 h-3" />
              <span>{new Date(order.desiredPurchaseDate).toLocaleDateString("ru-RU", { day:"2-digit", month:"short" })}</span>
            </div>
          )}
          <ChevronRight className="w-4 h-4 text-stone-300 group-hover:text-amber-500 group-hover:translate-x-0.5 transition-all" />
        </div>
      </div>

      {/* Last chat message preview */}
      {lastMsg && (
        <div className="mt-2 pt-2 border-t border-border/30">
          <p className="text-xs text-muted italic line-clamp-1">
            <MessageSquare className="w-3 h-3 inline mr-1" />
            {lastMsg}
          </p>
        </div>
      )}
    </Link>
  );
}
