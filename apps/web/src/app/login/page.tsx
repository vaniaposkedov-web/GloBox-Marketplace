"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Alert, Button, Card, Form, Input, Typography } from "antd";
import {
  ArrowLeftOutlined,
  LockOutlined,
  MailOutlined,
} from "@ant-design/icons";
import { ApiError } from "@/shared/api/client";
import { setSession } from "@/shared/auth";
import { fetchMe } from "@/features/auth-session";
import { AuthBrandPanel } from "@/shared/ui";
import {
  LoginPhoneForm,
  MaxFlow,
  MethodCircles,
  VkFlow,
  type BuyerAuthMethod,
} from "@/features/auth-methods";

/* ─────────────────────────────────────────────────────────────────── */

export default function LoginPage() {
  const [method, setMethod] = useState<BuyerAuthMethod>("email");

  const brandHeadline: Record<BuyerAuthMethod, string> = {
    vk:    "Войдите в один клик",
    max:   "Быстрый вход через MAX",
    phone: "Один код — и вы внутри",
    email: "Email и пароль — классика",
  };

  return (
    <main className="relative min-h-screen flex flex-col items-center justify-center px-3 sm:px-5 py-6 sm:py-10 overflow-hidden bg-gradient-to-br from-stone-50 via-amber-50/40 to-orange-50/30">
      <BubbleBg />

      {/* На главную — absolute top-left на мобильном, скрыт на desktop (там в AuthBrandPanel) */}
      <Link
        href="/"
        className="absolute top-4 left-4 z-20 lg:hidden inline-flex items-center gap-1.5 px-3 py-2 rounded-2xl bg-white/80 backdrop-blur border border-border shadow-sm text-sm font-medium text-muted hover:text-foreground transition-all fade-in-up"
        style={{ animationDelay: "0s" }}
      >
        <ArrowLeftOutlined style={{ fontSize: 11 }} />
        На главную
      </Link>

      <div className="relative w-full max-w-5xl grid lg:grid-cols-[1.05fr_1fr] gap-4 sm:gap-6 items-stretch z-10">
        <AuthBrandPanel
          variant="buyer"
          badge="Вход"
          headline={brandHeadline[method]}
          subline="Войдите, чтобы продолжить покупки, следить за заказами и получать персональные скидки на тысячи товаров с Садовода."
          onBack={() => (window.location.href = "/")}
        />

        <Card
          className="!rounded-2xl sm:!rounded-3xl !border-border !shadow-xl fade-in-up"
          styles={{ body: { padding: "16px" } }}
          style={{ animationDelay: "0.1s" }}
        >
          <div
            className="fade-in-up"
            style={{ animationDelay: "0.2s" }}
          >
            <Typography.Title level={3} className="!mb-4 !text-lg sm:!text-xl !text-center">
              Вход в аккаунт
            </Typography.Title>
          </div>

          <div className="fade-in-up" style={{ animationDelay: "0.3s" }}>
            <MethodCircles selected={method} onChange={setMethod} context="login" />
          </div>

          <div className="fade-in-up" style={{ animationDelay: "0.4s" }}>
            {method === "email" && <EmailLoginForm />}
            {method === "phone" && <LoginPhoneForm />}
            {method === "vk"    && <VkFlow context="login" />}
            {method === "max"   && <MaxFlow context="login" />}
          </div>

          <div className="mt-4 pt-3 border-t border-border fade-in-up" style={{ animationDelay: "0.5s" }}>
            <p className="text-center text-xs text-muted">
              Ещё нет аккаунта?{" "}
              <Link href="/register" className="text-amber-700 hover:underline font-semibold">
                Зарегистрироваться
              </Link>
            </p>
          </div>
        </Card>
      </div>
    </main>
  );
}

/* ── Glass bubble background ──────────────────────────────────────── */

