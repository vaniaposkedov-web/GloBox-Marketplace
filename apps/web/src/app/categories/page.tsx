"use client";

import Link from "next/link";
import { Suspense, useEffect, useState } from "react";
import { Card, Input, Skeleton, Tag } from "antd";
import { SearchOutlined, RightOutlined } from "@ant-design/icons";
import { SiteHeader } from "@/widgets/header";
import { fetchCategories, fetchListings } from "@/features/catalog";
import type { CategoryDto } from "@/shared/lib";

const CATEGORY_VISUALS: Record<string, { emoji: string; accent: string; tag: string }> = {
  women: { emoji: "👗", accent: "text-rose-500", tag: "Стиль" },
  men: { emoji: "👔", accent: "text-fuchsia-600", tag: "Классика" },
  beauty: { emoji: "💄", accent: "text-pink-500", tag: "Уход" },
  electronics: { emoji: "📱", accent: "text-fuchsia-500", tag: "Технологии" },
  home: { emoji: "🏡", accent: "text-rose-500", tag: "Уют" },
  kids: { emoji: "🧸", accent: "text-yellow-600", tag: "Для детей" },
  sport: { emoji: "⚽", accent: "text-rose-600", tag: "Активность" },
  books: { emoji: "📚", accent: "text-rose-600", tag: "Чтение" },
  food: { emoji: "🛒", accent: "text-fuchsia-700", tag: "Свежее" },
  auto: { emoji: "🚗", accent: "text-rose-700", tag: "В дорогу" },
};

export default function CategoriesPage() {
  return (
    <Suspense fallback={<CategoriesSkeleton />}>
      <CategoriesInner />
    </Suspense>
  );
}

function CategoriesSkeleton() {
  return (
    <div className="min-h-screen flex flex-col" style={{ background: "linear-gradient(135deg, #fdf4ff 0%, #fff1f2 50%, #fafaf9 100%)" }}>
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 py-6 space-y-6">
        <Card className="!rounded-3xl">
          <Skeleton active paragraph={{ rows: 3 }} />
        </Card>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => (
            <Card key={i} className="!rounded-2xl">
              <Skeleton active paragraph={{ rows: 2 }} />
            </Card>
          ))}
        </div>
      </main>
    </div>
  );
}

