"use client";

import { useCallback, useEffect, useRef, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Search, X, Package, ChevronRight, Plus, Trash2, ChevronLeft, Loader2 } from "lucide-react";
import { api, ApiError } from "@/lib/api";
import { getToken } from "@/lib/auth";
import { BottomNav } from "@/components/BottomNav";

// ── Constants ─────────────────────────────────────────────────────────────────

const IMG_W = 1200;
const IMG_H = 900;
const MAX_PHOTOS = 10;

const PREDEFINED_KEYS = [
  "Материал",
  "Цвет",
  "Размер",
  "Страна производства",
  "Вес",
  "Бренд",
];

// ── Types ─────────────────────────────────────────────────────────────────────

interface Category { id: string; slug: string; name: string; icon?: string | null }
interface Listing {
  id: string; title: string; description: string; price: number;
  status: string;
  category: { id: string; name: string };
  images: { id: string; url: string; order: number }[];
  characteristics?: { key: string; value: string }[] | null;
  createdAt: string;
}
interface ListingsResponse { items: Listing[]; total: number }
interface Attr { key: string; value: string; locked: boolean }
interface CatMatch { id: string; name: string; isNew: boolean }

// ── Helpers ───────────────────────────────────────────────────────────────────

function resizeImage(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = IMG_W; canvas.height = IMG_H;
      const ctx = canvas.getContext("2d")!;
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, IMG_W, IMG_H);
      const scale = Math.max(IMG_W / img.width, IMG_H / img.height);
      const sw = IMG_W / scale; const sh = IMG_H / scale;
      const sx = (img.width - sw) / 2; const sy = (img.height - sh) / 2;
      ctx.drawImage(img, sx, sy, sw, sh, 0, 0, IMG_W, IMG_H);
      resolve(canvas.toDataURL("image/jpeg", 0.85));
    };
    img.onerror = () => reject(new Error("Failed to load image"));
    img.src = URL.createObjectURL(file);
  });
}

const STATUS_LABELS: Record<string, string> = {
  DRAFT: "Черновик", PUBLISHED: "Опубликован", SOLD: "Продан", ARCHIVED: "В архиве",
};
const STATUS_COLORS: Record<string, string> = {
  PUBLISHED: "bg-green-100 text-green-700",
  DRAFT:     "bg-gray-100 text-gray-600",
  SOLD:      "bg-blue-100 text-blue-700",
  ARCHIVED:  "bg-orange-100 text-orange-700",
};

const FILTER_TABS = [
  { label: "Все",          value: "" },
  { label: "Опубликован",  value: "PUBLISHED" },
  { label: "Черновик",     value: "DRAFT" },
  { label: "Архив",        value: "ARCHIVED" },
];

// ── Empty form ────────────────────────────────────────────────────────────────

const EMPTY_FORM = { title: "", description: "", price: "", categoryId: "" };

const makeDefaultAttrs = (): Attr[] =>
  PREDEFINED_KEYS.map((k) => ({ key: k, value: "", locked: true }));

// ── Step indicator ────────────────────────────────────────────────────────────

const STEPS = ["Фото", "Основное", "Категория", "Характеристики"];

