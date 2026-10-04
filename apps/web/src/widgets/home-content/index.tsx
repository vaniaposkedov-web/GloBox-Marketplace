"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Button, Card, Skeleton, Tag } from "antd";
import {
  FireOutlined,
  RightOutlined,
  ThunderboltFilled,
  GiftOutlined,
  SafetyCertificateOutlined,
  TruckOutlined,
} from "@ant-design/icons";
import { useSession } from "@/shared/auth";
import { ListingCard, fetchCategories, fetchListings } from "@/features/catalog";
import type { CategoryDto, ListingCardDto } from "@/shared/lib";

type ExtendedListing = ListingCardDto & {
  oldPrice?: number;
  rating?: number;
  reviewsCount?: number;
  badge?: "new" | "hot" | "sale" | "best";
  gradient?: string;
  emoji?: string;
};

interface BusinessPerk {
  title: string;
  hint: string;
  href: string;
  icon: React.ReactNode;
  accent: string;
  iconColor: string;
}

const BUSINESS_PERKS: BusinessPerk[] = [
  {
    title: "Быстрая доставка",
    hint: "До 24 часов",
    href: "/listings",
    icon: <TruckOutlined />,
    accent: "from-emerald-400 to-emerald-600",
    iconColor: "text-emerald-600",
  },
  {
    title: "Гарантия возврата",
    hint: "14 дней без причин",
    href: "/listings",
    icon: <SafetyCertificateOutlined />,
    accent: "from-sky-400 to-sky-600",
    iconColor: "text-sky-600",
  },
  {
    title: "Кэшбэк до 20%",
    hint: "Бонусная программа",
    href: "/register",
    icon: <GiftOutlined />,
    accent: "from-rose-400 to-rose-600",
    iconColor: "text-rose-600",
  },
];

const CATEGORY_TILES: Array<{
  slug: string;
  title: string;
  emoji: string;
  accent: string;
}> = [
  { slug: "women", title: "Женщинам", emoji: "👗", accent: "text-rose-500" },
  { slug: "men", title: "Мужчинам", emoji: "👔", accent: "text-fuchsia-600" },
  { slug: "beauty", title: "Красота", emoji: "💄", accent: "text-pink-500" },
  { slug: "electronics", title: "Электроника", emoji: "📱", accent: "text-fuchsia-500" },
  { slug: "home", title: "Дом", emoji: "🏡", accent: "text-rose-500" },
  { slug: "kids", title: "Детям", emoji: "🧸", accent: "text-yellow-600" },
  { slug: "sport", title: "Спорт", emoji: "⚽", accent: "text-rose-600" },
  { slug: "books", title: "Книги", emoji: "📚", accent: "text-rose-600" },
];

