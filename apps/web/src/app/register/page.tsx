"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Button, Card, Typography } from "antd";
import {
  ArrowLeftOutlined,
  ShoppingCartOutlined,
  ShopOutlined,
  TeamOutlined,
  StarFilled,
} from "@ant-design/icons";
import { RegisterEmailForm } from "@/features/register-email";
import {
  MethodCircles,
  RegisterPhoneForm,
  VkFlow,
  MaxFlow,
  GenderSelect,
  type BuyerAuthMethod,
} from "@/features/auth-methods";
import { AuthBrandPanel } from "@/shared/ui";

type PageFlow =
  | { step: "role" }
  | { step: "buyer" }
  | { step: "gender"; accessToken: string; userId: string };

type DoneResult = { accessToken: string; userId: string };

/* ─────────────────────────────────────────────────────────────────── */

export default function RegisterPage() {
  const [flow, setFlow] = useState<PageFlow>({ step: "role" });
  const [method, setMethod] = useState<BuyerAuthMethod>("vk");

  function handleDone(result: DoneResult) {
    setFlow({ step: "gender", ...result });
  }

  /* ── ROLE SELECTION ──────────────────────────────────────────────── */
  if (flow.step === "role") {
    return (
      <main className="relative min-h-screen flex flex-col items-center justify-center px-4 py-6 sm:py-10 overflow-hidden bg-gradient-to-br from-stone-50 via-amber-50/40 to-orange-50/30 gap-0">
        <BubbleBg />

        {/* На главную — absolute top-left на мобильном, в потоке на десктопе */}
        <div
          className="absolute top-4 left-4 z-20 sm:relative sm:top-auto sm:left-auto sm:w-full fade-in-up"
          style={{ animationDelay: "0s" }}
        >
          <Link
            href="/"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-2xl bg-white/80 backdrop-blur border border-border shadow-sm hover:shadow-md text-sm font-medium text-muted hover:text-foreground transition-all"
          >
            <ArrowLeftOutlined style={{ fontSize: 11 }} />
            На главную
          </Link>
        </div>

        <div className="relative z-10 w-full max-w-4xl flex flex-col items-center gap-4 sm:gap-8">

          {/* Title */}
          <div className="text-center overflow-hidden px-2">
            <h2
              className="word-drop text-2xl sm:text-3xl lg:text-[2.6rem] font-extrabold tracking-tight text-foreground leading-tight"
              style={{ animationDelay: "0.05s" }}
            >
              Добро пожаловать в Globox
            </h2>
          </div>

          {/*
            Grid layout:
            Mobile (grid-cols-2):
              – Покупатель spans both columns (full-width, vertical, order-1)
              – Посредник + Поставщик share one row (order-2, order-3)

            Desktop (sm:grid-cols-3):
              – Equal 3-column with items-stretch (equal heights)
          */}
          <div className="w-full grid grid-cols-1 sm:grid-cols-[1fr_1.25fr_1fr] gap-3 sm:gap-4 lg:gap-5 items-center">

            {/* Покупатель — главная карточка, на мобильном стоит первой */}
            <div className="sm:order-2">
              <RoleCard
                icon={<ShoppingCartOutlined />}
                title="Пользователь"
                tagline="Лучшие товары в садоводе"
                gradient="from-amber-400 via-orange-500 to-rose-500"
                onClick={() => setFlow({ step: "buyer" })}
                featured
                enterDelay="0.05s"
              />
            </div>

            {/* Боковые карточки: на мобильном — рядом (2 колонки), на десктопе — sm:contents убирает обёртку из потока */}
            <div className="grid grid-cols-2 gap-3 sm:contents">
              {/* Посредник */}
              <div className="sm:order-1">
                <RoleCard
                  icon={<TeamOutlined />}
                  title="Посредник"
                  tagline="Зарабатывайте на заказах"
                  gradient="from-fuchsia-500 via-rose-500 to-orange-400"
                  onClick={() => (window.location.href = "/mediator")}
                  external
                  enterDelay="0.18s"
                />
              </div>

              {/* Поставщик */}
              <div className="sm:order-3">
                <RoleCard
                  icon={<ShopOutlined />}
                  title="Поставщик"
                  tagline="Продавайте на платформе"
                  gradient="from-slate-700 via-slate-600 to-zinc-500"
                  onClick={() => (window.location.href = "/seller")}
                  external
                  enterDelay="0.28s"
                />
              </div>
            </div>
          </div>

          <p
            className="text-sm text-muted fade-in-up"
            style={{ animationDelay: "0.5s" }}
          >
            Уже есть аккаунт?{" "}
            <Link href="/login" className="text-amber-700 hover:underline font-semibold">
              Войти
            </Link>
          </p>
        </div>
      </main>
    );
  }

  /* ── GENDER SELECT ───────────────────────────────────────────────── */
  if (flow.step === "gender") {
    return <GenderSelect accessToken={flow.accessToken} userId={flow.userId} />;
  }

  /* ── BUYER REGISTRATION ──────────────────────────────────────────── */
  const brandHeadline: Record<BuyerAuthMethod, string> = {
    vk:    "Войдите в один клик",
    max:   "Быстрый вход через MAX",
    phone: "Один код — и вы внутри",
    email: "Email и пароль — классика",
  };

  return (
    <main className="relative min-h-screen flex flex-col items-center justify-center px-3 sm:px-5 py-6 sm:py-10 overflow-hidden bg-gradient-to-br from-stone-50 via-amber-50/40 to-orange-50/30">
      <BubbleBg subtle />

      {/* Назад — absolute top-left на мобильном, скрыт на desktop (там в AuthBrandPanel) */}
      <button
        type="button"
        onClick={() => { setFlow({ step: "role" }); setMethod("vk"); }}
        className="absolute top-4 left-4 z-20 lg:hidden inline-flex items-center gap-1.5 px-3 py-2 rounded-2xl bg-white/80 backdrop-blur border border-border shadow-sm text-sm font-medium text-muted hover:text-foreground transition-all fade-in-up"
        style={{ animationDelay: "0s" }}
      >
        <ArrowLeftOutlined style={{ fontSize: 11 }} />
        Назад
      </button>

      <div className="relative w-full max-w-5xl grid lg:grid-cols-[1.05fr_1fr] gap-4 sm:gap-6 items-stretch z-10">
        <AuthBrandPanel
          variant="buyer"
          badge="Покупатель"
          headline={brandHeadline[method]}
          onBack={() => { setFlow({ step: "role" }); setMethod("vk"); }}
        />

        <Card
          className="!rounded-2xl sm:!rounded-3xl !border-border !shadow-xl fade-in-up"
          styles={{ body: { padding: "16px" } }}
          style={{ animationDelay: "0.1s" }}
        >
          <div
            className="fade-in-up"
            style={{ animationDelay: "0.2s" }}
          >
            <Typography.Title level={3} className="!mb-4 !text-lg sm:!text-xl !text-center">
              Создать аккаунт
            </Typography.Title>
          </div>

          <div className="fade-in-up" style={{ animationDelay: "0.3s" }}>
            <MethodCircles selected={method} onChange={setMethod} />
          </div>

          <div className="fade-in-up" style={{ animationDelay: "0.4s" }}>
            {method === "vk"    && <VkFlow           context="register" onDone={handleDone} />}
            {method === "max"   && <MaxFlow           onDone={handleDone} />}
            {method === "phone" && <RegisterPhoneForm onDone={handleDone} />}
            {method === "email" && <RegisterEmailForm onDone={handleDone} />}
          </div>

          <div className="mt-4 pt-3 border-t border-border fade-in-up" style={{ animationDelay: "0.5s" }}>
            <p className="text-center text-xs text-muted">
              Уже есть аккаунт?{" "}
              <Link href="/login" className="text-amber-700 hover:underline font-semibold">Войти</Link>
            </p>
          </div>
        </Card>
      </div>
    </main>
  );
}

