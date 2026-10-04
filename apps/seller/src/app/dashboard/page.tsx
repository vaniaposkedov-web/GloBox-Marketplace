"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Store, Package, Eye, Heart, ShoppingCart, Plus, X, ChevronLeft, ChevronRight,
  Trash2, Archive, Globe, PenLine, Check, Camera, GripVertical, Star,
  BarChart2, Layers, Tag, AlignLeft, Image as ImageIcon,
} from "lucide-react";
import { api, API_BASE } from "@/lib/api";
import { getToken, clearSession } from "@/lib/auth";
import { VerificationBanner, type SellerStatus } from "@/components/VerificationBanner";
import { BottomNav } from "@/components/BottomNav";

// ── Types ──────────────────────────────────────────────────────────────────────

interface Category { id: string; name: string; slug: string; icon?: string | null; parentId?: string | null }

interface ListingImage { id: string; url: string; order: number }

interface VariantListing {
  id: string;
  title: string;
  images: { url: string }[];
}

interface VariantGroup {
  id: string;
  listings: VariantListing[];
}

interface Listing {
  id: string;
  title: string;
  shortDescription?: string | null;
  description: string;
  price: number;
  stock: number;
  status: string;
  category: { id: string; name: string; parentId?: string | null };
  images: ListingImage[];
  viewCount: number;
  cartCount: number;
  favoritesCount: number;
  characteristics?: { key: string; value: string }[] | null;
  variantGroupId?: string | null;
  variantGroup?: VariantGroup | null;
  createdAt: string;
}

interface ProfileResponse {
  user: { id: string; email: string; firstName: string; lastName: string; phone: string; avatarUrl?: string | null };
  profile: { id: string; status: SellerStatus; rejectionReason?: string | null; firstName: string; lastName: string; pavilionNumber: string } | null;
}

interface ListingsResponse { items: Listing[]; total: number }

// ── Form state ─────────────────────────────────────────────────────────────────

interface FormState {
  title: string;
  shortDescription: string;
  description: string;
  price: string;
  stock: string;
  categoryId: string;
  characteristics: { key: string; value: string }[];
  variantGroupId: string | null;
  status: string;
}

const EMPTY_FORM: FormState = {
  title: "", shortDescription: "", description: "",
  price: "", stock: "1", categoryId: "",
  characteristics: [], variantGroupId: null, status: "PUBLISHED",
};

// ── Constants ─────────────────────────────────────────────────────────────────

const MAX_PHOTOS = 10;
const IMG_W = 1200;
const IMG_H = 900;

const STATUS_CFG: Record<string, { label: string; color: string; dot: string }> = {
  PUBLISHED: { label: "Активен",   color: "text-green-700 bg-green-100",  dot: "bg-green-500" },
  DRAFT:     { label: "Черновик",  color: "text-gray-600 bg-gray-100",    dot: "bg-gray-400" },
  ARCHIVED:  { label: "Архив",     color: "text-orange-700 bg-orange-100",dot: "bg-orange-400" },
  SOLD:      { label: "Продан",    color: "text-blue-700 bg-blue-100",    dot: "bg-blue-500" },
};

const COMMON_CHARS = [
  "Цвет", "Материал", "Размер", "Страна производства", "Бренд",
  "Пол", "Сезон", "Комплектация", "Длина", "Ширина",
];

// ── Image helpers ─────────────────────────────────────────────────────────────

function compressImage(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Не удалось прочитать файл"));
    reader.onload = (ev) => {
      const img = new window.Image();
      img.onerror = () => reject(new Error("Не удалось открыть изображение"));
      img.onload = () => {
        const canvas = document.createElement("canvas");
        canvas.width = IMG_W; canvas.height = IMG_H;
        const ctx = canvas.getContext("2d")!;
        ctx.fillStyle = "#fff";
        ctx.fillRect(0, 0, IMG_W, IMG_H);
        const scale = Math.max(IMG_W / img.width, IMG_H / img.height);
        const sw = IMG_W / scale; const sh = IMG_H / scale;
        const sx = (img.width - sw) / 2; const sy = (img.height - sh) / 2;
        ctx.drawImage(img, sx, sy, sw, sh, 0, 0, IMG_W, IMG_H);
        resolve(canvas.toDataURL("image/jpeg", 0.84));
      };
      img.src = ev.target!.result as string;
    };
    reader.readAsDataURL(file);
  });
}

async function uploadPhoto(dataUrl: string): Promise<string> {
  const r = await api.post<{ url: string }>("/supplier/upload", { data: dataUrl, ext: "jpg" });
  return r.url.startsWith("http") ? r.url : `${API_BASE}${r.url}`;
}

// ── Avatar gradient ───────────────────────────────────────────────────────────

function avatarGradient(name: string): string {
  const g = [
    "linear-gradient(135deg,#6366f1,#a855f7)",
    "linear-gradient(135deg,#0ea5e9,#6366f1)",
    "linear-gradient(135deg,#10b981,#0ea5e9)",
    "linear-gradient(135deg,#f59e0b,#ef4444)",
    "linear-gradient(135deg,#ec4899,#a855f7)",
  ];
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) & 0xffff;
  return g[h % g.length];
}

// ── Stat pill ─────────────────────────────────────────────────────────────────

function StatPill({ icon: Icon, value, color }: { icon: React.ElementType; value: number; color: string }) {
  return (
    <div className="flex items-center gap-1">
      <Icon className={`w-3 h-3 ${color}`} />
      <span className={`text-[11px] font-semibold ${color}`}>{value.toLocaleString("ru-RU")}</span>
    </div>
  );
}

// ── Product Card ──────────────────────────────────────────────────────────────

function ProductCard({ item, index, onClick }: { item: Listing; index: number; onClick: () => void }) {
  const st = STATUS_CFG[item.status] ?? STATUS_CFG.DRAFT;
  const [imgLoaded, setImgLoaded] = useState(false);
  const cover = item.images[0]?.url;

  return (
    <button
      type="button"
      onClick={onClick}
      className="product-card bg-card rounded-2xl border border-border overflow-hidden text-left w-full active:scale-[0.97] transition-transform"
      style={{ animationDelay: `${index * 60}ms` }}
    >
      {/* Photo */}
      <div className="relative bg-gray-100 overflow-hidden" style={{ aspectRatio: "4/3" }}>
        {cover ? (
          <>
            <img
              src={cover}
              alt={item.title}
              className={`w-full h-full object-cover transition-opacity duration-300 ${imgLoaded ? "opacity-100" : "opacity-0"}`}
              onLoad={() => setImgLoaded(true)}
            />
            {!imgLoaded && (
              <div className="absolute inset-0 bg-linear-to-br from-gray-200 to-gray-100 animate-pulse" />
            )}
          </>
        ) : (
          <div className="absolute inset-0 flex items-center justify-center">
            <ImageIcon className="w-10 h-10 text-gray-300" />
          </div>
        )}
        {/* Status badge */}
        <div className={`absolute top-2 left-2 flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full ${st.color}`}>
          <span className={`w-1.5 h-1.5 rounded-full ${st.dot}`} />
          {st.label}
        </div>
        {/* Photo count */}
        {item.images.length > 1 && (
          <div className="absolute bottom-2 right-2 text-[10px] bg-black/50 text-white px-1.5 py-0.5 rounded-full">
            {item.images.length} фото
          </div>
        )}
      </div>

      {/* Info */}
      <div className="p-3 space-y-2">
        <div>
          <p className="text-sm font-semibold text-foreground line-clamp-2 leading-snug">{item.title}</p>
          <p className="text-base font-black text-foreground mt-1">
            {(item.price / 100).toLocaleString("ru-RU")} ₽
          </p>
        </div>

        {/* Stats row */}
        <div className="flex items-center gap-3 pt-1 border-t border-border/50">
          <StatPill icon={Eye}          value={item.viewCount}      color="text-blue-500" />
          <StatPill icon={ShoppingCart} value={item.cartCount}      color="text-emerald-600" />
          <StatPill icon={Heart}        value={item.favoritesCount} color="text-rose-500" />
        </div>
      </div>
    </button>
  );
}