export function HomeContent() {
  const { user, hydrated } = useSession();
  const [listings, setListings] = useState<ExtendedListing[] | null>(null);
  const [categories, setCategories] = useState<CategoryDto[]>([]);

  useEffect(() => {
    fetchListings({ limit: 16 })
      .then((p) => setListings(p.items as ExtendedListing[]))
      .catch(() => setListings([]));
    fetchCategories()
      .then(setCategories)
      .catch(() => setCategories([]));
  }, []);

  const bestsellers = useMemo(
    () =>
      (listings ?? [])
        .filter((l) => l.badge === "best" || l.badge === "hot")
        .slice(0, 8),
    [listings],
  );
  const sales = useMemo(
    () => (listings ?? []).filter((l) => l.oldPrice && l.oldPrice > l.price).slice(0, 8),
    [listings],
  );
  const newArrivals = useMemo(
    () =>
      [...(listings ?? [])]
        .sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt))
        .slice(0, 8),
    [listings],
  );

  function categoryIdBySlug(slug: string): string | undefined {
    return categories.find((c) => c.slug === slug)?.id;
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-6 space-y-10">
      {/* HERO */}
      <section className="relative overflow-hidden rounded-3xl p-6 sm:p-10 lg:p-14 text-white shadow-2xl shadow-fuchsia-900/10 fade-in-up">
        <div className="absolute inset-0 bg-gradient-to-br from-[#86198f] via-[#c026d3] to-[#e879f9]" />
        <div className="absolute -top-24 -right-20 w-80 h-80 rounded-full bg-fuchsia-300/30 blur-3xl blob-float-a" />
        <div className="absolute -bottom-32 -left-20 w-96 h-96 rounded-full bg-rose-400/25 blur-3xl blob-float-b" />

        {/* Decorative sparkles */}
        <svg
          className="absolute inset-0 w-full h-full pointer-events-none"
          viewBox="0 0 1000 500"
          preserveAspectRatio="none"
        >
          <g className="text-white/30 float-slow">
            <path d="M120,80 l3,-10 l3,10 l10,3 l-10,3 l-3,10 l-3,-10 l-10,-3 z" fill="currentColor" />
            <path d="M850,130 l3,-10 l3,10 l10,3 l-10,3 l-3,10 l-3,-10 l-10,-3 z" fill="currentColor" />
          </g>
          <g className="text-white/25 float-slower">
            <path d="M420,50 l2,-7 l2,7 l7,2 l-7,2 l-2,7 l-2,-7 l-7,-2 z" fill="currentColor" />
            <path d="M700,380 l2,-7 l2,7 l7,2 l-7,2 l-2,7 l-2,-7 l-7,-2 z" fill="currentColor" />
            <circle cx="200" cy="380" r="3" fill="currentColor" />
            <circle cx="550" cy="100" r="4" fill="currentColor" />
          </g>
        </svg>

        <div className="relative grid lg:grid-cols-[1.1fr_1fr] gap-8 items-center">
          <div className="space-y-5">
            <Tag
              icon={<ThunderboltFilled />}
              className="!bg-white/15 !text-white !border-white/30 !rounded-full !px-3 !py-1 !font-medium backdrop-blur"
            >
              Распродажа · Скидки до −50%
            </Tag>
            <h1 className="text-3xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight leading-[1.05]">
              {hydrated && user
                ? `С возвращением, ${user.firstName}!`
                : "Теплые находки каждый день"}
            </h1>
            <p className="text-white/90 text-base sm:text-lg max-w-lg">
              Тысячи товаров с быстрой доставкой, честными отзывами и гарантией
              возврата. Прямо от поставщиков с Садовода — без лишних посредников.
            </p>
            <div className="flex gap-3 flex-wrap">
              <Button
                type="primary"
                size="large"
                href="/listings"
                className="!bg-white !text-fuchsia-700 hover:!bg-fuchsia-50 !font-semibold !rounded-xl !shadow-lg !shadow-black/20 !border-0"
              >
                Смотреть все скидки
              </Button>
              <Button
                size="large"
                href="/categories"
                className="!bg-white/10 !text-white !border-white/40 hover:!bg-white/20 !font-medium !rounded-xl backdrop-blur"
              >
                Все категории
              </Button>
            </div>

            {/* Mobile-only compact perks row */}
            <div className="grid grid-cols-3 gap-2.5 pt-3 max-w-md lg:hidden">
              {BUSINESS_PERKS.map((f, i) => (
                <Link
                  key={i}
                  href={f.href}
                  className="group flex flex-col items-center gap-1.5 py-3 px-2 rounded-2xl bg-white/15 backdrop-blur-md border border-white/25 text-center hover:bg-white/25 hover:scale-[1.04] active:scale-[0.97] transition-all duration-200"
                >
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-fuchsia-400 to-rose-500 text-white flex items-center justify-center text-lg shadow-sm group-hover:scale-110 transition-transform duration-200">
                    {f.icon}
                  </div>
                  <div className="text-[10px] font-bold text-white leading-tight">{f.title}</div>
                  <div className="text-[9px] text-white/70 leading-snug">{f.hint}</div>
                </Link>
              ))}
            </div>
          </div>

          {/* Marketplace hero showcase: floating product cards + perks */}
          <HeroShowcase />
        </div>
      </section>

      {/* CATEGORY TILES (light stickers) */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight">Популярные категории</h2>
          <Link
            href="/categories"
            className="text-sm font-medium text-fuchsia-700 hover:text-fuchsia-800 inline-flex items-center gap-1"
          >
            Все категории <RightOutlined style={{ fontSize: 11 }} />
          </Link>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
          {CATEGORY_TILES.map((c) => {
            const id = categoryIdBySlug(c.slug);
            return (
              <Link
                key={c.slug}
                href={id ? `/listings?category=${id}` : `/listings?q=${c.title}`}
                className="group relative rounded-2xl bg-white/70 backdrop-blur-sm border border-transparent hover:border-fuchsia-200 hover:bg-white hover:shadow-lg hover:shadow-fuchsia-500/10 hover:-translate-y-0.5 transition-all p-4 flex flex-col items-center justify-center gap-2"
              >
                <div className="relative text-4xl leading-none transition-transform duration-300 group-hover:scale-110">
                  <span className="relative z-10 drop-shadow-sm">{c.emoji}</span>
                  <span className="absolute inset-0 flex items-center justify-center -z-0 blur-xl opacity-50 group-hover:opacity-70 transition">
                    <span className={c.accent}>●</span>
                  </span>
                </div>
                <div className="text-[13px] font-medium text-center leading-tight text-foreground/85">
                  {c.title}
                </div>
              </Link>
            );
          })}
        </div>
      </section>

      {/* SALE STRIP */}
      <section className="rounded-3xl overflow-hidden relative bg-gradient-to-r from-fuchsia-600 via-purple-500 to-rose-400 p-6 sm:p-8 text-white shadow-xl">
        <div className="absolute inset-0 opacity-20 bg-[radial-gradient(ellipse_at_top_right,white,transparent_60%)]" />
        <svg
          className="absolute inset-0 w-full h-full pointer-events-none"
          viewBox="0 0 800 200"
          preserveAspectRatio="none"
        >
          <g className="text-white/30 float-slow">
            <circle cx="120" cy="40" r="3" fill="currentColor" />
            <circle cx="300" cy="150" r="4" fill="currentColor" />
            <circle cx="650" cy="60" r="5" fill="currentColor" />
          </g>
        </svg>
        <div className="relative flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="space-y-2">
            <Tag
              icon={<FireOutlined />}
              className="!bg-white/20 !text-white !border-white/30 !rounded-full !px-3 !py-1 !font-medium backdrop-blur"
            >
              Горячие скидки
            </Tag>
            <h3 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              Успей купить со скидкой до −50%
            </h3>
            <p className="text-white/85 max-w-md text-sm sm:text-base">
              Популярные товары по самым низким ценам недели. Доставка завтра.
            </p>
          </div>
          <div className="flex items-center gap-4">
            <div className="hidden sm:flex items-center gap-2 pop-in">
              {["💸", "🔥", "✨"].map((e, i) => (
                <div
                  key={i}
                  className="w-12 h-12 rounded-2xl bg-white/20 border border-white/30 backdrop-blur flex items-center justify-center text-2xl shadow-lg float-slow"
                  style={{ animationDelay: `${i * 0.15}s` }}
                >
                  {e}
                </div>
              ))}
            </div>
            <Button
              size="large"
              href="/listings"
              className="!bg-white !text-fuchsia-700 !font-semibold !rounded-xl !border-0 !shadow-lg"
            >
              Все скидки
            </Button>
          </div>
        </div>
      </section>

      {/* BESTSELLERS */}
      <ProductSection
        title="Хиты продаж"
        subtitle="Выбор покупателей"
        href="/listings"
        items={bestsellers}
        loading={!listings}
      />

      {/* SALE PRODUCTS */}
      <ProductSection
        title="Скидки недели"
        subtitle="Товары с лучшими ценами"
        href="/listings"
        items={sales}
        loading={!listings}
      />

      {/* NEW ARRIVALS */}
      <ProductSection
        title="Новинки"
        subtitle="Только что появились в каталоге"
        href="/listings"
        items={newArrivals}
        loading={!listings}
      />

      {/* B2B-CTA: стать поставщиком или посредником */}
      <B2BJoinSection />
    </div>
  );
}

