"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Zap, TrendingUp, Shield, Clock,
  Package, Users, MapPin, Smartphone,
  ChevronRight, CheckCircle2, ShoppingBag,
  Wallet,
} from "lucide-react";
import { getToken } from "@/lib/auth";

function useScrollReveal() {
  useEffect(() => {
    const els = document.querySelectorAll<HTMLElement>(".reveal, .reveal-stagger");
    const io = new IntersectionObserver(
      entries => entries.forEach(e => {
        if (e.isIntersecting) { e.target.classList.add("in-view"); io.unobserve(e.target); }
      }),
      { threshold: 0.1 }
    );
    els.forEach(el => io.observe(el));
    return () => io.disconnect();
  }, []);
}

export default function LandingPage() {
  const router = useRouter();
  useEffect(() => { if (getToken()) router.replace("/dashboard"); }, [router]);
  useScrollReveal();

  return (
    <div className="min-h-screen bg-background flex flex-col">

      {/* ── Navbar ── */}
      <header className="sticky top-0 z-40 bg-background/95 backdrop-blur border-b border-border">
        <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-primary flex items-center justify-center">
              <Zap className="w-4 h-4 text-white" />
            </div>
            <span className="font-bold text-base tracking-tight">GloBox Посредник</span>
          </div>
          <div className="flex items-center gap-2">
            <Link href="/login" className="text-sm px-3 py-1.5 rounded-lg text-muted hover:text-foreground hover:bg-accent transition">
              Войти
            </Link>
            <Link href="/register" className="text-sm px-4 py-2 rounded-xl bg-primary text-white font-semibold hover:bg-primary-hover transition active:scale-[0.98]">
              Начать
            </Link>
          </div>
        </div>
      </header>

      {/* ── Hero ── */}
      <section className="reveal max-w-5xl mx-auto px-4 pt-16 pb-12 text-center">
        <div className="inline-flex items-center gap-2 text-xs font-semibold px-3 py-1.5 rounded-full mb-6 bg-primary/8 text-primary border border-primary/15">
          <Zap className="w-3.5 h-3.5" />
          Работа на рынке Садовод
        </div>
        <h1 className="text-4xl sm:text-5xl font-black tracking-tight text-foreground leading-tight mb-4">
          Выкупай товары —<br />
          <span className="text-primary">зарабатывай каждый день</span>
        </h1>
        <p className="text-lg text-muted max-w-xl mx-auto mb-8">
          Покупатели заказывают товары с рынка Садовод, а вы выкупаете их и получаете комиссию с каждой сделки. Свободный график, стабильный доход.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link
            href="/register"
            className="inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl bg-primary text-white font-bold text-sm hover:bg-primary-hover transition active:scale-[0.98]"
          >
            <Wallet className="w-4 h-4" />
            Стать посредником
          </Link>
          <Link
            href="/login"
            className="inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl border border-border font-semibold text-sm hover:bg-accent transition active:scale-[0.98]"
          >
            Уже есть аккаунт
            <ChevronRight className="w-4 h-4 text-muted" />
          </Link>
        </div>
      </section>

      {/* ── Stats ── */}
      <section className="reveal bg-card border-y border-border py-8">
        <div className="max-w-5xl mx-auto px-4 grid grid-cols-3 gap-6 text-center">
          {[
            { value: "5 000+", label: "Выполненных заказов" },
            { value: "от 15%", label: "Комиссия с заказа" },
            { value: "24/7",   label: "Поток заказов" },
          ].map(s => (
            <div key={s.label}>
              <p className="text-2xl sm:text-3xl font-black text-foreground">{s.value}</p>
              <p className="text-xs sm:text-sm text-muted mt-1">{s.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Benefits ── */}
      <section className="reveal max-w-5xl mx-auto px-4 py-14">
        <h2 className="text-2xl font-bold text-center mb-2">Почему выбирают GloBox</h2>
        <p className="text-muted text-center mb-8 text-sm">Всё что нужно посреднику — в одном приложении</p>
        <div className="reveal-stagger grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[
            { icon: Clock,       color: "#6366f1", bg: "#eef2ff", title: "Свободный график",    desc: "Работайте когда удобно. Включайте режим «онлайн» только тогда, когда готовы принимать заказы." },
            { icon: TrendingUp,  color: "#16a34a", bg: "#f0fdf4", title: "Стабильный доход",    desc: "Каждый выкупленный заказ приносит комиссию. Больше заказов в день — больше заработок." },
            { icon: Shield,      color: "#0891b2", bg: "#ecfeff", title: "Без вложений",        desc: "Покупатель оплачивает товар напрямую. Ваша задача — только выкупить и передать заказ." },
            { icon: Package,     color: "#d97706", bg: "#fffbeb", title: "Простая работа",      desc: "Получаете заказ, идёте на рынок, выкупаете товар, передаёте покупателю. Всё через приложение." },
            { icon: Users,       color: "#7c3aed", bg: "#f5f3ff", title: "Поддержка команды",  desc: "Служба поддержки поможет в любой ситуации с заказом, покупателем или оплатой." },
            { icon: Zap,         color: "#dc2626", bg: "#fef2f2", title: "Быстрый старт",      desc: "Регистрация за 5 минут. После верификации сразу принимайте первые заказы." },
          ].map(b => {
            const Icon = b.icon;
            return (
              <div key={b.title} className="rounded-2xl border border-border p-5 bg-background hover:shadow-sm transition">
                <div className="w-11 h-11 rounded-xl flex items-center justify-center mb-3" style={{ background: b.bg }}>
                  <Icon className="w-5 h-5" style={{ color: b.color }} />
                </div>
                <p className="font-bold text-sm mb-1">{b.title}</p>
                <p className="text-xs text-muted leading-relaxed">{b.desc}</p>
              </div>
            );
          })}
        </div>
      </section>

      {/* ── How it works ── */}
      <section className="reveal bg-card border-y border-border py-14">
        <div className="max-w-3xl mx-auto px-4">
          <h2 className="text-2xl font-bold text-center mb-2">Как это работает</h2>
          <p className="text-muted text-center text-sm mb-10">Четыре шага до первого заработка</p>
          <div className="space-y-4">
            {[
              { n: "01", title: "Регистрация",      desc: "Создайте аккаунт: укажите имя, телефон и email. Это займёт 2 минуты." },
              { n: "02", title: "Верификация",       desc: "Заполните данные о себе и прикрепите фото пропуска на рынок Садовод. Администратор проверит заявку." },
              { n: "03", title: "Включите онлайн",   desc: "Когда готовы работать, нажмите кнопку «Онлайн» в приложении — заказы начнут поступать автоматически." },
              { n: "04", title: "Выкупайте и зарабатывайте", desc: "Принимайте заказы, выкупайте товар на рынке, передавайте покупателю и получайте комиссию." },
            ].map((step, i) => (
              <div key={step.n} className="flex items-start gap-4 p-4 rounded-2xl bg-background border border-border">
                <div className="w-10 h-10 rounded-full bg-primary text-white font-black text-sm flex items-center justify-center shrink-0">
                  {step.n}
                </div>
                <div>
                  <p className="font-bold text-sm">{step.title}</p>
                  <p className="text-xs text-muted mt-1 leading-relaxed">{step.desc}</p>
                </div>
                {i < 3 && <ChevronRight className="w-4 h-4 text-muted/30 shrink-0 ml-auto mt-1 hidden sm:block" />}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Earnings ── */}
      <section className="reveal max-w-3xl mx-auto px-4 py-14 w-full">
        <h2 className="text-2xl font-bold text-center mb-2">Сколько можно заработать</h2>
        <p className="text-muted text-center text-sm mb-8">Пример расчёта при среднем заказе 3 000 ₽</p>
        <div className="reveal-stagger grid sm:grid-cols-3 gap-4">
          {[
            { label: "5 заказов в день",  value: "≈ 2 250 ₽",  note: "при 15% комиссии",  color: "#6366f1", bg: "#eef2ff" },
            { label: "10 заказов в день", value: "≈ 4 500 ₽",  note: "при 15% комиссии",  color: "#16a34a", bg: "#f0fdf4" },
            { label: "20 заказов в день", value: "≈ 9 000 ₽",  note: "при 15% комиссии",  color: "#d97706", bg: "#fffbeb" },
          ].map(e => (
            <div key={e.label} className="rounded-2xl border border-border p-5 text-center bg-background">
              <div className="w-12 h-12 rounded-xl flex items-center justify-center mx-auto mb-3" style={{ background: e.bg }}>
                <Wallet className="w-6 h-6" style={{ color: e.color }} />
              </div>
              <p className="text-xl font-black text-foreground">{e.value}</p>
              <p className="text-xs font-semibold text-foreground/70 mt-1">{e.label}</p>
              <p className="text-[10px] text-muted mt-1">{e.note}</p>
            </div>
          ))}
        </div>
        <p className="text-center text-xs text-muted mt-4">Реальный заработок зависит от количества заказов и договорённостей с покупателем.</p>
      </section>

      {/* ── Requirements ── */}
      <section className="reveal bg-card border-y border-border py-14 px-4">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-2xl font-bold text-center mb-2">Кто может стать посредником</h2>
          <p className="text-muted text-center text-sm mb-8">Основные требования для регистрации</p>
          <div className="reveal-stagger grid sm:grid-cols-2 gap-3">
            {[
              "Действующий пропуск на рынок Садовод",
              "Мобильный телефон с доступом в интернет",
              "Возраст от 18 лет",
              "Готовность работать на рынке регулярно",
              "Ответственность и честность в сделках",
              "Базовые навыки общения с покупателями",
            ].map(r => (
              <div key={r} className="flex items-center gap-3 p-3.5 rounded-xl border border-border bg-background">
                <CheckCircle2 className="w-4 h-4 text-success shrink-0" />
                <span className="text-sm">{r}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Final CTA ── */}
      <section className="reveal bg-primary text-white py-14 px-4">
        <div className="max-w-xl mx-auto text-center">
          <h2 className="text-2xl font-black mb-3">Готовы начать зарабатывать?</h2>
          <p className="text-white/70 text-sm mb-8">Регистрация бесплатна. Первый заказ — уже сегодня.</p>
          <Link
            href="/register"
            className="inline-flex items-center justify-center gap-2 px-8 py-4 rounded-xl bg-white text-primary font-bold text-sm hover:bg-white/90 transition active:scale-[0.98]"
          >
            <Wallet className="w-4 h-4" />
            Стать посредником
          </Link>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="border-t border-border py-8 px-4">
        <div className="max-w-5xl mx-auto">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-primary flex items-center justify-center">
                <Zap className="w-3.5 h-3.5 text-white" />
              </div>
              <span className="font-bold text-sm">GloBox Посредник</span>
            </div>
            <div className="flex items-center gap-4 text-xs text-muted">
              <Link href="/terms"   className="hover:text-foreground transition">Условия использования</Link>
              <Link href="/privacy" className="hover:text-foreground transition">Политика конфиденциальности</Link>
              <a href="mailto:web14329@gmail.com" className="hover:text-foreground transition">Поддержка</a>
            </div>
          </div>
          <p className="text-center text-xs text-muted mt-6">
            © {new Date().getFullYear()} GloBox. Все права защищены.
          </p>
        </div>
      </footer>
    </div>
  );
}