// ── Step indicator ────────────────────────────────────────────────────────────

function StepDots({ total, current }: { total: number; current: number }) {
  const labels = ["Фото", "Описание", "Хар-ки", "Варианты"];
  return (
    <div className="flex items-center gap-1 justify-center">
      {Array.from({ length: total }).map((_, i) => (
        <div
          key={i}
          className={`flex items-center gap-1 text-[11px] font-semibold px-2.5 py-1 rounded-full transition-all ${
            i === current
              ? "bg-primary text-white scale-105"
              : i < current
              ? "bg-primary/20 text-primary"
              : "bg-gray-100 text-muted"
          }`}
        >
          <span className={`w-4 h-4 rounded-full flex items-center justify-center text-[10px] font-black ${i === current ? "bg-white/30" : ""}`}>
            {i < current ? <Check className="w-2.5 h-2.5" /> : i + 1}
          </span>
          {labels[i]}
        </div>
      ))}
    </div>
  );
}

// ── Photo step ────────────────────────────────────────────────────────────────

function PhotoStep({ photos, setPhotos, uploading, setUploading }:
  { photos: string[]; setPhotos: (p: string[]) => void; uploading: boolean; setUploading: (v: boolean) => void }) {
  const fileRef = useRef<HTMLInputElement>(null);
  const cameraRef = useRef<HTMLInputElement>(null);
  const [dragIdx, setDragIdx] = useState<number | null>(null);
  const [overIdx, setOverIdx] = useState<number | null>(null);

  const handleFiles = async (files: FileList | null) => {
    if (!files) return;
    setUploading(true);
    const toProcess = Array.from(files).slice(0, MAX_PHOTOS - photos.length);
    const urls: string[] = [];
    for (const f of toProcess) {
      try {
        const compressed = await compressImage(f);
        const url = await uploadPhoto(compressed);
        urls.push(url);
      } catch { /* skip */ }
    }
    setPhotos([...photos, ...urls]);
    setUploading(false);
  };

  const remove = (i: number) => setPhotos(photos.filter((_, idx) => idx !== i));
  const setMain = (i: number) => {
    const arr = [...photos];
    const [item] = arr.splice(i, 1);
    arr.unshift(item);
    setPhotos(arr);
  };

  const onDragStart = (i: number) => setDragIdx(i);
  const onDragOver = (e: React.DragEvent, i: number) => { e.preventDefault(); setOverIdx(i); };
  const onDrop = (i: number) => {
    if (dragIdx === null || dragIdx === i) { setDragIdx(null); setOverIdx(null); return; }
    const arr = [...photos];
    const [item] = arr.splice(dragIdx, 1);
    arr.splice(i, 0, item);
    setPhotos(arr);
    setDragIdx(null); setOverIdx(null);
  };

  return (
    <div className="space-y-4">
      <input ref={fileRef}   type="file" accept="image/*" multiple className="hidden" onChange={e => { handleFiles(e.target.files); e.target.value = ""; }} />
      <input ref={cameraRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={e => { handleFiles(e.target.files); e.target.value = ""; }} />

      {/* Main photo slot */}
      {photos.length === 0 ? (
        <div
          onClick={() => fileRef.current?.click()}
          className="w-full rounded-2xl border-2 border-dashed border-primary/30 bg-primary/3 flex flex-col items-center justify-center gap-3 cursor-pointer hover:bg-primary/5 transition-colors"
          style={{ aspectRatio: "4/3" }}
        >
          {uploading ? (
            <div className="w-10 h-10 rounded-full border-3 border-primary border-t-transparent animate-spin" style={{ borderWidth: 3 }} />
          ) : (
            <>
              <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center">
                <ImageIcon className="w-8 h-8 text-primary" />
              </div>
              <div className="text-center">
                <p className="font-semibold text-sm text-foreground">Добавить фотографии</p>
                <p className="text-xs text-muted mt-0.5">До {MAX_PHOTOS} штук, формат 4:3</p>
              </div>
              <div className="flex items-center gap-2">
                <button type="button" onClick={e => { e.stopPropagation(); fileRef.current?.click(); }}
                  className="flex items-center gap-1.5 text-xs px-3 py-2 rounded-xl bg-primary text-white font-semibold">
                  <ImageIcon className="w-3.5 h-3.5" /> Галерея
                </button>
                <button type="button" onClick={e => { e.stopPropagation(); cameraRef.current?.click(); }}
                  className="flex items-center gap-1.5 text-xs px-3 py-2 rounded-xl border border-border font-semibold">
                  <Camera className="w-3.5 h-3.5" /> Камера
                </button>
              </div>
            </>
          )}
        </div>
      ) : (
        <div className="relative rounded-2xl overflow-hidden bg-gray-100" style={{ aspectRatio: "4/3" }}>
          <img src={photos[0]} alt="Главное" className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-linear-to-t from-black/40 via-transparent to-transparent" />
          <div className="absolute bottom-3 left-3">
            <span className="text-white text-xs font-bold bg-black/50 px-2.5 py-1 rounded-full">Главное фото</span>
          </div>
          <button type="button" onClick={() => remove(0)}
            className="absolute top-3 right-3 w-8 h-8 rounded-full bg-black/50 text-white flex items-center justify-center hover:bg-red-500 transition-colors">
            <X className="w-4 h-4" />
          </button>
          {uploading && (
            <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
              <div className="w-10 h-10 rounded-full border-3 border-white border-t-transparent animate-spin" style={{ borderWidth: 3 }} />
            </div>
          )}
        </div>
      )}

      {/* Thumbnails grid */}
      {photos.length > 0 && (
        <div className="grid grid-cols-5 gap-2">
          {photos.map((src, i) => (
            <div
              key={src + i}
              draggable
              onDragStart={() => onDragStart(i)}
              onDragOver={e => onDragOver(e, i)}
              onDrop={() => onDrop(i)}
              className={`relative rounded-xl overflow-hidden cursor-grab group transition-all ${
                overIdx === i ? "ring-2 ring-primary scale-105" : ""
              } ${i === 0 ? "ring-2 ring-primary/70" : ""}`}
              style={{ aspectRatio: "4/3" }}
            >
              <img src={src} alt="" className="w-full h-full object-cover" />
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors" />
              {i === 0 && (
                <div className="absolute top-1 left-1 w-4 h-4 rounded-full bg-primary flex items-center justify-center">
                  <Star className="w-2.5 h-2.5 text-white fill-white" />
                </div>
              )}
              <button type="button" onClick={() => remove(i)}
                className="absolute top-1 right-1 w-5 h-5 rounded-full bg-red-500 text-white opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-[10px]">
                ×
              </button>
              {i !== 0 && (
                <button type="button" onClick={() => setMain(i)}
                  className="absolute bottom-1 left-1/2 -translate-x-1/2 text-[9px] bg-black/60 text-white px-1 py-0.5 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                  Главное
                </button>
              )}
              <GripVertical className="absolute bottom-1 right-1 w-3 h-3 text-white/70 opacity-0 group-hover:opacity-100" />
            </div>
          ))}
          {photos.length < MAX_PHOTOS && (
            <button type="button" onClick={() => fileRef.current?.click()}
              className="rounded-xl border-2 border-dashed border-border bg-card flex items-center justify-center hover:border-primary hover:bg-primary/5 transition-colors"
              style={{ aspectRatio: "4/3" }}>
              <Plus className="w-5 h-5 text-muted" />
            </button>
          )}
        </div>
      )}

      <p className="text-xs text-center text-muted">
        Перетаскивайте для изменения порядка · {photos.length}/{MAX_PHOTOS} фото
      </p>
    </div>
  );
}

// ── Characteristics step ──────────────────────────────────────────────────────

function CharacteristicsStep({ chars, onChange }: {
  chars: { key: string; value: string }[];
  onChange: (v: { key: string; value: string }[]) => void;
}) {
  const [newKey, setNewKey] = useState("");

  const remove = (i: number) => onChange(chars.filter((_, idx) => idx !== i));
  const updateValue = (i: number, v: string) => {
    const next = [...chars];
    next[i] = { ...next[i], value: v };
    onChange(next);
  };
  const addPreset = (k: string) => {
    if (chars.some(c => c.key === k)) return;
    onChange([...chars, { key: k, value: "" }]);
  };
  const addCustom = () => {
    const k = newKey.trim();
    if (!k || chars.some(c => c.key === k)) return;
    onChange([...chars, { key: k, value: "" }]);
    setNewKey("");
  };

  return (
    <div className="space-y-4">
      {/* Preset chips */}
      <div className="flex flex-wrap gap-1.5">
        {COMMON_CHARS.filter(k => !chars.some(c => c.key === k)).map(k => (
          <button key={k} type="button" onClick={() => addPreset(k)}
            className="text-xs px-3 py-1.5 rounded-full border border-border bg-card hover:bg-accent transition-colors flex items-center gap-1">
            <Plus className="w-3 h-3 text-primary" />{k}
          </button>
        ))}
      </div>

      {/* Rows — ключ заблокирован, только значение редактируемо */}
      <div className="space-y-2">
        {chars.map((c, i) => (
          <div key={i} className="flex items-center gap-2 p-3 bg-card rounded-xl border border-border char-row">
            {/* Key: locked label */}
            <span className="w-28 shrink-0 text-sm font-semibold text-foreground truncate select-none">
              {c.key}
            </span>
            <span className="text-border text-sm">·</span>
            {/* Value: editable */}
            <input
              value={c.value}
              onChange={e => updateValue(i, e.target.value)}
              placeholder="Значение"
              className="flex-1 text-sm bg-transparent focus:outline-none text-muted placeholder:text-muted min-w-0"
            />
            <button type="button" onClick={() => remove(i)}
              className="shrink-0 w-6 h-6 rounded-full bg-red-50 text-red-400 hover:bg-red-100 flex items-center justify-center transition-colors">
              <X className="w-3 h-3" />
            </button>
          </div>
        ))}
      </div>

      {/* Add custom — имя вводится один раз, затем фиксируется */}
      <div className="flex gap-2">
        <input
          value={newKey}
          onChange={e => setNewKey(e.target.value)}
          onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); addCustom(); } }}
          placeholder="Своя характеристика (напр. Длина)..."
          className="flex-1 border border-dashed border-border rounded-xl px-3.5 py-2.5 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/20 transition"
        />
        <button type="button" onClick={addCustom} disabled={!newKey.trim()}
          className="shrink-0 px-3.5 rounded-xl bg-primary/10 text-primary hover:bg-primary/20 transition disabled:opacity-40 flex items-center">
          <Plus className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

