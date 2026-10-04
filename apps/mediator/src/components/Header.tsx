"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Briefcase, LogOut, Settings, LifeBuoy, LayoutDashboard, Radio } from "lucide-react";
import { clearSession, getToken } from "@/lib/auth";

interface HeaderProps {
  status?: "PENDING" | "NEEDS_REVISION" | "APPROVED" | "REJECTED" | "FROZEN" | null;
}

export function Header({ status }: HeaderProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [authed, setAuthed] = useState(false);

  useEffect(() => {
    setAuthed(!!getToken());
  }, [pathname]);

  const logout = () => {
    clearSession();
    router.replace("/");
  };

  const navItems: { href: string; label: string; icon: React.ElementType; needsApproved?: boolean }[] = [
    { href: "/dashboard", label: "Кабинет", icon: LayoutDashboard },
    { href: "/orders", label: "Заказы", icon: Briefcase, needsApproved: true },
    { href: "/status", label: "Статус", icon: Radio, needsApproved: true },
    { href: "/settings", label: "Настройки", icon: Settings },
    { href: "/support", label: "Поддержка", icon: LifeBuoy },
  ];

  return (
    <header className="sticky top-0 z-30 bg-card/90 backdrop-blur border-b border-border">
      <div className="max-w-5xl mx-auto flex items-center justify-between px-4 h-14 gap-4">
        <Link href={authed ? "/dashboard" : "/"} className="flex items-center gap-2 shrink-0">
          <span className="text-xl">🤝</span>
          <span className="font-bold text-lg tracking-tight">GloBox Посредник</span>
        </Link>

        {authed && (
          <nav className="hidden md:flex items-center gap-1 text-sm">
            {navItems.map((it) => {
              const disabled = it.needsApproved && status !== "APPROVED";
              const active = pathname === it.href;
              const Icon = it.icon;
              return disabled ? (
                <span
                  key={it.href}
                  className="px-3 py-1.5 rounded-md text-muted/70 cursor-not-allowed inline-flex items-center gap-1.5"
                  title="Доступно после одобрения"
                >
                  <Icon className="w-4 h-4" />
                  {it.label}
                </span>
              ) : (
                <Link
                  key={it.href}
                  href={it.href}
                  className={`px-3 py-1.5 rounded-md inline-flex items-center gap-1.5 transition ${
                    active
                      ? "bg-primary/10 text-primary font-medium"
                      : "hover:bg-accent text-foreground"
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {it.label}
                </Link>
              );
            })}
          </nav>
        )}

        <div className="flex items-center gap-2">
          {authed ? (
            <button
              onClick={logout}
              className="text-sm text-muted hover:text-foreground transition inline-flex items-center gap-1.5"
            >
              <LogOut className="w-4 h-4" />
              <span className="hidden sm:inline">Выйти</span>
            </button>
          ) : (
            <>
              <Link
                href="/login"
                className="text-sm px-3 py-1.5 rounded-md hover:bg-accent transition"
              >
                Войти
              </Link>
              <Link
                href="/register"
                className="text-sm px-3 py-1.5 rounded-md bg-primary text-white hover:bg-primary-hover transition"
              >
                Подать заявку
              </Link>
            </>
          )}
        </div>
      </div>

      {authed && (
        <nav className="md:hidden flex items-center gap-1 px-2 pb-2 overflow-x-auto">
          {navItems.map((it) => {
            const disabled = it.needsApproved && status !== "APPROVED";
            const active = pathname === it.href;
            const Icon = it.icon;
            return disabled ? (
              <span
                key={it.href}
                className="px-3 py-1.5 rounded-md text-muted/70 cursor-not-allowed inline-flex items-center gap-1.5 text-xs shrink-0"
              >
                <Icon className="w-3.5 h-3.5" />
                {it.label}
              </span>
            ) : (
              <Link
                key={it.href}
                href={it.href}
                className={`px-3 py-1.5 rounded-md inline-flex items-center gap-1.5 text-xs shrink-0 transition ${
                  active
                    ? "bg-primary/10 text-primary font-medium"
                    : "hover:bg-accent"
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                {it.label}
              </Link>
            );
          })}
        </nav>
      )}
    </header>
  );
}