/* ── Glass bubble background ──────────────────────────────────────── */

function BubbleBg({ subtle = false }: { subtle?: boolean }) {
  const op = subtle ? 0.35 : 0.55;
  const bubbles = [
    { size: 480, style: { left: -110, top: -130 }, color: "245,158,11", anim: "drift-a", delay: "0s",   blur: 2  },
    { size: 380, style: { right: -90,  top: -70  }, color: "244,114,182", anim: "drift-b", delay: "3s",   blur: 1.5},
    { size: 300, style: { left: "5%",  bottom: -50}, color: "251,191,36",  anim: "drift-b", delay: "7s",   blur: 2  },
    { size: 240, style: { right: "9%", bottom: "14%"}, color: "249,115,22",anim: "drift-c", delay: "4s",   blur: 0  },
    { size: 190, style: { left: "43%", top: "58%" }, color: "251,146,60",  anim: "drift-a", delay: "9s",   blur: 1  },
    { size: 150, style: { right: "27%",top: "6%"  }, color: "253,186,116", anim: "drift-c", delay: "1.5s", blur: 0  },
  ];
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden style={{ opacity: op }}>
      {bubbles.map((b, i) => (
        <div
          key={i}
          className={`absolute rounded-full ${b.anim}`}
          style={{
            width: b.size, height: b.size,
            ...(b.style as React.CSSProperties),
            animationDelay: b.delay,
            filter: b.blur ? `blur(${b.blur}px)` : undefined,
            background: [
              "radial-gradient(circle at 34% 28%, rgba(255,255,255,0.9) 0%, rgba(255,255,255,0.55) 10%, transparent 32%)",
              "radial-gradient(circle at 66% 70%, rgba(0,0,0,0.05) 0%, transparent 28%)",
              `radial-gradient(circle at 50% 50%, rgba(${b.color},0.18) 0%, rgba(${b.color},0.06) 55%, transparent 78%)`,
            ].join(", "),
          }}
        >
          <div
            className="absolute inset-0 rounded-full"
            style={{ border: `1px solid rgba(${b.color},0.16)`, boxShadow: `inset 0 0 32px rgba(${b.color},0.06)` }}
          />
        </div>
      ))}
    </div>
  );
}

