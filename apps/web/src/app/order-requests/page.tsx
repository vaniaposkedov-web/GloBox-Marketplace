"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Alert, Card, Empty, Skeleton, Tag } from "antd";
import {
  ClockCircleOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  StopOutlined,
  TrophyOutlined,
} from "@ant-design/icons";
import { SiteHeader } from "@/widgets/header";
import { getOrderRequests } from "@/features/commerce";
import { useSession } from "@/shared/auth";
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

export default function OrderRequestsPage() {
  const router = useRouter();
  const { user, hydrated } = useSession();
  const [requests, setRequests] = useState<OrderRequestDto[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!hydrated) return;
    if (!user) {
      router.replace("/login?next=/order-requests");
      return;
    }
    getOrderRequests()
      .then(setRequests)
      .catch((err: Error) => setError(err.message));
  }, [hydrated, user, router]);

  return (
    <div className="min-h-screen flex flex-col pb-16 sm:pb-0">
      <SiteHeader />
      <main className="flex-1 max-w-4xl w-full mx-auto px-4 py-6">
        <h1 className="text-2xl font-extrabold tracking-tight mb-5">Мои заявки</h1>

        {error && <Alert type="error" message={error} showIcon className="!rounded-xl mb-4" />}

        {!requests && !error && (
          <div className="space-y-3">
            {[0, 1, 2].map((i) => (
              <Card key={i} className="!rounded-2xl">
                <Skeleton active paragraph={{ rows: 2 }} />
              </Card>
            ))}
          </div>
        )}

        {requests && requests.length === 0 && (
          <div className="text-center py-20">
            <Empty
              description="У вас пока нет заявок"
              image={Empty.PRESENTED_IMAGE_SIMPLE}
            />
            <Link
              href="/listings"
              className="mt-4 inline-flex px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 text-white text-sm font-semibold shadow-md shadow-amber-500/20 hover:shadow-lg hover:-translate-y-0.5 transition-all"
            >
              Перейти в каталог
            </Link>
          </div>
        )}

        {requests && requests.length > 0 && (
          <div className="space-y-3">
            {requests.map((req) => (
              <Link key={req.id} href={`/order-requests/${req.id}`}>
                <Card
                  className="!rounded-2xl hover:shadow-md hover:-translate-y-0.5 transition-all cursor-pointer"
                  bodyStyle={{ padding: 16 }}
                >
                  <div className="flex items-start gap-3">
                    {/* Mediator avatar */}
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-amber-400 to-rose-400 text-white font-bold flex items-center justify-center shrink-0 text-xs overflow-hidden">
                      {req.mediator.avatarUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={req.mediator.avatarUrl} alt="" className="w-full h-full object-cover" />
                      ) : (
                        `${req.mediator.firstName[0]}${req.mediator.lastName[0]}`
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-bold text-sm">
                          {req.mediator.firstName} {req.mediator.lastName}
                        </span>
                        <Tag
                          color={STATUS_COLOR[req.status]}
                          className="!m-0 !text-xs !rounded-full"
                          icon={STATUS_ICON[req.status]}
                        >
                          {ORDER_REQUEST_STATUS_LABEL[req.status]}
                        </Tag>
                      </div>

                      <div className="text-xs text-muted mb-2">
                        {req.items.length} товар{req.items.length === 1 ? "" : req.items.length < 5 ? "а" : "ов"}
                        {" · "}
                        {new Date(req.createdAt).toLocaleDateString("ru-RU", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        })}
                      </div>

                      {/* Preview of first 3 items */}
                      <div className="flex gap-1.5 mb-2">
                        {req.items.slice(0, 3).map((it) => (
                          <div key={it.id} className="w-10 h-10 rounded-lg bg-stone-100 overflow-hidden shrink-0">
                            {it.imageUrl ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img src={it.imageUrl} alt="" className="w-full h-full object-cover" />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-xs text-stone-400">🛍</div>
                            )}
                          </div>
                        ))}
                        {req.items.length > 3 && (
                          <div className="w-10 h-10 rounded-lg bg-stone-100 flex items-center justify-center text-xs text-muted font-medium">
                            +{req.items.length - 3}
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <div className="text-lg font-extrabold">
                        {formatPrice(req.totalAmount, req.currency)}
                      </div>
                      <div className="text-xs text-muted">
                        комиссия {formatPrice(req.totalCommission, req.currency)}
                      </div>
                    </div>
                  </div>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
