"use client";

import { useEffect, useState } from "react";
import { Alert, Button, Form, Input } from "antd";
import { SafetyOutlined } from "@ant-design/icons";
import { MaxBotConnect } from "@/shared/ui";
import { requestMediatorCode, verifyMediatorCode } from "../api";

interface Props {
  phoneE164: string;
  initialDevCode: string;
  masked: string;
  /** session_token для deep-link MAX-бота. Если пустой
   *  — отображается базовый link без ?start= */
  initialMaxToken?: string;
  onSuccess: (sessionToken: string) => void;
  onBack: () => void;
}

const RESEND_COOLDOWN_S = 30;

export function MediatorCodeStep({
  phoneE164,
  initialDevCode,
  masked,
  initialMaxToken,
  onSuccess,
  onBack,
}: Props) {
  const [code, setCode] = useState(initialDevCode);
  const [currentDev, setCurrentDev] = useState(initialDevCode);
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
      const res = await verifyMediatorCode(phoneE164, code);
      onSuccess(res.sessionToken);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Ошибка проверки кода");
    } finally {
      setLoading(false);
    }
  }

  async function handleResend() {
    setError(null);
    setLoading(true);
    try {
      const res = await requestMediatorCode(phoneE164);
      setCurrentDev(res.devCode);
      setCode(res.devCode);
      setCooldown(RESEND_COOLDOWN_S);
    } finally {
      setLoading(false);
    }
  }

  return (
    <Form layout="vertical" onFinish={handleSubmit} size="large">
      <div className="mb-4">
        <div className="text-lg font-semibold">Подтвердите номер в MAX</div>
        <div className="text-sm text-muted mt-1">
          Номер <span className="font-semibold text-foreground">{masked}</span> — откройте бота,
          поделитесь контактом и введите 6-значный код, который пришлёт бот.
          Срок действия кода — 5 минут.
        </div>
      </div>

      <MaxBotConnect botName="GloBoxMediatorBot" sessionToken={initialMaxToken} />

      {currentDev && (
        <Alert
          type="warning"
          showIcon
          icon={<SafetyOutlined />}
          className="!mb-3 !rounded-xl"
          message="Demo-режим"
          description={
            <>
              MAX-бот ещё не подключён. Тестовый код:{" "}
              <span className="font-mono font-bold text-base">{currentDev}</span>
            </>
          }
        />
      )}

      {error && <Alert type="error" message={error} showIcon className="!mb-3 !rounded-xl" />}

      <Form.Item label="Код подтверждения">
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
          ← Изменить данные
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
