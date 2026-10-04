"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import {
  ShopOutlined,
  TruckOutlined,
  SafetyCertificateOutlined,
  GiftOutlined,
  ThunderboltFilled,
  StarFilled,
  RocketOutlined,
  TeamOutlined,
  WalletOutlined,
  CheckCircleFilled,
  AppstoreOutlined,
  LockOutlined,
  SmileOutlined,
  ArrowLeftOutlined,
} from "@ant-design/icons";

export type AuthBrandVariant = "buyer" | "supplier" | "mediator";

interface AuthBrandPanelProps {
  variant?: AuthBrandVariant;
  headline: string;
  subline?: string;
  badge?: string;
  perks?: Array<{ value: string; hint: string }>;
  onBack?: () => void;
}

/**
 * Общая «брендовая» панель для страниц логина/регистрации.
 * Без иллюстраций-животных. Стилизованная марковая «витрина»
 * с парящими карточками товаров — в тёплой палитре проекта.
 */
export function AuthBrandPanel({
  variant = "buyer",
  headline,
  subline,
  badge,
  perks,
  onBack,
}: AuthBrandPanelProps) {
  // Тёплая палитра — для всех ролей. Mediator чуть «глубже»,
  // supplier «ярче», buyer — основной фирменный.
  const palette: Record<
    AuthBrandVariant,
    { bg: string; accent: string; tagBg: string }
  > = {
    buyer: {
      bg: "from-[#3a1c0a] via-[#7c3a0f] to-[#c2410c]",
      accent: "text-amber-200",
      tagBg: "!bg-amber-300/15 !text-amber-100 !border-amber-200/30",
    },
    supplier: {
      bg: "from-[#3a1c0a] via-[#a04412] to-[#f59e0b]",
      accent: "text-amber-200",
      tagBg: "!bg-amber-300/15 !text-amber-100 !border-amber-200/30",
    },
    mediator: {
      bg: "from-[#2a1408] via-[#7d2f1d] to-[#dc6b3f]",
      accent: "text-rose-200",
      tagBg: "!bg-rose-300/15 !text-rose-100 !border-rose-200/30",
    },
  };
  const colors = palette[variant];

  return (
    <div className="relative overflow-hidden rounded-3xl p-8 lg:p-10 text-white shadow-2xl shadow-amber-900/30 hidden lg:flex flex-col justify-between fade-in-up min-h-[640px]">
      {/* Base warm gradient */}
      <div className={`absolute inset-0 bg-gradient-to-br ${colors.bg}`} />

      {/* Soft blobs */}
      <div className="absolute inset-0 opacity-40">
        <div className="absolute -top-10 left-1/2 w-96 h-96 -translate-x-1/2 rounded-full bg-amber-400/40 blur-3xl blob-float-a" />
        <div className="absolute -bottom-16 -right-12 w-80 h-80 rounded-full bg-rose-500/40 blur-3xl blob-float-b" />
        <div className="absolute top-1/3 -left-20 w-72 h-72 rounded-full bg-orange-400/30 blur-3xl blob-float-c" />
      </div>

      {/* Subtle dot grid overlay */}
      <svg
        className="absolute inset-0 w-full h-full opacity-15"
        viewBox="0 0 400 700"
        preserveAspectRatio="xMidYMid slice"
        aria-hidden
      >
        <defs>
          <pattern
            id={`bp-dots-${variant}`}
            x="0"
            y="0"
            width="28"
            height="28"
            patternUnits="userSpaceOnUse"
          >
            <circle cx="2" cy="2" r="1.2" fill="#fef3c7" />
          </pattern>
        </defs>
        <rect width="400" height="700" fill={`url(#bp-dots-${variant})`} />
      </svg>

      {/* Header: back button or brand logo */}
      <div className="relative z-10">
        {onBack ? (
          <button
            type="button"
            onClick={onBack}
            className="inline-flex items-center gap-2 px-3 py-2 rounded-2xl bg-white/15 hover:bg-white/25 border border-white/25 text-white text-sm font-medium transition-all backdrop-blur"
          >
            <ArrowLeftOutlined style={{ fontSize: 12 }} />
            Назад
          </button>
        ) : (
          <Link
            href="/"
            className="inline-flex items-center gap-2 font-bold text-lg hover:opacity-90 transition"
          >
            <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-white/15 border border-white/30 backdrop-blur text-xl shadow-md shadow-black/20">
              ✦
            </span>
            Globox
          </Link>
        )}
      </div>

      {/* Showcase illustration + headline */}
      <div className="relative z-10 flex-1 flex flex-col items-center justify-center py-6 gap-5">
        <MarketShowcase variant={variant} />
        <div
          className="text-center space-y-2 fade-in-up"
          style={{ animationDelay: "0.4s" }}
        >
          {badge && (
            <span
              className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full backdrop-blur text-xs font-medium border ${colors.tagBg}`}
            >
              <ThunderboltFilled style={{ fontSize: 11 }} />
              {badge}
            </span>
          )}
          <h2 className="text-2xl xl:text-3xl font-extrabold tracking-tight">
            {headline}
          </h2>
          {subline && (
            <p className="text-white/85 text-sm max-w-sm mx-auto leading-relaxed">
              {subline}
            </p>
          )}
        </div>
      </div>

      {/* Perks row */}
      {perks && perks.length > 0 && (
        <div className="relative z-10 grid grid-cols-3 gap-2">
          {perks.map((p, i) => (
            <div
              key={i}
              className="rounded-xl bg-white/10 border border-white/20 p-3 backdrop-blur text-center fade-in-up hover:bg-white/15 transition"
              style={{ animationDelay: `${0.5 + i * 0.1}s` }}
            >
              <div className={`text-lg font-bold ${colors.accent}`}>
                {p.value}
              </div>
              <div className="text-[10px] uppercase tracking-wide text-white/70 leading-tight mt-0.5">
                {p.hint}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/**
 * Стилизованная иллюстрация «маркетплейс»: центральная витрина с тентом,
 * парящие вокруг карточки товаров и иконок — без живых существ.
 */
function MarketShowcase({ variant }: { variant: AuthBrandVariant }) {
  // Контент карточек — слегка адаптируется под роль
  const cards: Array<{
    icon: ReactNode;
    title: string;
    sub: string;
    cls: string; // позиция + анимация
    accent: string;
  }> =
    variant === "supplier"
      ? [
          {
            icon: <ShopOutlined />,
            title: "Витрина",
            sub: "ваш павильон",
            cls: "left-0 top-2 -rotate-6 plaque-bob-a",
            accent: "from-amber-400 to-orange-500",
          },
          {
            icon: <RocketOutlined />,
            title: "Заказы",
            sub: "сразу в чат",
            cls: "right-0 top-6 rotate-6 plaque-bob-b",
            accent: "from-orange-400 to-rose-500",
          },
          {
            icon: <CheckCircleFilled />,
            title: "Модерация",
            sub: "до 24 часов",
            cls: "left-1/2 -translate-x-1/2 -bottom-2 -rotate-2 plaque-bob-c",
            accent: "from-rose-400 to-amber-500",
          },
        ]
      : variant === "mediator"
        ? [
            {
              icon: <TeamOutlined />,
              title: "Заказы",
              sub: "от покупателей",
              cls: "left-0 top-2 -rotate-6 plaque-bob-a",
              accent: "from-amber-400 to-orange-500",
            },
            {
              icon: <WalletOutlined />,
              title: "Комиссия",
              sub: "3–20%",
              cls: "right-0 top-6 rotate-6 plaque-bob-b",
              accent: "from-orange-400 to-rose-500",
            },
            {
              icon: <StarFilled />,
              title: "Рейтинг",
              sub: "и отзывы",
              cls: "left-1/2 -translate-x-1/2 -bottom-2 -rotate-2 plaque-bob-c",
              accent: "from-rose-400 to-amber-500",
            },
          ]
        : [
            {
              icon: <AppstoreOutlined />,
              title: "Большой выбор",
              sub: "тысячи товаров",
              cls: "left-0 top-2 -rotate-6 plaque-bob-a",
              accent: "from-amber-400 to-orange-500",
            },
            {
              icon: <LockOutlined />,
              title: "Безопасность",
              sub: "гарантия сделки",
              cls: "right-0 top-6 rotate-6 plaque-bob-b",
              accent: "from-orange-400 to-rose-500",
            },
            {
              icon: <SmileOutlined />,
              title: "Удобство",
              sub: "всё в одном",
              cls: "left-1/2 -translate-x-1/2 -bottom-2 -rotate-2 plaque-bob-c",
              accent: "from-rose-400 to-amber-500",
            },
          ];

  return (
    <div className="relative w-full max-w-[340px] aspect-square pop-in">
      {/* Фоновый «прожектор» */}
      <div
        className="absolute inset-0 rounded-full blur-2xl"
        style={{
          background:
            "radial-gradient(circle at 50% 55%, rgba(254,243,199,0.5) 0%, rgba(254,243,199,0.15) 45%, transparent 75%)",
        }}
      />

      {/* Витрина — стилизованный SVG (тент + полки + товары). */}
      <svg
        viewBox="0 0 320 320"
        className="absolute inset-0 w-full h-full drop-shadow-2xl"
        aria-hidden
      >
        <defs>
          <linearGradient id={`storefront-${variant}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#fef3c7" />
            <stop offset="100%" stopColor="#fde6c4" />
          </linearGradient>
          <linearGradient id={`awning-${variant}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#f59e0b" />
            <stop offset="100%" stopColor="#c2410c" />
          </linearGradient>
          <linearGradient id={`shelf-${variant}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#fbbf24" />
            <stop offset="100%" stopColor="#d97706" />
          </linearGradient>
          <radialGradient id={`bag-${variant}`} cx="0.4" cy="0.3" r="0.8">
            <stop offset="0%" stopColor="#fff7ed" />
            <stop offset="100%" stopColor="#fde68a" />
          </radialGradient>
        </defs>

        {/* Тень под витриной */}
        <ellipse cx="160" cy="280" rx="120" ry="10" fill="#000" opacity="0.18" />

        {/* Корпус витрины */}
        <g className="subtle-breathe" style={{ transformOrigin: "160px 200px" }}>
          {/* Подножие */}
          <rect
            x="50"
            y="240"
            width="220"
            height="38"
            rx="6"
            fill="#92400e"
          />
          <rect x="50" y="240" width="220" height="6" rx="3" fill="#b45309" />

          {/* Стены */}
          <rect
            x="60"
            y="120"
            width="200"
            height="125"
            rx="10"
            fill={`url(#storefront-${variant})`}
            stroke="#92400e"
            strokeWidth="3"
          />

          {/* Большое окно-витрина */}
          <rect
            x="80"
            y="148"
            width="160"
            height="72"
            rx="6"
            fill="#fffbeb"
            stroke="#92400e"
            strokeWidth="2.5"
          />
          {/* Полка */}
          <rect
            x="80"
            y="184"
            width="160"
            height="3"
            fill={`url(#shelf-${variant})`}
          />

          {/* Товары на полке */}
          {/* Товар 1 — пакет */}
          <g transform="translate(95, 158)">
            <rect
              x="0"
              y="6"
              width="22"
              height="24"
              rx="2"
              fill={`url(#bag-${variant})`}
              stroke="#92400e"
              strokeWidth="1.5"
            />
            <path
              d="M5,6 Q5,0 11,0 Q17,0 17,6"
              fill="none"
              stroke="#92400e"
              strokeWidth="1.5"
            />
            <text
              x="11"
              y="22"
              fontSize="9"
              fontWeight="bold"
              fill="#dc2626"
              textAnchor="middle"
            >
              %
            </text>
          </g>
          {/* Товар 2 — коробка */}
          <g transform="translate(135, 158)">
            <rect
              x="0"
              y="4"
              width="28"
              height="26"
              rx="2"
              fill="#fef3c7"
              stroke="#92400e"
              strokeWidth="1.5"
            />
            <line
              x1="14"
              y1="4"
              x2="14"
              y2="30"
              stroke="#dc2626"
              strokeWidth="2"
            />
            <line
              x1="0"
              y1="14"
              x2="28"
              y2="14"
              stroke="#dc2626"
              strokeWidth="2"
            />
          </g>
          {/* Товар 3 — флакон */}
          <g transform="translate(180, 156)">
            <rect
              x="6"
              y="12"
              width="14"
              height="20"
              rx="2"
              fill="#fda4af"
              stroke="#9f1239"
              strokeWidth="1.4"
            />
            <rect
              x="9"
              y="6"
              width="8"
              height="6"
              fill="#9f1239"
            />
            <rect x="8" y="20" width="10" height="2" fill="#fff" opacity="0.5" />
          </g>
          {/* Товар 4 — кружка */}
          <g transform="translate(210, 162)">
            <ellipse cx="10" cy="8" rx="9" ry="2.5" fill="#fed7aa" />
            <path
              d="M1,8 L3,28 Q3,30 5,30 L15,30 Q17,30 17,28 L19,8 Z"
              fill="#fb923c"
              stroke="#9a3412"
              strokeWidth="1.5"
            />
            <ellipse cx="10" cy="8" rx="9" ry="2.5" fill="none" stroke="#9a3412" strokeWidth="1.5" />
            <path d="M19,14 Q24,15 23,21 Q22,25 18,24" fill="none" stroke="#9a3412" strokeWidth="1.5" />
          </g>

          {/* Дверь */}
          <rect
            x="142"
            y="194"
            width="36"
            height="46"
            rx="3"
            fill="#fed7aa"
            stroke="#92400e"
            strokeWidth="2"
          />
          <circle cx="171" cy="218" r="1.6" fill="#92400e" />

          {/* Тент (awning) полосатый */}
          <g>
            <path
              d="M52,120 Q160,108 268,120 L260,98 Q160,85 60,98 Z"
              fill={`url(#awning-${variant})`}
              stroke="#7c2d12"
              strokeWidth="2.5"
              strokeLinejoin="round"
            />
            {/* Полоски на тенте */}
            {[0, 1, 2, 3, 4, 5, 6].map((i) => (
              <line
                key={i}
                x1={62 + i * 32}
                y1={108}
                x2={68 + i * 32}
                y2={120}
                stroke="#fff"
                strokeWidth="2.5"
                opacity="0.45"
              />
            ))}
            {/* Зубцы по нижнему краю */}
            <path
              d="M52,120 L60,128 L70,120 L80,128 L90,120 L100,128 L110,120 L120,128 L130,120 L140,128 L150,120 L160,128 L170,120 L180,128 L190,120 L200,128 L210,120 L220,128 L230,120 L240,128 L250,120 L260,128 L268,120 Z"
              fill={`url(#awning-${variant})`}
              stroke="#7c2d12"
              strokeWidth="2"
              strokeLinejoin="round"
            />
          </g>

          {/* Вывеска "SHOP" */}
          <g>
            <rect
              x="115"
              y="126"
              width="90"
              height="18"
              rx="3"
              fill="#fff7ed"
              stroke="#7c2d12"
              strokeWidth="2"
            />
            <text
              x="160"
              y="139"
              fontSize="11"
              fontWeight="900"
              fill="#92400e"
              textAnchor="middle"
              letterSpacing="1.5"
            >
              SADOVOD
            </text>
          </g>

          {/* Звёзды над витриной */}
          <g className="float-slow" style={{ transformOrigin: "60px 60px" }}>
            <path
              d="M55,55 l3,-9 l3,9 l9,3 l-9,3 l-3,9 l-3,-9 l-9,-3 z"
              fill="#fde68a"
            />
          </g>
          <g className="float-slower" style={{ transformOrigin: "260px 50px" }}>
            <path
              d="M260,45 l2.5,-7 l2.5,7 l7,2.5 l-7,2.5 l-2.5,7 l-2.5,-7 l-7,-2.5 z"
              fill="#fda4af"
            />
          </g>
          <g className="float-slow" style={{ transformOrigin: "240px 90px" }}>
            <circle cx="240" cy="90" r="3" fill="#fde68a" />
          </g>
          <g className="float-slower" style={{ transformOrigin: "70px 90px" }}>
            <circle cx="70" cy="90" r="2.5" fill="#fda4af" />
          </g>
        </g>
      </svg>

      {/* Парящие AntD-карточки рядом с витриной */}
      {cards.map((c, i) => (
        <div
          key={i}
          className={`absolute ${c.cls} bg-white rounded-2xl shadow-xl shadow-black/30 px-3 py-2 flex items-center gap-2 min-w-[120px] backdrop-blur-sm fade-in-up`}
          style={{ animationDelay: `${0.3 + i * 0.15}s` }}
        >
          <span
            className={`w-9 h-9 rounded-xl bg-gradient-to-br ${c.accent} text-white flex items-center justify-center shrink-0 text-sm shadow-md`}
          >
            {c.icon}
          </span>
          <div className="leading-tight">
            <div className="text-[12px] font-bold text-foreground whitespace-nowrap">
              {c.title}
            </div>
            <div className="text-[10px] text-muted whitespace-nowrap">
              {c.sub}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
