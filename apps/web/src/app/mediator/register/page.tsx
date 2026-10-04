"use client";

import Link from "next/link";
import { Button, Card, Typography } from "antd";
import { ArrowLeftOutlined } from "@ant-design/icons";
import { RegisterMediatorForm } from "@/features/register-mediator";
import { AnimatedWarmBackground, AuthBrandPanel } from "@/shared/ui";

export default function MediatorRegisterPage() {
  return (
    <main className="relative min-h-screen flex items-center justify-center px-4 py-10 overflow-hidden bg-gradient-to-br from-stone-50 via-amber-50/40 to-orange-50/30">
      <AnimatedWarmBackground />

      <div className="relative w-full max-w-5xl grid lg:grid-cols-[1fr_1.05fr] gap-6 items-stretch z-10">
        <AuthBrandPanel
          variant="mediator"
          badge="Кабинет посредника · posred-globox.ru"
          headline="Зарабатывайте на выкупах с Садовода"
          subline="Покупатели заказывают через вас, вы выкупаете товар у поставщиков и забираете комиссию. Платформа сводит всех вместе."
          perks={[
            { value: "3–20%", hint: "ваша комиссия" },
            { value: "0 ₽", hint: "минимум выкупа" },
            { value: "24 ч", hint: "модерация заявки" },
          ]}
        />

        <Card
          className="!rounded-3xl !border-border !shadow-xl fade-in-up"
          style={{ animationDelay: "0.15s" }}
        >
          <div className="mb-5 flex items-start justify-between gap-3">
            <div>
              <Typography.Title level={2} className="!mb-1 !text-[28px]">
                Стать посредником
              </Typography.Title>
              <Typography.Text type="secondary">
                4 шага: данные → код в MAX → условия → модерация
              </Typography.Text>
            </div>
            <Link href="/">
              <Button
                type="text"
                icon={<ArrowLeftOutlined />}
                className="!mt-1"
              >
                На главную
              </Button>
            </Link>
          </div>

          <RegisterMediatorForm />

          <div className="text-center text-xs text-muted mt-6 pt-4 border-t border-border">
            Уже подавали заявку?{" "}
            <Link
              href="/mediator/status"
              className="text-amber-700 hover:underline font-semibold"
            >
              Посмотреть статус
            </Link>
          </div>
        </Card>
      </div>
    </main>
  );
}
