"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Alert, Button, Card, Result, Skeleton, Tag, Timeline, Typography } from "antd";
import {
  ArrowLeftOutlined,
  ClockCircleOutlined,
  EditOutlined,
  HourglassOutlined,
  SafetyCertificateOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
} from "@ant-design/icons";
import { useSession, isSupplier } from "@/shared/auth";
import { SiteHeader } from "@/widgets/header";
import { SUPPLIER_REVIEW_SLA_HOURS } from "@/shared/lib";

type DemoStatus = "pending" | "needs_revision" | "approved" | "rejected";

interface DemoSnapshot {
  status: DemoStatus;
  submittedAt: string;
  reviewerNote?: string | null;
}

/**
 * Limited supplier dashboard (Блок 2.6).
 * Пока заявка PENDING — никаких витрин/товаров. Только статус + контакты.
 * При NEEDS_REVISION — кнопка «Доработать заявку».
 * При APPROVED — переход в полный кабинет (`/my-listings`).
 */
export default function SellerStatusPage() {
  const router = useRouter();
  const { user, hydrated } = useSession();
  const [snapshot, setSnapshot] = useState<DemoSnapshot | null>(null);

  useEffect(() => {
    // В реальной реализации будет запрос к /api/supplier/application/me.
    // Пока — демо: pending сразу после регистрации.
    if (!hydrated) return;
    if (!user) {
      router.replace("/seller/register");
      return;
    }
    setSnapshot({
      status: "pending",
      submittedAt: new Date().toISOString(),
      reviewerNote: null,
    });
  }, [hydrated, user, router]);

  const isSellerRole = isSupplier(user?.role, user?.roles);

  return (
    <div className="min-h-screen flex flex-col">
      <SiteHeader />
      <main className="flex-1 max-w-3xl w-full mx-auto px-4 py-8 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <Typography.Title level={3} className="!mb-1">
              Кабинет поставщика
            </Typography.Title>
            <Typography.Text type="secondary">
              Заявка пока на рассмотрении. После одобрения откроется полный
              кабинет с витриной, заказами и аналитикой.
            </Typography.Text>
          </div>
          <Link href="/">
            <Button icon={<ArrowLeftOutlined />}>На главную</Button>
          </Link>
        </div>

        {!hydrated || !snapshot ? (
          <Card className="!rounded-3xl">
            <Skeleton active />
          </Card>
        ) : !isSellerRole ? (
          <Result
            status="info"
            title="Заявка не найдена"
            subTitle="Похоже, вы ещё не подавали заявку поставщика."
            extra={
              <Link href="/seller/register">
                <Button type="primary" className="!rounded-xl">
                  Подать заявку
                </Button>
              </Link>
            }
          />
        ) : (
          <>
            <StatusCard status={snapshot.status} note={snapshot.reviewerNote ?? null} />

            <Card className="!rounded-3xl">
              <Typography.Title level={4} className="!mb-3">
                Прогресс
              </Typography.Title>
              <Timeline
                items={[
                  {
                    color: "green",
                    children: (
                      <div>
                        <div className="font-medium">Заявка получена</div>
                        <div className="text-xs text-muted">
                          {new Date(snapshot.submittedAt).toLocaleString("ru-RU")}
                        </div>
                      </div>
                    ),
                  },
                  {
                    color:
                      snapshot.status === "pending" ? "blue" : "green",
                    dot:
                      snapshot.status === "pending" ? (
                        <HourglassOutlined />
                      ) : undefined,
                    children: (
                      <div>
                        <div className="font-medium">Модерация</div>
                        <div className="text-xs text-muted">
                          SLA — до {SUPPLIER_REVIEW_SLA_HOURS} ч.
                        </div>
                      </div>
                    ),
                  },
                  {
                    color:
                      snapshot.status === "approved"
                        ? "green"
                        : snapshot.status === "rejected"
                          ? "red"
                          : "gray",
                    dot:
                      snapshot.status === "approved" ? (
                        <CheckCircleOutlined />
                      ) : snapshot.status === "rejected" ? (
                        <CloseCircleOutlined />
                      ) : undefined,
                    children: (
                      <div>
                        <div className="font-medium">Решение</div>
                        <div className="text-xs text-muted">
                          После одобрения откроется витрина.
                        </div>
                      </div>
                    ),
                  },
                ]}
              />
            </Card>

            {snapshot.status === "approved" && (
              <Result
                status="success"
                title="Поздравляем — вы поставщик!"
                subTitle="Можно публиковать товары и принимать заказы."
                extra={
                  <Link href="/my-listings">
                    <Button
                      type="primary"
                      size="large"
                      className="!rounded-xl"
                    >
                      Открыть витрину
                    </Button>
                  </Link>
                }
              />
            )}

            {snapshot.status === "needs_revision" && (
              <Alert
                type="warning"
                showIcon
                icon={<EditOutlined />}
                className="!rounded-2xl"
                message="Нужны правки"
                description={
                  <div className="space-y-2">
                    <div>{snapshot.reviewerNote || "Уточните данные в анкете."}</div>
                    <Link href="/seller/register">
                      <Button type="primary" className="!rounded-xl">
                        Доработать заявку
                      </Button>
                    </Link>
                  </div>
                }
              />
            )}
          </>
        )}
      </main>
    </div>
  );
}

function StatusCard({
  status,
  note,
}: {
  status: DemoStatus;
  note: string | null;
}) {
  const map: Record<
    DemoStatus,
    { color: string; tag: string; title: string; sub: string; icon: React.ReactNode }
  > = {
    pending: {
      color: "processing",
      tag: "На рассмотрении",
      title: "Заявка проверяется модератором",
      sub: `Ответ придёт в течение ${SUPPLIER_REVIEW_SLA_HOURS} часов. Пока кабинет ограничен — публиковать товары нельзя.`,
      icon: <ClockCircleOutlined style={{ fontSize: 28, color: "#0958d9" }} />,
    },
    needs_revision: {
      color: "warning",
      tag: "Нужны правки",
      title: "Модератор просит уточнить данные",
      sub: note ?? "Откройте анкету и поправьте отмеченные поля.",
      icon: <EditOutlined style={{ fontSize: 28, color: "#d97706" }} />,
    },
    approved: {
      color: "success",
      tag: "Одобрено",
      title: "Вы — поставщик Globox",
      sub: "Полный кабинет открыт. Загружайте товары и принимайте заказы.",
      icon: (
        <SafetyCertificateOutlined style={{ fontSize: 28, color: "#16a34a" }} />
      ),
    },
    rejected: {
      color: "error",
      tag: "Отклонено",
      title: "Заявка отклонена",
      sub: note ?? "Свяжитесь с поддержкой для уточнения причины.",
      icon: <CloseCircleOutlined style={{ fontSize: 28, color: "#dc2626" }} />,
    },
  };
  const v = map[status];
  return (
    <Card className="!rounded-3xl !border-amber-200">
      <div className="flex items-start gap-4">
        <div className="w-14 h-14 rounded-2xl bg-amber-50 flex items-center justify-center shrink-0">
          {v.icon}
        </div>
        <div className="flex-1">
          <Tag color={v.color as never} className="!rounded-lg">
            {v.tag}
          </Tag>
          <div className="mt-2 text-lg font-semibold">{v.title}</div>
          <div className="text-sm text-muted mt-1 max-w-xl">{v.sub}</div>
        </div>
      </div>
    </Card>
  );
}
