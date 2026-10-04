"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Alert, Button, Checkbox, Form, Input, Modal } from "antd";
import Link from "next/link";
import { MobileOutlined, SafetyOutlined, LockOutlined } from "@ant-design/icons";
import { validatePhone, validatePassword, PHONE_INVALID_USER_MESSAGE } from "@/shared/lib";
import { setSession } from "@/shared/auth";
import { fetchMe } from "@/features/auth-session";
import {
  registerWithPhone,
  requestPhoneCode,
  type PhoneRegistrationResult,
} from "../api";
import { SuccessScreen } from "./success-screen";

type Stage =
  | { step: "phone" }
  | { step: "code"; phoneE164: string; devCode?: string; masked: string; password: string }
  | { step: "success"; accessToken: string; userId: string }
  | { step: "done" };

const RESEND_COOLDOWN_S = 30;

interface RegisterPhoneFormProps {
  onDone?: (result: { accessToken: string; userId: string }) => void;
}

export function RegisterPhoneForm({ onDone }: RegisterPhoneFormProps = {}) {
  const router = useRouter();
  const [stage, setStage] = useState<Stage>({ step: "phone" });

  return (
    <div className="w-full">
      {/* Step 1: phone + password form */}
      {stage.step === "phone" && (
        <PhoneStep
          onSuccess={(phoneE164, devCode, masked, password) =>
            setStage({ step: "code", phoneE164, devCode, masked, password })
          }
        />
      )}


      {/* OTP modal: code input → success animation */}
      <Modal
        open={stage.step === "code" || stage.step === "success"}
        footer={null}
        closable={false}
        centered
        width="min(420px, calc(100vw - 24px))"
        style={{ borderRadius: 24 }}
        styles={{ body: { padding: "28px 24px" } }}
      >
        {stage.step === "code" && (
          <CodeStep
            phoneE164={stage.phoneE164}
            devCode={stage.devCode}
            masked={stage.masked}
            password={stage.password}
            onSuccess={async (result) => {
              setSession(result.accessToken, null);
              const me = await fetchMe();
              setSession(result.accessToken, {
                id: me.id,
                email: me.email,
                firstName: me.firstName,
                lastName: me.lastName,
                role: me.role,
                roles: me.roles,
                avatarUrl: me.avatarUrl,
              });
              setStage({ step: "success", accessToken: result.accessToken, userId: result.userId });
            }}
            onBack={() => setStage({ step: "phone" })}
          />
        )}
        {stage.step === "success" && (
          <SuccessScreen
            onRedirect={() => {
              const s = stage as { step: "success"; accessToken: string; userId: string };
              setStage({ step: "done" });
              if (onDone) onDone({ accessToken: s.accessToken, userId: s.userId });
              else router.push("/");
            }}
          />
        )}
      </Modal>
    </div>
  );
}

function PhoneStep({
  onSuccess,
}: {
  onSuccess: (phoneE164: string, devCode: string | undefined, masked: string, password: string) => void;
}) {
  const [phone, setPhone] = useState("+7");
  const [password, setPassword] = useState("");
  const [agreed, setAgreed] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const validation = useMemo(() => validatePhone(phone), [phone]);
  const pv = useMemo(() => validatePassword(password), [password]);
  const passwordOk = pv.ok;

  async function handleSubmit() {
    setError(null);
    if (!validation.ok || !validation.e164) {
      setError(PHONE_INVALID_USER_MESSAGE);
      return;
    }
    if (!passwordOk) {
      setError(pv.errors[0] ?? "Некорректный пароль");
      return;
    }
    setLoading(true);
    try {
      const res = await requestPhoneCode(validation.e164);
      onSuccess(validation.e164, res.devCode, res.maskedPhone, password);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Не удалось отправить код");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Form layout="vertical" onFinish={handleSubmit} size="large">
      <div className="mb-5">
        <h2 className="text-2xl font-extrabold text-foreground tracking-tight">Регистрация по номеру</h2>
        <p className="text-sm text-muted mt-1">Код по SMS + пароль для входа</p>
      </div>

      {error && <Alert type="error" message={error} showIcon className="!mb-3 !rounded-xl" />}

      <Form.Item
        validateStatus={!validation.ok && phone.length > 2 ? "warning" : undefined}
        help={!validation.ok && phone.length > 2 ? <span className="text-xs">Формат: +7 999 123 45 67</span> : undefined}
      >
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

      <Form.Item
        validateStatus={password.length > 0 && !passwordOk ? "warning" : undefined}
        help={password.length > 0 && !passwordOk ? <span className="text-xs">{pv.errors[0] ?? "Минимум 6 символов, только английские"}</span> : undefined}
      >
        <Input.Password
          prefix={<LockOutlined className="text-muted" />}
          placeholder="Придумайте пароль"
          autoComplete="new-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="!rounded-xl"
        />
      </Form.Item>

      <div className="mb-4">
        <Checkbox checked={agreed} onChange={(e) => setAgreed(e.target.checked)}>
          <span className="text-xs text-muted">
            Принимаю{" "}
            <Link href="/privacy" target="_blank" className="text-amber-700 underline hover:text-amber-800 font-medium">
              политику конфиденциальности
            </Link>
          </span>
        </Checkbox>
      </div>

      <Button
        type="primary"
        htmlType="submit"
        block
        size="large"
        loading={loading}
        disabled={!validation.ok || !agreed || !passwordOk}
        className="!rounded-xl !font-semibold !shadow-md !shadow-amber-500/20"
      >
        Получить SMS-код
      </Button>
    </Form>
  );
}

function CodeStep({
  phoneE164,
  devCode,
  masked,
  password,
  onSuccess,
  onBack,
}: {
  phoneE164: string;
  devCode?: string;
  masked: string;
  password: string;
  onSuccess: (result: PhoneRegistrationResult) => void;
  onBack: () => void;
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
      const result = await registerWithPhone({ phoneE164, code, password });
      onSuccess(result);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Ошибка проверки кода");
      setLoading(false);
    }
  }

  async function handleResend() {
    setError(null);
    setLoading(true);
    try {
      const res = await requestPhoneCode(phoneE164);
      setCurrentDev(res.devCode);
      setCode(res.devCode ?? "");
      setCooldown(RESEND_COOLDOWN_S);
    } finally {
      setLoading(false);
    }
  }

  return (
    <Form layout="vertical" onFinish={handleSubmit} size="large">
      <div className="mb-3">
        <div className="text-sm font-semibold">Код из SMS на <span className="text-foreground">{masked}</span></div>
      </div>

      {currentDev && (
        <Alert
          type="warning"
          showIcon
          className="!mb-3 !rounded-xl"
          icon={<SafetyOutlined />}
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
        className="!rounded-xl !font-semibold"
      >
        Подтвердить
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
