"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Badge } from "antd";
import {
  AppstoreOutlined,
  ShoppingCartOutlined,
  HeartOutlined,
  ProfileOutlined,
  UserOutlined,
} from "@ant-design/icons";
import { useCartCount } from "@/features/commerce";

const NAV_ITEMS: {
  href: string;
  label: string;
  icon: typeof AppstoreOutlined;
  showBadge?: boolean;
}[] = [
  { href: "/categories", label: "Каталог", icon: AppstoreOutlined },
  { href: "/cart", label: "Корзина", icon: ShoppingCartOutlined, showBadge: true },
  { href: "/favorites", label: "Избранное", icon: HeartOutlined },
  { href: "/orders", label: "Заказы", icon: ProfileOutlined },
  { href: "/profile", label: "Профиль", icon: UserOutlined },
];

export function MobileBottomNav() {
  const pathname = usePathname();
  const cartCount = useCartCount();
  const isActive = (href: string) =>
    pathname === href || pathname.startsWith(href + "/");

  return (
    <nav className="sm:hidden fixed bottom-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-lg border-t border-border/50 after:absolute after:left-0 after:right-0 after:top-full after:h-20 after:bg-white/95 after:backdrop-blur-lg"
      style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
    >
      <div className="grid grid-cols-5 h-14">
        {NAV_ITEMS.map(({ href, label, icon: Icon, showBadge }) => {
          const active = isActive(href);
          return (
            <Link
              key={href}
              href={href}
              className={`relative flex flex-col items-center justify-center gap-0.5 transition-colors ${
                active
                  ? "text-fuchsia-600"
                  : "text-muted hover:text-fuchsia-400"
              }`}
            >
              {active && (
                <span className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-0.5 rounded-full bg-gradient-to-r from-fuchsia-500 to-rose-500" />
              )}
              {showBadge ? (
                <Badge
                  count={cartCount ?? 0}
                  size="small"
                  color="#c026d3"
                  offset={[4, -2]}
                >
                  <Icon
                    style={{ fontSize: 20 }}
                    className={active ? "text-fuchsia-600" : "text-muted"}
                  />
                </Badge>
              ) : (
                <Icon style={{ fontSize: 20 }} />
              )}
              <span className="text-[10px] leading-tight font-medium">
                {label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