function B2BJoinSection() {
  return (
    <section className="grid md:grid-cols-2 gap-4">
      <Link
        href="/seller"
        className="group relative overflow-hidden rounded-3xl p-6 sm:p-8 text-white bg-gradient-to-br from-[#4a1d96] via-[#7c3aed] to-[#a78bfa] shadow-xl hover:shadow-2xl transition-all hover:-translate-y-0.5"
      >
        <div className="absolute -top-10 -right-10 w-48 h-48 rounded-full bg-violet-300/30 blur-2xl group-hover:bg-violet-200/40 transition" />
        <Tag
          icon={<ThunderboltFilled />}
          className="!bg-white/20 !text-white !border-white/30 !rounded-full !px-3 !py-0.5 !font-medium backdrop-blur"
        >
          Для продавцов Садовода
        </Tag>
        <h3 className="mt-3 text-2xl sm:text-3xl font-extrabold tracking-tight">
          Стать поставщиком
        </h3>
        <p className="mt-2 text-white/90 text-sm sm:text-base max-w-md">
          Открывайте онлайн-витрину прямо из павильона. Заявка — за 4 шага,
          модерация — до 24 часов.
        </p>
        <div className="mt-4 inline-flex items-center gap-2 font-semibold">
          Начать <RightOutlined style={{ fontSize: 12 }} />
        </div>
      </Link>

      <Link
        href="/mediator"
        className="group relative overflow-hidden rounded-3xl p-6 sm:p-8 text-white bg-gradient-to-br from-[#701a75] via-[#a21caf] to-[#c026d3] shadow-xl hover:shadow-2xl transition-all hover:-translate-y-0.5"
      >
        <div className="absolute -top-10 -right-10 w-48 h-48 rounded-full bg-fuchsia-300/30 blur-2xl group-hover:bg-fuchsia-200/40 transition" />
        <Tag
          icon={<ThunderboltFilled />}
          className="!bg-white/20 !text-white !border-white/30 !rounded-full !px-3 !py-0.5 !font-medium backdrop-blur"
        >
          Для посредников
        </Tag>
        <h3 className="mt-3 text-2xl sm:text-3xl font-extrabold tracking-tight">
          Зарабатывайте на выкупах
        </h3>
        <p className="mt-2 text-white/90 text-sm sm:text-base max-w-md">
          Покупатели заказывают через вас, вы выкупаете товар у поставщиков и
          забираете комиссию 3–20%.
        </p>
        <div className="mt-4 inline-flex items-center gap-2 font-semibold">
          Начать <RightOutlined style={{ fontSize: 12 }} />
        </div>
      </Link>
    </section>
  );
}

