"use client";

import Link from "next/link";
import { SiteHeader } from "@/widgets/header";

const PORTALS = [
  {
    title: "Маркетплейс",
    desc: "Каталог товаров, корзина, заказы, избранное",
    href: "/",
    icon: "🛒",
    color: "from-amber-500 to-orange-500",
    internal: true,
  },
  {
    title: "Кабинет поставщика",
    desc: "Управление товарами, статистика, поддержка",
    href: "https://seller-blush-ten.vercel.app",
    icon: "🏪",
    color: "from-emerald-500 to-teal-500",
  },
  {
    title: "Кабинет посредника",
    desc: "Заказы от покупателей, настройки комиссии",
    href: "https://mediator-khaki.vercel.app",
    icon: "🤝",
    color: "from-sky-500 to-blue-500",
  },
  {
    title: "Админ-панель",
    desc: "Модерация заявок, статистика, поддержка",
    href: "https://admin-iota-eosin-32.vercel.app",
    icon: "⚙️",
    color: "from-violet-500 to-purple-500",
  },
];

export default function PortalsPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-stone-50 via-amber-50/40 to-orange-50/30">
      <SiteHeader />

      <main className="max-w-4xl mx-auto px-4 py-12">
        <div className="text-center mb-10">
          <h1 className="text-3xl font-extrabold tracking-tight text-foreground">
            GloBox — Все панели
          </h1>
          <p className="text-muted mt-2 text-sm">
            Выберите нужный раздел для перехода
          </p>
        </div>

        <div className="grid sm:grid-cols-2 gap-5">
          {PORTALS.map((p) => (
            <a
              key={p.title}
              href={p.internal ? p.href : p.href}
              target={p.internal ? undefined : "_blank"}
              rel={p.internal ? undefined : "noopener noreferrer"}
              className="group block bg-white rounded-2xl border border-border shadow-sm hover:shadow-lg hover:-translate-y-0.5 transition-all overflow-hidden"
            >
              {/* Color strip */}
              <div className={`h-1.5 bg-gradient-to-r ${p.color}`} />

              <div className="p-5">
                <div className="flex items-start gap-4">
                  <span className="text-3xl shrink-0">{p.icon}</span>
                  <div className="flex-1 min-w-0">
                    <h2 className="font-bold text-lg text-foreground group-hover:text-primary transition">
                      {p.title}
                    </h2>
                    <p className="text-sm text-muted mt-0.5">{p.desc}</p>
                  </div>
                  <svg
                    className="w-5 h-5 text-muted group-hover:text-primary transition shrink-0 mt-1"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <path d="M9 18l6-6-6-6" />
                  </svg>
                </div>

              </div>
            </a>
          ))}
        </div>

        <p className="text-center text-xs text-muted mt-8">
          © {new Date().getFullYear()} GloBox. Все права защищены.
        </p>
      </main>
    </div>
  );
}