function BubbleBg() {
  const bubbles = [
    { size: 480, style: { left: -110, top: -130 }, color: "245,158,11", anim: "drift-a", delay: "0s",   blur: 2  },
    { size: 380, style: { right: -90,  top: -70  }, color: "244,114,182", anim: "drift-b", delay: "3s",   blur: 1.5},
    { size: 300, style: { left: "5%",  bottom: -50}, color: "251,191,36",  anim: "drift-b", delay: "7s",   blur: 2  },
    { size: 240, style: { right: "9%", bottom: "14%"}, color: "249,115,22",anim: "drift-c", delay: "4s",   blur: 0  },
    { size: 190, style: { left: "43%", top: "58%" }, color: "251,146,60",  anim: "drift-a", delay: "9s",   blur: 1  },
    { size: 150, style: { right: "27%",top: "6%"  }, color: "253,186,116", anim: "drift-c", delay: "1.5s", blur: 0  },
  ];
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden style={{ opacity: 0.35 }}>
      {bubbles.map((b, i) => (
        <div
          key={i}
          className={`absolute rounded-full ${b.anim}`}
          style={{
            width: b.size, height: b.size,
            ...(b.style as React.CSSProperties),
            animationDelay: b.delay,
            filter: b.blur ? `blur(${b.blur}px)` : undefined,
            background: [
              "radial-gradient(circle at 34% 28%, rgba(255,255,255,0.9) 0%, rgba(255,255,255,0.55) 10%, transparent 32%)",
              "radial-gradient(circle at 66% 70%, rgba(0,0,0,0.05) 0%, transparent 28%)",
              `radial-gradient(circle at 50% 50%, rgba(${b.color},0.18) 0%, rgba(${b.color},0.06) 55%, transparent 78%)`,
            ].join(", "),
          }}
        >
          <div
            className="absolute inset-0 rounded-full"
            style={{ border: `1px solid rgba(${b.color},0.16)`, boxShadow: `inset 0 0 32px rgba(${b.color},0.06)` }}
          />
        </div>
      ))}
    </div>
  );
}

type EmailStage =
  | { step: "credentials" }
  | { step: "code"; email: string; password: string; devCode?: string }
  | { step: "done" };

function EmailLoginForm() {
  const router = useRouter();
  const [stage, setStage] = useState<EmailStage>({ step: "credentials" });

  return (
    <div className="w-full max-w-md mx-auto pt-2">
      {stage.step === "credentials" && (
        <EmailCredentialsStep
          onSuccess={(email, password, devCode) =>
            setStage({ step: "code", email, password, devCode })
          }
        />
      )}
      {stage.step === "code" && (
        <EmailCodeStep
          email={stage.email}
          password={stage.password}
          devCode={stage.devCode}
          onBack={() => setStage({ step: "credentials" })}
          onSuccess={() => {
            setStage({ step: "done" });
            setTimeout(() => router.push("/"), 800);
          }}
        />
      )}
      {stage.step === "done" && (
        <div className="text-center py-8">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-green-100 mb-3">
            <svg width="24" height="24" viewBox="0 0 20 20" fill="none">
              <path d="M4 10l4 4 8-8" stroke="#22c55e" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          <div className="text-lg font-bold text-foreground">Успешный вход</div>
          <div className="text-sm text-muted mt-1">Переходим на главную...</div>
        </div>
      )}
    </div>
  );
}

