"use client";

import { useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { SiteHeader } from "@/widgets/header";
import { Button, Field } from "@/shared/ui";
import {
  fetchCategories,
  fetchListing,
  updateListing,
} from "@/features/catalog";
import { useSession } from "@/shared/auth";
import { ApiError } from "@/shared/api/client";
import {
  updateListingSchema,
  type CategoryDto,
  type Currency,
  type ListingDetailDto,
  type ListingStatus,
} from "@/shared/lib";

const CURRENCIES: Currency[] = ["RUB", "KZT", "BYN", "USD", "EUR"];

const STATUS_OPTIONS: Array<{ value: ListingStatus; label: string }> = [
  { value: "PUBLISHED", label: "Опубликовано" },
  { value: "DRAFT", label: "Черновик" },
  { value: "SOLD", label: "Продано" },
  { value: "ARCHIVED", label: "В архиве" },
];

export default function EditListingPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { user, hydrated } = useSession();

  const [listing, setListing] = useState<ListingDetailDto | null>(null);
  const [categories, setCategories] = useState<CategoryDto[] | null>(null);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priceMajor, setPriceMajor] = useState("");
  const [currency, setCurrency] = useState<Currency>("RUB");
  const [categoryId, setCategoryId] = useState("");
  const [city, setCity] = useState("");
  const [status, setStatus] = useState<ListingStatus>("PUBLISHED");
  const [stockStr, setStockStr] = useState("1");
  const [imageUrlsRaw, setImageUrlsRaw] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!hydrated) return;
    if (!user) {
      router.replace(`/login?next=/listings/${params.id}/edit`);
      return;
    }
    void Promise.all([
      fetchListing(params.id).then((l) => {
        if (l.seller.id !== user.id) {
          router.replace(`/listings/${l.id}`);
          return;
        }
        setListing(l);
        setTitle(l.title);
        setDescription(l.description);
        setPriceMajor(String(Math.round(l.price / 100)));
        setCurrency(l.currency);
        setCategoryId(l.category.id);
        setCity(l.city ?? "");
        setStatus(l.status);
        setStockStr(String(l.stock));
        setImageUrlsRaw(l.images.join("\n"));
      }),
      fetchCategories().then(setCategories),
    ]).catch((err: ApiError) => setError(err.message));
  }, [hydrated, user, params.id, router]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    const imageUrls = imageUrlsRaw
      .split(/[\s,\n]+/)
      .map((u) => u.trim())
      .filter(Boolean);

    const payload = {
      title: title.trim(),
      description: description.trim(),
      price: Math.round(Number(priceMajor.replace(/[^\d]/g, "")) * 100),
      currency,
      categoryId,
      city: city.trim() || undefined,
      imageUrls,
      status,
    };
    const parsed = updateListingSchema.safeParse(payload);
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Проверьте поля");
      return;
    }
    setLoading(true);
    try {
      await updateListing(params.id, parsed.data);
      router.push(`/listings/${params.id}`);
    } catch (err) {
      setError(err instanceof ApiError ? err.payload.message : "Ошибка");
    } finally {
      setLoading(false);
    }
  }

  if (!hydrated || !user) {
    return (
      <div className="min-h-screen flex flex-col">
        <SiteHeader />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      <SiteHeader />
      <main className="flex-1 max-w-2xl w-full mx-auto px-4 py-6">
        <Link
          href="/my-listings"
          className="text-sm text-muted hover:text-foreground inline-block mb-4"
        >
          ← К моим товарам
        </Link>
        <h1 className="text-2xl font-bold mb-6">Редактировать товар</h1>

        {!listing && !error && (
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => (
              <div
                key={i}
                className="h-10 rounded bg-border/40 animate-pulse"
              />
            ))}
          </div>
        )}

        {listing && (
          <form onSubmit={handleSubmit} className="space-y-4">
            <Field
              label="Заголовок"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
            />

            <div>
              <label className="text-sm font-medium block mb-1">Статус</label>
              <select
                className="w-full border border-border rounded-lg px-3 h-10 bg-transparent focus:outline-none focus:border-primary"
                value={status}
                onChange={(e) => setStatus(e.target.value as ListingStatus)}
              >
                {STATUS_OPTIONS.map((s) => (
                  <option key={s.value} value={s.value}>
                    {s.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-sm font-medium block mb-1">Категория</label>
              <select
                className="w-full border border-border rounded-lg px-3 h-10 bg-transparent focus:outline-none focus:border-primary"
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
                required
              >
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
                className="w-full border border-border rounded-lg px-3 py-2 bg-transparent focus:outline-none focus:border-primary min-h-[120px]"
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
                value={priceMajor}
                onChange={(e) =>
                  setPriceMajor(e.target.value.replace(/[^\d]/g, ""))
                }
                required
              />
              <div>
                <label className="text-sm font-medium block mb-1">Валюта</label>
                <select
                  className="w-full border border-border rounded-lg px-3 h-10 bg-transparent focus:outline-none focus:border-primary"
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
                label="Город"
                placeholder="Москва"
                value={city}
                onChange={(e) => setCity(e.target.value)}
              />
              <Field
                label="Остаток на складе"
                type="text"
                inputMode="numeric"
                value={stockStr}
                onChange={(e) =>
                  setStockStr(e.target.value.replace(/[^\d]/g, ""))
                }
              />
            </div>

            <div>
              <label className="text-sm font-medium block mb-1">
                Ссылки на картинки
              </label>
              <textarea
                className="w-full border border-border rounded-lg px-3 py-2 bg-transparent focus:outline-none focus:border-primary min-h-[80px] font-mono text-xs"
                value={imageUrlsRaw}
                onChange={(e) => setImageUrlsRaw(e.target.value)}
              />
              <p className="text-xs text-muted mt-1">
                По одному URL на строку (до 10 шт)
              </p>
            </div>

            {error && <p className="text-sm text-danger">{error}</p>}

            <div className="flex gap-2">
              <Button type="submit" loading={loading}>
                Сохранить
              </Button>
              <Link
                href={`/listings/${params.id}`}
                className="px-4 py-2 rounded-lg border border-border hover:bg-black/5 text-sm"
              >
                Отмена
              </Link>
            </div>
          </form>
        )}
      </main>
    </div>
  );
}
