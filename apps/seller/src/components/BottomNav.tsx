"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Package, User } from "lucide-react";

const tabs = [
  { href: "/dashboard", label: "Главная", Icon: Home },
  { href: "/products",  label: "Товары",  Icon: Package },
  { href: "/profile",   label: "Профиль", Icon: User },
] as const;

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 bg-card/95 backdrop-blur-lg border-t border-border safe-area-bottom"
      style={{ touchAction: "manipulation" }}
    >
      <div className="flex items-stretch justify-around max-w-lg mx-auto">
        {tabs.map((t) => {
          const active = pathname === t.href || pathname.startsWith(t.href + "/");
          const { Icon } = t;

          return (
            <Link
              key={t.href}
              href={t.href}
              className="flex flex-col items-center justify-center gap-0.5 py-2 px-1 flex-1 select-none"
              style={{ WebkitTapHighlightColor: "transparent", touchAction: "manipulation" }}
            >
              <div
                className="flex items-center justify-center w-10 h-7 rounded-full transition-all duration-200"
                style={{
                  background: active ? "var(--accent)" : "transparent",
                  transform: active ? "scale(1)" : "scale(0.95)",
                }}
              >
                <Icon
                  className="transition-all duration-200"
                  style={{
                    width: 20,
                    height: 20,
                    color: active ? "var(--foreground)" : "var(--muted)",
                    strokeWidth: active ? 2.5 : 1.8,
                  }}
                />
              </div>
              <span
                className="text-[10px] leading-tight transition-all duration-200"
                style={{
                  color: active ? "var(--foreground)" : "var(--muted)",
                  fontWeight: active ? 600 : 400,
                }}
              >
                {t.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
