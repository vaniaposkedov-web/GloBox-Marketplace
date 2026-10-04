"use client";

import { useState, type FormEvent } from "react";
import {
  DEFAULT_EMAIL_WHITELIST,
  EMAIL_WHITELIST_ERROR_MESSAGE,
  isEmailDomainAllowed,
  validatePassword,
} from "@/shared/lib";
import { ApiError } from "@/shared/api/client";
import { requestEmailCode } from "../api";
import { Alert, Button, Checkbox, Input } from "antd";
import { LockOutlined, MailOutlined } from "@ant-design/icons";
import Link from "next/link";

interface Props {
  initialEmail?: string;
  onSuccess: (email: string, password: string, devCode?: string) => void;
}

export function StepEmail({ initialEmail = "", onSuccess }: Props) {
  const [email, setEmail] = useState(initialEmail);
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [agreed, setAgreed] = useState(false);

  const pv = validatePassword(password);
  const passwordOk = pv.ok;

  async function handleSubmit(e: FormEvent) {
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
    if (!passwordOk) {
      setError(pv.errors[0] ?? "Некорректный пароль");
      return;
    }

    setLoading(true);
    try {
      const res = await requestEmailCode({ email: trimmed });
      onSuccess(trimmed, password, res.devCode);
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.payload.message);
      } else {
        setError("Не удалось отправить код. Попробуйте ещё раз.");
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="mb-1">
        <h2 className="text-2xl font-extrabold text-foreground tracking-tight">Регистрация по почте</h2>
        <p className="text-sm text-muted mt-1">Код на email + пароль для входа</p>
      </div>

      {error && <Alert type="error" message={error} showIcon className="!rounded-xl" />}

      <Input
        prefix={<MailOutlined className="text-muted" />}
        type="email"
        inputMode="email"
        autoComplete="email"
        placeholder="name@gmail.com"
        value={email}
        size="large"
        onChange={(e) => setEmail(e.target.value)}
        className="!rounded-xl"
        required
      />

      <Input.Password
        prefix={<LockOutlined className="text-muted" />}
        placeholder="Придумайте пароль"
        autoComplete="new-password"
        size="large"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        className="!rounded-xl"
        status={password.length > 0 && !passwordOk ? "warning" : undefined}
      />
      {password.length > 0 && !passwordOk && (
        <p className="text-xs text-amber-600 -mt-2">{pv.errors[0] ?? "Минимум 6 символов, только английские"}</p>
      )}

      {/* Privacy checkbox */}
      <div>
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
        disabled={!agreed || !passwordOk}
        className="!rounded-xl !font-semibold !shadow-md !shadow-amber-500/20"
      >
        Получить код
      </Button>
    </form>
  );
}
