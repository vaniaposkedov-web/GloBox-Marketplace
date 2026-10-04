"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, ClipboardList, MessageSquare, User } from "lucide-react";
import { useNavBadges } from "@/hooks/useNavBadges";

const tabs = [
  {
    href: "/dashboard",
    label: "Главная",
    Icon: Home,
    badge: null as null | "orders" | "chats",
  },
  {
    href: "/orders",
    label: "Заказы",
    Icon: ClipboardList,
    badge: "orders" as const,
  },
  {
    href: "/chats",
    label: "Чаты",
    Icon: MessageSquare,
    badge: "chats" as const,
  },
  {
    href: "/profile",
    label: "Профиль",
    Icon: User,
    badge: null as null | "orders" | "chats",
  },
] as const;

export function BottomNav() {
  const pathname = usePathname();
  const badges = useNavBadges();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-card/95 backdrop-blur-lg border-t border-border safe-area-bottom">
      <div className="flex items-stretch justify-around max-w-lg mx-auto">
        {tabs.map((t) => {
          const active = pathname === t.href || pathname.startsWith(t.href + "/");
          const { Icon } = t;
          const badgeCount = t.badge ? badges[t.badge] : 0;

          return (
            <Link
              key={t.href}
              href={t.href}
              className={`flex flex-col items-center justify-center gap-1 py-2 px-1 min-w-14 min-h-14 transition-all duration-200 ${
                active ? "text-primary" : "text-muted hover:text-foreground"
              }`}
            >
              <div className="relative">
                <Icon
                  className="w-6 h-6"
                  strokeWidth={active ? 2.5 : 1.8}
                  fill={active ? "currentColor" : "none"}
                />
                {badgeCount > 0 && (
                  <span
                    className="absolute -top-2 -right-2.5 min-w-[18px] h-[18px] bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center px-1 leading-none select-none"
                    style={{ boxShadow: "0 1px 4px rgba(239,68,68,0.5)" }}
                  >
                    {badgeCount > 99 ? "99+" : badgeCount}
                  </span>
                )}
              </div>
              <span className={`text-[10px] leading-tight ${active ? "font-semibold" : "font-normal"}`}>
                {t.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
