"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Package,
  CheckCircle2,
  Search,
  ShoppingBag,
  Clock,
  Truck,
  XCircle,
  Users,
  Inbox,
  Loader2,
} from "lucide-react";
import { SiteHeader } from "@/widgets/header";
import { Button } from "@/shared/ui";
import { useSession } from "@/shared/auth";
import {
  getAvailableMediatorOrders,
  respondToMediatorOrder,
  getMyMediatorOrders,
  startPurchasing,
  startDelivering,
} from "@/features/commerce";
import { formatPrice } from "@/shared/lib";
import { ApiError } from "@/shared/api/client";

type Tab = "available" | "active";

const STATUS_MAP: Record<string, { label: string; color: string }> = {
  SEARCHING: { label: "Ищем исполнителя", color: "bg-blue-100 text-blue-700" },
  SELECTING: { label: "Выбор исполнителя", color: "bg-indigo-100 text-indigo-700" },
  ASSIGNED: { label: "Назначен", color: "bg-purple-100 text-purple-700" },
  AWAITING_PURCHASE_DATE: { label: "Ожидание даты", color: "bg-amber-100 text-amber-700" },
  PURCHASING: { label: "Идёт закупка", color: "bg-orange-100 text-orange-700" },
  DELIVERING: { label: "Доставка", color: "bg-cyan-100 text-cyan-700" },
  COMPLETED: { label: "Завершён", color: "bg-emerald-100 text-emerald-700" },
  CANCELLED: { label: "Отменён", color: "bg-red-100 text-red-700" },
};

