"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Alert, Card, Skeleton, Tag, Modal } from "antd";
import {
  ClockCircleOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  StopOutlined,
  TrophyOutlined,
  ArrowLeftOutlined,
} from "@ant-design/icons";
import { SiteHeader } from "@/widgets/header";
import { getOrderRequest, cancelOrderRequest } from "@/features/commerce";
import { useSession } from "@/shared/auth";
import { Button } from "@/shared/ui";
import { ApiError } from "@/shared/api/client";
import {
  formatPrice,
  ORDER_REQUEST_STATUS_LABEL,
  type OrderRequestDto,
  type OrderRequestStatus,
} from "@/shared/lib";

const STATUS_ICON: Record<OrderRequestStatus, React.ReactNode> = {
  PENDING: <ClockCircleOutlined style={{ color: "#d97706" }} />,
  ACCEPTED: <CheckCircleOutlined style={{ color: "#16a34a" }} />,
  REJECTED: <CloseCircleOutlined style={{ color: "#dc2626" }} />,
  CANCELLED: <StopOutlined style={{ color: "#6b7280" }} />,
  COMPLETED: <TrophyOutlined style={{ color: "#7c3aed" }} />,
};

const STATUS_COLOR: Record<OrderRequestStatus, string> = {
  PENDING: "orange",
  ACCEPTED: "green",
  REJECTED: "red",
  CANCELLED: "default",
  COMPLETED: "purple",
};

export default function OrderRequestDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { user, hydrated } = useSession();
  const [req, setReq] = useState<OrderRequestDto | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [cancelling, setCancelling] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);

  useEffect(() => {
    if (!hydrated) return;
    if (!user) {
      router.replace(`/login?next=/order-requests/${params.id}`);
      return;
    }
    getOrderRequest(params.id)
      .then(setReq)
      .catch((err: Error) => setError(err.message));
  }, [hydrated, user, router, params.id]);

  async function handleCancel() {
    setCancelling(true);
    try {
      const updated = await cancelOrderRequest(params.id);
      setReq(updated);
      setConfirmOpen(false);
    } catch (err) {
      const msg = err instanceof ApiError ? err.payload.message : "Ошибка";
      setError(msg);
    } finally {
      setCancelling(false);
    }
  }

  return (
    <div className="min-h-screen flex flex-col pb-16 sm:pb-0">
      <SiteHeader />
      <main className="flex-1 max-w-4xl w-full mx-auto px-4 py-6">
        <Link
          href="/order-requests"
          className="inline-flex items-center gap-2 text-sm text-muted hover:text-foreground mb-4 transition"
        >
          <ArrowLeftOutlined /> Все заявки
        </Link>

        {error && <Alert type="error" message={error} showIcon className="!rounded-xl mb-4" />}

        {!req && !error && (
          <Card className="!rounded-2xl">
            <Skeleton active paragraph={{ rows: 6 }} />
          </Card>
        )}

        {req && (
          <div className="space-y-4 fade-in-up">
            {/* Header */}
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-xl font-extrabold tracking-tight">
                  Заявка
                </h1>
                <p className="text-xs text-muted mt-0.5">
                  {new Date(req.createdAt).toLocaleString("ru-RU")}
                </p>
              </div>
              <Tag
                color={STATUS_COLOR[req.status]}
                className="!text-sm !px-3 !py-1 !rounded-full"
                icon={STATUS_ICON[req.status]}
              >
                {ORDER_REQUEST_STATUS_LABEL[req.status]}
              </Tag>
            </div>

            {/* Mediator */}
            <Card className="!rounded-2xl" bodyStyle={{ padding: 16 }}>
              <div className="text-xs text-muted mb-2 font-medium uppercase tracking-wide">Посредник</div>
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-full bg-gradient-to-br from-amber-400 to-rose-400 text-white font-bold flex items-center justify-center text-xs shrink-0 overflow-hidden">
                  {req.mediator.avatarUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={req.mediator.avatarUrl} alt="" className="w-full h-full object-cover" />
                  ) : (
                    `${req.mediator.firstName[0]}${req.mediator.lastName[0]}`
                  )}
                </div>
                <div>
                  <div className="font-bold">{req.mediator.firstName} {req.mediator.lastName}</div>
                  <div className="text-xs text-muted">Комиссия {req.mediator.commissionRate}%</div>
                </div>
              </div>
            </Card>

            {/* Items */}
            <Card className="!rounded-2xl" bodyStyle={{ padding: 16 }}>
              <div className="text-xs text-muted mb-3 font-medium uppercase tracking-wide">Товары</div>
              <div className="space-y-3">
                {req.items.map((it) => (
                  <div key={it.id} className="flex items-center gap-3">
                    <div className="w-14 h-14 rounded-lg bg-stone-100 overflow-hidden shrink-0">
                      {it.imageUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={it.imageUrl} alt={it.title} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-lg">🛍</div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <Link href={`/listings/${it.listingId}`} className="text-sm font-medium hover:text-primary transition line-clamp-1">
                        {it.title}
                      </Link>
                      <p className="text-xs text-muted">{it.qty} шт.</p>
                    </div>
                    <div className="text-sm font-bold shrink-0">
                      {formatPrice(it.price * it.qty, req.currency)}
                    </div>
                  </div>
                ))}
              </div>
            </Card>

            {/* Price breakdown */}
            <Card className="!rounded-2xl" bodyStyle={{ padding: 16 }}>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted">Товары</span>
                  <span className="font-medium">{formatPrice(req.totalItemsPrice, req.currency)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted">Комиссия ({req.mediator.commissionRate}%)</span>
                  <span className="font-medium">{formatPrice(req.totalCommission, req.currency)}</span>
                </div>
                <div className="border-t border-border/40 pt-3 flex justify-between">
                  <span className="font-bold">Итого</span>
                  <span className="text-xl font-extrabold">{formatPrice(req.totalAmount, req.currency)}</span>
                </div>
              </div>
            </Card>

            {/* Payment warning */}
            <div className="rounded-xl bg-amber-50 border border-amber-200/60 p-4 flex gap-3">
              <div className="text-amber-600 shrink-0 mt-0.5 text-lg">⚠️</div>
              <div className="text-sm">
                <p className="font-semibold text-amber-800 mb-1">Оплата напрямую посреднику</p>
                <p className="text-amber-700/80 text-xs leading-relaxed">
                  Платформа не участвует в расчётах. Связь через чат.
                </p>
              </div>
            </div>

            {/* Cancel button */}
            {req.status === "PENDING" && (
              <Button
                type="button"
                variant="secondary"
                className="w-full py-3 rounded-xl !border-red-200 !text-red-600 hover:!bg-red-50"
                onClick={() => setConfirmOpen(true)}
              >
                Отменить заявку
              </Button>
            )}
          </div>
        )}
      </main>

      <Modal
        open={confirmOpen}
        onCancel={() => setConfirmOpen(false)}
        onOk={handleCancel}
        okText="Отменить заявку"
        cancelText="Назад"
        okButtonProps={{ danger: true, loading: cancelling }}
        title="Отменить заявку?"
      >
        <p>Посредник получит уведомление об отмене.</p>
      </Modal>
    </div>
  );
}
