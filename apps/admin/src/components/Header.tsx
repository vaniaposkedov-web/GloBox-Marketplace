"use client";

import { useRouter } from "next/navigation";
import {
  LogOut,
  BarChart3,
  Store,
  Users,
  ShoppingBag,
  Tag,
  Bot,
} from "lucide-react";

type Tab = "stats" | "suppliers" | "mediators" | "buyers" | "categories" | "ai";

interface HeaderProps {
  activeTab?: Tab;
  onTabChange?: (tab: Tab) => void;
  unreadCount?: number;
  pendingCount?: number;
}

const TABS: { key: Tab; label: string; icon: React.ElementType }[] = [
  { key: "stats",      label: "Обзор",       icon: BarChart3 },
  { key: "suppliers",  label: "Поставщики",  icon: Store },
  { key: "mediators",  label: "Посредники",  icon: Users },
  { key: "buyers",     label: "Покупатели",  icon: ShoppingBag },
  { key: "categories", label: "Категории",   icon: Tag },
  { key: "ai",         label: "ИИ",          icon: Bot },
];

function TabBadge({ count, red }: { count: number; red?: boolean }) {
  if (!count) return null;
  return (
    <span className={`ml-0.5 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full leading-none ${red ? "bg-red-500" : "bg-amber-500"}`}>
      {count}
    </span>
  );
}

export function Header({ activeTab, onTabChange, unreadCount, pendingCount }: HeaderProps) {
  const router = useRouter();

  const logout = () => {
    localStorage.removeItem("admin.token");
    localStorage.removeItem("admin.userId");
    router.replace("/login");
  };

  const getBadge = (key: Tab) => {
    if ((key === "suppliers" || key === "mediators") && pendingCount && pendingCount > 0)
      return <TabBadge count={pendingCount} />;
    return null;
  };

  return (
    <header className="sticky top-0 z-30 bg-card/90 backdrop-blur border-b border-border">
      <div className="max-w-6xl mx-auto flex items-center justify-between px-4 h-14 gap-4">
        <div className="flex items-center gap-2 shrink-0">
          <span className="text-xl">⚙️</span>
          <span className="font-bold text-lg tracking-tight">GloBox Admin</span>
        </div>

        {onTabChange && (
          <nav className="hidden md:flex items-center gap-1 text-sm">
            {TABS.map((t) => {
              const Icon = t.icon;
              const active = activeTab === t.key;
              return (
                <button
                  key={t.key}
                  onClick={() => onTabChange(t.key)}
                  className={`px-3 py-1.5 rounded-md inline-flex items-center gap-1.5 transition ${
                    active ? "bg-primary/10 text-primary font-medium" : "hover:bg-accent text-foreground"
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {t.label}
                  {getBadge(t.key)}
                </button>
              );
            })}
          </nav>
        )}

        <button
          onClick={logout}
          className="text-sm text-muted hover:text-foreground transition inline-flex items-center gap-1.5"
        >
          <LogOut className="w-4 h-4" />
          <span className="hidden sm:inline">Выйти</span>
        </button>
      </div>

      {/* Mobile nav */}
      {onTabChange && (
        <nav className="md:hidden flex items-center gap-1 px-2 pb-2 overflow-x-auto">
          {TABS.map((t) => {
            const Icon = t.icon;
            const active = activeTab === t.key;
            return (
              <button
                key={t.key}
                onClick={() => onTabChange(t.key)}
                className={`px-3 py-1.5 rounded-md inline-flex items-center gap-1.5 text-xs shrink-0 transition ${
                  active ? "bg-primary/10 text-primary font-medium" : "hover:bg-accent"
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                {t.label}
                {getBadge(t.key)}
              </button>
            );
          })}
        </nav>
      )}
    </header>
  );
}
