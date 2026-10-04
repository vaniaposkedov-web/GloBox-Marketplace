"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  ChevronLeft, Save, User, FileText, Camera,
  CheckCircle2, RefreshCw, Check, Upload, Image as ImageIcon, X,
} from "lucide-react";
import { api, API_BASE } from "@/lib/api";
import { getToken } from "@/lib/auth";

// ── Types ─────────────────────────────────────────────────────────────────────

interface DocData {
  lastName: string; firstName: string; middleName: string;
  phone: string; email: string;
  pavilionNumber: string;
  passPhotoUrl: string;
  passSelfiePhotoUrl: string;
  avatarUrl: string;
  entityType: string;
  categoryIds: string[];
  locationId: string;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

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
  const r = await api.post<{ url: string }>("/supplier/upload", { data: dataUrl, ext: "jpg" });
  return r.url.startsWith("http") ? r.url : `${API_BASE}${r.url}`;
}

// ── PhotoField with example background ───────────────────────────────────────

function PhotoField({
  label, hint, value, onChange, example, readOnly = false,
}: {
  label: string; hint: string; value: string;
  onChange?: (v: string) => void; example?: string; readOnly?: boolean;
}) {
  const [uploading, setUploading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const galleryRef = useRef<HTMLInputElement>(null);
  const cameraRef  = useRef<HTMLInputElement>(null);

  const handle = async (file: File) => {
    setUploading(true); setErr(null);
    try {
      const jpeg = await compressToJpeg(file);
      const url = await uploadBase64(jpeg);
      onChange?.(url);
    } catch (e: any) { setErr(e?.message ?? "Ошибка загрузки"); }
    finally { setUploading(false); }
  };

  if (readOnly) {
    return (
      <div className="space-y-2">
        {value ? (
          <a href={value} target="_blank" rel="noreferrer">
            <img src={value} alt={label}
              className="w-full rounded-2xl object-cover border border-border hover:opacity-90 transition"
              style={{ aspectRatio: "4/3" }}
            />
          </a>
        ) : (
          <div className="rounded-2xl bg-accent flex items-center justify-center" style={{ aspectRatio: "4/3" }}>
            <p className="text-sm text-muted">Не загружено</p>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="relative rounded-2xl overflow-hidden" style={{ aspectRatio: "4/3" }}>
        <img
          src={value || example || ""}
          alt={label}
          className="w-full h-full object-cover"
          style={value ? {} : { filter: "brightness(0.5) blur(2px)" }}
        />
        {uploading ? (
          <div className="absolute inset-0 bg-black/65 flex flex-col items-center justify-center gap-3">
            <svg width="64" height="64" viewBox="0 0 64 64" className="drop-shadow-lg">
              <circle cx="32" cy="32" r="26" fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth="5" />
              <circle cx="32" cy="32" r="26" fill="none" stroke="white" strokeWidth="5"
                strokeLinecap="round" strokeDasharray="163.36" strokeDashoffset="40"
                style={{ transformOrigin: "32px 32px", animation: "circSpin 1.1s linear infinite" }}
              />
              <style>{`@keyframes circSpin { from { transform: rotate(-90deg); } to { transform: rotate(270deg); } }`}</style>
            </svg>
            <p className="text-white text-sm font-semibold drop-shadow">Загрузка…</p>
          </div>
        ) : value ? (
          <>
            <div className="absolute top-3 left-3 bg-success/90 text-white text-xs px-2.5 py-1 rounded-full flex items-center gap-1.5 font-semibold">
              <Check className="w-3 h-3" /> Загружено
            </div>
            <button
              onClick={() => onChange?.("")}
              className="absolute top-3 right-3 bg-black/60 text-white text-xs px-3 py-1.5 rounded-full flex items-center gap-1.5 active:bg-black/80 transition"
            >
              <RefreshCw className="w-3 h-3" /> Заменить
            </button>
          </>
        ) : (
          <>
            {example && (
              <div className="absolute top-3 left-3 bg-black/55 text-white/90 text-[11px] px-2.5 py-1 rounded-full font-semibold tracking-wide uppercase">
                Пример
              </div>
            )}
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 px-4">
              <button
                onClick={() => galleryRef.current?.click()}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-white text-foreground text-sm font-bold shadow-xl active:scale-[0.97] transition"
                style={{ WebkitTapHighlightColor: "transparent" }}
              >
                <Upload className="w-4 h-4" /> Загрузить фото
              </button>
              <button
                onClick={() => cameraRef.current?.click()}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/20 text-white text-xs font-medium active:bg-white/30 transition"
                style={{ WebkitTapHighlightColor: "transparent" }}
              >
                <Camera className="w-3.5 h-3.5" /> Камера
              </button>
              <p className="text-white/75 text-[11px] text-center">{hint}</p>
            </div>
          </>
        )}
      </div>
      {err && <p className="text-xs text-danger bg-danger/5 rounded-xl px-3 py-2">{err}</p>}
      <input ref={galleryRef} type="file" accept="image/*" className="hidden"
        onChange={e => { const f = e.target.files?.[0]; if (f) handle(f); e.target.value = ""; }} />
      <input ref={cameraRef} type="file" accept="image/*" capture="environment" className="hidden"
        onChange={e => { const f = e.target.files?.[0]; if (f) handle(f); e.target.value = ""; }} />
    </div>
  );
}

// ── Section card ──────────────────────────────────────────────────────────────

function Section({ icon: Icon, title, badge, children }: {
  icon: React.ElementType; title: string; badge?: React.ReactNode; children: React.ReactNode;
}) {
  return (
    <div className="bg-card rounded-2xl border border-border overflow-hidden">
      <div className="flex items-center gap-2.5 px-5 py-3.5 border-b border-border bg-accent/30">
        <Icon className="w-4 h-4 text-primary" />
        <span className="text-sm font-bold flex-1">{title}</span>
        {badge}
      </div>
      <div className="p-5 space-y-4">{children}</div>
    </div>
  );
}

function ReadField({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-muted mb-1">{label}</p>
      <p className="text-sm font-medium">{value || "—"}</p>
    </div>
  );
}

function EditField({ label, value, onChange, placeholder }: {
  label: string; value: string; onChange: (v: string) => void; placeholder?: string;
}) {
  return (
    <div>
      <label className="block text-xs font-medium text-muted mb-1.5">{label}</label>
      <input
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full border border-border rounded-xl px-4 py-3 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/20"
      />
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function SellerDocumentsPage() {
  const router = useRouter();
  const [data, setData]     = useState<DocData>({
    lastName: "", firstName: "", middleName: "", phone: "", email: "",
    pavilionNumber: "", passPhotoUrl: "", passSelfiePhotoUrl: "", avatarUrl: "",
    entityType: "INDIVIDUAL", categoryIds: [], locationId: "",
  });
  const [status, setStatus]   = useState<string>("");
  const [rejectionReason, setRejectionReason] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving]   = useState(false);
  const [saved, setSaved]     = useState(false);
  const [error, setError]     = useState<string | null>(null);

  const set = (k: keyof DocData, v: string) => setData(f => ({ ...f, [k]: v }));

  useEffect(() => {
    if (!getToken()) { router.replace("/login"); return; }
    api.get<{
      profile: {
        status: string; lastName: string; firstName: string; middleName?: string | null;
        pavilionNumber?: string | null;
        passPhotoUrl?: string | null; passSelfiePhotoUrl?: string | null; avatarUrl?: string | null;
        entityType?: string | null; locationId?: string | null;
        rejectionReason?: string | null;
        categories?: { category: { id: string } }[];
      } | null;
      user: { firstName?: string | null; lastName?: string | null; phone?: string | null; email?: string | null };
    }>("/supplier/me").then(d => {
      const p = d.profile;
      const u = d.user;
      if (!p) { router.replace("/verify"); return; }
      setStatus(p.status);
      setRejectionReason(p.rejectionReason ?? null);
      setData({
        lastName: p.lastName ?? u.lastName ?? "",
        firstName: p.firstName ?? u.firstName ?? "",
        middleName: p.middleName ?? "",
        phone: u.phone ?? "",
        email: u.email ?? "",
        pavilionNumber: p.pavilionNumber ?? "",
        passPhotoUrl: p.passPhotoUrl ?? "",
        passSelfiePhotoUrl: p.passSelfiePhotoUrl ?? "",
        avatarUrl: p.avatarUrl ?? "",
        entityType: p.entityType ?? "INDIVIDUAL",
        categoryIds: p.categories?.map(c => c.category.id) ?? [],
        locationId: p.locationId ?? "",
      });
    }).catch(() => router.replace("/login"))
      .finally(() => setLoading(false));
  }, [router]);

  const save = async () => {
    setSaving(true); setError(null); setSaved(false);
    try {
      await api.post("/supplier/profile/submit", {
        firstName: data.firstName.trim(),
        lastName: data.lastName.trim(),
        middleName: data.middleName.trim() || undefined,
        phone: data.phone.trim() || undefined,
        locationId: data.locationId,
        pavilionNumber: data.pavilionNumber.trim(),
        entityType: data.entityType,
        categoryIds: data.categoryIds,
        passPhotoUrl: data.passPhotoUrl,
        passSelfiePhotoUrl: data.passSelfiePhotoUrl,
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

  const isEditable = status === "NEEDS_REVISION" || status === "REJECTED";
  const canSave = isEditable && !!data.passPhotoUrl && !!data.passSelfiePhotoUrl;

  const statusLabel: Record<string, string> = {
    PENDING: "На проверке", NEEDS_REVISION: "Требуются правки",
    APPROVED: "Одобрен", REJECTED: "Отклонён",
  };
  const statusColor: Record<string, string> = {
    PENDING: "bg-amber-500/10 text-amber-600",
    NEEDS_REVISION: "bg-orange-500/10 text-orange-600",
    APPROVED: "bg-green-500/10 text-green-600",
    REJECTED: "bg-red-500/10 text-red-600",
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">

      {/* Header */}
      <div className="sticky top-0 z-30 bg-card/95 backdrop-blur border-b border-border h-14 flex items-center px-4 gap-3">
        <button
          onClick={() => router.back()}
          className="text-muted transition"
          style={{ WebkitTapHighlightColor: "transparent" }}
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
        <h1 className="font-bold flex-1">Мои документы</h1>
        {status && (
          <span className={`text-xs font-semibold px-3 py-1 rounded-full ${statusColor[status] ?? ""}`}>
            {statusLabel[status] ?? status}
          </span>
        )}
      </div>

      <main className="flex-1 max-w-lg mx-auto w-full px-4 py-6 space-y-5 pb-10">

        {/* Approved banner */}
        {status === "APPROVED" && (
          <div className="bg-green-500/5 rounded-2xl border-2 border-green-500/20 p-5 flex items-center gap-4" style={{ animation: "slideUp 0.2s ease-out" }}>
            <div className="w-12 h-12 rounded-full bg-green-500/15 flex items-center justify-center shrink-0">
              <CheckCircle2 className="w-6 h-6 text-green-500" />
            </div>
            <div>
              <p className="font-bold text-green-600">Документы проверены</p>
              <p className="text-xs text-muted mt-0.5">Ваша верификация пройдена. Вы можете размещать товары.</p>
            </div>
          </div>
        )}

        {/* Revision banner */}
        {isEditable && rejectionReason && (
          <div className="bg-orange-50 border border-orange-200 rounded-2xl p-4 flex gap-3" style={{ animation: "slideUp 0.2s ease-out" }}>
            <span className="text-xl shrink-0">⚠️</span>
            <div>
              <p className="font-semibold text-sm text-orange-700">
                {status === "NEEDS_REVISION" ? "Требуются правки" : "Заявка отклонена"}
              </p>
              <p className="text-xs text-orange-600 mt-0.5">{rejectionReason}</p>
            </div>
          </div>
        )}

        {/* Personal data */}
        <Section icon={User} title="Личные данные">
          {isEditable ? (
            <div className="grid grid-cols-2 gap-3">
              <EditField label="Фамилия" value={data.lastName} onChange={v => set("lastName", v)} />
              <EditField label="Имя" value={data.firstName} onChange={v => set("firstName", v)} />
              <div className="col-span-2">
                <EditField label="Павильон" value={data.pavilionNumber} onChange={v => set("pavilionNumber", v)} placeholder="Например: СТ7-42" />
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              <ReadField label="Фамилия" value={data.lastName} />
              <ReadField label="Имя" value={data.firstName} />
              <ReadField label="Телефон" value={data.phone} />
              <ReadField label="Email" value={data.email} />
              <div className="col-span-2">
                <ReadField label="Павильон" value={data.pavilionNumber.split("\n")[0]} />
              </div>
            </div>
          )}
        </Section>

        {/* Passport */}
        <Section
          icon={FileText}
          title="Разворот паспорта"
          badge={data.passPhotoUrl ? <CheckCircle2 className="w-4 h-4 text-green-500" /> : undefined}
        >
          <PhotoField
            label="Разворот паспорта"
            hint="Все надписи читаемы, ничего не обрезано"
            value={data.passPhotoUrl}
            onChange={isEditable ? v => set("passPhotoUrl", v) : undefined}
            example="/examples/passport.png"
            readOnly={!isEditable}
          />
        </Section>

        {/* Selfie */}
        <Section
          icon={Camera}
          title="Селфи с паспортом"
          badge={data.passSelfiePhotoUrl ? <CheckCircle2 className="w-4 h-4 text-green-500" /> : undefined}
        >
          <PhotoField
            label="Селфи с паспортом"
            hint="Держите паспорт рядом с лицом, чтобы оба были в кадре"
            value={data.passSelfiePhotoUrl}
            onChange={isEditable ? v => set("passSelfiePhotoUrl", v) : undefined}
            example="/examples/selfie.png"
            readOnly={!isEditable}
          />
        </Section>

        {/* Biometric */}
        <Section
          icon={Camera}
          title="Биометрическое фото"
          badge={data.avatarUrl ? <CheckCircle2 className="w-4 h-4 text-green-500" /> : undefined}
        >
          {data.avatarUrl ? (
            <div className="space-y-3">
              <div className="w-32 h-32 rounded-full overflow-hidden border-4 border-green-400 mx-auto">
                <img src={data.avatarUrl} alt="Биометрия" className="w-full h-full object-cover" />
              </div>
              {isEditable && (
                <button
                  onClick={() => set("avatarUrl", "")}
                  className="w-full py-2.5 rounded-xl border border-border text-xs font-medium text-muted flex items-center justify-center gap-1.5 active:bg-accent transition"
                  style={{ WebkitTapHighlightColor: "transparent" }}
                >
                  <RefreshCw className="w-3.5 h-3.5" /> Загрузить новое фото
                </button>
              )}
            </div>
          ) : isEditable ? (
            <PhotoField
              label="Биометрическое фото"
              hint="Смотрите прямо в камеру, лицо по центру"
              value=""
              onChange={v => set("avatarUrl", v)}
            />
          ) : (
            <p className="text-sm text-muted text-center py-4">Не загружено</p>
          )}
        </Section>

        {/* Errors / success */}
        {error && (
          <div className="flex items-center gap-2 text-red-700 bg-red-50 border border-red-100 rounded-xl px-4 py-3">
            <X className="w-4 h-4 shrink-0" />
            <p className="text-sm">{error}</p>
          </div>
        )}
        {saved && (
          <div className="flex items-center gap-2 text-green-700 bg-green-50 border border-green-100 rounded-xl px-4 py-3">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span className="text-sm font-semibold">Данные обновлены! Возвращаемся…</span>
          </div>
        )}

        {/* Save button */}
        {isEditable && (
          <button
            onClick={save}
            disabled={saving || saved || !canSave}
            className="w-full py-4 rounded-2xl bg-primary text-white font-bold text-sm transition disabled:opacity-40 active:scale-[0.98] flex items-center justify-center gap-2"
            style={{ WebkitTapHighlightColor: "transparent" }}
          >
            <Save className="w-5 h-5" />
            {saving ? "Сохранение…" : "Отправить на повторную проверку"}
          </button>
        )}

        {!isEditable && status !== "APPROVED" && (
          <div className="bg-accent rounded-2xl border border-border px-4 py-3 text-xs text-muted text-center">
            Редактирование недоступно — заявка на рассмотрении
          </div>
        )}
      </main>
    </div>
  );
}
