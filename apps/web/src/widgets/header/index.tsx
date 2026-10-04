"use client";

import Link from "next/link";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useRef, useState } from "react";
import { Badge, Button, Dropdown, Input } from "antd";
import {
  SearchOutlined,
  HeartOutlined,
  ShoppingCartOutlined,
  UserOutlined,
  AppstoreOutlined,
  LogoutOutlined,
  IdcardOutlined,
  ProfileOutlined,
} from "@ant-design/icons";
import { canSell, clearSession, isMediator, isSupplier, useSession } from "@/shared/auth";
import { useCartCount } from "@/features/commerce";
import { MobileBottomNav } from "@/widgets/mobile-nav";

function HeaderSearch() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [query, setQuery] = useState(searchParams?.get("q") ?? "");
  const [results, setResults] = useState<{ listings: any[]; mediators: any[] } | null>(null);
  const [open, setOpen] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setQuery(searchParams?.get("q") ?? "");
  }, [searchParams]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  function handleChange(value: string) {
    setQuery(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (value.trim().length < 2) { setResults(null); setOpen(false); return; }
    debounceRef.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/listings/quick-search?q=${encodeURIComponent(value.trim())}`);
        if (res.ok) { const d = await res.json(); setResults(d); setOpen(true); }
      } catch {}
    }, 280);
  }

  function submitSearch(value: string) {
    setOpen(false);
    setResults(null);
    const params = new URLSearchParams();
    if (value.trim()) params.set("q", value.trim());
    router.push(`/listings${params.toString() ? "?" + params.toString() : ""}`);
  }

  const hasResults = results && (results.listings.length > 0 || results.mediators.length > 0);

  return (
    <div ref={wrapRef} className="relative w-full">
      <Input
        size="large"
        allowClear
        prefix={<SearchOutlined className="text-muted" />}
        placeholder="Искать товар, бренд, посредника..."
        value={query}
        onChange={(e) => handleChange(e.target.value)}
        onPressEnter={() => submitSearch(query)}
        onFocus={() => { if (results) setOpen(true); }}
        className="!rounded-xl !border-fuchsia-300 hover:!border-fuchsia-400 focus-within:!border-fuchsia-500 focus-within:!shadow-[0_0_0_2px_rgba(217,70,239,0.15)]"
      />
      {open && hasResults && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-white rounded-2xl shadow-xl border border-fuchsia-100 z-50 overflow-hidden max-h-96 overflow-y-auto">
          {results!.listings.length > 0 && (
            <div>
              <p className="px-4 pt-3 pb-1 text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Товары</p>
              {results!.listings.map((l: any) => (
                <button key={l.id} type="button"
                  onClick={() => { setOpen(false); router.push(`/listings/${l.id}`); }}
                  className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-fuchsia-50 transition text-left"
                >
                  {l.imageUrl ? (
                    <img src={l.imageUrl} alt="" className="w-9 h-9 rounded-lg object-cover shrink-0 border border-gray-100" />
                  ) : (
                    <div className="w-9 h-9 rounded-lg bg-gray-100 shrink-0" />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">{l.title}</p>
                    <p className="text-xs text-gray-400">{l.price ? `${Math.round(l.price / 100).toLocaleString("ru-RU")} ₽` : ""}</p>
                  </div>
                </button>
              ))}
            </div>
          )}
          {results!.mediators.length > 0 && (
            <div>
              <p className="px-4 pt-3 pb-1 text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Посредники</p>
              {results!.mediators.map((m: any) => (
                <button key={m.id} type="button"
                  onClick={() => { setOpen(false); router.push(`/mediator?select=${m.id}`); }}
                  className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-fuchsia-50 transition text-left"
                >
                  <div className="w-9 h-9 rounded-full bg-gradient-to-br from-fuchsia-400 to-rose-500 flex items-center justify-center text-white text-sm font-bold shrink-0">
                    {m.avatarUrl ? <img src={m.avatarUrl} alt="" className="w-9 h-9 rounded-full object-cover" /> : (m.firstName?.[0] ?? "П")}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">{m.firstName} {m.lastName}</p>
                    <p className="text-xs text-gray-400">Комиссия {m.commissionRate}%</p>
                  </div>
                </button>
              ))}
            </div>
          )}
          <button type="button"
            onClick={() => submitSearch(query)}
            className="w-full px-4 py-3 text-sm text-fuchsia-600 font-semibold hover:bg-fuchsia-50 border-t border-fuchsia-100 transition text-left"
          >
            Показать все результаты по «{query}» →
          </button>
        </div>
      )}
    </div>
  );
}

function HeaderSearchFallback() {
  return (
    <Input
      size="large"
      allowClear
      prefix={<SearchOutlined className="text-muted" />}
      placeholder="Искать товар, бренд или категорию"
      className="!rounded-xl"
      disabled
    />
  );
}

export function SiteHeader() {
  const { user, hydrated } = useSession();
  const cartCount = useCartCount();
  const pathname = usePathname();
  const router = useRouter();
  const initials = user
    ? `${user.firstName?.[0] ?? ""}${user.lastName?.[0] ?? ""}`.toUpperCase()
    : "";

  function handleLogout() {
    clearSession();
    router.push("/login");
  }

  const isActive = (href: string) => pathname === href;

  return (
    <>
    <header className="sticky top-0 z-30 border-b border-fuchsia-100/60 backdrop-blur-md" style={{ background: "linear-gradient(135deg, rgba(253,244,255,0.92) 0%, rgba(255,241,242,0.92) 50%, rgba(250,250,249,0.92) 100%)" }}>
      <div className="max-w-7xl mx-auto px-4 h-16 flex items-center gap-3 sm:gap-5">
        <Link
          href="/"
          className="font-bold text-lg shrink-0 inline-flex items-center gap-2"
        >
          <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-fuchsia-500 to-rose-500 text-white text-sm shadow-md shadow-fuchsia-500/30">
            ✦
          </span>
          <span className="hidden sm:inline tracking-tight">Globox</span>
        </Link>

        <Link
          href="/categories"
          className={`hidden md:inline-flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium transition ${
            isActive("/categories")
              ? "bg-fuchsia-50 text-fuchsia-600 font-semibold"
              : "text-foreground hover:bg-fuchsia-100"
          }`}
        >
          <AppstoreOutlined style={{ fontSize: 16 }} /> Каталог
        </Link>

        <div className="flex-1 max-w-2xl">
          <Suspense fallback={<HeaderSearchFallback />}>
            <HeaderSearch />
          </Suspense>
        </div>

        <nav className="flex items-center gap-1 sm:gap-2">
          {!hydrated && (
            <div className="w-24 h-9 rounded-lg bg-border/50 animate-pulse" />
          )}

          {hydrated && user && (
            <>
              {isSupplier(user.role, user.roles) && (
                <Link
                  href="/seller/status"
                  className={`hidden lg:inline-flex px-3 py-2 rounded-xl text-sm transition ${
                    isActive("/seller/status")
                      ? "bg-fuchsia-50 text-fuchsia-600 font-semibold"
                      : "hover:bg-fuchsia-100"
                  }`}
                >
                  Кабинет поставщика
                </Link>
              )}
              {isMediator(user.role, user.roles) && (
                <Link
                  href="/mediator/status"
                  className={`hidden lg:inline-flex px-3 py-2 rounded-xl text-sm transition ${
                    isActive("/mediator/status")
                      ? "bg-fuchsia-50 text-fuchsia-600 font-semibold"
                      : "hover:bg-fuchsia-100"
                  }`}
                >
                  Кабинет посредника
                </Link>
              )}
              {canSell(user.role, user.roles) && (
                <Link
                  href="/my-listings"
                  className={`hidden lg:inline-flex px-3 py-2 rounded-xl text-sm transition ${
                    isActive("/my-listings")
                      ? "bg-fuchsia-50 text-fuchsia-600 font-semibold"
                      : "hover:bg-fuchsia-100"
                  }`}
                >
                  Мои товары
                </Link>
              )}
              <Link
                href="/orders"
                className={`hidden md:inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium transition ${
                  isActive("/orders")
                    ? "bg-fuchsia-50 text-fuchsia-600 font-semibold"
                    : "hover:bg-fuchsia-100"
                }`}
                title="Мои заказы"
              >
                <ProfileOutlined style={{ fontSize: 16 }} /> Заказы
              </Link>
              <Link
                href="/favorites"
                className={`hidden md:inline-flex w-10 h-10 rounded-xl items-center justify-center transition ${
                  isActive("/favorites")
                    ? "bg-fuchsia-50 text-fuchsia-600"
                    : "hover:bg-fuchsia-100"
                }`}
                title="Избранное"
              >
                <HeartOutlined style={{ fontSize: 18 }} />
              </Link>
              <Link
                href="/cart"
                className={`hidden md:inline-flex w-10 h-10 rounded-xl items-center justify-center transition ${
                  isActive("/cart")
                    ? "bg-fuchsia-50 text-fuchsia-600"
                    : "hover:bg-fuchsia-100"
                }`}
                title="Корзина"
              >
                <Badge
                  count={cartCount ?? 0}
                  size="small"
                  color="#c026d3"
                  offset={[2, -2]}
                >
                  <ShoppingCartOutlined style={{ fontSize: 18 }} />
                </Badge>
              </Link>
              <Dropdown
                trigger={["click"]}
                placement="bottomRight"
                menu={{
                  items: [
                    {
                      key: "profile",
                      icon: <IdcardOutlined />,
                      label: "Профиль",
                      onClick: () => router.push("/profile"),
                    },
                    { type: "divider" },
                    {
                      key: "logout",
                      icon: <LogoutOutlined />,
                      label: "Выйти",
                      danger: true,
                      onClick: handleLogout,
                    },
                  ],
                }}
              >
                <button
                  type="button"
                  className="ml-1 hidden sm:flex items-center gap-2 px-1.5 py-1 rounded-xl hover:bg-fuchsia-100 transition cursor-pointer"
                  title="Аккаунт"
                >
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-fuchsia-400 to-rose-400 text-white font-semibold flex items-center justify-center overflow-hidden text-xs">
                    {user.avatarUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={user.avatarUrl}
                        alt={user.firstName}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      initials || <UserOutlined />
                    )}
                  </div>
                  <span className="hidden sm:inline text-sm font-medium max-w-[120px] truncate">
                    {user.firstName}
                  </span>
                </button>
              </Dropdown>
            </>
          )}

          {hydrated && !user && (
            <>
              <Link
                href="/seller"
                className="hidden lg:inline-flex px-3 py-2 rounded-xl text-sm font-medium text-foreground hover:bg-fuchsia-100 transition"
              >
                Продавцам
              </Link>
              <Link
                href="/mediator"
                className="hidden lg:inline-flex px-3 py-2 rounded-xl text-sm font-medium text-foreground hover:bg-fuchsia-100 transition"
              >
                Посредникам
              </Link>
              <Link
                href="/favorites"
                className="hidden md:inline-flex w-10 h-10 rounded-xl items-center justify-center hover:bg-fuchsia-100 transition"
                title="Избранное"
              >
                <HeartOutlined style={{ fontSize: 18 }} />
              </Link>
              <Link
                href="/cart"
                className="hidden md:inline-flex w-10 h-10 rounded-xl items-center justify-center hover:bg-fuchsia-100 transition"
                title="Корзина"
              >
                <ShoppingCartOutlined style={{ fontSize: 18 }} />
              </Link>
              <Button
                type="text"
                href="/login"
                className="!hidden sm:!inline-flex !rounded-xl"
              >
                Войти
              </Button>
              <Button
                type="primary"
                href="/register"
                className="!rounded-xl !font-medium !shadow-md !shadow-fuchsia-500/25"
              >
                Регистрация
              </Button>
            </>
          )}
        </nav>
      </div>
    </header>
    <MobileBottomNav />
    </>
  );
}
