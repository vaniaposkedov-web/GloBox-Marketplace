"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { LogIn } from "lucide-react";
import { api } from "@/lib/api";
import { setSession } from "@/lib/auth";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await api.post<{ accessToken: string; userId: string }>(
        "/mediator/login",
        { email: email.trim().toLowerCase(), password },
      );
      setSession(res.accessToken, res.userId);
      router.push("/dashboard");
    } catch (err: any) {
      setError(err.message ?? "Ошибка входа");
    } finally {
      setLoading(false);
    }
  };

  const input =
    "w-full border border-border rounded-xl px-4 py-3 bg-background focus:outline-none focus:ring-2 focus:ring-primary/15 text-sm min-h-[48px]";

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 bg-background">
      <div className="max-w-md w-full space-y-6 animate-[fadeIn_0.3s_ease-out]">
        <div className="text-center">
          <div className="w-14 h-14 rounded-2xl bg-accent flex items-center justify-center mx-auto mb-3">
            <LogIn className="w-7 h-7 text-foreground" />
          </div>
          <h1 className="text-2xl font-bold">Вход</h1>
          <p className="text-sm text-muted mt-1">Кабинет посредника GloBox</p>
        </div>

        {error && (
          <div className="text-sm text-danger bg-danger/5 border border-danger/20 rounded-xl px-4 py-3">
            {error}
          </div>
        )}

        <form
          onSubmit={handleSubmit}
          className="bg-card rounded-2xl border border-border p-5 space-y-4"
        >
          <div>
            <label className="block text-xs font-medium text-muted mb-1.5">Email</label>
            <input
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="email@example.com"
              className={input}
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-muted mb-1.5">Пароль</label>
            <input
              type="password"
              required
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Ваш пароль"
              className={input}
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 rounded-xl bg-primary text-white font-semibold text-sm hover:bg-primary-hover transition disabled:opacity-40 active:scale-[0.98] min-h-[48px]"
          >
            {loading ? "Вход…" : "Войти"}
          </button>
        </form>

        <p className="text-center text-sm text-muted">
          Нет аккаунта?{" "}
          <Link href="/register" className="text-foreground font-semibold hover:underline">
            Зарегистрироваться
          </Link>
        </p>
      </div>
    </div>
  );
}
