"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useRef, useEffect } from "react";
import { UserPlus, Eye, EyeOff } from "lucide-react";
import { api } from "@/lib/api";
import { setSession } from "@/lib/auth";

export default function MediatorRegisterPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const errRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (error && errRef.current) {
      errRef.current.classList.remove("shake");
      void errRef.current.offsetWidth;
      errRef.current.classList.add("shake");
    }
  }, [error]);

  const [showPwd, setShowPwd] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const [phoneDigits, setPhoneDigits] = useState("");

  const [form, setForm] = useState({
    lastName: "",
    firstName: "",
    phone: "",
    email: "",
    password: "",
    passwordConfirm: "",
  });

  const set = <K extends keyof typeof form>(k: K, v: string) =>
    setForm((prev) => ({ ...prev, [k]: v }));

  const input =
    "w-full border border-border rounded-xl px-4 py-3 bg-background focus:outline-none focus:ring-2 focus:ring-primary/15 text-sm min-h-[48px]";

  const hasCyr = (s: string) => /[а-яА-ЯёЁ]/.test(s);

  const emailErr = hasCyr(form.email)
    ? "Только латинские буквы"
    : form.email && !form.email.includes("@")
      ? "Введите корректный email"
      : "";
  const pwdErr = hasCyr(form.password)
    ? "Пароль должен содержать только латиницу, цифры и символы"
    : form.password && form.password.length < 6
      ? "Минимум 6 символов"
      : "";
  const confirmErr = hasCyr(form.passwordConfirm)
    ? "Пароль должен содержать только латиницу"
    : form.passwordConfirm && form.password !== form.passwordConfirm
      ? "Пароли не совпадают"
      : "";

  const canSubmit =
    form.firstName.trim().length >= 2 &&
    form.lastName.trim().length >= 2 &&
    phoneDigits.length === 10 &&
    form.email.includes("@") &&
    !emailErr &&
    form.password.length >= 6 &&
    !pwdErr &&
    !confirmErr &&
    form.password === form.passwordConfirm;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await api.post<{
        accessToken: string;
        userId: string;
      }>("/mediator/register", {
        lastName: form.lastName.trim(),
        firstName: form.firstName.trim(),
        phone: form.phone.trim(),
        email: form.email.trim().toLowerCase(),
        password: form.password,
      });
      setSession(res.accessToken, res.userId);
      router.push("/profile");
    } catch (err: any) {
      setError(err.message ?? "Ошибка регистрации");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 bg-background">
      <div className="max-w-md w-full space-y-6 animate-[fadeIn_0.3s_ease-out]">
        <div className="text-center">
          <div className="w-14 h-14 rounded-2xl bg-accent flex items-center justify-center mx-auto mb-3">
            <UserPlus className="w-7 h-7 text-foreground" />
          </div>
          <h1 className="text-2xl font-bold">Регистрация</h1>
          <p className="text-sm text-muted mt-1">
            Создайте аккаунт посредника. Данные для подтверждения заполните позже в профиле.
          </p>
        </div>

        {error && (
          <div ref={errRef} className="text-sm text-danger bg-danger/5 border border-danger/20 rounded-xl px-4 py-3">
            {error}
          </div>
        )}

        <form onSubmit={submit} className="bg-card rounded-2xl border border-border p-5 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-muted mb-1.5">Имя *</label>
              <input
                value={form.firstName}
                onChange={(e) => set("firstName", e.target.value)}
                placeholder="Иван"
                className={input}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-muted mb-1.5">Фамилия *</label>
              <input
                value={form.lastName}
                onChange={(e) => set("lastName", e.target.value)}
                placeholder="Иванов"
                className={input}
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-muted mb-1.5">Телефон *</label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm text-muted pointer-events-none">+7</span>
              <input
                type="tel"
                value={phoneDigits}
                onChange={(e) => {
                  let raw = e.target.value.replace(/\D/g, "");
                  // Strip leading 7 or 8 so user can paste full number like 79991234567
                  if (raw.length === 11 && (raw.startsWith("7") || raw.startsWith("8"))) {
                    raw = raw.slice(1);
                  }
                  raw = raw.slice(0, 10);
                  setPhoneDigits(raw);
                  set("phone", raw.length > 0 ? "+7" + raw : "");
                }}
                placeholder="9925451234"
                maxLength={10}
                className={input + " pl-10"}
              />
            </div>
            {phoneDigits.length > 0 && phoneDigits.length < 10 && (
              <p className="text-[10px] text-muted mt-1">Введите 10 цифр после +7</p>
            )}
          </div>

          <div>
            <label className="block text-xs font-medium text-muted mb-1.5">Email *</label>
            <input
              type="email"
              value={form.email}
              onChange={(e) => set("email", e.target.value)}
              placeholder="email@example.com"
              autoComplete="email"
              className={input + (emailErr ? " border-danger" : "")}
            />
            {emailErr && <p className="text-xs text-danger mt-1">{emailErr}</p>}
          </div>

          <div>
            <label className="block text-xs font-medium text-muted mb-1.5">Пароль *</label>
            <div className="relative">
              <input
                type={showPwd ? "text" : "password"}
                value={form.password}
                onChange={(e) => set("password", e.target.value)}
                placeholder="Латиница, цифры, символы"
                autoComplete="new-password"
                className={input + " pr-11" + (pwdErr ? " border-danger" : "")}
              />
              <button
                type="button"
                onClick={() => setShowPwd(!showPwd)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-foreground transition"
              >
                {showPwd ? <EyeOff className="w-4.5 h-4.5" /> : <Eye className="w-4.5 h-4.5" />}
              </button>
            </div>
            {pwdErr && <p className="text-xs text-danger mt-1">{pwdErr}</p>}
          </div>

          <div>
            <label className="block text-xs font-medium text-muted mb-1.5">Повторите пароль *</label>
            <div className="relative">
              <input
                type={showConfirm ? "text" : "password"}
                value={form.passwordConfirm}
                onChange={(e) => set("passwordConfirm", e.target.value)}
                placeholder="Ещё раз"
                autoComplete="new-password"
                className={input + " pr-11" + (confirmErr ? " border-danger" : "")}
              />
              <button
                type="button"
                onClick={() => setShowConfirm(!showConfirm)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-foreground transition"
              >
                {showConfirm ? <EyeOff className="w-4.5 h-4.5" /> : <Eye className="w-4.5 h-4.5" />}
              </button>
            </div>
            {confirmErr && <p className="text-xs text-danger mt-1">{confirmErr}</p>}
          </div>

          <button
            type="submit"
            disabled={!canSubmit || loading}
            className="w-full py-3.5 rounded-xl bg-primary text-white font-semibold text-sm hover:bg-primary-hover transition disabled:opacity-40 disabled:cursor-not-allowed active:scale-[0.98] min-h-[48px]"
          >
            {loading ? "Создание аккаунта…" : "Зарегистрироваться"}
          </button>

          <p className="text-center text-xs text-muted leading-relaxed">
            Регистрируясь, вы соглашаетесь с{" "}
            <Link href="/terms" className="text-foreground hover:underline">Условиями использования</Link>
            {" "}и{" "}
            <Link href="/privacy" className="text-foreground hover:underline">Политикой конфиденциальности</Link>
            {" "}GloBox
          </p>
        </form>

        <p className="text-center text-sm text-muted">
          Уже есть аккаунт?{" "}
          <Link href="/login" className="text-foreground font-semibold hover:underline">
            Войти
          </Link>
        </p>
      </div>
    </div>
  );
}