// ── Variants step (WB-style) ──────────────────────────────────────────────────

function VariantsStep({ currentId, allListings, variantGroupId, setVariantGroupId, onRefresh }:
  {
    currentId: string | null;
    allListings: Listing[];
    variantGroupId: string | null;
    setVariantGroupId: (id: string | null) => void;
    onRefresh?: () => void;
  }
) {
  const [creating, setCreating] = useState(false);
  const [actionId, setActionId] = useState<string | null>(null);

  // Участники группы (не считая текущего)
  const groupMembers = variantGroupId
    ? allListings.filter(l => l.id !== currentId && l.variantGroupId === variantGroupId)
    : [];

  // Товары вне группы (доступные для добавления)
  const available = allListings.filter(
    l => l.id !== currentId && l.variantGroupId !== variantGroupId
  );

  const createGroup = async () => {
    setCreating(true);
    try {
      const g = await api.post<{ id: string }>("/supplier/variant-groups");
      setVariantGroupId(g.id);
    } catch { /* ignore */ } finally { setCreating(false); }
  };

  const addToGroup = async (listingId: string) => {
    if (!variantGroupId) return;
    setActionId(listingId);
    try {
      await api.patch(`/supplier/listings/${listingId}`, { variantGroupId });
      onRefresh?.();
    } catch { /* ignore */ } finally { setActionId(null); }
  };

  const removeFromGroup = async (listingId: string) => {
    setActionId(listingId);
    try {
      await api.patch(`/supplier/listings/${listingId}`, { variantGroupId: null });
      onRefresh?.();
    } catch { /* ignore */ } finally { setActionId(null); }
  };

  const disbandGroup = async () => {
    if (!variantGroupId) return;
    if (!confirm("Расформировать группу вариантов? Все товары группы станут независимыми.")) return;
    setCreating(true);
    try {
      // Убираем из группы всех участников
      await Promise.all(
        groupMembers.map(m => api.patch(`/supplier/listings/${m.id}`, { variantGroupId: null }))
      );
      setVariantGroupId(null);
      onRefresh?.();
    } catch { /* ignore */ } finally { setCreating(false); }
  };

  return (
    <div className="space-y-4">
      <div className="bg-blue-50 border border-blue-200 rounded-xl px-4 py-3 text-xs text-blue-700">
        <p className="font-semibold mb-1">💡 Группа вариантов</p>
        <p>Объедините несколько товаров (например одно платье в разных цветах) — покупатель увидит варианты прямо в карточке.</p>
      </div>

      {!variantGroupId ? (
        /* ── Нет группы ── */
        <div className="text-center py-6 space-y-3">
          <div className="w-16 h-16 rounded-2xl bg-gray-100 mx-auto flex items-center justify-center">
            <Layers className="w-8 h-8 text-gray-400" />
          </div>
          <div>
            <p className="font-semibold text-sm">Нет группы вариантов</p>
            <p className="text-xs text-muted mt-1">Нажмите «Создать», затем добавьте другие товары в группу</p>
          </div>
          <button type="button" onClick={createGroup} disabled={creating}
            className="px-5 py-2.5 rounded-xl bg-primary text-white text-sm font-semibold hover:bg-primary/90 transition disabled:opacity-50 flex items-center gap-2 mx-auto">
            {creating
              ? <><span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />Создание...</>
              : <><Plus className="w-4 h-4" />Создать группу вариантов</>}
          </button>
        </div>
      ) : (
        /* ── Есть группа ── */
        <div className="space-y-4">

          {/* Заголовок группы */}
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold">
              Группа вариантов
              <span className="ml-2 text-[11px] font-normal text-muted bg-accent px-2 py-0.5 rounded-full">
                {groupMembers.length + 1} товар{groupMembers.length === 0 ? "" : groupMembers.length < 4 ? "а" : "ов"}
              </span>
            </p>
            <button type="button" onClick={disbandGroup} disabled={creating}
              className="text-xs text-red-500 hover:text-red-700 transition">
              Расформировать
            </button>
          </div>

          {/* Полоса предпросмотра */}
          <div>
            <p className="text-[11px] text-muted mb-2">Предпросмотр:</p>
            <div className="flex gap-2 overflow-x-auto pb-1">
              <div className="shrink-0 w-14 rounded-xl overflow-hidden ring-2 ring-primary relative" style={{ aspectRatio: "4/3" }}>
                <div className="w-full h-full bg-primary/10 flex items-center justify-center">
                  <span className="text-[9px] text-primary font-bold">Этот</span>
                </div>
              </div>
              {groupMembers.map(m => (
                <div key={m.id} className="shrink-0 w-14 rounded-xl overflow-hidden border-2 border-border relative group" style={{ aspectRatio: "4/3" }}>
                  {m.images[0]
                    ? <img src={m.images[0].url} alt={m.title} className="w-full h-full object-cover" />
                    : <div className="w-full h-full bg-gray-100 flex items-center justify-center"><ImageIcon className="w-4 h-4 text-gray-300" /></div>
                  }
                  <button
                    type="button"
                    onClick={() => removeFromGroup(m.id)}
                    disabled={actionId === m.id}
                    className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition flex items-center justify-center"
                  >
                    {actionId === m.id
                      ? <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                      : <X className="w-4 h-4 text-white" />}
                  </button>
                </div>
              ))}
            </div>
            {groupMembers.length > 0 && (
              <p className="text-[10px] text-muted mt-1">Наведите на товар в полосе чтобы убрать его из группы</p>
            )}
          </div>

          {/* Текущие участники списком */}
          {groupMembers.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-semibold text-muted uppercase tracking-wider">В группе:</p>
              {groupMembers.map(m => (
                <div key={m.id} className="flex items-center gap-3 p-2.5 rounded-xl border border-border bg-card">
                  <div className="w-10 shrink-0 rounded-lg overflow-hidden" style={{ aspectRatio: "4/3" }}>
                    {m.images[0]
                      ? <img src={m.images[0].url} alt="" className="w-full h-full object-cover" />
                      : <div className="w-full h-full bg-gray-100" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{m.title}</p>
                    <p className="text-xs text-muted">{(m.price / 100).toLocaleString("ru-RU")} ₽</p>
                  </div>
                  <button type="button" onClick={() => removeFromGroup(m.id)} disabled={actionId === m.id}
                    className="shrink-0 w-7 h-7 rounded-full bg-red-50 text-red-400 hover:bg-red-100 flex items-center justify-center transition">
                    {actionId === m.id
                      ? <span className="w-3.5 h-3.5 border-2 border-red-300 border-t-red-500 rounded-full animate-spin" />
                      : <X className="w-3.5 h-3.5" />}
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Добавить из доступных */}
          <div className="space-y-2">
            <p className="text-xs font-semibold text-muted uppercase tracking-wider">
              Добавить в группу:
            </p>
            {available.length === 0 ? (
              <p className="text-sm text-muted text-center py-4 bg-card rounded-xl border border-border">
                Нет других товаров для добавления
              </p>
            ) : (
              available.map(item => (
                <button key={item.id} type="button"
                  onClick={() => addToGroup(item.id)}
                  disabled={actionId === item.id}
                  className="w-full flex items-center gap-3 p-2.5 rounded-xl border border-border hover:bg-accent active:bg-accent transition-colors text-left disabled:opacity-50">
                  <div className="w-10 shrink-0 rounded-lg overflow-hidden" style={{ aspectRatio: "4/3" }}>
                    {item.images[0]
                      ? <img src={item.images[0].url} alt="" className="w-full h-full object-cover" />
                      : <div className="w-full h-full bg-gray-100" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{item.title}</p>
                    <p className="text-xs text-muted">{(item.price / 100).toLocaleString("ru-RU")} ₽</p>
                  </div>
                  {actionId === item.id
                    ? <span className="w-4 h-4 border-2 border-primary/40 border-t-primary rounded-full animate-spin shrink-0" />
                    : <Plus className="w-4 h-4 text-primary shrink-0" />}
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Product Modal ─────────────────────────────────────────────────────────────

function ProductModal({
  item, allListings, categories, onClose, onSave, onDelete, onRefresh,
}: {
  item: Listing | "new";
  allListings: Listing[];
  categories: Category[];
  onClose: () => void;
  onSave: (id: string | null, form: FormState, photos: string[]) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  onRefresh?: () => void;
}) {
  const isNew = item === "new";
  const listing = isNew ? null : item as Listing;

  const [step, setStep] = useState(0);
  const [form, setForm] = useState<FormState>(
    listing
      ? {
          title: listing.title,
          shortDescription: listing.shortDescription ?? "",
          description: listing.description,
          price: (listing.price / 100).toString(),
          stock: listing.stock.toString(),
          categoryId: listing.category.id,
          characteristics: (listing.characteristics as { key: string; value: string }[]) ?? [],
          variantGroupId: listing.variantGroupId ?? null,
          status: listing.status,
        }
      : { ...EMPTY_FORM }
  );
  const [photos, setPhotos] = useState<string[]>(listing?.images.map(i => i.url) ?? []);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [previewSlide, setPreviewSlide] = useState(0);
  const [mode, setMode] = useState<"edit" | "preview">("edit");
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // ── Состояние: категория (родитель) ──────────────────────────────────────
  const [catQuery, setCatQuery]         = useState(() => {
    const cat = listing?.category;
    if (!cat) return "";
    return cat.parentId ? (categories.find(c => c.id === cat.parentId)?.name ?? "") : cat.name;
  });
  const [catId, setCatId]               = useState(() => {
    const cat = listing?.category;
    if (!cat) return "";
    return cat.parentId ? cat.parentId : cat.id;
  });
  const [catLoading, setCatLoading]     = useState(false);
  const [catResult, setCatResult]       = useState<{ name: string; isNew: boolean } | null>(null);
  const [catHint, setCatHint]           = useState<string | null>(null);

  // ── Состояние: подкатегория ───────────────────────────────────────────────
  const [subQuery, setSubQuery]         = useState(() => {
    const cat = listing?.category;
    return (cat?.parentId) ? cat.name : "";
  });
  const [subId, setSubId]               = useState(() => {
    const cat = listing?.category;
    return (cat?.parentId) ? cat.id : "";
  });
  const [subLoading, setSubLoading]     = useState(false);
  const [subResult, setSubResult]       = useState<{ name: string; isNew: boolean } | null>(null);
  const [subHint, setSubHint]           = useState<string | null>(null);

  // Финальный categoryId = sub если выбран, иначе cat
  const finalCatId = subId || catId;

  const [catError, setCatError] = useState<string | null>(null);
  const [subError, setSubError] = useState<string | null>(null);

  // Синхронизируем form.categoryId с финальным выбором
  useEffect(() => {
    setForm(f => ({ ...f, categoryId: finalCatId }));
  }, [catId, subId]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Общая функция вызова AI match ────────────────────────────────────────
  type MatchRes = { id: string; name: string; parentId: string | null; parentName: string | null; isNew: boolean; noMatch?: boolean; hint?: string };

  const runMatch = async (query: string, parentId: string | null): Promise<MatchRes | null> => {
    try {
      const body: { query: string; parentId?: string } = { query };
      if (parentId) body.parentId = parentId;
      return await api.post<MatchRes>("/supplier/categories/match", body);
    } catch (err: any) {
      return { id: "", name: "", parentId: null, parentName: null, isNew: false, noMatch: true, hint: err?.message ?? "Ошибка ИИ" };
    }
  };

  // ── Выбор категории ───────────────────────────────────────────────────────
  const selectCatItem = (id: string, name: string, isNew?: boolean) => {
    setCatId(id); setCatQuery(name); setCatResult(isNew !== undefined ? { name, isNew } : null);
    setCatHint(null); setCatError(null);
    setSubId(""); setSubQuery(""); setSubResult(null); setSubHint(null); setSubError(null);
  };
  const selectSubItem = (id: string, name: string, isNew?: boolean) => {
    setSubId(id); setSubQuery(name); setSubResult(isNew !== undefined ? { name, isNew } : null);
    setSubHint(null); setSubError(null);
  };
  const clearCatItem = () => {
    setCatId(""); setCatQuery(""); setCatResult(null); setCatHint(null); setCatError(null);
    setSubId(""); setSubQuery(""); setSubResult(null); setSubHint(null); setSubError(null);
  };
  const clearSubItem = () => { setSubId(""); setSubQuery(""); setSubResult(null); setSubHint(null); setSubError(null); };

  // ── Ручной запуск AI (кнопка ✓) — единственный способ подтвердить ──────────
  const handleCatConfirm = async () => {
    const q = catQuery.trim();
    if (!q || catLoading) return;
    if (q.length < 3) { setCatError("Введите не менее 3 символов"); return; }
    setCatLoading(true); setCatHint(null); setCatResult(null); setCatError(null);
    const res = await runMatch(q, null);
    if (res) {
      if (res.noMatch) setCatError(res.hint ?? "Категория не найдена. Уточните запрос.");
      else selectCatItem(res.id, res.name, res.isNew);
    }
    setCatLoading(false);
  };
  const handleSubConfirm = async () => {
    const q = subQuery.trim();
    if (!q || !catId || subLoading) return;
    if (q.length < 3) { setSubError("Введите не менее 3 символов"); return; }
    setSubLoading(true); setSubHint(null); setSubResult(null); setSubError(null);
    const res = await runMatch(q, catId);
    if (res) {
      if (res.noMatch) setSubError(res.hint ?? "Подкатегория не найдена. Уточните запрос.");
      else selectSubItem(res.id, res.name, res.isNew);
    }
    setSubLoading(false);
  };

  // ── Иерархия категорий ────────────────────────────────────────────────────
  const rootCats = categories.filter(c => !c.parentId);
  const childrenByParent: Record<string, Category[]> = {};
  categories.forEach(c => { if (c.parentId) (childrenByParent[c.parentId] ??= []).push(c); });
  const catChildren = catId ? (childrenByParent[catId] ?? []) : [];

  const totalSteps = 4;
  const descLen = form.description.length;

  const canNext = () => {
    if (step === 0) return photos.length > 0;
    if (step === 1) return !!form.title && !!form.description && !!form.price && !!finalCatId;
    return true;
  };

  const set = (k: keyof FormState, v: any) => setForm(f => ({ ...f, [k]: v }));

  const handleSave = async () => {
    setSaving(true);
    try { await onSave(listing?.id ?? null, form, photos); }
    finally { setSaving(false); }
  };

  const variantsInGroup = allListings.filter(
    l => l.variantGroupId && l.variantGroupId === (form.variantGroupId ?? listing?.variantGroupId) && l.id !== listing?.id
  );

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center" style={{ animation: "modalBg 0.2s ease-out" }}>
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />

      <div
        className="relative bg-background w-full sm:max-w-2xl rounded-t-3xl sm:rounded-2xl flex flex-col overflow-hidden shadow-2xl"
        style={{ maxHeight: "94dvh", animation: "modalSlide 0.3s cubic-bezier(0.34,1.56,0.64,1)" }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border shrink-0">
          <div className="flex items-center gap-3">
            <button type="button" onClick={onClose} className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center hover:bg-gray-200 transition-colors">
              <X className="w-4 h-4" />
            </button>
            <div>
              <p className="font-bold text-sm">{isNew ? "Новый товар" : "Редактировать товар"}</p>
              {!isNew && <p className="text-xs text-muted line-clamp-1">{listing!.title}</p>}
            </div>
          </div>
          <div className="flex items-center gap-2">
            {/* Preview / Edit toggle */}
            {!isNew && photos.length > 0 && (
              <button type="button" onClick={() => setMode(m => m === "edit" ? "preview" : "edit")}
                className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-xl border border-border font-medium hover:bg-accent transition-colors">
                {mode === "edit" ? <><Eye className="w-3.5 h-3.5" /> Превью</> : <><PenLine className="w-3.5 h-3.5" /> Редактировать</>}
              </button>
            )}
            {!isNew && (
              <button type="button" onClick={() => setShowDeleteConfirm(true)}
                className="w-8 h-8 rounded-xl bg-red-50 text-red-500 flex items-center justify-center hover:bg-red-100 transition-colors">
                <Trash2 className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* Delete confirm */}
        {showDeleteConfirm && (
          <div className="absolute inset-0 z-10 bg-background/95 flex flex-col items-center justify-center gap-4 p-6" style={{ animation: "fadeIn 0.15s ease-out" }}>
            <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center">
              <Trash2 className="w-8 h-8 text-red-500" />
            </div>
            <div className="text-center">
              <p className="font-bold">Удалить товар?</p>
              <p className="text-sm text-muted mt-1">Это действие нельзя отменить</p>
            </div>
            <div className="flex gap-3 w-full max-w-xs">
              <button type="button" onClick={() => setShowDeleteConfirm(false)}
                className="flex-1 py-2.5 rounded-xl border border-border text-sm font-medium">Отмена</button>
              <button type="button" onClick={() => listing && onDelete(listing.id)}
                className="flex-1 py-2.5 rounded-xl bg-red-600 text-white text-sm font-bold">Удалить</button>
            </div>
          </div>
        )}

        {/* PREVIEW MODE */}
        {mode === "preview" && !isNew && (
          <div className="flex-1 overflow-y-auto">
            {/* Photo slider */}
            <div className="relative bg-black" style={{ aspectRatio: "4/3" }}>
              {photos[previewSlide] && <img src={photos[previewSlide]} alt="" className="w-full h-full object-cover" />}
              {photos.length > 1 && (
                <>
                  <button type="button" onClick={() => setPreviewSlide(s => Math.max(0, s - 1))}
                    className="absolute left-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-black/50 text-white flex items-center justify-center">
                    <ChevronLeft className="w-5 h-5" />
                  </button>
                  <button type="button" onClick={() => setPreviewSlide(s => Math.min(photos.length - 1, s + 1))}
                    className="absolute right-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-black/50 text-white flex items-center justify-center">
                    <ChevronRight className="w-5 h-5" />
                  </button>
                  <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1">
                    {photos.map((_, i) => (
                      <button key={i} type="button" onClick={() => setPreviewSlide(i)}
                        className={`w-1.5 h-1.5 rounded-full transition-all ${i === previewSlide ? "bg-white w-4" : "bg-white/50"}`} />
                    ))}
                  </div>
                </>
              )}
            </div>

            {/* Variants strip (WB-style) */}
            {variantsInGroup.length > 0 && (
              <div className="px-4 pt-3">
                <p className="text-xs text-muted mb-2">Варианты ({variantsInGroup.length + 1})</p>
                <div className="flex gap-2 overflow-x-auto pb-1">
                  <div className="shrink-0 rounded-xl overflow-hidden ring-2 ring-primary" style={{ width: 64, aspectRatio: "4/3" }}>
                    {photos[0] ? <img src={photos[0]} alt="" className="w-full h-full object-cover" /> : <div className="w-full h-full bg-primary/10" />}
                  </div>
                  {variantsInGroup.map(v => (
                    <div key={v.id} className="shrink-0 rounded-xl overflow-hidden border border-border" style={{ width: 64, aspectRatio: "4/3" }}>
                      {v.images[0] ? <img src={v.images[0].url} alt="" className="w-full h-full object-cover" /> : <div className="w-full h-full bg-gray-100" />}
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="px-4 pt-4 pb-8 space-y-4">
              <div>
                <p className="text-2xl font-black text-foreground">{(Number(form.price) * 100 > 0 ? Number(form.price) : listing!.price / 100).toLocaleString("ru-RU")} ₽</p>
                <p className="font-bold text-lg mt-1">{form.title}</p>
                {form.shortDescription && <p className="text-muted text-sm mt-1">{form.shortDescription}</p>}
              </div>
              <p className="text-sm text-foreground/80 whitespace-pre-wrap">{form.description}</p>
              {form.characteristics.length > 0 && (
                <div className="border border-border rounded-xl divide-y divide-border">
                  <p className="px-4 py-2.5 text-xs font-bold text-muted uppercase tracking-wider">Характеристики</p>
                  {form.characteristics.filter(c => c.key && c.value).map((c, i) => (
                    <div key={i} className="flex items-center justify-between px-4 py-2.5">
                      <span className="text-sm text-muted">{c.key}</span>
                      <span className="text-sm font-medium">{c.value}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* EDIT MODE */}
        {mode === "edit" && (
          <>
            <div className="px-5 py-3 border-b border-border shrink-0">
              <StepDots total={totalSteps} current={step} />
            </div>

            <div className="flex-1 overflow-y-auto px-5 py-4">
              {/* Step 0: Photos */}
              {step === 0 && (
                <PhotoStep photos={photos} setPhotos={setPhotos} uploading={uploading} setUploading={setUploading} />
              )}

              {/* Step 1: Description */}
              {step === 1 && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-muted mb-1.5 uppercase tracking-wider">Название товара *</label>
                    <input value={form.title} onChange={e => set("title", e.target.value)} required
                      placeholder="Например: Платье летнее макси, бежевое"
                      className="w-full border border-border rounded-xl px-4 py-3 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/20 transition" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-muted mb-1.5 uppercase tracking-wider">Краткое описание <span className="text-muted font-normal">(≤150 симв.)</span></label>
                    <input value={form.shortDescription} onChange={e => set("shortDescription", e.target.value.slice(0, 150))}
                      placeholder="Одной строкой — цвет, ткань, особенность"
                      className="w-full border border-border rounded-xl px-4 py-3 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/20 transition" />
                    <p className="text-right text-xs text-muted mt-1">{form.shortDescription.length}/150</p>
                  </div>
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="block text-xs font-bold text-muted uppercase tracking-wider">Описание товара *</label>
                      <span className={`text-xs font-medium ${descLen > 900 ? "text-red-500" : descLen > 700 ? "text-amber-500" : "text-muted"}`}>
                        {descLen}/1000
                      </span>
                    </div>
                    <textarea value={form.description} onChange={e => set("description", e.target.value.slice(0, 1000))} required rows={5}
                      placeholder="Материал, размеры, уход, особенности... Подробное описание помогает покупателям найти ваш товар."
                      className="w-full border border-border rounded-xl px-4 py-3 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/20 transition resize-none" />
                    <div className="w-full bg-gray-100 rounded-full h-1 mt-1.5">
                      <div className={`h-full rounded-full transition-all ${descLen > 900 ? "bg-red-500" : descLen > 700 ? "bg-amber-400" : "bg-primary"}`}
                        style={{ width: `${(descLen / 1000) * 100}%` }} />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-muted mb-1.5 uppercase tracking-wider">Цена ₽ *</label>
                    <input type="number" min="0" step="1" inputMode="numeric" value={form.price}
                      onChange={e => set("price", e.target.value)} required
                      placeholder="1 500"
                      className="w-full border border-border rounded-xl px-4 py-3 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/20 transition" />
                  </div>
                  {/* ══ КАТЕГОРИЯ ══ */}
                  <div>
                    <label className="block text-xs font-bold text-muted mb-1.5 uppercase tracking-wider">Категория *</label>
                    {catId ? (
                      /* Выбрана — чип */
                      <div className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl border border-primary/40 bg-primary/5">
                        <span className="flex-1 text-sm font-semibold truncate">{catQuery}</span>
                        {catResult?.isNew && <span className="text-[10px] bg-green-500 text-white px-1.5 py-0.5 rounded-full shrink-0">новая</span>}
                        <button type="button" onClick={clearCatItem} className="shrink-0 w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center hover:bg-red-100 hover:text-red-500 transition"><X className="w-3.5 h-3.5" /></button>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {/* Ввод + кнопка подтверждения */}
                        <div className="flex gap-2">
                          <input
                            value={catQuery}
                            onChange={e => { setCatQuery(e.target.value); setCatHint(null); setCatResult(null); }}
                            onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); handleCatConfirm(); } }}
                            placeholder="Введите категорию..."
                            className="flex-1 border border-border rounded-xl px-3.5 py-2.5 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/20 transition"
                          />
                          <button type="button" onClick={handleCatConfirm} disabled={catLoading || catQuery.trim().length < 3}
                            className="shrink-0 w-11 h-11 rounded-xl bg-primary/10 text-primary hover:bg-primary/20 transition disabled:opacity-40 flex items-center justify-center">
                            {catLoading
                              ? <span className="w-4 h-4 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
                              : <Check className="w-4 h-4" />}
                          </button>
                        </div>
                        {catResult && <p className={`text-xs px-3 py-1.5 rounded-lg ${catResult.isNew ? "bg-green-50 text-green-700" : "bg-blue-50 text-blue-700"}`}>{catResult.isNew ? `✨ Создана: «${catResult.name}»` : `✓ Подобрана: «${catResult.name}»`}</p>}
                        {catHint && <p className="text-xs px-3 py-1.5 rounded-lg bg-amber-50 text-amber-700 border border-amber-200">⚠ {catHint}</p>}
                        {catError && (
                          <div className="flex items-start gap-2 px-3 py-2 rounded-lg bg-red-50 border border-red-200">
                            <span className="text-red-500 text-sm shrink-0">✗</span>
                            <p className="text-xs text-red-700">{catError}</p>
                          </div>
                        )}
                        {/* Список корневых категорий */}
                        <div className="border border-border rounded-xl overflow-hidden">
                          <div className="overflow-y-auto" style={{ maxHeight: 160 }}>
                            {catLoading
                              ? <p className="text-xs text-muted text-center py-3 flex items-center justify-center gap-2"><span className="w-3 h-3 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />ИИ подбирает...</p>
                              : rootCats.filter(c => !catQuery.trim() || c.name.toLowerCase().includes(catQuery.toLowerCase())).length === 0
                              ? <p className="text-xs text-muted text-center py-3">Нажмите ✓ — ИИ создаст категорию</p>
                              : rootCats.filter(c => !catQuery.trim() || c.name.toLowerCase().includes(catQuery.toLowerCase())).map((c, i, arr) => (
                                <button key={c.id} type="button" onClick={() => selectCatItem(c.id, c.name)}
                                  className={`w-full text-left px-3.5 py-2.5 text-sm font-medium hover:bg-accent active:bg-accent transition-colors flex items-center gap-2 ${i < arr.length - 1 ? "border-b border-border/40" : ""}`}>
                                  {c.icon && <span>{c.icon}</span>}
                                  <span>{c.name}</span>
                                  {childrenByParent[c.id]?.length ? <span className="ml-auto text-[10px] text-muted">{childrenByParent[c.id].length} подкат.</span> : null}
                                </button>
                              ))}
                          </div>
                        </div>
                        <p className="text-[11px] text-muted">Выберите из списка или введите и нажмите <span className="font-semibold text-primary">✓</span> для подтверждения</p>
                      </div>
                    )}
                  </div>

                  {/* ══ ПОДКАТЕГОРИЯ ══ */}
                  {catId && (
                    <div>
                      <label className="block text-xs font-bold text-muted mb-1.5 uppercase tracking-wider">Подкатегория <span className="text-muted font-normal normal-case">(уточните товар)</span></label>
                      {subId ? (
                        /* Выбрана — чип */
                        <div className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl border border-primary/30 bg-primary/5">
                          <span className="flex-1 text-sm font-medium truncate">{subQuery}</span>
                          {subResult?.isNew && <span className="text-[10px] bg-green-500 text-white px-1.5 py-0.5 rounded-full shrink-0">новая</span>}
                          <button type="button" onClick={clearSubItem} className="shrink-0 w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center hover:bg-red-100 hover:text-red-500 transition"><X className="w-3.5 h-3.5" /></button>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          <div className="flex gap-2">
                            <input
                              value={subQuery}
                              onChange={e => { setSubQuery(e.target.value); setSubHint(null); setSubResult(null); }}
                              onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); handleSubConfirm(); } }}
                              placeholder={`Уточните — напр. «Письменный стол»...`}
                              className="flex-1 border border-border rounded-xl px-3.5 py-2.5 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/20 transition"
                            />
                            <button type="button" onClick={handleSubConfirm} disabled={subLoading || subQuery.trim().length < 3}
                              className="shrink-0 w-11 h-11 rounded-xl bg-primary/10 text-primary hover:bg-primary/20 transition disabled:opacity-40 flex items-center justify-center">
                              {subLoading
                                ? <span className="w-4 h-4 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
                                : <Check className="w-4 h-4" />}
                            </button>
                          </div>
                          {subResult && <p className={`text-xs px-3 py-1.5 rounded-lg ${subResult.isNew ? "bg-green-50 text-green-700" : "bg-blue-50 text-blue-700"}`}>{subResult.isNew ? `✨ Создана: «${subResult.name}»` : `✓ Найдена: «${subResult.name}»`}</p>}
                          {subHint && <p className="text-xs px-3 py-1.5 rounded-lg bg-amber-50 text-amber-700 border border-amber-200">⚠ {subHint}</p>}
                          {subError && (
                            <div className="flex items-start gap-2 px-3 py-2 rounded-lg bg-red-50 border border-red-200">
                              <span className="text-red-500 text-sm shrink-0">✗</span>
                              <p className="text-xs text-red-700">{subError}</p>
                            </div>
                          )}
                          {/* Список подкатегорий текущего родителя */}
                          {catChildren.length > 0 && (
                            <div className="border border-border rounded-xl overflow-hidden">
                              <div className="overflow-y-auto" style={{ maxHeight: 140 }}>
                                {catChildren.filter(c => !subQuery.trim() || c.name.toLowerCase().includes(subQuery.toLowerCase())).map((c, i, arr) => (
                                  <button key={c.id} type="button" onClick={() => selectSubItem(c.id, c.name)}
                                    className={`w-full text-left pl-4 pr-3.5 py-2 text-sm text-muted hover:bg-accent active:bg-accent transition-colors flex items-center gap-2 ${i < arr.length - 1 ? "border-b border-border/30" : ""}`}>
                                    <span className="text-border text-xs">└─</span>{c.name}
                                  </button>
                                ))}
                              </div>
                            </div>
                          )}
                          <p className="text-[11px] text-muted">Выберите из списка или введите и нажмите <span className="font-semibold text-primary">✓</span> для подтверждения</p>
                        </div>
                      )}
                    </div>
                  )}
                  {/* Status toggle */}
                  <div>
                    <label className="block text-xs font-bold text-muted mb-2 uppercase tracking-wider">Статус</label>
                    <div className="flex gap-2">
                      {(["PUBLISHED", "DRAFT", "ARCHIVED"] as const).map(s => (
                        <button key={s} type="button" onClick={() => set("status", s)}
                          className={`flex items-center gap-1.5 text-xs px-3 py-2 rounded-xl border transition-all font-medium ${
                            form.status === s ? "border-primary bg-primary/10 text-primary" : "border-border bg-card text-muted"
                          }`}>
                          <span className={`w-2 h-2 rounded-full ${STATUS_CFG[s].dot}`} />
                          {STATUS_CFG[s].label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Step 2: Characteristics */}
              {step === 2 && (
                <CharacteristicsStep
                  chars={form.characteristics}
                  onChange={v => set("characteristics", v)}
                />
              )}

              {/* Step 3: Variants */}
              {step === 3 && (
                <VariantsStep
                  currentId={listing?.id ?? null}
                  allListings={allListings}
                  variantGroupId={form.variantGroupId}
                  setVariantGroupId={v => set("variantGroupId", v)}
                  onRefresh={onRefresh}
                />
              )}
            </div>

            {/* Footer nav */}
            <div className="px-5 py-4 border-t border-border shrink-0 flex items-center gap-3">
              {step > 0 ? (
                <button type="button" onClick={() => setStep(s => s - 1)}
                  className="flex items-center gap-1.5 text-sm px-4 py-2.5 rounded-xl border border-border font-medium hover:bg-accent transition-colors">
                  <ChevronLeft className="w-4 h-4" /> Назад
                </button>
              ) : (
                <button type="button" onClick={onClose}
                  className="text-sm px-4 py-2.5 rounded-xl border border-border font-medium text-muted hover:bg-accent transition-colors">
                  Отмена
                </button>
              )}
              {step < totalSteps - 1 ? (
                <button type="button" onClick={() => setStep(s => s + 1)}
                  disabled={!canNext()}
                  className="flex-1 flex items-center justify-center gap-1.5 text-sm py-2.5 rounded-xl bg-primary text-white font-bold hover:bg-primary/90 transition disabled:opacity-40">
                  Далее <ChevronRight className="w-4 h-4" />
                </button>
              ) : (
                <button type="button" onClick={handleSave} disabled={saving || uploading || !canNext()}
                  className="flex-1 flex items-center justify-center gap-2 text-sm py-2.5 rounded-xl bg-primary text-white font-bold hover:bg-primary/90 transition disabled:opacity-40">
                  {saving ? (
                    <><div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />{isNew ? "Создание..." : "Сохранение..."}</>
                  ) : (
                    <><Check className="w-4 h-4" />{isNew ? "Опубликовать товар" : "Сохранить изменения"}</>
                  )}
                </button>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function DashboardPage() {
  const router = useRouter();

  const [profile, setProfile] = useState<ProfileResponse | null>(null);
  const [listings, setListings] = useState<Listing[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<{ msg: string; type: "error"|"success" } | null>(null);
  const [modal, setModal] = useState<Listing | "new" | null>(null);
  const [activeFilter, setActiveFilter] = useState<string>("");

  const showToast = (msg: string, type: "error"|"success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  const load = useCallback(async () => {
    if (!getToken()) { router.replace("/login"); return; }
    try {
      const [me, listData, cats] = await Promise.all([
        api.get<ProfileResponse>("/supplier/me"),
        api.get<ListingsResponse>("/supplier/my-listings").catch(() => ({ items: [], total: 0 })),
        api.get<Category[]>("/categories").catch(() => []),
      ]);
      setProfile(me);
      setListings(listData.items ?? []);
      setCategories(Array.isArray(cats) ? cats : []);
    } catch {
      clearSession();
      router.replace("/login");
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => { load(); }, [load]);

  const handleSave = async (id: string | null, form: FormState, photos: string[]) => {
    const payload = {
      title: form.title,
      shortDescription: form.shortDescription || null,
      description: form.description,
      price: Math.round(parseFloat(form.price) * 100),
      stock: parseInt(form.stock) || 0,
      categoryId: form.categoryId,
      status: form.status,
      imageUrls: photos,
      characteristics: form.characteristics.filter(c => c.key && c.value),
      variantGroupId: form.variantGroupId,
    };
    if (id) {
      await api.patch(`/supplier/listings/${id}`, payload);
      showToast("Изменения сохранены ✓", "success");
    } else {
      await api.post("/supplier/listings", payload);
      showToast("Товар опубликован ✓", "success");
    }
    setModal(null);
    load();
  };

  const handleDelete = async (id: string) => {
    await api.patch(`/supplier/listings/${id}`, { status: "ARCHIVED" });
    showToast("Товар перемещён в архив", "success");
    setModal(null);
    load();
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="w-10 h-10 rounded-full border-4 border-primary border-t-transparent animate-spin" />
      </div>
    );
  }

  if (!profile) return null;

  const { user } = profile;
  const status = profile.profile?.status ?? null;
  const isApproved = status === "APPROVED";
  const displayName = `${user.firstName} ${user.lastName}`.trim() || user.email;

  const filtered = activeFilter ? listings.filter(l => l.status === activeFilter) : listings;
  const totalViews = listings.reduce((s, l) => s + l.viewCount, 0);
  const totalCart = listings.reduce((s, l) => s + l.cartCount, 0);
  const totalFavs = listings.reduce((s, l) => s + l.favoritesCount, 0);

  return (
    <div className="min-h-screen bg-background">
      <style>{`
        @keyframes slideUp   { from { opacity:0; transform:translateY(16px) } to { opacity:1; transform:translateY(0) } }
        @keyframes fadeIn    { from { opacity:0 } to { opacity:1 } }
        @keyframes modalBg   { from { opacity:0 } to { opacity:1 } }
        @keyframes modalSlide{ from { opacity:0; transform:translateY(40px) scale(0.97) } to { opacity:1; transform:translateY(0) scale(1) } }
        .product-card        { animation: slideUp 0.35s ease-out both }
        .char-row            { animation: slideUp 0.2s ease-out both }
      `}</style>

      <VerificationBanner status={status} rejectionReason={profile.profile?.rejectionReason} />

      {/* Header */}
      <header className="sticky top-0 z-40 bg-background/95 backdrop-blur border-b border-border">
        <div className="max-w-2xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-primary flex items-center justify-center">
              <Store className="w-4 h-4 text-white" />
            </div>
            <span className="font-bold text-base tracking-tight">GloBox Seller</span>
          </div>
          <Link href="/profile">
            {user.avatarUrl ? (
              <img src={user.avatarUrl} alt="" className="w-9 h-9 rounded-full object-cover border border-border" />
            ) : (
              <div className="w-9 h-9 rounded-full flex items-center justify-center text-white font-bold text-sm"
                style={{ background: avatarGradient(displayName) }}>
                {displayName[0]?.toUpperCase()}
              </div>
            )}
          </Link>
        </div>
      </header>

      {/* Toast */}
      {toast && (
        <div className={`fixed top-16 left-1/2 -translate-x-1/2 z-50 px-5 py-3 rounded-2xl text-sm font-semibold shadow-xl flex items-center gap-2 ${
          toast.type === "success" ? "bg-green-600 text-white" : "bg-red-600 text-white"
        }`} style={{ animation: "slideUp 0.2s ease-out" }}>
          {toast.type === "success" ? <Check className="w-4 h-4" /> : <X className="w-4 h-4" />}
          {toast.msg}
        </div>
      )}

      <main className="max-w-2xl mx-auto px-4 pb-28">

        {/* ── Stats summary (approved only) ── */}
        {isApproved && (
          <div className="grid grid-cols-4 gap-2 mt-4" style={{ animation: "slideUp 0.2s ease-out" }}>
            {[
              { icon: Package,      value: listings.length,    label: "Товары",    color: "text-primary",    bg: "bg-primary/8" },
              { icon: Eye,          value: totalViews,         label: "Просмотры", color: "text-blue-600",   bg: "bg-blue-50" },
              { icon: ShoppingCart, value: totalCart,          label: "В корзине", color: "text-emerald-600",bg: "bg-emerald-50" },
              { icon: Heart,        value: totalFavs,          label: "Лайки",     color: "text-rose-500",   bg: "bg-rose-50" },
            ].map((s) => (
              <div key={s.label} className="bg-card rounded-2xl border border-border p-3 flex flex-col items-center gap-1 text-center">
                <div className={`w-8 h-8 rounded-xl ${s.bg} flex items-center justify-center`}>
                  <s.icon className={`w-4 h-4 ${s.color}`} />
                </div>
                <p className={`text-lg font-black ${s.color}`}>{s.value.toLocaleString("ru-RU")}</p>
                <p className="text-[10px] text-muted leading-none">{s.label}</p>
              </div>
            ))}
          </div>
        )}

        {isApproved ? (
          <>
            {/* Filter tabs */}
            <div className="flex gap-1.5 overflow-x-auto pb-0.5 mt-4 scrollbar-hide" style={{ animation: "slideUp 0.25s ease-out" }}>
              {[
                { label: "Все", value: "" },
                { label: "Активные", value: "PUBLISHED" },
                { label: "Черновики", value: "DRAFT" },
                { label: "Архив", value: "ARCHIVED" },
              ].map(tab => (
                <button key={tab.value} type="button" onClick={() => setActiveFilter(tab.value)}
                  className={`shrink-0 text-xs font-semibold px-4 py-2 rounded-full transition-all ${
                    activeFilter === tab.value
                      ? "bg-primary text-white shadow-sm"
                      : "bg-card border border-border text-muted hover:border-primary/30"
                  }`}>
                  {tab.label}
                  {tab.value !== "" && (
                    <span className="ml-1.5 text-[10px]">
                      {listings.filter(l => l.status === tab.value).length}
                    </span>
                  )}
                </button>
              ))}
            </div>

            {/* Product grid */}
            {filtered.length > 0 ? (
              <div className="grid grid-cols-2 gap-3 mt-3">
                {filtered.map((item, i) => (
                  <ProductCard key={item.id} item={item} index={i} onClick={() => setModal(item)} />
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-16 gap-4 mt-3" style={{ animation: "slideUp 0.3s ease-out" }}>
                <div className="w-20 h-20 rounded-2xl bg-gray-100 flex items-center justify-center">
                  <Package className="w-10 h-10 text-gray-300" />
                </div>
                <div className="text-center">
                  <p className="font-bold text-foreground">
                    {activeFilter ? "Нет товаров в этой категории" : "Нет товаров"}
                  </p>
                  <p className="text-sm text-muted mt-1">
                    {activeFilter ? "Попробуйте другой фильтр" : "Добавьте первый товар"}
                  </p>
                </div>
                {!activeFilter && (
                  <button type="button" onClick={() => setModal("new")}
                    className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary text-white text-sm font-bold active:scale-95 transition">
                    <Plus className="w-4 h-4" /> Добавить товар
                  </button>
                )}
              </div>
            )}
          </>
        ) : (
          /* ── Not verified ── */
          <div className="mt-4 space-y-3">
            <div className="bg-card rounded-2xl border border-border p-6 flex flex-col items-center gap-4 text-center" style={{ animation: "slideUp 0.22s ease-out" }}>
              <div className="w-16 h-16 rounded-2xl bg-amber-100 flex items-center justify-center">
                <Store className="w-8 h-8 text-amber-500" />
              </div>
              <div>
                <p className="font-bold text-base">
                  {status === "PENDING" ? "Заявка на рассмотрении" :
                   status === "NEEDS_REVISION" ? "Требуются правки" :
                   status === "REJECTED" ? "Заявка отклонена" : "Пройдите верификацию"}
                </p>
                <p className="text-sm text-muted mt-1.5">
                  {status === "PENDING" ? "Мы проверяем вашу заявку. До 24 часов." :
                   "Заполните анкету поставщика для начала работы."}
                </p>
              </div>
              {status !== "PENDING" && (
                <Link href="/verify" className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary text-white text-sm font-bold">
                  <Store className="w-4 h-4" />
                  {status === "NEEDS_REVISION" ? "Исправить заявку" : status === "REJECTED" ? "Подать повторно" : "Заполнить анкету"}
                </Link>
              )}
            </div>
          </div>
        )}
      </main>

      {/* FAB */}
      {isApproved && (
        <button
          type="button"
          onClick={() => setModal("new")}
          className="fixed bottom-24 right-5 z-30 w-14 h-14 rounded-full bg-primary text-white shadow-lg flex items-center justify-center active:scale-95 transition-all hover:shadow-primary/30 hover:shadow-xl"
          style={{ animation: "slideUp 0.4s ease-out" }}
        >
          <Plus className="w-7 h-7" />
        </button>
      )}

      {/* Modal */}
      {modal && (
        <ProductModal
          item={modal}
          allListings={listings}
          categories={categories}
          onClose={() => setModal(null)}
          onSave={handleSave}
          onDelete={handleDelete}
          onRefresh={load}
        />
      )}

      {!modal && <BottomNav />}
    </div>
  );
}