interface ProductSectionProps {
  title: string;
  subtitle?: string;
  href: string;
  items: ExtendedListing[];
  loading: boolean;
}

function ProductSection({ title, subtitle, href, items, loading }: ProductSectionProps) {
  return (
    <section className="space-y-4">
      <div className="flex items-end justify-between gap-2">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight">{title}</h2>
          {subtitle && <p className="text-sm text-muted mt-0.5">{subtitle}</p>}
        </div>
        <Link
          href={href}
          className="text-sm font-medium text-fuchsia-700 hover:text-fuchsia-800 inline-flex items-center gap-1 shrink-0"
        >
          Смотреть все <RightOutlined style={{ fontSize: 11 }} />
        </Link>
      </div>

      {loading && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 sm:gap-4">
          {[...Array(5)].map((_, i) => (
            <Card key={i} className="!rounded-2xl">
              <Skeleton.Image active className="!w-full !h-32" />
              <Skeleton active paragraph={{ rows: 2 }} className="!mt-3" />
            </Card>
          ))}
        </div>
      )}

      {!loading && items.length === 0 && (
        <Card className="!rounded-2xl">
          <p className="text-center text-muted py-8">Пока пусто — загляните позже</p>
        </Card>
      )}

      {!loading && items.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 sm:gap-4">
          {items.map((l) => (
            <ListingCard key={l.id} listing={l} />
          ))}
        </div>
      )}
    </section>
  );
}

/**
 * Hero-витрина маркетплейса: парящие карточки товаров вокруг центральной
 * иллюстрации витрины (SVG storefront), плюс три кликабельные плашки-перка
 * с непрерывной idle-анимацией. Без живых существ — только тёплая
 * маркетплейс-визуалка в палитре проекта.
 */
function HeroShowcase() {
  return (
    <div className="relative hidden lg:block h-[500px]">
      {/* Радиальный тёплый «прожектор» */}
      <div
        className="absolute inset-x-0 bottom-0 mx-auto w-[26rem] h-[26rem] rounded-full"
        style={{
          background:
            "radial-gradient(circle at center, rgba(255,255,255,0.22) 0%, rgba(255,255,255,0.06) 55%, transparent 80%)",
        }}
        aria-hidden
      />
      <div
        className="absolute left-1/2 bottom-4 -translate-x-1/2 w-72 h-72 rounded-full border border-white/15 blob-float-c"
        aria-hidden
      />

      {/* Центральная стилизованная витрина */}
      <div className="absolute inset-0 flex items-center justify-center pop-in">
        <StorefrontIllustration />
      </div>

      {/* Парящие карточки товаров — слева, справа и сверху */}
      <FloatingProductCard
        className="left-2 top-[30%] -rotate-[8deg] plaque-bob-a w-44"
        emoji="👗"
        title="Платье"
        price="2 490 ₽"
        oldPrice="3 990 ₽"
        badge="−38%"
        badgeColor="bg-rose-500"
      />
      <FloatingProductCard
        className="right-2 top-[26%] rotate-[8deg] plaque-bob-b w-44"
        emoji="📱"
        title="Смартфон"
        price="14 990 ₽"
        oldPrice="19 990 ₽"
        badge="Хит"
        badgeColor="bg-fuchsia-500"
      />
      <FloatingProductCard
        className="left-1/2 -translate-x-1/2 top-[6%] -rotate-[3deg] plaque-bob-c w-48"
        emoji="✨"
        title="Скидки до"
        price="−50%"
        badge="Сегодня"
        badgeColor="bg-purple-500"
      />

      {/* Три кликабельные плашки-перка снизу */}
      <div
        className="absolute fade-in-up plaque-bob-a"
        style={{ left: "-0.75rem", bottom: "8%", animationDelay: "0.25s" }}
      >
        <PerkPlaque
          perk={BUSINESS_PERKS[0]}
          className="w-48 -rotate-[6deg] hover:!rotate-[-2deg] hover:scale-[1.06]"
        />
      </div>
      <div
        className="absolute fade-in-up plaque-bob-b"
        style={{ right: "-0.75rem", bottom: "8%", animationDelay: "0.4s" }}
      >
        <PerkPlaque
          perk={BUSINESS_PERKS[1]}
          className="w-48 rotate-[6deg] hover:!rotate-[2deg] hover:scale-[1.06]"
        />
      </div>
    </div>
  );
}

