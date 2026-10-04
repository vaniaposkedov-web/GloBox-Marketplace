"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { SiteHeader } from "@/widgets/header";
import { Button, Field } from "@/shared/ui";
import { ApiError } from "@/shared/api/client";
import {
  createListingSchema,
  type CategoryDto,
  type Currency,
} from "@/shared/lib";
import { canSell, useSession } from "@/shared/auth";
import { createListing, fetchCategories } from "@/features/catalog";

const CURRENCIES: Currency[] = ["RUB", "KZT", "BYN", "USD", "EUR"];

export default function NewListingPage() {
  const router = useRouter();
  const { user, hydrated } = useSession();

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priceRub, setPriceRub] = useState(""); // Основная валюта в формате "1000"
  const [currency, setCurrency] = useState<Currency>("RUB");
  const [city, setCity] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [stockStr, setStockStr] = useState("1");
  const [imageUrl, setImageUrl] = useState("");
  const [categories, setCategories] = useState<CategoryDto[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchCategories().then((cs) => {
      setCategories(cs);
      if (cs.length > 0 && !categoryId) setCategoryId(cs[0].id);
    });
  }, [categoryId]);

  useEffect(() => {
    if (!hydrated) return;
    if (!user) {
      router.replace("/login?next=/new-listing");
      return;
    }
    if (!canSell(user.role)) {
      router.replace("/profile");
    }
  }, [hydrated, user, router]);

  const imageUrls = useMemo(
    () =>
      imageUrl
        .split(/[\s,\n]+/)
        .map((u) => u.trim())
        .filter((u) => u.length > 0),
    [imageUrl],
  );

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    const priceNum = Number(priceRub.replace(/[^\d]/g, ""));
    const payload = {
      title: title.trim(),
      description: description.trim(),
      price: Math.round(priceNum * 100), // в копейки
      currency,
      categoryId,
      city: city.trim() || undefined,
      stock: Math.max(1, Number(stockStr.replace(/[^\d]/g, "")) || 1),
      imageUrls,
    };

    const parsed = createListingSchema.safeParse(payload);
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Ошибка валидации");
      return;
    }

    setLoading(true);
    try {
      const created = await createListing(parsed.data);
      router.push(`/listings/${created.id}`);
    } catch (err) {
      if (err instanceof ApiError) setError(err.payload.message);
      else setError("Не удалось создать объявление");
    } finally {
      setLoading(false);
    }
  }

  if (!hydrated || !user) {
    return (
      <div className="min-h-screen flex flex-col">
        <SiteHeader />
        <div className="flex-1 flex items-center justify-center">
          <div className="h-10 w-40 bg-border/40 animate-pulse rounded" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      <SiteHeader />
      <main className="flex-1 max-w-2xl w-full mx-auto px-4 py-6">
        <Link
          href="/listings"
          className="text-sm text-muted hover:text-foreground inline-block mb-4"
        >
          ← К списку
        </Link>
        <h1 className="text-2xl font-bold mb-6">Новое объявление</h1>

        <form onSubmit={handleSubmit} className="space-y-4">
          <Field
            label="Заголовок"
            placeholder="Например: iPhone 15 Pro Max 256GB"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
          />

          <div>
            <label className="text-sm font-medium block mb-1">Категория</label>
            <select
              className="w-full border border-border rounded-lg px-3 h-10 bg-transparent focus:outline-none focus:border-primary transition"
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
              required
            >
              {!categories && <option>Загрузка...</option>}
              {categories?.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.icon} {c.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-sm font-medium block mb-1">Описание</label>
            <textarea
              className="w-full border border-border rounded-lg px-3 py-2 bg-transparent focus:outline-none focus:border-primary transition min-h-[120px]"
              placeholder="Состояние, комплектация, почему продаёте"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Field
              label="Цена"
              type="text"
              inputMode="numeric"
              placeholder="10000"
              value={priceRub}
              onChange={(e) => setPriceRub(e.target.value.replace(/[^\d]/g, ""))}
              required
            />
            <div>
              <label className="text-sm font-medium block mb-1">Валюта</label>
              <select
                className="w-full border border-border rounded-lg px-3 h-10 bg-transparent focus:outline-none focus:border-primary transition"
                value={currency}
                onChange={(e) => setCurrency(e.target.value as Currency)}
              >
                {CURRENCIES.map((c) => (
                  <option key={c}>{c}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Field
              label="Город (необязательно)"
              placeholder="Москва"
              value={city}
              onChange={(e) => setCity(e.target.value)}
            />
            <Field
              label="Остаток"
              type="text"
              inputMode="numeric"
              placeholder="1"
              value={stockStr}
              onChange={(e) => setStockStr(e.target.value.replace(/[^\d]/g, ""))}
              hint="Сколько штук в наличии"
            />
          </div>

          <div>
            <label className="text-sm font-medium block mb-1">
              Ссылки на картинки (по одной на строку)
            </label>
            <textarea
              className="w-full border border-border rounded-lg px-3 py-2 bg-transparent focus:outline-none focus:border-primary transition min-h-[80px] font-mono text-xs"
              placeholder="https://example.com/photo1.jpg"
              value={imageUrl}
              onChange={(e) => setImageUrl(e.target.value)}
            />
            <p className="text-xs text-muted mt-1">
              В MVP загрузка файлов не реализована. Вставьте URL (до 10 шт).
            </p>
          </div>

          {error && <p className="text-sm text-danger">{error}</p>}

          <Button type="submit" loading={loading} className="w-full">
            Опубликовать
          </Button>
        </form>
      </main>
    </div>
  );
}