function EmailCredentialsStep({
  onSuccess,
}: {
  onSuccess: (email: string, password: string, devCode?: string) => void;
}) {
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(values: { email: string; password: string }) {
    setError(null);
    setLoading(true);
    try {
      const { requestLoginEmailCode } = await import("@/features/auth-methods/api");
      const res = await requestLoginEmailCode(values.email);
      onSuccess(values.email, values.password, res.devCode);
    } catch (err) {
      if (err instanceof ApiError) setError(err.payload.message);
      else setError("Не удалось отправить код");
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      {error && (
        <Alert type="error" message={error} showIcon className="!mb-4 !rounded-xl pop-in" />
      )}
      <Form layout="vertical" onFinish={handleSubmit} size="large">
        <Form.Item
          label="Email"
          name="email"
          rules={[
            { required: true, message: "Введите email" },
            { type: "email", message: "Некорректный email" },
          ]}
        >
          <Input
            prefix={<MailOutlined className="text-muted" />}
            autoComplete="email"
            placeholder="you@example.com"
            className="!rounded-xl"
          />
        </Form.Item>
        <Form.Item
          label="Пароль"
          name="password"
          rules={[{ required: true, message: "Введите пароль" }]}
        >
          <Input.Password
            prefix={<LockOutlined className="text-muted" />}
            autoComplete="current-password"
            placeholder="Введите пароль"
            className="!rounded-xl"
          />
        </Form.Item>

        <div className="text-right mb-3">
          <Link
            href="/forgot"
            className="text-sm text-muted hover:text-amber-700 transition"
          >
            Забыли пароль?
          </Link>
        </div>

        <Button
          type="primary"
          htmlType="submit"
          loading={loading}
          block
          size="large"
          className="!rounded-xl !font-semibold !shadow-md !shadow-amber-500/25"
        >
          Получить код
        </Button>
      </Form>
    </>
  );
}

function EmailCodeStep({
  email,
  password,
  devCode,
  onBack,
  onSuccess,
}: {
  email: string;
  password: string;
  devCode?: string;
  onBack: () => void;
  onSuccess: () => void;
}) {
  const [code, setCode] = useState(devCode ?? "");
  const [currentDev, setCurrentDev] = useState(devCode);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [cooldown, setCooldown] = useState(30);

  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setTimeout(() => setCooldown((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

  async function handleSubmit() {
    setError(null);
    if (!/^\d{6}$/.test(code)) {
      setError("Код должен содержать 6 цифр");
      return;
    }
    setLoading(true);
    try {
      const { loginWithEmailCode } = await import("@/features/auth-methods/api");
      const res = await loginWithEmailCode({ email, code, password });
      setSession(res.accessToken, null);
      const me = await fetchMe();
      setSession(res.accessToken, {
        id: me.id,
        email: me.email,
        firstName: me.firstName,
        lastName: me.lastName,
        role: me.role,
        roles: me.roles,
        avatarUrl: me.avatarUrl,
      });
      onSuccess();
    } catch (err) {
      if (err instanceof ApiError) setError(err.payload.message);
      else setError(err instanceof Error ? err.message : "Ошибка входа");
    } finally {
      setLoading(false);
    }
  }

  async function handleResend() {
    setLoading(true);
    try {
      const { requestLoginEmailCode } = await import("@/features/auth-methods/api");
      const res = await requestLoginEmailCode(email);
      setCurrentDev(res.devCode);
      setCode(res.devCode ?? "");
      setCooldown(30);
    } finally {
      setLoading(false);
    }
  }

  const masked = email.replace(/^(.{2})(.*)(@.*)$/, (_, a, b, c) => a + "*".repeat(b.length) + c);

  return (
    <>
      <div className="mb-4">
        <div className="text-lg font-semibold">Введите код с почты</div>
        <div className="text-sm text-muted mt-1">
          Код отправлен на <span className="font-semibold text-foreground">{masked}</span>
        </div>
      </div>

      {currentDev && (
        <Alert
          type="warning"
          showIcon
          className="!mb-3 !rounded-xl"
          message="Demo-режим"
          description={
            <>
              Email-шлюз не подключен. Ваш код:{" "}
              <span className="font-mono font-bold text-base">{currentDev}</span>
            </>
          }
        />
      )}

      {error && <Alert type="error" message={error} showIcon className="!mb-3 !rounded-xl" />}

      <Form layout="vertical" onFinish={handleSubmit} size="large">
        <Form.Item label="Код из email">
          <Input
            inputMode="numeric"
            autoComplete="one-time-code"
            maxLength={6}
            placeholder="••••••"
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
            className="!rounded-xl !tracking-[0.5em] !text-center !text-xl !font-mono"
          />
        </Form.Item>

        <Button
          type="primary"
          htmlType="submit"
          block
          size="large"
          loading={loading}
          className="!rounded-xl !font-semibold !shadow-md !shadow-amber-500/25"
        >
          Войти
        </Button>

        <div className="flex items-center justify-between text-sm mt-3">
          <button type="button" className="text-muted hover:text-foreground" onClick={onBack}>
            ← Изменить email
          </button>
          <button
            type="button"
            disabled={cooldown > 0 || loading}
            className="text-amber-700 hover:text-amber-800 disabled:text-muted disabled:cursor-not-allowed font-medium"
            onClick={handleResend}
          >
            {cooldown > 0 ? `Отправить снова (${cooldown}с)` : "Отправить снова"}
          </button>
        </div>
      </Form>
    </>
  );
}