/* ── Role card ────────────────────────────────────────────────────── */

interface RoleCardProps {
  icon: React.ReactNode;
  title: string;
  tagline: string;
  gradient: string;
  onClick: () => void;
  featured?: boolean;
  external?: boolean;
  enterDelay?: string;
}

/* ── Drum / slot-machine counter ─────────────────────────────────────── */
function DrumNumber({ to, delay = 0 }: { to: number; delay?: number }) {
  const ceiling = Math.max(to, 99);
  const [val, setVal] = useState(0);

  useEffect(() => {
    let raf: number;
    const tid = setTimeout(() => {
      const TOTAL = 1700;
      const SETTLE = 0.62;
      const t0 = performance.now();

      const tick = (now: number) => {
        const p = Math.min((now - t0) / TOTAL, 1);
        if (p < SETTLE) {
          setVal(Math.floor(Math.random() * (ceiling + 1)));
        } else {
          const q = (p - SETTLE) / (1 - SETTLE);
          const eased = 1 - Math.pow(1 - q, 3);
          setVal(Math.round(eased * to));
        }
        if (p < 1) raf = requestAnimationFrame(tick);
        else setVal(to);
      };

      raf = requestAnimationFrame(tick);
    }, delay);

    return () => { clearTimeout(tid); cancelAnimationFrame(raf); };
  }, [to, delay, ceiling]);

  return <>{val.toLocaleString("ru-RU").replace(/\s/g, ".")}</>;
}