function StepDots({ current }: { current: number }) {
  return (
    <div className="flex items-center gap-2 justify-center py-3">
      {STEPS.map((label, i) => (
        <div key={i} className="flex flex-col items-center gap-1">
          <div
            className={`w-2 h-2 rounded-full transition-all ${
              i + 1 === current
                ? "bg-primary scale-125"
                : i + 1 < current
                ? "bg-primary/40"
                : "bg-gray-200"
            }`}
          />
        </div>
      ))}
      <span className="ml-2 text-xs text-muted font-medium">
        {STEPS[current - 1]} {current}/{STEPS.length}
      </span>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

function SellerProductsPageInner() {
  const router       = useRouter();
  const searchParams = useSearchParams();
  const fileRef = useRef<HTMLInputElement>(null);

  // Data
  const [listings, setListings]     = useState<ListingsResponse | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [profileStatus, setProfileStatus] = useState<string | null>(null);

  // UI state
  const [showForm, setShowForm]   = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [loading, setLoading]     = useState(false);
  const [toast, setToast]         = useState<{ msg: string; type: "error" | "success" } | null>(null);
  const [photos, setPhotos]       = useState<string[]>([]);
  const [form, setForm]           = useState({ ...EMPTY_FORM });

  // Multi-step
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);

  // Category step
  const [catSearch, setCatSearch]           = useState("");
  const [catMatchLoading, setCatMatchLoading] = useState(false);
  const [catMatchResult, setCatMatchResult]   = useState<CatMatch | null>(null);

  // Characteristics step
  const [attrs, setAttrs] = useState<Attr[]>(makeDefaultAttrs());
  const [newAttrKey, setNewAttrKey] = useState("");
  const newAttrKeyRef = useRef<HTMLInputElement>(null);

  // Search + filter
  const [search, setSearch]           = useState("");
  const [activeFilter, setActiveFilter] = useState("");

  // ── Load ──────────────────────────────────────────────────────────────────

  useEffect(() => {
    if (!getToken()) { router.replace("/login"); return; }
    loadAll();
    if (searchParams.get("new") === "1") {
      openCreate();
      router.replace("/products", { scroll: false });
    }
  }, [router]); // eslint-disable-line react-hooks/exhaustive-deps

  const loadAll = () => {
    loadListings();
    api.get<Category[]>("/categories")
      .then((r) => setCategories(Array.isArray(r) ? r : []))
      .catch(() => {});
    api.get<{ profile: { status: string } | null }>("/supplier/me")
      .then((r) => setProfileStatus(r.profile?.status ?? null))
      .catch(() => {});
  };

  const loadListings = () => {
    api.get<ListingsResponse>("/supplier/my-listings")
      .then(setListings)
      .catch(() => {});
  };

  // ── Toast ─────────────────────────────────────────────────────────────────

  const showToast = (msg: string, type: "error" | "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  // ── Photos ────────────────────────────────────────────────────────────────

  const handleFiles = useCallback(async (files: FileList | null) => {
    if (!files) return;
    const remaining = MAX_PHOTOS - photos.length;
    const toProcess = Array.from(files).slice(0, remaining);
    const results: string[] = [];
    for (const f of toProcess) {
      try { results.push(await resizeImage(f)); } catch { /* skip */ }
    }
    setPhotos((prev) => [...prev, ...results]);
  }, [photos.length]);

  const removePhoto = (i: number) => setPhotos((prev) => prev.filter((_, idx) => idx !== i));

  // ── Open edit / create ────────────────────────────────────────────────────

  const openEdit = (item: Listing) => {
    setEditingId(item.id);
    setForm({
      title: item.title,
      description: item.description,
      price: (item.price / 100).toString(),
      categoryId: item.category?.id ?? "",
    });
    setPhotos(item.images.map((img) => img.url));
    const existing = item.characteristics ?? [];
    const merged: Attr[] = PREDEFINED_KEYS.map((k) => {
      const found = existing.find((a) => a.key === k);
      return { key: k, value: found?.value ?? "", locked: true };
    });
    const custom = existing
      .filter((a) => !PREDEFINED_KEYS.includes(a.key))
      .map((a) => ({ key: a.key, value: a.value, locked: true }));
    setAttrs([...merged, ...custom]);
    const cat = categories.find((c) => c.id === (item.category?.id ?? ""));
    setCatSearch(cat?.name ?? "");
    setCatMatchResult(null);
    setStep(1);
    setShowForm(true);
  };

  const openCreate = () => {
    setEditingId(null);
    setForm({ ...EMPTY_FORM });
    setPhotos([]);
    setAttrs(makeDefaultAttrs());
    setCatSearch("");
    setCatMatchResult(null);
    setStep(1);
    setShowForm(true);
  };

  const closeForm = () => {
    setShowForm(false);
    setEditingId(null);
    setForm({ ...EMPTY_FORM });
    setPhotos([]);
    setAttrs(makeDefaultAttrs());
    setCatSearch("");
    setCatMatchResult(null);
    setNewAttrKey("");
    setStep(1);
  };

  // ── Category AI match ─────────────────────────────────────────────────────

  const filteredCategories = catSearch.trim()
    ? categories.filter((c) =>
        c.name.toLowerCase().includes(catSearch.trim().toLowerCase())
      )
    : categories;

  const handleCatMatch = async () => {
    const q = catSearch.trim();
    if (!q) return;
    setCatMatchLoading(true);
    setCatMatchResult(null);
    try {
      const res = await api.post<CatMatch>("/supplier/categories/match", { query: q });
      setCatMatchResult(res);
      setForm((f) => ({ ...f, categoryId: res.id }));
      setCatSearch(res.name);
    } catch (err: any) {
      showToast(err.message || "Ошибка поиска категории", "error");
    } finally {
      setCatMatchLoading(false);
    }
  };

  const selectCategory = (cat: Category) => {
    setForm((f) => ({ ...f, categoryId: cat.id }));
    setCatSearch(cat.name);
    setCatMatchResult({ id: cat.id, name: cat.name, isNew: false });
  };

  // ── Characteristics ───────────────────────────────────────────────────────

  const addCustomAttr = () => {
    const k = newAttrKey.trim();
    if (!k) return;
    setAttrs((prev) => [...prev, { key: k, value: "", locked: true }]);
    setNewAttrKey("");
    newAttrKeyRef.current?.focus();
  };

  const removeAttr = (i: number) => {
    setAttrs((prev) => prev.filter((_, idx) => idx !== i));
  };

  const setAttrValue = (i: number, value: string) => {
    setAttrs((prev) => prev.map((a, idx) => idx === i ? { ...a, value } : a));
  };

  // ── Step navigation ───────────────────────────────────────────────────────

  const canGoNext = () => {
    if (step === 1) return true;
    if (step === 2) return form.title.trim() !== "" && form.description.trim() !== "" && form.price !== "" && parseFloat(form.price) > 0;
    if (step === 3) return form.categoryId !== "";
    return true;
  };

  const goNext = () => {
    if (step < 4) setStep((s) => (s + 1) as 1 | 2 | 3 | 4);
  };

  const goPrev = () => {
    if (step > 1) setStep((s) => (s - 1) as 1 | 2 | 3 | 4);
  };

  // ── Submit ────────────────────────────────────────────────────────────────

  const handleSubmit = async () => {
    if (!form.categoryId) { showToast("Выберите категорию", "error"); return; }
    setLoading(true);
    const payload = {
      title:       form.title,
      description: form.description,
      price:       Math.round(parseFloat(form.price) * 100),
      categoryId:  form.categoryId,
      imageUrls:   photos,
      characteristics: attrs
        .filter((a) => a.value.trim())
        .map(({ key, value }) => ({ key, value: value.trim() })),
    };
    try {
      if (editingId) {
        await api.patch(`/supplier/listings/${editingId}`, payload);
        showToast("Товар обновлён — на модерации", "success");
      } else {
        await api.post("/supplier/listings", payload);
        showToast("Товар создан!", "success");
      }
      closeForm();
      loadListings();
    } catch (err: any) {
      if (err instanceof ApiError && err.status === 404) {
        showToast("Товар не найден (возможно уже удалён)", "error");
      } else {
        showToast(err.message || "Ошибка при сохранении товара", "error");
      }
    } finally { setLoading(false); }
  };

  // ── Filtered listings ─────────────────────────────────────────────────────

  const filtered = (listings?.items ?? []).filter((item) => {
    const matchesStatus = !activeFilter || item.status === activeFilter;
    const matchesSearch = !search || item.title.toLowerCase().includes(search.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  // ── Not approved gate ─────────────────────────────────────────────────────

  if (profileStatus !== null && profileStatus !== "APPROVED") {
    return (
      <div className="min-h-screen bg-background">
        <div className="flex items-center justify-center min-h-screen px-4">
          <div className="bg-card rounded-2xl border border-border shadow-sm p-8 max-w-sm w-full text-center">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-amber-100 flex items-center justify-center">
              <Package className="w-8 h-8 text-amber-600" />
            </div>
            <h2 className="text-lg font-bold text-foreground mb-2">Функция доступна после верификации</h2>
            <p className="text-sm text-muted mb-6">Управление товарами станет доступно после одобрения вашей заявки администратором.</p>
            <Link href="/dashboard" className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary text-white text-sm font-medium active:scale-95 transition">
              Вернуться на главную
            </Link>
          </div>
        </div>
        <BottomNav />
      </div>
    );
  }

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-background">
      <input
        ref={fileRef} type="file" accept="image/*" multiple className="hidden"
        onChange={(e) => { handleFiles(e.target.files); e.target.value = ""; }}
      />

      {/* ── Sticky header ── */}
      <div
        className="sticky top-0 z-40 px-4 py-3"
        style={{ background: "rgba(255,255,255,0.92)", backdropFilter: "blur(16px)", borderBottom: "1px solid var(--border)" }}
      >
        <div className="max-w-lg mx-auto flex items-center gap-3">
          <h1 className="text-lg font-bold text-foreground">Мои товары</h1>
        </div>
      </div>

      {/* ── Toast ── */}
      {toast && (
        <div className={`fixed top-16 left-1/2 -translate-x-1/2 z-60 px-4 py-2.5 rounded-xl text-sm font-medium shadow-lg ${
          toast.type === "error" ? "bg-red-600 text-white" : "bg-green-600 text-white"
        }`}>
          {toast.msg}
        </div>
      )}

      <main className="max-w-lg mx-auto px-4 pb-24">

        {/* ── Search ── */}
        <div className="relative mt-3 mb-3">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Поиск товаров..."
            className="w-full pl-10 pr-10 py-2.5 rounded-xl border border-border bg-card text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
          />
          {search && (
            <button onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2">
              <X className="w-4 h-4 text-muted" />
            </button>
          )}
        </div>

        {/* ── Filter tabs ── */}
        <div className="flex gap-1.5 overflow-x-auto pb-2 scrollbar-hide mb-4">
          {FILTER_TABS.map((tab) => (
            <button
              key={tab.value}
              onClick={() => setActiveFilter(tab.value)}
              className={`shrink-0 px-3.5 py-1.5 rounded-full text-sm font-medium transition ${
                activeFilter === tab.value
                  ? "bg-primary text-white"
                  : "bg-card border border-border text-muted"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* ── Form modal / overlay ── */}
        {showForm && (
          <div
            className="fixed inset-0 z-50 bg-black/40 flex items-end sm:items-center justify-center"
            onClick={(e) => { if (e.target === e.currentTarget) closeForm(); }}
          >
            <div
              className="bg-background w-full sm:max-w-lg rounded-t-3xl sm:rounded-2xl flex flex-col"
              style={{ maxHeight: "92dvh" }}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Modal header */}
              <div className="flex items-center justify-between px-4 pt-4 pb-2 border-b border-border shrink-0">
                <h2 className="font-bold text-foreground">{editingId ? "Редактировать товар" : "Новый товар"}</h2>
                <button type="button" onClick={closeForm}>
                  <X className="w-5 h-5 text-muted" />
                </button>
              </div>

              {/* Step indicator */}
              <div className="px-4 shrink-0">
                <StepDots current={step} />
              </div>

              {/* ── Step content (scrollable) ── */}
              <div className="flex-1 overflow-y-auto px-4 pb-2">

                {/* ══ STEP 1: Фото ══ */}
                {step === 1 && (
                  <div className="space-y-3 pt-2">
                    <p className="text-sm text-muted">Добавьте фото товара. Главное — первое изображение.</p>
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium">Фото <span className="text-muted font-normal">{photos.length}/{MAX_PHOTOS}</span></span>
                        <span className="text-[11px] text-muted">4:3 · {IMG_W}×{IMG_H}px</span>
                      </div>
                      {photos.length === 0 ? (
                        <button
                          type="button"
                          onClick={() => fileRef.current?.click()}
                          className="w-full rounded-2xl border-2 border-dashed border-border bg-card active:bg-accent transition flex flex-col items-center justify-center gap-2"
                          style={{ aspectRatio: "4/3" }}
                        >
                          <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center">
                            <svg className="w-7 h-7 text-primary" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                              <path d="M12 5v14M5 12h14" strokeLinecap="round" />
                            </svg>
                          </div>
                          <span className="text-sm text-muted">Добавить фото</span>
                        </button>
                      ) : (
                        <div className="relative rounded-2xl overflow-hidden bg-gray-100" style={{ aspectRatio: "4/3" }}>
                          <img src={photos[0]} alt="" className="absolute inset-0 w-full h-full object-cover" />
                          <button type="button" onClick={() => removePhoto(0)}
                            className="absolute top-2 right-2 w-8 h-8 rounded-full bg-black/50 text-white flex items-center justify-center active:bg-red-500 transition">
                            <X className="w-4 h-4" />
                          </button>
                          <span className="absolute bottom-2 left-2 bg-black/50 text-white text-[11px] px-2 py-0.5 rounded-full">Главное фото</span>
                        </div>
                      )}
                      {photos.length > 0 && (
                        <div className="mt-2 flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
                          {photos.slice(1).map((src, i) => (
                            <div key={i + 1} className="relative shrink-0 w-20 rounded-xl overflow-hidden bg-gray-100 group" style={{ aspectRatio: "4/3" }}>
                              <img src={src} alt="" className="absolute inset-0 w-full h-full object-cover" />
                              <button type="button" onClick={() => removePhoto(i + 1)}
                                className="absolute top-1 right-1 w-5 h-5 rounded-full bg-black/50 text-white flex items-center justify-center text-[10px] opacity-0 group-hover:opacity-100 active:opacity-100 transition">
                                ×
                              </button>
                            </div>
                          ))}
                          {photos.length < MAX_PHOTOS && (
                            <button type="button" onClick={() => fileRef.current?.click()}
                              className="shrink-0 w-20 rounded-xl border-2 border-dashed border-border bg-card flex items-center justify-center"
                              style={{ aspectRatio: "4/3" }}>
                              <svg className="w-6 h-6 text-muted" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                                <path d="M12 5v14M5 12h14" strokeLinecap="round" />
                              </svg>
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* ══ STEP 2: Основное ══ */}
                {step === 2 && (
                  <div className="space-y-4 pt-2">
                    <div>
                      <label className="block text-sm font-medium mb-1">Название <span className="text-red-400">*</span></label>
                      <input
                        value={form.title}
                        onChange={(e) => setForm({ ...form, title: e.target.value })}
                        className="w-full border border-border rounded-xl px-3.5 py-2.5 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/20"
                        placeholder="Платье летнее макси"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">Описание <span className="text-red-400">*</span></label>
                      <textarea
                        rows={4}
                        value={form.description}
                        onChange={(e) => setForm({ ...form, description: e.target.value })}
                        className="w-full border border-border rounded-xl px-3.5 py-2.5 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/20 resize-none"
                        placeholder="Материал, размеры, особенности..."
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">Цена, ₽ <span className="text-red-400">*</span></label>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        inputMode="decimal"
                        value={form.price}
                        onChange={(e) => setForm({ ...form, price: e.target.value })}
                        className="w-full border border-border rounded-xl px-3.5 py-2.5 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/20"
                        placeholder="1 500"
                      />
                    </div>
                    {editingId && (
                      <p className="text-xs text-amber-600 bg-amber-50 rounded-xl px-3 py-2">
                        После сохранения товар отправится на модерацию
                      </p>
                    )}
                  </div>
                )}

                {/* ══ STEP 3: Категория ══ */}
                {step === 3 && (
                  <div className="space-y-3 pt-2">
                    <p className="text-sm text-muted">Выберите из списка или введите своё название — ИИ подберёт подходящую категорию.</p>

                    {/* Selected badge */}
                    {form.categoryId && (
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs text-muted">Выбрано:</span>
                        <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-primary/10 text-primary text-sm font-medium">
                          {catMatchResult?.isNew && <span className="text-[10px] bg-green-500 text-white px-1.5 py-0.5 rounded-full mr-1">новая</span>}
                          {categories.find((c) => c.id === form.categoryId)?.name ?? catMatchResult?.name ?? ""}
                          <button type="button" onClick={() => { setForm((f) => ({ ...f, categoryId: "" })); setCatMatchResult(null); setCatSearch(""); }}
                            className="ml-1 text-primary/60 hover:text-red-500 transition">
                            <X className="w-3 h-3" />
                          </button>
                        </span>
                      </div>
                    )}

                    {/* Search input */}
                    <div className="flex gap-2">
                      <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" />
                        <input
                          value={catSearch}
                          onChange={(e) => { setCatSearch(e.target.value); setCatMatchResult(null); setForm((f) => ({ ...f, categoryId: "" })); }}
                          placeholder="Найти или ввести свою..."
                          className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                        />
                      </div>
                      <button
                        type="button"
                        onClick={handleCatMatch}
                        disabled={catMatchLoading || !catSearch.trim()}
                        className="px-3 py-2.5 rounded-xl bg-primary/10 text-primary text-xs font-medium hover:bg-primary/20 transition disabled:opacity-40 shrink-0"
                      >
                        {catMatchLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : "ИИ"}
                      </button>
                    </div>

                    {/* AI match result info */}
                    {catMatchResult && (
                      <div className={`text-xs rounded-xl px-3 py-2 ${catMatchResult.isNew ? "bg-green-50 text-green-700 border border-green-200" : "bg-blue-50 text-blue-700 border border-blue-200"}`}>
                        {catMatchResult.isNew
                          ? `Создана новая категория «${catMatchResult.name}»`
                          : `ИИ подобрал: «${catMatchResult.name}»`}
                      </div>
                    )}

                    {/* Category list */}
                    <div className="space-y-1 max-h-48 overflow-y-auto pr-1">
                      {filteredCategories.length === 0 && catSearch.trim() && (
                        <p className="text-xs text-muted text-center py-4">
                          Категория не найдена — нажмите «ИИ» для автоподбора
                        </p>
                      )}
                      {filteredCategories.map((cat) => (
                        <button
                          key={cat.id}
                          type="button"
                          onClick={() => selectCategory(cat)}
                          className={`w-full flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl text-left text-sm transition ${
                            form.categoryId === cat.id
                              ? "bg-primary text-white"
                              : "bg-card border border-border hover:bg-accent active:bg-accent"
                          }`}
                        >
                          {cat.icon && <span>{cat.icon}</span>}
                          <span className="font-medium">{cat.name}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* ══ STEP 4: Характеристики ══ */}
                {step === 4 && (
                  <div className="space-y-3 pt-2">
                    <p className="text-sm text-muted">Необязательно. Помогает покупателям найти товар.</p>

                    <div className="space-y-2">
                      {attrs.map((attr, i) => (
                        <div key={i} className="flex items-center gap-2">
                          {/* Key — locked, не редактируется */}
                          <div className="w-36 shrink-0">
                            <span className="block text-xs font-medium text-muted bg-accent border border-border rounded-lg px-3 py-2.5 truncate">
                              {attr.key}
                            </span>
                          </div>
                          {/* Value — editable */}
                          <input
                            value={attr.value}
                            onChange={(e) => setAttrValue(i, e.target.value)}
                            placeholder="Значение"
                            className="flex-1 border border-border rounded-lg px-3 py-2.5 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/20"
                          />
                          {/* Remove button — only for custom attrs (index >= PREDEFINED_KEYS.length) */}
                          {i >= PREDEFINED_KEYS.length ? (
                            <button type="button" onClick={() => removeAttr(i)}
                              className="shrink-0 w-8 h-8 flex items-center justify-center text-muted hover:text-red-500 transition rounded-lg hover:bg-red-50">
                              <Trash2 className="w-4 h-4" />
                            </button>
                          ) : (
                            <div className="w-8 shrink-0" />
                          )}
                        </div>
                      ))}
                    </div>

                    {/* Add custom characteristic */}
                    <div className="flex items-center gap-2 pt-1">
                      <input
                        ref={newAttrKeyRef}
                        value={newAttrKey}
                        onChange={(e) => setNewAttrKey(e.target.value)}
                        onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addCustomAttr(); } }}
                        placeholder="Название характеристики..."
                        className="flex-1 border border-dashed border-border rounded-lg px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/20"
                      />
                      <button
                        type="button"
                        onClick={addCustomAttr}
                        disabled={!newAttrKey.trim()}
                        className="shrink-0 w-9 h-9 flex items-center justify-center rounded-lg bg-primary/10 text-primary hover:bg-primary/20 transition disabled:opacity-40"
                      >
                        <Plus className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* ── Navigation buttons ── */}
              <div className="px-4 pt-3 pb-4 border-t border-border shrink-0">
                <div className={`flex gap-3 ${step > 1 ? "justify-between" : "justify-end"}`}>
                  {step > 1 && (
                    <button
                      type="button"
                      onClick={goPrev}
                      className="flex items-center gap-1.5 px-5 py-3 rounded-xl border border-border bg-card text-sm font-medium text-foreground hover:bg-accent active:scale-[0.97] transition"
                    >
                      <ChevronLeft className="w-4 h-4" />
                      Назад
                    </button>
                  )}

                  {step < 4 ? (
                    <button
                      type="button"
                      onClick={goNext}
                      disabled={!canGoNext()}
                      className="flex items-center gap-1.5 px-6 py-3 rounded-xl bg-primary text-white text-sm font-medium hover:bg-primary/90 active:scale-[0.97] transition disabled:opacity-40"
                    >
                      Далее
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={handleSubmit}
                      disabled={loading || !form.categoryId}
                      className="flex items-center gap-1.5 px-6 py-3 rounded-xl bg-primary text-white text-sm font-medium hover:bg-primary/90 active:scale-[0.97] transition disabled:opacity-40"
                    >
                      {loading ? (
                        <><Loader2 className="w-4 h-4 animate-spin" /> Сохранение...</>
                      ) : editingId ? "Сохранить изменения" : "Создать товар"}
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── Listings ── */}
        {!listings ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <div className="w-10 h-10 rounded-full border-2 border-primary border-t-transparent animate-spin" />
            <p className="text-sm text-muted">Загружаем товары…</p>
          </div>
        ) : filtered.length === 0 ? (
          search || activeFilter ? (
            <div className="flex flex-col items-center justify-center py-16 gap-4">
              <svg width="80" height="80" viewBox="0 0 80 80" fill="none" className="opacity-60">
                <circle cx="34" cy="34" r="20" stroke="#d1d5db" strokeWidth="3" fill="none"/>
                <path d="M48 48L60 60" stroke="#d1d5db" strokeWidth="3" strokeLinecap="round"/>
                <path d="M28 34h12M34 28v12" stroke="#d1d5db" strokeWidth="2.5" strokeLinecap="round"/>
              </svg>
              <div className="text-center">
                <p className="font-semibold text-foreground">Ничего не найдено</p>
                <p className="text-sm text-muted mt-1">Попробуйте изменить фильтры или поисковый запрос</p>
              </div>
              <button
                onClick={() => { setSearch(""); setActiveFilter(""); }}
                className="px-4 py-2 rounded-xl border border-border text-sm font-medium text-muted active:bg-accent transition"
              >
                Сбросить фильтры
              </button>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-12 gap-5">
              <div className="relative">
                <svg width="120" height="120" viewBox="0 0 120 120" fill="none">
                  <rect x="20" y="45" width="80" height="55" rx="8" fill="#f3f4f6" stroke="#e5e7eb" strokeWidth="1.5"/>
                  <path d="M20 45 L20 32 Q20 28 24 28 L44 28 L44 45" fill="#e9eaec" stroke="#e5e7eb" strokeWidth="1.5"/>
                  <path d="M100 45 L100 32 Q100 28 96 28 L76 28 L76 45" fill="#e9eaec" stroke="#e5e7eb" strokeWidth="1.5"/>
                  <path d="M44 28 L60 38 L76 28" stroke="#d1d5db" strokeWidth="1.5" strokeLinecap="round" fill="none"/>
                  <rect x="50" y="26" width="20" height="21" rx="2" fill="#dbeafe" stroke="#bfdbfe" strokeWidth="1"/>
                  <circle cx="18" cy="20" r="2.5" fill="#fde68a"/>
                  <circle cx="102" cy="30" r="2" fill="#c7d2fe"/>
                  <circle cx="60" cy="72" r="14" fill="white" stroke="#e5e7eb" strokeWidth="1"/>
                  <path d="M60 66 L60 78 M54 72 L66 72" stroke="#9ca3af" strokeWidth="2" strokeLinecap="round"/>
                </svg>
              </div>
              <div className="text-center px-4">
                <p className="font-bold text-foreground text-base">Пока нет товаров</p>
                <p className="text-sm text-muted mt-1.5 leading-relaxed">Добавить товары можно на главной странице</p>
              </div>
            </div>
          )
        ) : (
          <div className="space-y-3">
            {filtered.map((item) => (
              <div key={item.id} className="bg-card rounded-2xl border border-border flex items-stretch overflow-hidden">
                {/* Image */}
                <div className="w-16 h-16 shrink-0 bg-gray-100 flex items-center justify-center self-center ml-3 my-3 rounded-xl overflow-hidden">
                  {item.images[0] ? (
                    <img src={item.images[0].url} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <Package className="w-6 h-6 text-gray-300" />
                  )}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0 px-3 py-3 flex flex-col justify-between">
                  <div>
                    <p className="text-sm font-semibold text-foreground truncate">{item.title}</p>
                    <p className="text-sm font-bold text-foreground mt-0.5">
                      {(item.price / 100).toLocaleString("ru-RU")} ₽
                    </p>
                  </div>
                  <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                    <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${STATUS_COLORS[item.status] || "bg-gray-100 text-gray-600"}`}>
                      {STATUS_LABELS[item.status] || item.status}
                    </span>
                  </div>
                </div>

                {/* Edit button */}
                <button
                  onClick={() => openEdit(item)}
                  className="px-3 flex items-center justify-center text-muted hover:text-foreground transition border-l border-border"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        )}
      </main>

      <BottomNav />
    </div>
  );
}

export default function SellerProductsPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div>}>
      <SellerProductsPageInner />
    </Suspense>
  );
}
