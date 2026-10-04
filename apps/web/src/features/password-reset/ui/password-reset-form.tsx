"use client";

import { useMemo, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button, Field, PasswordStrengthBar } from "@/shared/ui";
import { ApiError } from "@/shared/api/client";
import { fetchMe } from "@/features/auth-session";
import { setSession } from "@/shared/auth";
import {
  DEFAULT_EMAIL_WHITELIST,
  EMAIL_WHITELIST_ERROR_MESSAGE,
  isEmailDomainAllowed,
  validatePassword,
} from "@/shared/lib";
import {
  completePasswordReset,
  requestPasswordReset,
  verifyPasswordReset,
} from "../api";

type Stage =
  | { step: "email" }
  | { step: "code"; email: string; devCode?: string }
  | { step: "password"; email: string; code: string }
  | { step: "done" };

export function PasswordResetForm() {
  const router = useRouter();
  const [stage, setStage] = useState<Stage>({ step: "email" });
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const passwordCheck = useMemo(
    () => validatePassword(password),
    [password],
  );

  async function handleEmailSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    const trimmed = email.trim().toLowerCase();
    if (!trimmed.includes("@")) {
      setError("Некорректный email");
      return;
    }
    if (!isEmailDomainAllowed(trimmed, DEFAULT_EMAIL_WHITELIST)) {
      setError(EMAIL_WHITELIST_ERROR_MESSAGE);
      return;
    }
    setLoading(true);
    try {
      const res = await requestPasswordReset({ email: trimmed });
      setEmail(trimmed);
      setCode(res.devCode ?? "");
      setStage({ step: "code", email: trimmed, devCode: res.devCode });
    } catch (err) {
      setError(err instanceof ApiError ? err.payload.message : "Ошибка");
    } finally {
      setLoading(false);
    }
  }

  async function handleCodeSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (!/^\d{6}$/.test(code)) {
      setError("Код должен содержать 6 цифр");
      return;
    }
    setLoading(true);
    try {
      await verifyPasswordReset({ email, code });
      setStage({ step: "password", email, code });
    } catch (err) {
      setError(err instanceof ApiError ? err.payload.message : "Ошибка");
    } finally {
      setLoading(false);
    }
  }

  async function handlePasswordSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (!passwordCheck.ok) {
      setError(passwordCheck.errors[0] ?? "Некорректный пароль");
      return;
    }
    setLoading(true);
    try {
      const res = await completePasswordReset({
        email,
        code,
        newPassword: password,
      });
      setSession(res.accessToken, null);
      try {
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
      } catch {
        // ничего, токен сохранён
      }
      setStage({ step: "done" });
      setTimeout(() => router.push("/"), 600);
    } catch (err) {
      setError(err instanceof ApiError ? err.payload.message : "Ошибка");
    } finally {
      setLoading(false);
    }
  }

  const devCode = stage.step === "code" ? stage.devCode : undefined;

  return (
    <div className="w-full max-w-md">
      <div className="mb-4 text-sm">
        <Link href="/login" className="text-muted hover:text-foreground">
          ← Ко входу
        </Link>
      </div>

      {stage.step === "email" && (
        <form onSubmit={handleEmailSubmit} className="space-y-4">
          <div>
            <h2 className="text-2xl font-semibold">Восстановление пароля</h2>
            <p className="text-sm text-muted mt-1">
              Введите email от аккаунта — вышлем 6-значный код
            </p>
          </div>
          <Field
            label="Email"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            error={error}
            required
          />
          <Button type="submit" loading={loading} className="w-full">
            Выслать код
          </Button>
        </form>
      )}

      {stage.step === "code" && (
        <form onSubmit={handleCodeSubmit} className="space-y-4">
          <div>
            <h2 className="text-2xl font-semibold">Код из письма</h2>
            <p className="text-sm text-muted mt-1">
              Отправлен на <span className="font-medium">{email}</span>. Срок — 15 минут.
            </p>
          </div>
          {devCode && (
            <div className="rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-sm">
              <div className="font-medium text-amber-900">DEV-режим</div>
              <div className="text-amber-800">
                Код:{" "}
                <span className="font-mono font-semibold">{devCode}</span>
              </div>
            </div>
          )}
          <Field
            label="6-значный код"
            inputMode="numeric"
            maxLength={6}
            autoComplete="one-time-code"
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
            error={error}
          />
          <Button type="submit" loading={loading} className="w-full">
            Проверить
          </Button>
        </form>
      )}

      {stage.step === "password" && (
        <form onSubmit={handlePasswordSubmit} className="space-y-4">
          <div>
            <h2 className="text-2xl font-semibold">Новый пароль</h2>
            <p className="text-sm text-muted mt-1">
              Придумайте новый пароль — он заменит старый
            </p>
          </div>
          <div>
            <Field
              label="Пароль"
              type="password"
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              error={error}
              required
            />
            <PasswordStrengthBar password={password} />
          </div>
          <Button type="submit" loading={loading} className="w-full">
            Сохранить и войти
          </Button>
        </form>
      )}

      {stage.step === "done" && (
        <div className="text-center space-y-3 py-6">
          <div className="inline-flex w-12 h-12 rounded-full bg-success/15 text-success items-center justify-center text-2xl">
            ✓
          </div>
          <h2 className="text-2xl font-semibold">Пароль обновлён</h2>
          <p className="text-sm text-muted">Перенаправляем...</p>
        </div>
      )}
    </div>
  );
}
