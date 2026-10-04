"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  ChevronLeft, Save, User, FileText, Camera,
  CheckCircle2, RefreshCw, Check, Image, Upload, Eye, ImageIcon,
} from "lucide-react";
import { api, API_BASE } from "@/lib/api";
import { getToken } from "@/lib/auth";

/* ─── Compress to JPEG via canvas (handles HEIC, large iPhone photos) ─── */
function compressToJpeg(file: File, maxPx = 1500, quality = 0.82): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Не удалось прочитать файл"));
    reader.onload = (ev) => {
      const img = new window.Image();
      img.onerror = () => reject(new Error("Не удалось открыть изображение"));
      img.onload = () => {
        let { width: w, height: h } = img;
        if (w > maxPx || h > maxPx) {
          if (w >= h) { h = Math.round(h * maxPx / w); w = maxPx; }
          else        { w = Math.round(w * maxPx / h); h = maxPx; }
        }
        const canvas = document.createElement("canvas");
        canvas.width = w; canvas.height = h;
        const ctx = canvas.getContext("2d");
        if (!ctx) return reject(new Error("Canvas недоступен"));
        ctx.drawImage(img, 0, 0, w, h);
        resolve(canvas.toDataURL("image/jpeg", quality));
      };
      img.src = ev.target!.result as string;
    };
    reader.readAsDataURL(file);
  });
}

async function uploadBase64(dataUrl: string): Promise<string> {
  const r = await api.post<{ url: string }>("/mediator/upload", { data: dataUrl, ext: "jpg" });
  return r.url.startsWith("http") ? r.url : `${API_BASE}${r.url}`;
}

/* ─── Photo field ─── */
function PhotoField({
  label, hint, value, onChange, selfie = false,
}: {
  label: string; hint: string; value: string;
  onChange: (v: string) => void; selfie?: boolean;
}) {
  const [uploading, setUploading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const galleryRef = useRef<HTMLInputElement>(null);
  const cameraRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState(false);

  const handle = async (file: File) => {
    setUploading(true); setErr(null);
    try {
      const jpeg = await compressToJpeg(file);
      const url = await uploadBase64(jpeg);
      onChange(url);
    } catch (e: any) { setErr(e?.message ?? "Ошибка загрузки. Попробуйте ещё раз."); }
    finally { setUploading(false); }
  };

  return (
    <div className="space-y-2">
      <label className="block text-sm font-semibold">{label}</label>
      {hint && <p className="text-xs text-muted">{hint}</p>}

      {value ? (
        <div className="space-y-2">
          <div className="relative rounded-2xl overflow-hidden aspect-4/3 bg-accent">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={value} alt={label} className="w-full h-full object-cover" />
            <div className="absolute bottom-2 left-2 flex gap-2">
              <div className="bg-green-500/90 text-white text-xs px-2 py-1 rounded-full flex items-center gap-1">
                <Check className="w-3 h-3" /> Загружено
              </div>
              <button
                onClick={() => setPreview(!preview)}
                className="bg-black/60 text-white text-xs px-2 py-1 rounded-full flex items-center gap-1"
              >
                <Eye className="w-3 h-3" /> {preview ? "Скрыть" : "Просмотр"}
              </button>
            </div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => galleryRef.current?.click()}
              disabled={uploading}
              className="flex-1 py-2 rounded-xl border border-border text-xs font-medium flex items-center justify-center gap-1.5 hover:bg-accent transition disabled:opacity-50"
            >
              <Image className="w-3.5 h-3.5" /> Заменить из галереи
            </button>
            <button
              onClick={() => cameraRef.current?.click()}
              disabled={uploading}
              className="flex-1 py-2 rounded-xl border border-border text-xs font-medium flex items-center justify-center gap-1.5 hover:bg-accent transition disabled:opacity-50"
            >
              <Camera className="w-3.5 h-3.5" /> Переснять
            </button>
          </div>
        </div>
      ) : (
        <div className="rounded-2xl border-2 border-dashed border-border aspect-4/3 flex flex-col items-center justify-center gap-3 bg-accent/20">
          <Upload className="w-8 h-8 text-muted" />
          {uploading ? (
            <div className="flex flex-col items-center gap-2">
              <div className="w-6 h-6 rounded-full border-2 border-primary border-t-transparent animate-spin" />
              <p className="text-xs text-muted">Загрузка…</p>
            </div>
          ) : (
            <div className="flex gap-2">
              <button
                onClick={() => galleryRef.current?.click()}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-card border border-border text-xs font-medium hover:bg-accent transition"
              >
                <Image className="w-4 h-4" /> Галерея
              </button>
              <button
                onClick={() => cameraRef.current?.click()}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-card border border-border text-xs font-medium hover:bg-accent transition"
              >
                <Camera className="w-4 h-4" /> Камера
              </button>
            </div>
          )}
        </div>
      )}

      {err && <p className="text-xs text-danger bg-danger/5 rounded-lg px-3 py-2">{err}</p>}
      <input ref={galleryRef} type="file" accept="image/jpeg,image/png,image/webp,image/*" className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) handle(f); e.target.value = ""; }} />
      <input ref={cameraRef} type="file" accept="image/*" capture={selfie ? "user" : "environment"} className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) handle(f); e.target.value = ""; }} />
    </div>
  );
}

