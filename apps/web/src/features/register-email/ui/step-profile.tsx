"use client";

import { useMemo, useState, type FormEvent } from "react";
import {
  nameSchema,
  PHONE_INVALID_USER_MESSAGE,
  validatePassword,
  validatePhone,
} from "@/shared/lib";
import { Button, Field, PasswordStrengthBar } from "@/shared/ui";
import { ApiError } from "@/shared/api/client";
import { completeRegistration } from "../api";

interface Props {
  email: string;
  code: string;
  onSuccess: (result: { accessToken: string; userId: string }) => void;
}

export function StepProfile({ email, code, onSuccess }: Props) {
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState("+7");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<{
    firstName?: string;
    lastName?: string;
    phone?: string;
    password?: string;
    form?: string;
  }>({});

  const phoneValidation = useMemo(() => validatePhone(phone), [phone]);
  const passwordValidation = useMemo(
    () => validatePassword(password),
    [password],
  );

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const errors: typeof fieldErrors = {};

    const firstCheck = nameSchema.safeParse(firstName.trim());
    if (!firstCheck.success) {
      errors.firstName =
        firstCheck.error.issues[0]?.message ?? "Некорректное имя";
    }
    const lastCheck = nameSchema.safeParse(lastName.trim());
    if (!lastCheck.success) {
      errors.lastName =
        lastCheck.error.issues[0]?.message ?? "Некорректная фамилия";
    }
    if (!phoneValidation.ok) errors.phone = PHONE_INVALID_USER_MESSAGE;
    if (!passwordValidation.ok) {
      errors.password = passwordValidation.errors[0] ?? "Некорректный пароль";
    }

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }

    setFieldErrors({});
    setLoading(true);

    try {
      const result = await completeRegistration({
        email,
        code,
        password,
        phone: phoneValidation.e164 ?? phone,
        firstName: firstName.trim(),
        lastName: lastName.trim(),
      });
      onSuccess(result);
    } catch (err) {
      if (err instanceof ApiError) {
        setFieldErrors({ form: err.payload.message });
      } else {
        setFieldErrors({ form: "Не удалось завершить регистрацию" });
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <h2 className="text-2xl font-semibold">Профиль</h2>
        <p className="text-sm text-muted mt-1">
          Последний шаг — пароль и номер телефона
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Field
          label="Имя"
          autoComplete="given-name"
          value={firstName}
          onChange={(e) => setFirstName(e.target.value)}
          error={fieldErrors.firstName}
          required
        />
        <Field
          label="Фамилия"
          autoComplete="family-name"
          value={lastName}
          onChange={(e) => setLastName(e.target.value)}
          error={fieldErrors.lastName}
          required
        />
      </div>

      <Field
        label="Телефон"
        type="tel"
        inputMode="tel"
        autoComplete="tel"
        placeholder="+7 999 123 45 67"
        value={phone}
        onChange={(e) => setPhone(e.target.value)}
        error={fieldErrors.phone}
        hint="Россия, Казахстан, Беларусь и др. СНГ (кроме Украины)"
        required
      />

      <div>
        <Field
          label="Пароль"
          type="password"
          autoComplete="new-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          error={fieldErrors.password}
          required
        />
        <PasswordStrengthBar password={password} />
      </div>

      {fieldErrors.form && (
        <p className="text-sm text-danger">{fieldErrors.form}</p>
      )}

      <Button type="submit" loading={loading} className="w-full">
        Зарегистрироваться
      </Button>
    </form>
  );
}
