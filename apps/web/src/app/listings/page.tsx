"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  Button,
  Card,
  ConfigProvider,
  Drawer,
  Empty,
  Pagination,
  Segmented,
  Select,
  Skeleton,
  Slider,
  Tag,
} from "antd";
import {
  FilterOutlined,
  PlusOutlined,
  StarFilled,
} from "@ant-design/icons";
import { SiteHeader } from "@/widgets/header";
import {
  ListingCard,
  fetchCategories,
  fetchListings,
} from "@/features/catalog";
import { setAnalogueItem } from "@/features/commerce";
import { canSell, useSession } from "@/shared/auth";
import type { CategoryDto, ListingsPage } from "@/shared/lib";

export default function ListingsPageRoute() {
  return (
    <Suspense fallback={<ListingsSkeleton />}>
      <ListingsPageInner />
    </Suspense>
  );
}

function ListingsSkeleton() {
  return (
    <div className="min-h-screen flex flex-col" style={{ background: "linear-gradient(135deg, #fdf4ff 0%, #fff1f2 50%, #fafaf9 100%)" }}>
      <SiteHeader />
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 py-6">
        <Skeleton active paragraph={{ rows: 4 }} />
      </main>
    </div>
  );
}

type SortKey = "new" | "priceAsc" | "priceDesc" | "rating";

function ListingsPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user } = useSession();

  const categoryId = searchParams.get("category") ?? undefined;
  const q = searchParams.get("q") ?? undefined;
  const page = Number(searchParams.get("page") ?? "1");
  const sort = (searchParams.get("sort") as SortKey) ?? "new";
  const analogueParam = searchParams.get("analogue") ?? undefined;
  const [analogueOrderId, analogueItemId] = analogueParam?.split(":") ?? [];
  const isAnalogueMode = !!(analogueOrderId && analogueItemId);

  const [data, setData] = useState<ListingsPage | null>(null);
  const [categories, setCategories] = useState<CategoryDto[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [priceRange, setPriceRange] = useState<[number, number]>([0, 50_000]);
  const [minRating, setMinRating] = useState<number>(0);
  const [drawerOpen, setDrawerOpen] = useState(false);

  useEffect(() => {
    fetchCategories()
      .then(setCategories)
      .catch(() => setCategories([]));
  }, []);

  useEffect(() => {
    setData(null);
    setError(null);
    fetchListings({ categoryId, q, page, limit: 24 })
      .then(setData)
      .catch((err: Error) => setError(err.message));
  }, [categoryId, q, page]);

  const filteredItems = useMemo(() => {
    if (!data) return null;
    let items = [...(data.items as Array<ListingsPage["items"][number] & {
      oldPrice?: number;
      rating?: number;
    }>)];

    items = items.filter((i) => {
      const priceRub = i.price / 100;
      return priceRub >= priceRange[0] && priceRub <= priceRange[1];
    });

    if (minRating > 0) {
      items = items.filter((i) => (i.rating ?? 0) >= minRating);
    }

    if (sort === "priceAsc") items.sort((a, b) => a.price - b.price);
    else if (sort === "priceDesc") items.sort((a, b) => b.price - a.price);
    else if (sort === "rating")
      items.sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0));

    return items;
  }, [data, priceRange, minRating, sort]);

  function updateParams(patch: Record<string, string | undefined>) {
    const params = new URLSearchParams(searchParams.toString());
    for (const [k, v] of Object.entries(patch)) {
      if (v === undefined || v === "") params.delete(k);
      else params.set(k, v);
    }
    router.push(`/listings${params.toString() ? "?" + params.toString() : ""}`);
  }

  function setCategory(id: string | undefined) {
    updateParams({ category: id, page: undefined });
  }

  function goToPage(p: number) {
    updateParams({ page: p === 1 ? undefined : String(p) });
  }

  function setSort(key: SortKey) {
    updateParams({ sort: key === "new" ? undefined : key });
  }

  async function handleAttach(listingId: string) {
    await setAnalogueItem(analogueOrderId!, analogueItemId!, listingId);
    router.push("/orders");
  }

  const activeCategory = categories.find((c) => c.id === categoryId);

  const FilterContent = (
    <div className="space-y-6">
      <div>
        <div className="text-sm font-semibold mb-3">Категории</div>
        <div className="space-y-1">
          <button
            type="button"
            onClick={() => setCategory(undefined)}
            className={`w-full text-left px-3 py-2 rounded-lg text-sm transition ${
              !categoryId
                ? "bg-fuchsia-100 text-fuchsia-700 font-medium"
                : "hover:bg-fuchsia-100 hover:text-fuchsia-700"
            }`}
          >
            Все категории
          </button>
          {categories.map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => setCategory(c.id)}
              className={`w-full text-left px-3 py-2 rounded-lg text-sm transition flex items-center gap-2 ${
                categoryId === c.id
                  ? "bg-fuchsia-100 text-fuchsia-700 font-medium"
                  : "hover:bg-fuchsia-100 hover:text-fuchsia-700"
              }`}
            >
              <span>{c.icon ?? "•"}</span>
              <span>{c.name}</span>
            </button>
          ))}
        </div>
      </div>

      <div>
        <div className="flex items-center justify-between mb-3">
          <div className="text-sm font-semibold">Цена, ₽</div>
          <div className="text-xs text-muted">
            {priceRange[0].toLocaleString("ru")} — {priceRange[1].toLocaleString("ru")}
          </div>
        </div>
        <Slider
          range
          min={0}
          max={50_000}
          step={500}
          value={priceRange}
          onChange={(v) => setPriceRange(v as [number, number])}
          onChangeComplete={() => { (document.activeElement as HTMLElement)?.blur(); }}
          styles={{ track: { background: "#d946ef" }, rail: { background: "#f3e8ff" }, handle: { borderColor: "#d946ef" } }}
        />
      </div>

      <div>
        <div className="text-sm font-semibold mb-3">Рейтинг</div>
        <div className="flex flex-col gap-1.5">
          {[0, 3, 4, 4.5].map((r) => (
            <button
              key={r}
              type="button"
              onClick={() => setMinRating(r)}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition ${
                minRating === r
                  ? "bg-fuchsia-100 text-fuchsia-700 font-medium"
                  : "hover:bg-fuchsia-100 hover:text-fuchsia-700"
              }`}
            >
              {r === 0 ? (
                <span>Любой</span>
              ) : (
                <>
                  <StarFilled style={{ color: "#d946ef" }} />
                  <span>от {r}</span>
                </>
              )}
            </button>
          ))}
        </div>
      </div>

      <Button
        block
        onClick={() => {
          setPriceRange([0, 50_000]);
          setMinRating(0);
          setCategory(undefined);
        }}
        style={{ borderColor: "#e9d5ff", color: "#9333ea" }}
        onMouseEnter={(e) => { e.currentTarget.style.borderColor = "#c026d3"; e.currentTarget.style.color = "#c026d3"; }}
        onMouseLeave={(e) => { e.currentTarget.style.borderColor = "#e9d5ff"; e.currentTarget.style.color = "#9333ea"; }}
      >
        Сбросить фильтры
      </Button>
    </div>
  );

  return (
    <div className="min-h-screen flex flex-col" style={{ background: "linear-gradient(135deg, #fdf4ff 0%, #fff1f2 50%, #fafaf9 100%)" }}>
      <SiteHeader />
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 py-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-4">
          <div>
            <div className="text-xs text-muted">
              <Link href="/" className="hover:text-fuchsia-700">Главная</Link>
              {" / "}
              <span>Каталог</span>
              {activeCategory && (
                <>
                  {" / "}
                  <span>{activeCategory.name}</span>
                </>
              )}
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight mt-1">
              {activeCategory?.name ?? (q ? `Поиск: «${q}»` : "Каталог")}
            </h1>
            {data && (
              <p className="text-sm text-muted mt-1">
                {data.total} товаров
              </p>
            )}
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <Button
              icon={<FilterOutlined />}
              className="lg:!hidden !rounded-xl"
              onClick={() => setDrawerOpen(true)}
            >
              Фильтры
            </Button>
            <ConfigProvider theme={{ components: { Segmented: { itemSelectedBg: "#f5d0fe", itemSelectedColor: "#86198f" } } }}>
              <Segmented
                value={sort}
                onChange={(v) => setSort(v as SortKey)}
                options={[
                  { value: "new", label: "Новинки" },
                  { value: "priceAsc", label: "Дешевле" },
                  { value: "priceDesc", label: "Дороже" },
                  { value: "rating", label: "Рейтинг" },
                ]}
              />
            </ConfigProvider>
            {canSell(user?.role) && (
              <Button
                type="primary"
                icon={<PlusOutlined />}
                href="/new-listing"
                className="!rounded-xl"
              >
                Разместить
              </Button>
            )}
          </div>
        </div>

        {isAnalogueMode && (
          <div className="mb-4 flex items-center gap-3 px-4 py-3 rounded-2xl bg-amber-50 border border-amber-200">
            <span className="text-2xl shrink-0">📦</span>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-amber-800">Режим выбора аналога</p>
              <p className="text-xs text-amber-700 mt-0.5">
                Найдите подходящий товар и нажмите «Прикрепить» — он заменит исходный в заявке
              </p>
            </div>
            <a href="/orders" className="shrink-0 text-xs font-semibold text-amber-600 underline hover:text-amber-800 transition">
              Отмена
            </a>
          </div>
        )}

        {q && (
          <div className="mb-4">
            <Tag
              closable
              onClose={() => updateParams({ q: undefined })}
              className="!rounded-full !px-3 !py-1"
              color="purple"
            >
              Поиск: {q}
            </Tag>
          </div>
        )}

        <div className="grid lg:grid-cols-[260px_1fr] gap-6">
          <aside className="hidden lg:block">
            <Card className="!rounded-2xl sticky top-20">{FilterContent}</Card>
          </aside>

          <div className="min-w-0 space-y-4">
            {error && (
              <Card className="!rounded-2xl">
                <p className="text-sm text-danger">Ошибка: {error}</p>
              </Card>
            )}

            {!filteredItems && !error && (
              <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4">
                {[...Array(8)].map((_, i) => (
                  <Card key={i} className="!rounded-2xl">
                    <Skeleton.Image active className="!w-full !h-32" />
                    <Skeleton active paragraph={{ rows: 2 }} className="!mt-3" />
                  </Card>
                ))}
              </div>
            )}

            {filteredItems && filteredItems.length === 0 && (
              <Card className="!rounded-2xl">
                <Empty
                  description={
                    <div className="space-y-2">
                      <p>Ничего не найдено</p>
                      <Button type="link" href="/listings" style={{ color: "#c026d3" }}>
                        Показать все товары
                      </Button>
                    </div>
                  }
                />
              </Card>
            )}

            {filteredItems && filteredItems.length > 0 && (
              <>
                <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4">
                  {filteredItems.map((l) => (
                    <ListingCard
                      key={l.id}
                      listing={l}
                      onAttach={isAnalogueMode ? handleAttach : undefined}
                    />
                  ))}
                </div>

                {data && data.pages > 1 && (
                  <div className="flex justify-center pt-6">
                    <Pagination
                      current={data.page}
                      total={data.total}
                      pageSize={data.limit}
                      showSizeChanger={false}
                      onChange={goToPage}
                    />
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </main>

      <Drawer
        title="Фильтры"
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        placement="left"
        width={320}
      >
        {FilterContent}
      </Drawer>
    </div>
  );
}