function FloatingProductCard({
  className = "",
  emoji,
  title,
  price,
  oldPrice,
  badge,
  badgeColor,
}: {
  className?: string;
  emoji: string;
  title: string;
  price: string;
  oldPrice?: string;
  badge?: string;
  badgeColor?: string;
}) {
  return (
    <div
      className={`absolute bg-white rounded-2xl shadow-xl shadow-black/30 p-3 fade-in-up ${className}`}
    >
      {badge && (
        <span
          className={`absolute -top-2 -right-2 ${badgeColor ?? "bg-rose-500"} text-white text-[10px] font-bold px-2 py-1 rounded-full shadow-md`}
        >
          {badge}
        </span>
      )}
      <div className="flex items-center gap-2.5">
        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-fuchsia-100 to-rose-100 flex items-center justify-center text-2xl shrink-0">
          {emoji}
        </div>
        <div className="leading-tight min-w-0">
          <div className="text-[11px] text-muted font-medium truncate">
            {title}
          </div>
          <div className="text-sm font-bold text-foreground truncate">
            {price}
          </div>
          {oldPrice && (
            <div className="text-[10px] text-muted line-through">
              {oldPrice}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function StorefrontIllustration() {
  return (
    <svg
      viewBox="0 0 360 360"
      className="w-[360px] h-[360px] drop-shadow-2xl"
      aria-hidden
    >
      <defs>
        <linearGradient id="hero-front" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#fef3c7" />
          <stop offset="100%" stopColor="#fde6c4" />
        </linearGradient>
        <linearGradient id="hero-awn" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#c026d3" />
          <stop offset="100%" stopColor="#7c3aed" />
        </linearGradient>
        <linearGradient id="hero-shelf" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#d946ef" />
          <stop offset="100%" stopColor="#a855f7" />
        </linearGradient>
      </defs>

      <ellipse cx="180" cy="320" rx="140" ry="12" fill="#000" opacity="0.25" />

      {/* Корпус */}
      <rect
        x="50"
        y="280"
        width="260"
        height="40"
        rx="6"
        fill="#6b21a8"
      />
      <rect x="50" y="280" width="260" height="6" rx="3" fill="#7e22ce" />

      <rect
        x="60"
        y="130"
        width="240"
        height="155"
        rx="12"
        fill="url(#hero-front)"
        stroke="#6b21a8"
        strokeWidth="3"
      />

      {/* Большое окно */}
      <rect
        x="80"
        y="160"
        width="200"
        height="92"
        rx="6"
        fill="#fffbeb"
        stroke="#6b21a8"
        strokeWidth="2.5"
      />
      <rect x="80" y="200" width="200" height="3" fill="url(#hero-shelf)" />

      {/* Товары на полке */}
      <g transform="translate(96, 174)">
        <rect x="0" y="6" width="26" height="28" rx="3" fill="#fff7ed" stroke="#6b21a8" strokeWidth="1.6" />
        <path d="M6,6 Q6,0 13,0 Q20,0 20,6" fill="none" stroke="#6b21a8" strokeWidth="1.6" />
        <text x="13" y="25" fontSize="11" fontWeight="bold" fill="#dc2626" textAnchor="middle">%</text>
      </g>
      <g transform="translate(140, 172)">
        <rect x="0" y="4" width="34" height="32" rx="3" fill="#fef3c7" stroke="#6b21a8" strokeWidth="1.6" />
        <line x1="17" y1="4" x2="17" y2="36" stroke="#9333ea" strokeWidth="2.5" />
        <line x1="0" y1="18" x2="34" y2="18" stroke="#9333ea" strokeWidth="2.5" />
      </g>
      <g transform="translate(192, 172)">
        <rect x="6" y="14" width="18" height="22" rx="3" fill="#fda4af" stroke="#9f1239" strokeWidth="1.6" />
        <rect x="9" y="6" width="12" height="8" fill="#9f1239" />
        <rect x="8" y="22" width="14" height="2" fill="#fff" opacity="0.5" />
      </g>
      <g transform="translate(232, 178)">
        <ellipse cx="12" cy="8" rx="11" ry="3" fill="#fed7aa" />
        <path
          d="M1,8 L3,32 Q3,34 5,34 L19,34 Q21,34 21,32 L23,8 Z"
          fill="#fb923c"
          stroke="#7e22ce"
          strokeWidth="1.6"
        />
        <ellipse cx="12" cy="8" rx="11" ry="3" fill="none" stroke="#7e22ce" strokeWidth="1.6" />
        <path d="M23,15 Q29,16 27,24 Q26,28 21,27" fill="none" stroke="#7e22ce" strokeWidth="1.6" />
      </g>

      {/* Дверь */}
      <rect x="160" y="222" width="40" height="60" rx="4" fill="#fed7aa" stroke="#6b21a8" strokeWidth="2.5" />
      <circle cx="192" cy="252" r="2" fill="#6b21a8" />

      {/* Тент */}
      <path
        d="M50,130 Q180,116 310,130 L300,100 Q180,86 60,100 Z"
        fill="url(#hero-awn)"
        stroke="#6b21a8"
        strokeWidth="3"
        strokeLinejoin="round"
      />
      {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => (
        <line
          key={i}
          x1={64 + i * 36}
          y1={113}
          x2={70 + i * 36}
          y2={130}
          stroke="#fff"
          strokeWidth="3"
          opacity="0.5"
        />
      ))}
      <path
        d="M50,130 L60,140 L72,130 L84,140 L96,130 L108,140 L120,130 L132,140 L144,130 L156,140 L168,130 L180,140 L192,130 L204,140 L216,130 L228,140 L240,130 L252,140 L264,130 L276,140 L288,130 L300,140 L310,130 Z"
        fill="url(#hero-awn)"
        stroke="#6b21a8"
        strokeWidth="2"
        strokeLinejoin="round"
      />

      {/* Вывеска */}
      <rect x="125" y="138" width="110" height="22" rx="4" fill="#fff7ed" stroke="#6b21a8" strokeWidth="2.5" />
      <text
        x="180"
        y="154"
        fontSize="13"
        fontWeight="900"
        fill="#6b21a8"
        textAnchor="middle"
        letterSpacing="2"
      >
        SADOVOD
      </text>
    </svg>
  );
}

function PerkPlaque({
  perk,
  className = "",
  style,
}: {
  perk: BusinessPerk;
  className?: string;
  style?: React.CSSProperties;
}) {
  return (
    <Link
      href={perk.href}
      className={`group block rounded-2xl bg-white text-foreground shadow-xl shadow-black/25 hover:shadow-2xl hover:shadow-fuchsia-500/40 hover:ring-2 hover:ring-fuchsia-300/70 hover:-translate-y-1.5 transition-all duration-300 ease-out overflow-hidden will-change-transform ${className}`}
      style={style}
    >
      {/* Colored top stripe */}
      <div className={`h-1.5 bg-gradient-to-r ${perk.accent}`} />
      <div className="p-3 flex items-center gap-3">
        <div
          className={`w-11 h-11 rounded-xl bg-gradient-to-br ${perk.accent} text-white flex items-center justify-center shrink-0 text-xl shadow-md group-hover:scale-110 transition-transform`}
        >
          {perk.icon}
        </div>
        <div className="flex-1 min-w-0">
          <div className="font-bold text-sm leading-tight text-foreground">
            {perk.title}
          </div>
          <div className="text-[11px] text-muted mt-0.5 truncate">
            {perk.hint}
          </div>
        </div>
        <RightOutlined
          className="text-muted group-hover:text-fuchsia-700 group-hover:translate-x-0.5 transition-all"
          style={{ fontSize: 11 }}
        />
      </div>
    </Link>
  );
}
