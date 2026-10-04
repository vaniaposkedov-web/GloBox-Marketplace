"use client";

import { useEffect, useState, type FormEvent } from "react";
import { Button, Field } from "@/shared/ui";
import { ApiError } from "@/shared/api/client";
import { requestEmailCode, verifyEmailCode } from "../api";

interface Props {
  email: string;
  devCode?: string;
  onSuccess: (code: string) => void;
  onBack: () => void;
}

const RESEND_COOLDOWN_S = 60;

export function StepCode({ email, devCode, onSuccess, onBack }: Props) {
  const [code, setCode] = useState(devCode ?? "");
  const [currentDevCode, setCurrentDevCode] = useState(devCode);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [cooldown, setCooldown] = useState(RESEND_COOLDOWN_S);

  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setTimeout(() => setCooldown((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (!/^\d{6}$/.test(code)) {
      setError("Код должен состоять из 6 цифр");
      return;
    }

    setLoading(true);
    try {
      await verifyEmailCode({ email, code });
      onSuccess(code);
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.payload.message);
      } else {
        setError("Ошибка проверки кода");
      }
    } finally {
      setLoading(false);
    }
  }

  async function handleResend() {
    setError(null);
    setLoading(true);
    try {
      const res = await requestEmailCode({ email });
      setCooldown(RESEND_COOLDOWN_S);
      if (res.devCode) {
        setCurrentDevCode(res.devCode);
        setCode(res.devCode);
      }
    } catch (err) {
      if (err instanceof ApiError) setError(err.payload.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <h2 className="text-2xl font-semibold">Подтверждение</h2>
        <p className="text-sm text-muted mt-1">
          Код отправлен на <span className="font-medium">{email}</span>. Срок действия — 15 минут.
        </p>
      </div>

      {currentDevCode && (
        <div className="rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-sm">
          <div className="font-medium text-amber-900">DEV-режим</div>
          <div className="text-amber-800">
            SMTP не настроен. Ваш код:{" "}
            <span className="font-mono font-semibold">{currentDevCode}</span>
          </div>
        </div>
      )}

      <Field
        label="6-значный код"
        inputMode="numeric"
        pattern="[0-9]*"
        autoComplete="one-time-code"
        maxLength={6}
        placeholder="••••••"
        value={code}
        onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
        error={error}
      />

      <Button type="submit" loading={loading} className="w-full">
        Подтвердить
      </Button>

      <div className="flex justify-between items-center text-sm">
        <button
          type="button"
          className="text-muted hover:text-foreground"
          onClick={onBack}
        >
          ← Изменить email
        </button>
        <button
          type="button"
          className="text-primary hover:text-primary-hover disabled:text-muted disabled:cursor-not-allowed"
          disabled={cooldown > 0 || loading}
          onClick={handleResend}
        >
          {cooldown > 0 ? `Запросить новый (${cooldown}с)` : "Запросить новый код"}
        </button>
      </div>
    </form>
  );
}
