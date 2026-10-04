"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { LayoutDashboard, Package, MessageSquare, LogOut, Store } from "lucide-react";
import { clearSession, isAuthed } from "@/lib/auth";
import type { SellerStatus } from "./VerificationBanner";

interface HeaderProps {
  status?: SellerStatus;
}

const NAV = [
  { href: "/dashboard", label: "Кабинет",    icon: LayoutDashboard, needsApproved: false },
  { href: "/products",  label: "Мои товары", icon: Package,          needsApproved: true  },
  { href: "/support",   label: "Поддержка",  icon: MessageSquare,    needsApproved: false },
];

export function Header({ status }: HeaderProps) {
  const router   = useRouter();
  const pathname = usePathname();
  const [authed, setAuthed] = useState(false);

  useEffect(() => { setAuthed(isAuthed()); }, [pathname]);

  const logout = () => { clearSession(); router.replace("/"); };

  return (
    <header className="sticky top-0 z-30 bg-background/95 backdrop-blur border-b border-border">
      <div className="max-w-5xl mx-auto flex items-center justify-between px-4 h-14 gap-4">

        <Link href={authed ? "/dashboard" : "/"} className="flex items-center gap-2 shrink-0">
          <div className="w-8 h-8 rounded-xl bg-primary flex items-center justify-center">
            <Store className="w-4 h-4 text-white" />
          </div>
          <span className="font-bold text-base tracking-tight">GloBox Seller</span>
        </Link>

        {authed && (
          <nav className="hidden md:flex items-center gap-1 text-sm">
            {NAV.map((item) => {
              const locked = item.needsApproved && status !== "APPROVED";
              const active = pathname === item.href;
              const Icon   = item.icon;
              if (locked) return (
                <span key={item.href} title="Доступно после одобрения"
                  className="px-3 py-1.5 rounded-md text-muted/50 cursor-not-allowed inline-flex items-center gap-1.5">
                  <Icon className="w-4 h-4" />{item.label}
                </span>
              );
              return (
                <Link key={item.href} href={item.href}
                  className={`px-3 py-1.5 rounded-md inline-flex items-center gap-1.5 transition ${
                    active ? "bg-primary/10 text-primary font-semibold" : "hover:bg-accent text-foreground"
                  }`}
                >
                  <Icon className="w-4 h-4" />{item.label}
                </Link>
              );
            })}
          </nav>
        )}

        <div className="flex items-center gap-2">
          {authed ? (
            <button onClick={logout} className="text-sm text-muted hover:text-foreground transition inline-flex items-center gap-1.5">
              <LogOut className="w-4 h-4" />
              <span className="hidden sm:inline">Выйти</span>
            </button>
          ) : (
            <>
              <Link href="/login"    className="text-sm px-3 py-1.5 rounded-md hover:bg-accent transition">Войти</Link>
              <Link href="/register" className="text-sm px-3 py-1.5 rounded-md bg-primary text-white hover:bg-primary-hover transition">Подать заявку</Link>
            </>
          )}
        </div>
      </div>

      {/* Mobile nav */}
      {authed && (
        <nav className="md:hidden flex items-center gap-1 px-2 pb-2 overflow-x-auto">
          {NAV.map((item) => {
            const locked = item.needsApproved && status !== "APPROVED";
            const active = pathname === item.href;
            const Icon   = item.icon;
            if (locked) return (
              <span key={item.href} className="px-3 py-1.5 rounded-md text-muted/50 cursor-not-allowed inline-flex items-center gap-1.5 text-xs shrink-0">
                <Icon className="w-3.5 h-3.5" />{item.label}
              </span>
            );
            return (
              <Link key={item.href} href={item.href}
                className={`px-3 py-1.5 rounded-md inline-flex items-center gap-1.5 text-xs shrink-0 transition ${
                  active ? "bg-primary/10 text-primary font-semibold" : "hover:bg-accent"
                }`}
              >
                <Icon className="w-3.5 h-3.5" />{item.label}
              </Link>
            );
          })}
        </nav>
      )}
    </header>
  );
}