const PARTICLES = [
  { cls: "float-ptcl-a", left: "8%",  top: "14%", s: 5, d: "0s"   },
  { cls: "float-ptcl-b", left: "80%", top: "16%", s: 4, d: "0.8s" },
  { cls: "float-ptcl-c", left: "18%", top: "76%", s: 4, d: "0.4s" },
  { cls: "float-ptcl-a", left: "72%", top: "70%", s: 7, d: "1.2s" },
  { cls: "float-ptcl-b", left: "50%", top: "88%", s: 3, d: "0.6s" },
  { cls: "float-ptcl-c", left: "34%", top: "22%", s: 3, d: "1.8s" },
];

function RoleCard({
  icon, title, tagline, gradient, onClick,
  featured = false, external = false, enterDelay = "0s",
}: RoleCardProps) {
  const [hovered, setHovered] = useState(false);
  const [ripple, setRipple]   = useState<{ x: number; y: number; key: number } | null>(null);

  function handleMouseLeave() { setHovered(false); }
  function handleClick(e: React.MouseEvent) {
    const r = e.currentTarget.getBoundingClientRect();
    setRipple({ x: e.clientX - r.left, y: e.clientY - r.top, key: Date.now() });
    setTimeout(() => setRipple(null), 750);
    onClick();
  }

  /* ── HERO / FEATURED CARD (Покупатель) ────────────────────────────── */
  if (featured) {
    return (
      <div
        className="card-slide-in w-full"
        style={{ animationDelay: enterDelay, position: "relative", zIndex: hovered ? 20 : 2 }}
      >
        <button
          type="button"
          onClick={handleClick}
          onMouseLeave={handleMouseLeave}
          onMouseEnter={() => setHovered(true)}
          className="group relative w-full rounded-[24px] sm:rounded-[36px] overflow-hidden cursor-pointer select-none block min-h-[270px] sm:min-h-[460px]"
          style={{
              borderRadius: "36px",
              overflow: "hidden",
              isolation: "isolate",
              transform: `scale(${hovered ? 1.025 : 1}) translateY(${hovered ? -8 : 0}px)`,
              transition: hovered
                ? "transform 0.18s cubic-bezier(0.22,1,0.36,1), box-shadow 0.2s"
                : "transform 0.4s cubic-bezier(0.34,1.56,0.64,1), box-shadow 0.35s",
              boxShadow: hovered
                ? "0 40px 80px -12px rgba(120,80,20,0.35)"
                : "0 20px 50px -10px rgba(120,80,20,0.22)",
            }}
          >
            {/* Base gradient */}
            <div className={`absolute inset-0 bg-gradient-to-br ${gradient}`} />

            {/* Radial top shine */}
            <div
              className="absolute inset-0"
              style={{ background: "radial-gradient(ellipse at 50% -5%, rgba(255,255,255,0.38) 0%, transparent 52%)" }}
            />

            {/* Dot mesh */}
            <div
              className="absolute inset-0 opacity-[0.11]"
              style={{
                backgroundImage: "radial-gradient(rgba(255,255,255,1) 1px, transparent 1px)",
                backgroundSize: "22px 22px",
              }}
            />

            {/* Concentric decorative rings — top-right */}
            <div className="absolute -top-20 -right-20 w-72 h-72 rounded-full border border-white/10" />
            <div className="absolute -top-12 -right-12 w-52 h-52 rounded-full border border-white/[0.07]" />
            <div className="absolute -top-5  -right-5  w-36 h-36 rounded-full border border-white/[0.05]" />

            {/* Floating particles */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
              {PARTICLES.map((p, i) => (
                <div
                  key={i}
                  className={`absolute rounded-full bg-white ${p.cls}`}
                  style={{ left: p.left, top: p.top, width: p.s, height: p.s, opacity: 0.48, animationDelay: p.d }}
                />
              ))}
            </div>

            {/* Ripple */}
            {ripple && <span key={ripple.key} className="ripple-click" style={{ left: ripple.x, top: ripple.y }} />}

            {/* ── Content ── */}
            <div className="relative flex flex-col items-center justify-center text-white text-center gap-2 sm:gap-4 px-4 sm:px-8 pt-9 pb-14 sm:pt-12 sm:pb-16 min-h-[270px] sm:min-h-[460px] rounded-[24px] sm:rounded-[36px]" style={{ borderRadius: "36px" }}>

              {/* Top badge */}
              <div className="absolute top-4 inset-x-0 flex justify-center">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/20 backdrop-blur-sm border border-white/30 text-[11px] font-bold tracking-wide">
                  <StarFilled style={{ fontSize: 9 }} />
                  Популярный выбор
                </span>
              </div>

              {/* Icon */}
              <div
                className="relative flex items-center justify-center w-12 h-12 sm:w-20 sm:h-20 rounded-xl sm:rounded-3xl bg-white/20 backdrop-blur-sm border border-white/30"
                style={{ boxShadow: "0 0 44px rgba(255,255,255,0.18), 0 8px 24px rgba(0,0,0,0.2)" }}
              >
                <span className="text-[22px] sm:text-[38px] flex items-center justify-center leading-none">
                  {icon}
                </span>
                {hovered && <div className="absolute -inset-1.5 rounded-3xl border-2 border-white/35 pop-in" />}
              </div>

              {/* Title & tagline */}
              <div className="space-y-2">
                <div className="text-[18px] sm:text-[28px] font-black tracking-tight leading-tight">
                  {title}
                </div>
                <div className="text-white/80 text-xs sm:text-sm leading-snug max-w-[180px] mx-auto">
                  {tagline}
                </div>
              </div>

              {/* CTA */}
              <div className="pulse-ring px-4 sm:px-7 py-2 sm:py-2.5 bg-white text-amber-600 rounded-full text-[11px] sm:text-sm font-extrabold shadow-xl shadow-amber-900/15 group-hover:bg-amber-50 transition-colors whitespace-nowrap">
                Зарегистрироваться →
              </div>

              {/* Bottom stats */}
              <div className="absolute bottom-0 left-0 right-0 px-6 sm:px-8 pb-2.5 sm:pb-4 flex items-center justify-evenly">
                <div className="text-center">
                  <div className="text-white font-bold text-xs sm:text-sm tabular-nums">
                    <DrumNumber to={548} delay={500} />
                  </div>
                  <div className="text-white/50 text-[9px] uppercase tracking-wide">пользователей</div>
                </div>
                <div className="h-5 w-px bg-white/20" />
                <div className="text-center">
                  <div className="text-white font-bold text-sm">✔</div>
                  <div className="text-white/50 text-[9px] uppercase tracking-wide leading-tight max-w-[60px] mx-auto">Проверка качества</div>
                </div>
                <div className="h-5 w-px bg-white/20" />
                <div className="text-center">
                  <div className="text-white font-bold text-xs sm:text-sm tabular-nums">
                    <DrumNumber to={10000} delay={700} />
                  </div>
                  <div className="text-white/50 text-[9px] uppercase tracking-wide">товаров</div>
                </div>
              </div>

            </div>
        </button>
      </div>
    );
  }

  /* ── SIDE CARD (Посредник / Поставщик) ────────────────────────────── */
  return (
    <div
      className="card-slide-in w-full"
      style={{ animationDelay: enterDelay, position: "relative", zIndex: hovered ? 20 : 1 }}
    >
      <button
        type="button"
        onClick={handleClick}
        onMouseLeave={handleMouseLeave}
        onMouseEnter={() => setHovered(true)}
        className="group relative w-full rounded-[20px] sm:rounded-[32px] overflow-hidden cursor-pointer select-none block min-h-[120px] sm:min-h-[340px]"
        style={{
          borderRadius: "32px",
          overflow: "hidden",
          isolation: "isolate",
          transform: `scale(${hovered ? 1.03 : 1}) translateY(${hovered ? -6 : 0}px)`,
          transition: hovered
            ? "transform 0.18s cubic-bezier(0.22,1,0.36,1), box-shadow 0.2s"
            : "transform 0.4s cubic-bezier(0.34,1.56,0.64,1), box-shadow 0.35s",
          boxShadow: hovered
            ? "0 20px 40px -8px rgba(0,0,0,0.20)"
            : "0 6px 22px -6px rgba(0,0,0,0.12)",
        }}
      >
        {/* Background gradient */}
        <div className={`absolute inset-0 bg-gradient-to-br ${gradient}`} />

        {/* Radial top highlight */}
        <div
          className="absolute inset-0"
          style={{ background: "radial-gradient(ellipse at 50% 0%, rgba(255,255,255,0.22) 0%, transparent 50%)" }}
        />

        {/* Dot mesh */}
        <div
          className="absolute inset-0 opacity-[0.07]"
          style={{
            backgroundImage: "radial-gradient(rgba(255,255,255,1) 1px, transparent 1px)",
            backgroundSize: "18px 18px",
          }}
        />

        {/* Decorative bottom-right rings */}
        <div className="absolute -bottom-10 -right-10 w-40 h-40 rounded-full border border-white/15" />
        <div className="absolute -bottom-5  -right-5  w-24 h-24 rounded-full border border-white/10" />

        {/* Diagonal accent lines top-right */}
        <div className="absolute top-0 right-0 w-20 h-20 overflow-hidden">
          <div className="absolute top-2 right-2  h-20 bg-white/[0.16] rotate-[38deg] origin-top-right" style={{ width: "1.5px" }} />
          <div className="absolute top-2 right-6  h-16 bg-white/[0.10] rotate-[38deg] origin-top-right" style={{ width: "1px" }} />
          <div className="absolute top-2 right-10 h-12 bg-white/[0.07] rotate-[38deg] origin-top-right" style={{ width: "1px" }} />
        </div>

        {/* Ripple */}
        {ripple && <span key={ripple.key} className="ripple-click" style={{ left: ripple.x, top: ripple.y }} />}

        {/* Content */}
        <div className="relative flex flex-col items-center justify-center text-white text-center gap-1.5 sm:gap-3 px-2.5 sm:px-5 pt-3 pb-5 sm:pt-5 sm:pb-9 min-h-[120px] sm:min-h-[340px] rounded-[20px] sm:rounded-[32px]" style={{ borderRadius: "32px" }}>

          {/* Icon */}
          <div
            className="flex items-center justify-center w-8 h-8 sm:w-14 sm:h-14 rounded-lg sm:rounded-2xl bg-white/20 backdrop-blur-sm border border-white/25"
            style={{ boxShadow: "0 0 22px rgba(255,255,255,0.12), 0 4px 14px rgba(0,0,0,0.2)" }}
          >
            <span className="text-[16px] sm:text-[26px] flex items-center justify-center leading-none">
              {icon}
            </span>
          </div>

          {/* Text */}
          <div className="space-y-1 sm:space-y-1.5">
            <div className="text-[13px] sm:text-[20px] font-black tracking-tight leading-tight">
              {title}
            </div>
            <div className="text-white/75 text-[9px] sm:text-xs leading-snug max-w-[100px] sm:max-w-[145px] mx-auto">
              {tagline}
            </div>
            {external && (
              <div className="text-white/45 text-[9px] sm:text-[11px] mt-0.5">
                Отдельная платформа ↗
              </div>
            )}
          </div>

          {/* Arrow */}
          <div className="absolute bottom-2 right-3 sm:bottom-4 sm:right-5 text-white/35 group-hover:text-white/65 transition-colors text-xs sm:text-base font-medium">
            {external ? "↗" : "→"}
          </div>

        </div>
      </button>
    </div>
  );
}