/* ─── AvatarUpload: inline biometric capture without redirect ─── */
function AvatarUpload({ onCapture }: { onCapture: (url: string) => void }) {
  const [uploading, setUploading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const galleryRef = useRef<HTMLInputElement>(null);
  const cameraRef  = useRef<HTMLInputElement>(null);

  const handle = async (file: File) => {
    setUploading(true); setErr(null);
    try {
      const jpeg = await compressToJpeg(file, 800, 0.9);
      const url = await uploadBase64(jpeg);
      onCapture(url);
    } catch (e: any) { setErr(e?.message ?? "Ошибка загрузки"); }
    finally { setUploading(false); }
  };

  if (uploading) {
    return (
      <div className="flex flex-col items-center gap-3 py-8">
        <svg width="64" height="64" viewBox="0 0 64 64">
          <circle cx="32" cy="32" r="26" fill="none" stroke="var(--border)" strokeWidth="5" />
          <circle cx="32" cy="32" r="26" fill="none" stroke="var(--primary)" strokeWidth="5"
            strokeLinecap="round" strokeDasharray="163.36" strokeDashoffset="40"
            style={{ transformOrigin: "32px 32px", animation: "circSpin 1.1s linear infinite" }}
          />
          <style>{`@keyframes circSpin { from { transform: rotate(-90deg); } to { transform: rotate(270deg); } }`}</style>
        </svg>
        <p className="text-sm text-muted">Загрузка биометрии…</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-col items-center gap-3 py-6 rounded-2xl border-2 border-dashed border-border bg-accent/30">
        <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center">
          <Camera className="w-7 h-7 text-primary" />
        </div>
        <p className="text-sm text-muted text-center px-4">Загрузите фото лица для биометрии</p>
        <div className="flex gap-2">
          <button
            onClick={() => galleryRef.current?.click()}
            className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-primary text-white text-xs font-semibold active:scale-[0.97] transition"
            style={{ WebkitTapHighlightColor: "transparent" }}
          >
            <ImageIcon className="w-3.5 h-3.5" /> Галерея
          </button>
          <button
            onClick={() => cameraRef.current?.click()}
            className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl border border-border text-xs font-medium active:bg-accent transition"
            style={{ WebkitTapHighlightColor: "transparent" }}
          >
            <Camera className="w-3.5 h-3.5" /> Камера
          </button>
        </div>
      </div>
      {err && <p className="text-xs text-danger bg-danger/5 rounded-xl px-3 py-2">{err}</p>}
      <input ref={galleryRef} type="file" accept="image/*" className="hidden"
        onChange={e => { const f = e.target.files?.[0]; if (f) handle(f); e.target.value = ""; }} />
      <input ref={cameraRef} type="file" accept="image/*" capture="user" className="hidden"
        onChange={e => { const f = e.target.files?.[0]; if (f) handle(f); e.target.value = ""; }} />
    </div>
  );
}

/* ─── Section header ─── */
function Section({ icon: Icon, title, children }: { icon: React.ElementType; title: string; children: React.ReactNode }) {
  return (
    <div className="bg-card rounded-2xl border border-border overflow-hidden">
      <div className="flex items-center gap-2.5 px-5 py-3.5 border-b border-border bg-accent/30">
        <Icon className="w-4 h-4 text-primary" />
        <span className="text-sm font-bold">{title}</span>
      </div>
      <div className="p-5 space-y-4">{children}</div>
    </div>
  );
}

function Field({ label, value, onChange, placeholder, readOnly }: {
  label: string; value: string; onChange?: (v: string) => void;
  placeholder?: string; readOnly?: boolean;
}) {
  return (
    <div>
      <label className="block text-xs font-medium text-muted mb-1.5">{label}</label>
      <input
        value={value}
        onChange={readOnly ? undefined : e => onChange?.(e.target.value)}
        readOnly={readOnly}
        placeholder={placeholder}
        className={`w-full border border-border rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 ${readOnly ? "bg-accent text-muted" : "bg-background"}`}
      />
    </div>
  );
}

/* ─── Main page ─── */
interface DocData {
  lastName: string; firstName: string; middleName: string;
  phone: string; email: string;
  passportPhotoUrl: string; passSelfiePhotoUrl: string; passPhotoUrl: string; avatarUrl: string;
  commissionRate: number; minOrderAmount: number;
}

export default function DocumentsPage() {
  const router = useRouter();
  const [data, setData] = useState<DocData>({
    lastName: "", firstName: "", middleName: "", phone: "", email: "",
    passportPhotoUrl: "", passSelfiePhotoUrl: "", passPhotoUrl: "", avatarUrl: "",
    commissionRate: 10, minOrderAmount: 0,
  });
  const [status, setStatus] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!getToken()) { router.replace("/login"); return; }
    api.get<{
      profile: {
        status: string; firstName: string; lastName: string; middleName?: string | null;
        passportPhotoUrl?: string | null; passSelfiePhotoUrl?: string | null; passPhotoUrl?: string | null; avatarUrl?: string | null;
        commissionRate?: number | null; minOrderAmount?: number | null;
      } | null;
      user: { firstName?: string | null; lastName?: string | null; phone?: string | null; email?: string | null };
    }>("/mediator/me").then(d => {
      const p = d.profile;
      const u = d.user;
      if (!p) { router.replace("/verify"); return; }
      setStatus(p.status);
      setData({
        lastName: p.lastName ?? u.lastName ?? "",
        firstName: p.firstName ?? u.firstName ?? "",
        middleName: p.middleName ?? "",
        phone: u.phone ?? "",
        email: u.email ?? "",
        passportPhotoUrl: p.passportPhotoUrl ?? "",
        passSelfiePhotoUrl: p.passSelfiePhotoUrl ?? "",
        passPhotoUrl: p.passPhotoUrl ?? "",
        avatarUrl: p.avatarUrl ?? "",
        commissionRate: Number(p.commissionRate ?? 10),
        minOrderAmount: p.minOrderAmount ?? 0,
      });
    }).catch(() => router.replace("/login"))
      .finally(() => setLoading(false));
  }, [router]);

  const set = (k: keyof DocData, v: string) => setData(f => ({ ...f, [k]: v }));

  const save = async () => {
    setSaving(true); setError(null); setSaved(false);
    try {
      await api.post("/mediator/profile/submit", {
        firstName: data.firstName.trim(),
        lastName: data.lastName.trim(),
        middleName: data.middleName.trim() || undefined,
        phone: data.phone.trim() || undefined,
        commissionRate: data.commissionRate,
        minOrderAmount: data.minOrderAmount,
        passportPhotoUrl: data.passportPhotoUrl,
        passSelfiePhotoUrl: data.passSelfiePhotoUrl,
        passPhotoUrl: data.passPhotoUrl,
        avatarUrl: data.avatarUrl || undefined,
      });
      setSaved(true);
      setTimeout(() => router.replace("/profile"), 1500);
    } catch (e: any) { setError(e.message ?? "Ошибка сохранения"); }
    finally { setSaving(false); }
  };

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="w-9 h-9 rounded-full border-4 border-primary border-t-transparent animate-spin" />
    </div>
  );

  const isEditable = status === "PENDING" || status === "NEEDS_REVISION";
  const statusLabel: Record<string, string> = {
    PENDING: "На проверке",
    NEEDS_REVISION: "Требуются правки",
    APPROVED: "Одобрен",
    REJECTED: "Отклонён",
  };
  const statusColor: Record<string, string> = {
    PENDING: "bg-warning/10 text-warning",
    NEEDS_REVISION: "bg-orange-500/10 text-orange-600",
    APPROVED: "bg-green-500/10 text-green-600",
    REJECTED: "bg-danger/10 text-danger",
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <div className="sticky top-0 z-30 bg-card/95 backdrop-blur border-b border-border h-14 flex items-center px-4 gap-3">
        <button onClick={() => router.back()} className="text-muted hover:text-foreground transition">
          <ChevronLeft className="w-5 h-5" />
        </button>
        <h1 className="font-bold flex-1">Мои документы</h1>
        {status && (
          <span className={`text-xs font-semibold px-3 py-1 rounded-full ${statusColor[status] ?? ""}`}>
            {statusLabel[status] ?? status}
          </span>
        )}
      </div>

      <main className="flex-1 max-w-lg mx-auto w-full px-4 py-6 space-y-5">

        {/* Approved banner */}
        {status === "APPROVED" && (
          <div className="bg-green-500/5 rounded-2xl border-2 border-green-500/20 p-5 flex items-center gap-4 animate-[slideUp_0.2s_ease-out]">
            <div className="w-12 h-12 rounded-full bg-green-500/15 flex items-center justify-center shrink-0">
              <CheckCircle2 className="w-6 h-6 text-green-500" />
            </div>
            <div>
              <p className="font-bold text-green-600">Документы проверены</p>
              <p className="text-xs text-muted mt-0.5">Ваша верификация пройдена. Полный доступ к платформе открыт.</p>
            </div>
          </div>
        )}

        {/* Personal data */}
        <Section icon={User} title="Личные данные">
          <Field label="Фамилия" value={data.lastName} onChange={v => set("lastName", v)} readOnly={!isEditable} />
          <Field label="Имя" value={data.firstName} onChange={v => set("firstName", v)} readOnly={!isEditable} />
          <Field label="Отчество" value={data.middleName} onChange={v => set("middleName", v)} placeholder="—" readOnly={!isEditable} />
          <Field label="Email" value={data.email} onChange={v => set("email", v)} readOnly={!isEditable} />
          <Field label="Телефон" value={data.phone} onChange={v => set("phone", v)} readOnly={!isEditable} />
        </Section>

        {/* Passport */}
        <Section icon={FileText} title="Документ — паспорт">
          {isEditable ? (
            <PhotoField
              label="Разворот паспорта (стр. 2–3)"
              hint="Страница с фотографией и данными"
              value={data.passportPhotoUrl}
              onChange={v => set("passportPhotoUrl", v)}
            />
          ) : data.passportPhotoUrl ? (
            <a href={data.passportPhotoUrl} target="_blank" rel="noreferrer">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={data.passportPhotoUrl} alt="Паспорт" className="w-full rounded-2xl aspect-4/3 object-cover border border-border hover:opacity-90 transition" />
            </a>
          ) : <p className="text-sm text-muted">Не загружено</p>}
        </Section>

        {/* Selfie */}
        <Section icon={Camera} title="Селфи с паспортом">
          {isEditable ? (
            <PhotoField
              label="Селфи с паспортом в руке"
              hint="Лицо и разворот паспорта в кадре"
              value={data.passSelfiePhotoUrl}
              onChange={v => set("passSelfiePhotoUrl", v)}
              selfie
            />
          ) : data.passSelfiePhotoUrl ? (
            <a href={data.passSelfiePhotoUrl} target="_blank" rel="noreferrer">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={data.passSelfiePhotoUrl} alt="Селфи" className="w-full rounded-2xl aspect-4/3 object-cover border border-border hover:opacity-90 transition" />
            </a>
          ) : <p className="text-sm text-muted">Не загружено</p>}
        </Section>

        {/* Pass photo (Садовод) */}
        <Section icon={FileText} title="Пропуск (Садовод)">
          {isEditable ? (
            <PhotoField
              label="Фото пропуска из Садовода"
              hint="Фото пропуска целиком — данные и срок действия должны быть читаемы"
              value={data.passPhotoUrl}
              onChange={v => set("passPhotoUrl", v)}
            />
          ) : data.passPhotoUrl ? (
            <a href={data.passPhotoUrl} target="_blank" rel="noreferrer">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={data.passPhotoUrl} alt="Пропуск" className="w-full rounded-2xl aspect-4/3 object-cover border border-border hover:opacity-90 transition" />
            </a>
          ) : <p className="text-sm text-muted">Не загружено</p>}
        </Section>

        {/* Biometric */}
        <Section icon={Camera} title="Биометрическое фото">
          {data.avatarUrl ? (
            <div className="space-y-3">
              <div className="relative w-36 h-36 rounded-full overflow-hidden border-4 border-green-400 mx-auto">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={data.avatarUrl} alt="Биометрия" className="w-full h-full object-cover" />
              </div>
              {isEditable && (
                <button
                  onClick={() => set("avatarUrl", "")}
                  className="w-full py-2 rounded-xl border border-border text-xs text-muted hover:bg-accent transition flex items-center justify-center gap-1.5"
                >
                  <RefreshCw className="w-3.5 h-3.5" /> Переснять биометрию
                </button>
              )}
            </div>
          ) : isEditable ? (
            <AvatarUpload onCapture={v => set("avatarUrl", v)} />
          ) : <p className="text-sm text-muted">Не загружено</p>}
        </Section>

        {/* Errors / success */}
        {error && <p className="text-sm text-danger bg-danger/5 border border-danger/20 rounded-xl px-4 py-3">{error}</p>}
        {saved && (
          <div className="flex items-center gap-2 text-green-600 bg-green-50 border border-green-200 rounded-xl px-4 py-3">
            <CheckCircle2 className="w-5 h-5" />
            <span className="text-sm font-semibold">Данные обновлены! Перенаправление…</span>
          </div>
        )}

        {/* Save button (only if editable) */}
        {isEditable && (
          <button
            onClick={save}
            disabled={saving || saved || !data.passportPhotoUrl || !data.passSelfiePhotoUrl || !data.passPhotoUrl}
            className="w-full py-4 rounded-2xl bg-primary text-white font-bold text-sm hover:bg-primary-hover transition disabled:opacity-40 flex items-center justify-center gap-2 mb-8"
          >
            <Save className="w-5 h-5" />
            {saving ? "Сохранение…" : "Сохранить и отправить на проверку"}
          </button>
        )}
      </main>
    </div>
  );
}
