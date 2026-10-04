"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Alert, Button, Card, Result, Skeleton, Tag, Timeline, Typography } from "antd";
import {
  ArrowLeftOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  CloseCircleOutlined,
  EditOutlined,
  HourglassOutlined,
  SafetyCertificateOutlined,
} from "@ant-design/icons";
import { useSession, isMediator } from "@/shared/auth";
import { SiteHeader } from "@/widgets/header";
import { MEDIATOR_REVIEW_SLA_HOURS } from "@/shared/lib";

type DemoStatus = "pending" | "needs_revision" | "approved" | "rejected";

interface DemoSnapshot {
  status: DemoStatus;
  submittedAt: string;
  reviewerNote?: string | null;
}

export default function MediatorStatusPage() {
  const router = useRouter();
  const { user, hydrated } = useSession();
  const [snapshot, setSnapshot] = useState<DemoSnapshot | null>(null);

  useEffect(() => {
    if (!hydrated) return;
    if (!user) {
      router.replace("/mediator/register");
      return;
    }
    setSnapshot({
      status: "pending",
      submittedAt: new Date().toISOString(),
      reviewerNote: null,
    });
  }, [hydrated, user, router]);

  const isMediatorRole = isMediator(user?.role, user?.roles);

  return (
    <div className="min-h-screen flex flex-col">
      <SiteHeader />
      <main className="flex-1 max-w-3xl w-full mx-auto px-4 py-8 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <Typography.Title level={3} className="!mb-1">
              Кабинет посредника
            </Typography.Title>
            <Typography.Text type="secondary">
              Принимать заказы можно после одобрения. Пока заявка PENDING —
              кабинет ограничен.
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
        ) : !isMediatorRole ? (
          <Result
            status="info"
            title="Заявка не найдена"
            subTitle="Вы ещё не подавали заявку посредника."
            extra={
              <Link href="/mediator/register">
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
                    color: snapshot.status === "pending" ? "blue" : "green",
                    dot:
                      snapshot.status === "pending" ? (
                        <HourglassOutlined />
                      ) : undefined,
                    children: (
                      <div>
                        <div className="font-medium">Модерация</div>
                        <div className="text-xs text-muted">
                          SLA — до {MEDIATOR_REVIEW_SLA_HOURS} ч.
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
                          После одобрения вас могут выбирать покупатели.
                        </div>
                      </div>
                    ),
                  },
                ]}
              />
            </Card>

            {snapshot.status === "needs_revision" && (
              <Alert
                type="warning"
                showIcon
                icon={<EditOutlined />}
                className="!rounded-2xl"
                message="Нужны правки"
                description={
                  <div className="space-y-2">
                    <div>
                      {snapshot.reviewerNote || "Уточните данные в анкете."}
                    </div>
                    <Link href="/mediator/register">
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
      sub: `Ответ придёт в течение ${MEDIATOR_REVIEW_SLA_HOURS} часов. Принимать заказы пока нельзя.`,
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
      title: "Вы — посредник Globox",
      sub: "Покупатели увидят вас в списке доступных посредников.",
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
    <Card className="!rounded-3xl !border-sky-200">
      <div className="flex items-start gap-4">
        <div className="w-14 h-14 rounded-2xl bg-sky-50 flex items-center justify-center shrink-0">
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
