"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Store, ShoppingBag, TrendingUp, Users,
  Shield, ChevronRight, CheckCircle2, Package,
  MapPin, Zap,
} from "lucide-react";
import { isAuthed } from "@/lib/auth";

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
  useEffect(() => { if (isAuthed()) router.replace("/dashboard"); }, [router]);
  useScrollReveal();

  return (
    <div className="min-h-screen bg-background flex flex-col">

      {/* ── Navbar ── */}
      <header className="sticky top-0 z-40 bg-background/95 backdrop-blur border-b border-border">
        <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-primary flex items-center justify-center">
              <Store className="w-4 h-4 text-white" />
            </div>
            <span className="font-bold text-base tracking-tight">GloBox Seller</span>
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
          Платформа для поставщиков рынка Садовод
        </div>
        <h1 className="text-4xl sm:text-5xl font-black tracking-tight text-foreground leading-tight mb-4">
          Продавайте больше<br />
          <span className="text-primary">с GloBox Seller</span>
        </h1>
        <p className="text-lg text-muted max-w-xl mx-auto mb-8">
          Подключитесь к платформе GloBox и получайте заказы от покупателей через проверенных посредников. Без лишних хлопот — только продажи.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link
            href="/register"
            className="inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl bg-primary text-white font-bold text-sm hover:bg-primary-hover transition active:scale-[0.98]"
          >
            <ShoppingBag className="w-4 h-4" />
            Зарегистрироваться бесплатно
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
            { value: "10 000+", label: "Покупателей на платформе" },
            { value: "500+",    label: "Активных посредников" },
            { value: "24/7",    label: "Приём заказов" },
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
        <h2 className="text-2xl font-bold text-center mb-2">Почему выбирают GloBox Seller</h2>
        <p className="text-muted text-center mb-8 text-sm">Всё что нужно поставщику — в одном месте</p>
        <div className="reveal-stagger grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[
            { icon: TrendingUp, color: "#6366f1", bg: "#eef2ff", title: "Больше продаж", desc: "Ваши товары видят тысячи покупателей через сеть посредников GloBox" },
            { icon: Users,      color: "#16a34a", bg: "#f0fdf4", title: "Сеть посредников", desc: "Посредники выкупают ваш товар напрямую на рынке — вам не нужно ничего доставлять" },
            { icon: Shield,     color: "#0891b2", bg: "#ecfeff", title: "Безопасные сделки", desc: "Все операции проходят через платформу. Оплата гарантирована." },
            { icon: Package,    color: "#d97706", bg: "#fffbeb", title: "Удобный каталог", desc: "Добавляйте товары с фото, ценой и описанием. Покупатели находят вас сами." },
            { icon: MapPin,     color: "#7c3aed", bg: "#f5f3ff", title: "Точный адрес", desc: "Указываете номер павильона — посредник точно найдёт ваш стенд на рынке." },
            { icon: Zap,        color: "#dc2626", bg: "#fef2f2", title: "Быстрый старт", desc: "Регистрация занимает 5 минут. Первый заказ можно получить в тот же день." },
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
          <p className="text-muted text-center text-sm mb-10">Четыре шага до первого заказа</p>
          <div className="space-y-4">
            {[
              { n: "01", title: "Регистрация аккаунта", desc: "Создайте аккаунт: укажите имя, телефон и email. Это займёт 2 минуты." },
              { n: "02", title: "Верификация", desc: "Заполните данные торговой точки: адрес, павильон, форму деятельности, категории товаров и документы." },
              { n: "03", title: "Одобрение", desc: "Администратор проверяет заявку (до 24 часов) и открывает вам доступ к каталогу товаров." },
              { n: "04", title: "Получайте заказы", desc: "Добавляйте товары в каталог. Покупатели находят их через посредников и оформляют заказы." },
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

      {/* ── Requirements ── */}
      <section className="reveal max-w-3xl mx-auto px-4 py-14">
        <h2 className="text-2xl font-bold text-center mb-2">Кто может зарегистрироваться</h2>
        <p className="text-muted text-center text-sm mb-8">Мы работаем с поставщиками с рынка Садовод</p>
        <div className="reveal-stagger grid sm:grid-cols-2 gap-3">
          {[
            "Физические лица, торгующие на рынке",
            "Самозанятые (НПД)",
            "Индивидуальные предприниматели (ИП)",
            "ООО и другие юридические лица",
            "Поставщики с действующим пропуском на рынок",
            "Наличие товаров в наличии на рынке",
          ].map(r => (
            <div key={r} className="flex items-center gap-3 p-3.5 rounded-xl border border-border bg-background">
              <CheckCircle2 className="w-4 h-4 text-success shrink-0" />
              <span className="text-sm">{r}</span>
            </div>
          ))}
        </div>
      </section>

      {/* ── Final CTA ── */}
      <section className="reveal bg-primary text-white py-14 px-4">
        <div className="max-w-xl mx-auto text-center">
          <h2 className="text-2xl font-black mb-3">Готовы начать?</h2>
          <p className="text-white/70 text-sm mb-8">Регистрация бесплатна. Первый заказ — уже сегодня.</p>
          <Link
            href="/register"
            className="inline-flex items-center justify-center gap-2 px-8 py-4 rounded-xl bg-white text-primary font-bold text-sm hover:bg-white/90 transition active:scale-[0.98]"
          >
            <ShoppingBag className="w-4 h-4" />
            Зарегистрироваться бесплатно
          </Link>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="border-t border-border py-8 px-4">
        <div className="max-w-5xl mx-auto">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-primary flex items-center justify-center">
                <Store className="w-3.5 h-3.5 text-white" />
              </div>
              <span className="font-bold text-sm">GloBox Seller</span>
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