function CategoriesInner() {
  const [categories, setCategories] = useState<CategoryDto[] | null>(null);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [query, setQuery] = useState("");

  useEffect(() => {
    fetchCategories()
      .then(async (cats) => {
        setCategories(cats);
        const pairs = await Promise.all(
          cats.map(async (c) => {
            try {
              const data = await fetchListings({ categoryId: c.id, limit: 1 });
              return [c.id, data.total] as const;
            } catch {
              return [c.id, 0] as const;
            }
          }),
        );
        setCounts(Object.fromEntries(pairs));
      })
      .catch(() => setCategories([]));
  }, []);

  const visible = (categories ?? []).filter((c) =>
    !query.trim() ? true : c.name.toLowerCase().includes(query.trim().toLowerCase()),
  );

  return (
    <div className="min-h-screen flex flex-col" style={{ background: "linear-gradient(135deg, #fdf4ff 0%, #fff1f2 50%, #fafaf9 100%)" }}>
      <SiteHeader />
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 py-6 space-y-6">
        <div className="relative overflow-hidden rounded-3xl p-6 sm:p-10 text-white shadow-xl shadow-fuchsia-900/10 fade-in-up">
          <div className="absolute inset-0 bg-gradient-to-br from-[#86198f] via-[#c026d3] to-[#e879f9]" />
          <div className="absolute -top-20 -right-10 w-72 h-72 rounded-full bg-fuchsia-300/30 blur-3xl blob-float-a" />
          <div className="absolute -bottom-24 -left-10 w-64 h-64 rounded-full bg-rose-300/25 blur-3xl blob-float-b" />
          <svg className="absolute inset-0 w-full h-full pointer-events-none" viewBox="0 0 1000 300" preserveAspectRatio="none">
            <g className="text-white/30 float-slow">
              <path d="M120,60 l3,-10 l3,10 l10,3 l-10,3 l-3,10 l-3,-10 l-10,-3 z" fill="currentColor" />
              <path d="M850,90 l3,-10 l3,10 l10,3 l-10,3 l-3,10 l-3,-10 l-10,-3 z" fill="currentColor" />
              <circle cx="200" cy="240" r="3" fill="currentColor" />
              <circle cx="700" cy="200" r="4" fill="currentColor" />
            </g>
          </svg>

          <div className="relative grid lg:grid-cols-[1fr_auto] gap-6 items-center">
            <div className="space-y-3 max-w-2xl">
              <Tag className="!bg-white/15 !text-white !border-white/30 !rounded-full !px-3 !py-1 !font-medium backdrop-blur">
                Все категории
              </Tag>
              <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight">
                Найдите то, что ищете
              </h1>
              <p className="text-white/90 text-base">
                Более {categories?.length ?? "—"} категорий и тысячи товаров с быстрой доставкой.
              </p>
              <Input
                size="large"
                prefix={<SearchOutlined className="text-muted" />}
                placeholder="Поиск по категориям"
                allowClear
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="!rounded-xl max-w-md !text-foreground"
              />
            </div>
            <div className="hidden lg:flex flex-col items-center gap-2 pop-in">
              <div className="grid grid-cols-2 gap-2">
                {["👗", "👔", "💄", "📱"].map((emoji, i) => (
                  <div
                    key={i}
                    className="w-16 h-16 rounded-2xl bg-white/15 border border-white/25 backdrop-blur flex items-center justify-center text-3xl shadow-lg float-slow"
                    style={{ animationDelay: `${i * 0.2}s` }}
                  >
                    {emoji}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {!categories && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[...Array(6)].map((_, i) => (
              <Card key={i} className="!rounded-2xl">
                <Skeleton active paragraph={{ rows: 2 }} />
              </Card>
            ))}
          </div>
        )}

        {categories && visible.length === 0 && (
          <Card className="!rounded-2xl">
            <p className="text-center text-muted py-6">Категории не найдены</p>
          </Card>
        )}

        {categories && visible.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {visible.map((c, i) => {
              const v = CATEGORY_VISUALS[c.slug] ?? {
                emoji: c.icon ?? "🛍",
                accent: "text-fuchsia-600",
                tag: "Категория",
              };
              return (
                <Link
                  key={c.id}
                  href={`/listings?category=${c.id}`}
                  className="group relative rounded-2xl border border-transparent bg-white/80 backdrop-blur-sm p-5 flex items-center gap-4 hover:bg-white hover:border-fuchsia-200 hover:shadow-xl hover:shadow-fuchsia-500/10 hover:-translate-y-0.5 transition-all fade-in-up"
                  style={{ animationDelay: `${Math.min(i * 0.04, 0.4)}s` }}
                >
                  <div className="relative w-16 h-16 flex items-center justify-center shrink-0">
                    <span className="absolute inset-0 flex items-center justify-center blur-2xl opacity-60 group-hover:opacity-80 transition">
                      <span className={`text-5xl ${v.accent}`}>●</span>
                    </span>
                    <span className="relative text-5xl leading-none transition-transform duration-300 group-hover:scale-110 drop-shadow-sm">
                      {v.emoji}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <Tag
                      color="purple"
                      className="!rounded-full !border-0 !bg-fuchsia-50 !text-fuchsia-700 !mb-1"
                    >
                      {v.tag}
                    </Tag>
                    <div className="font-bold text-lg tracking-tight">{c.name}</div>
                    <div className="text-sm text-muted">
                      {counts[c.id] !== undefined
                        ? `${counts[c.id]} товаров`
                        : "загружаем..."}
                    </div>
                  </div>
                  <RightOutlined className="text-muted group-hover:text-fuchsia-700 group-hover:translate-x-0.5 transition-all" />
                </Link>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