export default function MediatorDashboardPage() {
  const router = useRouter();
  const { user, hydrated } = useSession();
  const [tab, setTab] = useState<Tab>("available");
  const [available, setAvailable] = useState<any[]>([]);
  const [active, setActive] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!hydrated) return;
    if (!user) { router.replace("/login?next=/mediator-dashboard"); return; }
    loadAll();
  }, [hydrated, user, router]); // eslint-disable-line

  async function loadAll() {
    setLoading(true);
    try {
      const [avail, myOrders] = await Promise.all([
        getAvailableMediatorOrders().catch(() => ({ orders: [], limitReached: false, activeCount: 0 })),
        getMyMediatorOrders().catch(() => []),
      ]);
      setAvailable(avail.orders || []);
      setActive(Array.isArray(myOrders) ? myOrders.filter((o: any) =>
        !["COMPLETED", "CANCELLED", "DISPUTE", "NOT_FOUND"].includes(o.status)
      ) : []);
    } catch {}
    setLoading(false);
  }

  async function handleRespond(orderId: string) {
    setActionLoading(true);
    try {
      await respondToMediatorOrder(orderId);
      await loadAll();
      setTab("active");
    } catch (err) {
      setError(err instanceof ApiError ? err.payload?.message : "Ошибка");
    }
    setActionLoading(false);
  }

  async function handleStartPurchasing(orderId: string) {
    setActionLoading(true);
    try {
      await startPurchasing(orderId);
      await loadAll();
    } catch (err) {
      setError(err instanceof ApiError ? err.payload?.message : "Ошибка");
    }
    setActionLoading(false);
  }

  async function handleStartDelivering(orderId: string) {
    setActionLoading(true);
    try {
      await startDelivering(orderId);
      await loadAll();
    } catch (err) {
      setError(err instanceof ApiError ? err.payload?.message : "Ошибка");
    }
    setActionLoading(false);
  }

  if (!hydrated || !user) return <div className="min-h-screen flex flex-col"><SiteHeader /></div>;

  return (
    <div className="min-h-screen flex flex-col bg-stone-50/50">
      <SiteHeader />
      <main className="flex-1 max-w-4xl w-full mx-auto px-4 py-6">
        <h1 className="text-2xl font-extrabold mb-1">Кабинет посредника</h1>
        <p className="text-sm text-muted mb-5">Активных заказов: {active.length}/5</p>

        {error && (
          <div className="mb-4 px-4 py-3 rounded-xl bg-red-50 border border-red-100 text-sm text-red-600">
            {error}
          </div>
        )}

        {/* Tabs */}
        <div className="flex gap-1 p-1 rounded-xl bg-stone-100 mb-5 w-fit">
          {(["available", "active"] as Tab[]).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setTab(t)}
              className={`px-4 py-1.5 rounded-lg text-sm font-semibold transition ${tab === t ? "bg-white shadow-sm text-foreground" : "text-muted"}`}
            >
              {t === "available" ? (
                <span className="flex items-center gap-1.5"><Inbox className="w-3.5 h-3.5" /> Доступные {available.length > 0 && `(${available.length})`}</span>
              ) : (
                <span className="flex items-center gap-1.5"><Package className="w-3.5 h-3.5" /> Активные {active.length > 0 && `(${active.length})`}</span>
              )}
            </button>
          ))}
        </div>

        {loading && (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-8 h-8 animate-spin text-amber-500" />
          </div>
        )}

        {/* Available orders */}
        {!loading && tab === "available" && (
          <>
            {available.length === 0 && (
              <div className="text-center py-16">
                <Search className="w-10 h-10 text-stone-300 mx-auto mb-3" />
                <p className="font-semibold">Нет доступных заказов</p>
                <p className="text-sm text-muted mt-1">Новые заказы появятся здесь</p>
              </div>
            )}
            <div className="space-y-3">
              {available.map((order) => (
                <div key={order.id} className="rounded-2xl bg-white border border-border/40 p-4">
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div>
                      <p className="font-bold text-sm">{`Z-${order.id?.slice(-4)}`}</p>
                      <p className="text-xs text-muted">{order.itemsCount} товаров · {formatPrice(order.totalEstimatedAmount, order.currency)}</p>
                    </div>
                    {order.desiredPurchaseDate && (
                      <p className="text-xs text-muted">
                        Дата: {new Date(order.desiredPurchaseDate).toLocaleDateString("ru-RU")}
                      </p>
                    )}
                  </div>

                  {order.items?.length > 0 && (
                    <div className="flex gap-2 mb-3 overflow-x-auto">
                      {order.items.slice(0, 4).map((item: any) => (
                        <div key={item.id} className="w-12 h-12 rounded-lg border border-border/40 overflow-hidden bg-stone-50 shrink-0">
                          {item.selectedPhotoUrl ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={item.selectedPhotoUrl} alt="" className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <Package className="w-4 h-4 text-stone-300" />
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}

                  <Button
                    type="button"
                    onClick={() => handleRespond(order.id)}
                    loading={actionLoading}
                    disabled={active.length >= 5}
                    className="w-full py-2 rounded-xl text-sm"
                  >
                    {active.length >= 5 ? "Лимит 5/5 заказов" : "Откликнуться"}
                  </Button>
                </div>
              ))}
            </div>
          </>
        )}

        {/* Active orders */}
        {!loading && tab === "active" && (
          <>
            {active.length === 0 && (
              <div className="text-center py-16">
                <Package className="w-10 h-10 text-stone-300 mx-auto mb-3" />
                <p className="font-semibold">Нет активных заказов</p>
                <p className="text-sm text-muted mt-1">Откликайтесь на доступные заказы</p>
              </div>
            )}
            <div className="space-y-3">
              {active.map((order) => {
                const s = STATUS_MAP[order.status] || { label: order.status, color: "bg-stone-100 text-stone-600" };
                return (
                  <div key={order.id} className="rounded-2xl bg-white border border-border/40 p-4">
                    <div className="flex items-start justify-between gap-3 mb-3">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-bold text-sm">{order.zid}</span>
                          <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${s.color}`}>{s.label}</span>
                        </div>
                        <p className="text-xs text-muted">{order.items?.length || 0} товаров · {formatPrice(order.totalEstimatedAmount, order.currency)}</p>
                      </div>
                      <Link
                        href={`/mediator-orders/${order.id}`}
                        className="text-xs text-amber-600 font-medium hover:underline"
                      >
                        Открыть →
                      </Link>
                    </div>

                    <div className="flex gap-2">
                      {["ASSIGNED", "AWAITING_PURCHASE_DATE"].includes(order.status) && (
                        <button
                          type="button"
                          onClick={() => handleStartPurchasing(order.id)}
                          disabled={actionLoading}
                          className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-orange-500 text-white text-xs font-bold hover:bg-orange-600 transition disabled:opacity-50"
                        >
                          <ShoppingBag className="w-3.5 h-3.5" /> Начать закупку
                        </button>
                      )}
                      {order.status === "PURCHASING" && (
                        <button
                          type="button"
                          onClick={() => handleStartDelivering(order.id)}
                          disabled={actionLoading}
                          className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-cyan-500 text-white text-xs font-bold hover:bg-cyan-600 transition disabled:opacity-50"
                        >
                          <Truck className="w-3.5 h-3.5" /> Передать заказ
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </main>
    </div>
  );
}
