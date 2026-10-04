"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Alert, Button, Form, Input, Result } from "antd";
import { LockOutlined, MobileOutlined, SafetyOutlined } from "@ant-design/icons";
import { validatePhone, PHONE_INVALID_USER_MESSAGE } from "@/shared/lib";
import { setSession } from "@/shared/auth";
import { fetchMe } from "@/features/auth-session";
import { loginWithPhoneCode, requestLoginPhoneCode } from "../api";

type Stage =
  | { step: "phone" }
  | { step: "code"; phoneE164: string; password: string; devCode?: string; masked: string }
  | { step: "done" };

const RESEND_COOLDOWN_S = 30;

export function LoginPhoneForm({ onDone }: { onDone?: () => void }) {
  const router = useRouter();
  const [stage, setStage] = useState<Stage>({ step: "phone" });

  return (
    <div className="w-full max-w-md mx-auto">
      <div className="mt-2">
        {stage.step === "phone" && (
          <PhoneStep
            onSuccess={(phoneE164, password, devCode, masked) =>
              setStage({ step: "code", phoneE164, password, devCode, masked })
            }
          />
        )}
        {stage.step === "code" && (
          <CodeStep
            phoneE164={stage.phoneE164}
            password={stage.password}
            devCode={stage.devCode}
            masked={stage.masked}
            onBack={() => setStage({ step: "phone" })}
            onSuccess={() => {
              setStage({ step: "done" });
              setTimeout(() => {
                if (onDone) onDone();
                else router.push("/");
              }, 800);
            }}
          />
        )}
        {stage.step === "done" && (
          <Result status="success" title="Успешный вход" subTitle="Переходим на главную..." />
        )}
      </div>
    </div>
  );
}

function PhoneStep({
  onSuccess,
}: {
  onSuccess: (phoneE164: string, password: string, devCode: string | undefined, masked: string) => void;
}) {
  const [phone, setPhone] = useState("+7");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const validation = useMemo(() => validatePhone(phone), [phone]);

  async function handleSubmit() {
    setError(null);
    if (!validation.ok || !validation.e164) {
      setError(PHONE_INVALID_USER_MESSAGE);
      return;
    }
    if (password.length < 1) {
      setError("Введите пароль");
      return;
    }
    setLoading(true);
    try {
      const res = await requestLoginPhoneCode(validation.e164);
      onSuccess(validation.e164, password, res.devCode, res.maskedPhone);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Не удалось отправить код");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Form layout="vertical" onFinish={handleSubmit} size="large">
      {error && <Alert type="error" message={error} showIcon className="!mb-3 !rounded-xl" />}

      <Form.Item label="Номер телефона">
        <Input
          prefix={<MobileOutlined className="text-muted" />}
          inputMode="tel"
          autoComplete="tel"
          placeholder="+7 999 123 45 67"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          className="!rounded-xl"
        />
      </Form.Item>

      <Form.Item label="Пароль">
        <Input.Password
          prefix={<LockOutlined className="text-muted" />}
          autoComplete="current-password"
          placeholder="Введите пароль"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="!rounded-xl"
        />
      </Form.Item>

      <Button
        type="primary"
        htmlType="submit"
        block
        size="large"
        loading={loading}
        disabled={!validation.ok || password.length < 1}
        className="!rounded-xl !font-semibold !shadow-md !shadow-amber-500/20"
      >
        Получить SMS-код
      </Button>
    </Form>
  );
}

function CodeStep({
  phoneE164,
  password,
  devCode,
  masked,
  onBack,
  onSuccess,
}: {
  phoneE164: string;
  password: string;
  devCode?: string;
  masked: string;
  onBack: () => void;
  onSuccess: () => void;
}) {
  const [code, setCode] = useState(devCode ?? "");
  const [currentDev, setCurrentDev] = useState(devCode);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [cooldown, setCooldown] = useState(RESEND_COOLDOWN_S);

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
      const res = await loginWithPhoneCode({ phoneE164, code, password });
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
    } catch (e) {
      setError(e instanceof Error ? e.message : "Ошибка входа");
    } finally {
      setLoading(false);
    }
  }

  async function handleResend() {
    setLoading(true);
    try {
      const res = await requestLoginPhoneCode(phoneE164);
      setCurrentDev(res.devCode);
      setCode(res.devCode ?? "");
      setCooldown(RESEND_COOLDOWN_S);
    } finally {
      setLoading(false);
    }
  }

  return (
    <Form layout="vertical" onFinish={handleSubmit} size="large">
      <div className="mb-4">
        <div className="text-lg font-semibold">Введите код из SMS</div>
        <div className="text-sm text-muted mt-1">
          На номер <span className="font-semibold text-foreground">{masked}</span>
        </div>
      </div>

      {currentDev && (
        <Alert
          type="warning"
          showIcon
          icon={<SafetyOutlined />}
          className="!mb-3 !rounded-xl"
          message="Demo-режим"
          description={
            <>
              SMS-шлюз не подключен. Ваш код:{" "}
              <span className="font-mono font-bold text-base">{currentDev}</span>
            </>
          }
        />
      )}

      {error && <Alert type="error" message={error} showIcon className="!mb-3 !rounded-xl" />}

      <Form.Item label="Код из SMS">
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
        className="!rounded-xl !font-semibold !shadow-md !shadow-amber-500/20"
      >
        Войти
      </Button>

      <div className="flex items-center justify-between text-sm mt-3">
        <button type="button" className="text-muted hover:text-foreground" onClick={onBack}>
          ← Изменить номер
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
  );
}
