"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";

export default function AdminLoginPage() {
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
        "/admin/login",
        { email, password },
      );
      localStorage.setItem("admin.token", res.accessToken);
      localStorage.setItem("admin.userId", res.userId);
      router.push("/");
    } catch (err: any) {
      setError(err.message ?? "Ошибка входа");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="max-w-md w-full mx-4">
        <h1 className="text-2xl font-bold text-center mb-6">Вход в панель управления</h1>
        <form
          onSubmit={handleSubmit}
          className="bg-card rounded-2xl border border-border p-6 space-y-4 shadow-sm"
        >
          {error && (
            <div className="text-sm text-danger bg-red-50 rounded-lg px-4 py-2">{error}</div>
          )}
          <div>
            <label className="block text-sm font-medium mb-1">Email</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full border border-border rounded-xl px-4 py-2.5 bg-background focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Пароль</label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full border border-border rounded-xl px-4 py-2.5 bg-background focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 rounded-xl bg-primary text-white font-medium hover:bg-primary-hover transition disabled:opacity-50"
          >
            {loading ? "Вход…" : "Войти"}
          </button>
        </form>
      </div>
    </div>
  );
}
