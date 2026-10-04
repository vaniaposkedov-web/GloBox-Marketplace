"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  ChevronLeft, ChevronRight, Check, X,
  User, MapPin, Briefcase, Tag, FileText, Camera,
  Send, CheckCircle2, RefreshCw, Upload, ImageIcon,
} from "lucide-react";
import { api, API_BASE } from "@/lib/api";
import { getToken } from "@/lib/auth";

// ── Types ─────────────────────────────────────────────────────────────────────

interface DictItem { id: string; name: string; slug?: string; code?: string; }
interface Dicts { locations: DictItem[]; categories: DictItem[]; }

interface FormState {
  firstName: string; lastName: string; middleName: string; phone: string;
  locationId: string;
  pavilionNumber: string;
  signText: string;
  entityType: string;
  categoryIds: string[];
  customCategory: string;
  inn: string; ogrnip: string;
  passPhotoUrl: string; passSelfiePhotoUrl: string;
  avatarUrl: string;
}

const EMPTY_FORM: FormState = {
  firstName: "", lastName: "", middleName: "", phone: "",
  locationId: "",
  pavilionNumber: "",
  signText: "",
  entityType: "INDIVIDUAL",
  categoryIds: [],
  customCategory: "",
  inn: "", ogrnip: "",
  passPhotoUrl: "", passSelfiePhotoUrl: "",
  avatarUrl: "",
};

const DRAFT_KEY = "seller-verify-draft";


const ENTITY_TYPES = [
  { value: "INDIVIDUAL",    label: "Физическое лицо",    desc: "Работаю как частное лицо" },
  { value: "SELF_EMPLOYED", label: "Самозанятый (НПД)",  desc: "Плательщик налога на профдоход" },
  { value: "IP",            label: "ИП",                 desc: "Индивидуальный предприниматель" },
  { value: "OOO",           label: "ООО",                desc: "Юридическое лицо" },
];

const STEPS = [
  { num: 1, label: "Аккаунт",      icon: User },
  { num: 2, label: "Адрес",        icon: MapPin },
  { num: 3, label: "Деятельность", icon: Briefcase },
  { num: 4, label: "Категории",    icon: Tag },
  { num: 5, label: "Документы",    icon: FileText },
  { num: 6, label: "Биометрия",    icon: Camera },
];

// ── Image upload ──────────────────────────────────────────────────────────────

function compressToJpeg(file: File, maxPx = 1500, quality = 0.82): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Не удалось прочитать файл"));
    reader.onload = ev => {
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
  const res = await api.post<{ url: string }>("/supplier/upload", { data: dataUrl, ext: "jpg" });
  return res.url.startsWith("http") ? res.url : `${API_BASE}${res.url}`;
}

// ── PhotoUpload — пример как фон, как у посредника ───────────────────────────

function PhotoUpload({ label, hint, value, onChange, example }: {
  label: string; hint: string; value: string; onChange: (url: string) => void;
  example: string;
}) {
  const [uploading, setUploading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = async (file: File) => {
    setUploading(true); setErr(null);
    // Yield to React so the loading overlay renders before canvas work blocks the thread
    await new Promise(r => setTimeout(r, 40));
    try {
      const jpeg = await compressToJpeg(file);
      const url = await uploadBase64(jpeg);
      onChange(url);
    } catch (e: any) {
      setErr(e?.message ?? "Ошибка загрузки");
    } finally { setUploading(false); }
  };

  return (
    <div className="space-y-2">
      {/* Photo area */}
      <div className="relative rounded-2xl overflow-hidden" style={{ aspectRatio: "4/3" }}>
        {/* Background: example (blurred) or uploaded photo */}
        <img
          src={value || example}
          alt={label}
          className="w-full h-full object-cover"
          style={value ? {} : { filter: "brightness(0.5) blur(2px)" }}
        />

        {uploading ? (
          <div className="absolute inset-0 bg-black/65 flex flex-col items-center justify-center gap-3">
            <div className="animate-spin" style={{ width: 64, height: 64 }}>
              <svg width="64" height="64" viewBox="0 0 64 64">
                <circle cx="32" cy="32" r="26" fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth="5" />
                <circle cx="32" cy="32" r="26" fill="none" stroke="white" strokeWidth="5"
                  strokeLinecap="round" strokeDasharray="50 113" />
              </svg>
            </div>
            <p className="text-white text-sm font-semibold drop-shadow">Загрузка…</p>
          </div>
        ) : value ? (
          <>
            <div className="absolute top-3 left-3 bg-success/90 text-white text-xs px-2.5 py-1 rounded-full flex items-center gap-1.5 font-semibold">
              <Check className="w-3 h-3" /> Загружено
            </div>
            <button
              onClick={() => onChange("")}
              className="absolute top-3 right-3 bg-black/60 text-white text-xs px-3 py-1.5 rounded-full flex items-center gap-1.5 active:bg-black/80 transition"
            >
              <RefreshCw className="w-3 h-3" /> Заменить
            </button>
          </>
        ) : (
          <>
            <div className="absolute top-3 left-3 bg-black/55 text-white/90 text-[11px] px-2.5 py-1 rounded-full font-semibold tracking-wide uppercase">
              Пример
            </div>
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 px-4">
              <button
                onClick={() => inputRef.current?.click()}
                className="flex items-center gap-2 px-6 py-3 rounded-xl bg-white text-foreground text-sm font-bold shadow-xl active:scale-[0.97] transition"
                style={{ WebkitTapHighlightColor: "transparent" }}
              >
                <Upload className="w-4 h-4" />
                Загрузить своё фото
              </button>
              <p className="text-white/80 text-[11px] text-center">{hint}</p>
            </div>
          </>
        )}
      </div>

      {err && <p className="text-xs text-danger bg-danger/5 rounded-xl px-3 py-2">{err}</p>}
      <input ref={inputRef} type="file" accept="image/*" className="hidden"
        onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f); e.target.value = ""; }} />
    </div>
  );
}

// ── BiometricCapture ──────────────────────────────────────────────────────────

function BiometricCapture({ value, onCapture }: { value: string; onCapture: (url: string) => void }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const fallbackRef = useRef<HTMLInputElement>(null);
  const [state, setState] = useState<"idle" | "starting" | "scanning" | "countdown" | "uploading" | "done" | "error">("idle");
  const [count, setCount] = useState(3);
  const [preview, setPreview] = useState<string | null>(null);
  const [uploadErr, setUploadErr] = useState<string | null>(null);

  useEffect(() => {
    if (value) { setState("done"); setPreview(value); }
  }, [value]);

  useEffect(() => () => { streamRef.current?.getTracks().forEach(t => t.stop()); }, []);

  const startCamera = async () => {
    setState("starting"); setUploadErr(null);
    try {
      const s = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user", width: { ideal: 720 }, height: { ideal: 720 } }, audio: false,
      });
      streamRef.current = s;
      setState("scanning");
      setTimeout(() => { if (videoRef.current) videoRef.current.srcObject = s; }, 100);
    } catch { setState("error"); }
  };

  const doCapture = useCallback(async () => {
    const v = videoRef.current; const c = canvasRef.current;
    if (!v || !c) return;
    c.width = v.videoWidth || 640; c.height = v.videoHeight || 640;
    const ctx = c.getContext("2d")!;
    ctx.save(); ctx.scale(-1, 1); ctx.drawImage(v, -c.width, 0); ctx.restore();
    const dataUrl = c.toDataURL("image/jpeg", 0.90);
    streamRef.current?.getTracks().forEach(t => t.stop()); streamRef.current = null;
    setPreview(dataUrl); setState("uploading");
    try {
      const url = await uploadBase64(dataUrl);
      onCapture(url); setState("done");
    } catch (e: any) { setUploadErr(e?.message ?? "Ошибка загрузки"); setState("error"); }
  }, [onCapture]);

  const startCountdown = useCallback(() => {
    setState("countdown"); let c = 3; setCount(c);
    const t = setInterval(() => { c--; setCount(c); if (c <= 0) { clearInterval(t); doCapture(); } }, 1000);
  }, [doCapture]);

  const handleFallback = async (file: File) => {
    setState("uploading"); setUploadErr(null);
    try {
      const jpeg = await compressToJpeg(file, 800);
      const url = await uploadBase64(jpeg);
      setPreview(jpeg); onCapture(url); setState("done");
    } catch (e: any) { setUploadErr(e?.message ?? "Ошибка загрузки"); setState("error"); }
  };

  const retry = () => { setPreview(null); onCapture(""); setState("idle"); setCount(3); setUploadErr(null); };

  const SIZE = 264; const R = 120; const CIRC = 2 * Math.PI * R;

  return (
    <div className="space-y-4">
      {state === "idle" && (
        <div className="flex flex-col items-center gap-5 py-4">
          <div className="relative" style={{ width: SIZE, height: SIZE }}>
            <svg width={SIZE} height={SIZE} viewBox={`0 0 ${SIZE} ${SIZE}`} className="absolute inset-0">
              <circle cx={SIZE/2} cy={SIZE/2} r={R} fill="none" stroke="var(--border)" strokeWidth="3" />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
              <Camera className="w-16 h-16 text-muted" />
            </div>
          </div>
          <p className="text-center text-xs text-muted max-w-xs">Смотрите прямо в камеру, лицо по центру круга</p>
          <div className="flex flex-col gap-2 w-full max-w-56">
            <button onClick={startCamera}
              className="w-full px-6 py-3.5 rounded-xl bg-primary text-white font-semibold text-sm flex items-center justify-center gap-2 active:scale-[0.98] transition">
              <Camera className="w-4 h-4" /> Открыть камеру
            </button>
            <button onClick={() => fallbackRef.current?.click()}
              className="w-full px-6 py-3 rounded-xl border border-border text-sm font-medium text-muted flex items-center justify-center gap-2 active:bg-accent transition">
              <ImageIcon className="w-4 h-4" /> Загрузить фото
            </button>
          </div>
          <input ref={fallbackRef} type="file" accept="image/*" className="hidden"
            onChange={e => { const f = e.target.files?.[0]; if (f) handleFallback(f); e.target.value = ""; }} />
        </div>
      )}

      {state === "starting" && (
        <div className="flex flex-col items-center gap-3 py-8">
          <div className="w-12 h-12 rounded-full border-4 border-primary border-t-transparent animate-spin" />
          <p className="text-sm text-muted">Запуск камеры…</p>
        </div>
      )}

      {(state === "scanning" || state === "countdown") && (
        <div className="flex flex-col items-center gap-4">
          <div className="relative" style={{ width: SIZE, height: SIZE }}>
            <video ref={videoRef} autoPlay playsInline muted
              className="absolute inset-0 w-full h-full object-cover rounded-full"
              style={{ transform: "scaleX(-1)" }} />
            <svg width={SIZE} height={SIZE} viewBox={`0 0 ${SIZE} ${SIZE}`} className="absolute inset-0">
              <defs>
                <mask id="bm"><rect width={SIZE} height={SIZE} fill="white" /><circle cx={SIZE/2} cy={SIZE/2} r={R-2} fill="black" /></mask>
              </defs>
              <rect width={SIZE} height={SIZE} fill="rgba(0,0,0,0.5)" mask="url(#bm)" />
              <circle cx={SIZE/2} cy={SIZE/2} r={R} fill="none" stroke="rgba(255,255,255,0.25)" strokeWidth="3" />
              <circle cx={SIZE/2} cy={SIZE/2} r={R} fill="none"
                stroke={state === "countdown" ? "#22c55e" : "#3b82f6"} strokeWidth="4" strokeLinecap="round"
                strokeDasharray={`${state === "countdown" ? CIRC*0.9 : CIRC*0.25} ${CIRC}`}
                style={{ transformOrigin: `${SIZE/2}px ${SIZE/2}px`, animation: `bioRotate ${state === "countdown" ? "0.8s" : "1.8s"} linear infinite` }} />
            </svg>
            {state === "countdown" && (
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <span className="text-white text-7xl font-bold drop-shadow-2xl">{count}</span>
              </div>
            )}
          </div>
          <canvas ref={canvasRef} className="hidden" />
          <p className="text-xs text-muted text-center">{state === "countdown" ? "Не двигайтесь…" : "Расположите лицо в круге"}</p>
          {state === "scanning" && (
            <button onClick={startCountdown}
              className="px-8 py-3.5 rounded-xl bg-primary text-white font-semibold active:scale-[0.98] transition">
              Сфотографировать
            </button>
          )}
        </div>
      )}

      {state === "uploading" && (
        <div className="flex flex-col items-center gap-3 py-6">
          {preview && (
            <div className="relative w-40 h-40 rounded-full overflow-hidden border-4 border-primary/30">
              <img src={preview} alt="" className="w-full h-full object-cover" style={{ transform: "scaleX(-1)" }} />
              <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                <div className="w-9 h-9 rounded-full border-4 border-white border-t-transparent animate-spin" />
              </div>
            </div>
          )}
          <p className="text-sm text-muted animate-pulse">Сохранение…</p>
        </div>
      )}

      {state === "done" && (
        <div className="flex flex-col items-center gap-4">
          <div className="relative" style={{ width: SIZE, height: SIZE }}>
            {preview && (
              <img src={preview} alt="Биометрия"
                className="absolute inset-0 w-full h-full object-cover rounded-full"
                style={{ transform: "scaleX(-1)" }} />
            )}
            <svg width={SIZE} height={SIZE} viewBox={`0 0 ${SIZE} ${SIZE}`} className="absolute inset-0">
              <circle cx={SIZE/2} cy={SIZE/2} r={R} fill="none" stroke="#22c55e" strokeWidth="4" />
            </svg>
          </div>
          <div className="flex items-center gap-2 text-green-600 font-semibold text-sm">
            <CheckCircle2 className="w-5 h-5" /> Биометрия захвачена
          </div>
          <button onClick={retry} className="text-xs text-muted flex items-center gap-1.5 underline underline-offset-2">
            <RefreshCw className="w-3.5 h-3.5" /> Переснять
          </button>
        </div>
      )}

      {state === "error" && (
        <div className="text-center space-y-4 py-6">
          <p className="text-sm text-danger">{uploadErr ?? "Камера недоступна — проверьте разрешения браузера"}</p>
          <div className="flex flex-col gap-2 max-w-56 mx-auto">
            <button onClick={startCamera}
              className="px-6 py-2.5 rounded-xl bg-primary text-white text-sm font-semibold flex items-center justify-center gap-2 active:scale-[0.98] transition">
              <Camera className="w-4 h-4" /> Попробовать снова
            </button>
            <button onClick={() => fallbackRef.current?.click()}
              className="px-6 py-2.5 rounded-xl border border-border text-sm flex items-center justify-center gap-2 active:bg-accent transition">
              <ImageIcon className="w-4 h-4" /> Загрузить фото
            </button>
          </div>
          <input ref={fallbackRef} type="file" accept="image/*" className="hidden"
            onChange={e => { const f = e.target.files?.[0]; if (f) handleFallback(f); e.target.value = ""; }} />
        </div>
      )}
      <style>{`@keyframes bioRotate { from { transform: rotate(-90deg); } to { transform: rotate(270deg); } }`}</style>
    </div>
  );
}

// ── Field ─────────────────────────────────────────────────────────────────────

function Field({ label, value, onChange, placeholder, type = "text" }: {
  label: string; value: string; onChange: (v: string) => void; placeholder?: string; type?: string;
}) {
  return (
    <div>
      <label className="block text-[11px] font-semibold text-muted mb-1.5 uppercase tracking-wide">{label}</label>
      <input type={type} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}
        className="w-full border border-border rounded-xl px-3.5 py-2.5 bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/50 transition" />
    </div>
  );
}

function SummaryRow({ label, value, ok }: { label: string; value: string; ok?: boolean }) {
  return (
    <div className="flex items-center justify-between text-sm py-0.5">
      <span className="text-muted">{label}</span>
      <span className={`font-semibold ${ok ? "text-success" : ""}`}>{value}</span>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function VerifyPage() {
  const router  = useRouter();
  const [step, setStep]       = useState(1);
  const [dicts, setDicts]     = useState<Dicts | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError]     = useState<string | null>(null);
  const [rejectionReason, setRejectionReason] = useState<string | null>(null);

  const [form, setForm] = useState<FormState>({ ...EMPTY_FORM });

  const set = (k: keyof FormState, v: string | string[]) =>
    setForm(f => ({ ...f, [k]: v }));

  const toggleCategory = (id: string) =>
    setForm(f => {
      if (f.categoryIds.includes(id)) return { ...f, categoryIds: f.categoryIds.filter(c => c !== id) };
      if (f.categoryIds.length >= 5) return f;
      return { ...f, categoryIds: [...f.categoryIds, id] };
    });

  // ── Draft persistence ──
  const saveDraft = useCallback((f: FormState) => {
    try { localStorage.setItem(DRAFT_KEY, JSON.stringify(f)); } catch { /* ignore */ }
  }, []);

  const loadDraft = (): FormState | null => {
    try {
      const raw = localStorage.getItem(DRAFT_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch { return null; }
  };

  const clearDraft = () => {
    try { localStorage.removeItem(DRAFT_KEY); } catch { /* ignore */ }
  };

  // Auto-save draft on form change
  useEffect(() => {
    if (!loading) saveDraft(form);
  }, [form, loading, saveDraft]);

  // ── Load ──
  useEffect(() => {
    if (!getToken()) { router.replace("/login"); return; }
    Promise.all([
      api.get<{ user: { firstName?: string; lastName?: string; phone?: string }; profile: any }>("/supplier/me"),
      api.get<Dicts>("/supplier/dicts"),
    ]).then(([me, d]) => {
      const s = me.profile?.status;
      if (s === "PENDING" || s === "APPROVED") { router.replace("/dashboard"); return; }

      if (s === "NEEDS_REVISION" || s === "REJECTED") {
        setRejectionReason(me.profile?.rejectionReason ?? null);
      }

      setDicts(d);
      const firstLocationId = d.locations[0]?.id ?? "";

      // Try to restore from saved profile first, then from draft
      const draft = loadDraft();

      // Parse existing pavilionNumber and sign
      const rawPn = me.profile?.pavilionNumber ?? "";
      const signIdx = rawPn.indexOf("\nВывеска:");
      const existingPavilion = signIdx > 0 ? rawPn.slice(0, signIdx).trim() : rawPn.trim();
      const existingSign = signIdx > 0 ? rawPn.slice(signIdx + 9).trim() : "";

      setForm(draft ?? {
        firstName: me.user?.firstName ?? "",
        lastName:  me.user?.lastName  ?? "",
        middleName: "",
        phone:     me.user?.phone     ?? "",
        locationId:     me.profile?.locationId ?? firstLocationId,
        pavilionNumber: existingPavilion,
        signText:       existingSign,
        entityType:     me.profile?.entityType ?? "INDIVIDUAL",
        categoryIds:    me.profile?.categories?.map((c: any) => c.category.id) ?? [],
        customCategory: "",
        inn:            me.profile?.inn ?? "",
        ogrnip:         me.profile?.ogrnip ?? "",
        passPhotoUrl:       me.profile?.passPhotoUrl ?? "",
        passSelfiePhotoUrl: me.profile?.passSelfiePhotoUrl ?? "",
        avatarUrl:          me.profile?.avatarUrl ?? "",
      });
      setLoading(false);
    }).catch(() => router.replace("/login"));
  }, [router]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Validation ──
  const NAME_RE = /^[\p{L}\s\-']{1,50}$/u;

  const canStep: Record<number, boolean> = {
    1: form.firstName.trim().length >= 2 && NAME_RE.test(form.firstName.trim()) &&
       form.lastName.trim().length  >= 2 && NAME_RE.test(form.lastName.trim()),
    2: form.pavilionNumber.trim().length >= 2,
    3: !!form.entityType,
    4: form.categoryIds.length >= 1,
    5: !!form.passPhotoUrl && !!form.passSelfiePhotoUrl,
    6: !!form.avatarUrl,
  };

  const handleSubmit = async () => {
    setSubmitting(true); setError(null);
    const fullPavilion = [
      form.pavilionNumber.trim(),
      form.signText.trim() ? `\nВывеска: ${form.signText.trim()}` : "",
    ].join("").trim();

    // Build categoryIds: deduplicate, keep max 5
    const catIds = [...new Set(form.categoryIds)].slice(0, 5);

    try {
      await api.post("/supplier/profile/submit", {
        firstName:    form.firstName.trim(),
        lastName:     form.lastName.trim(),
        middleName:   form.middleName.trim() || undefined,
        phone:        form.phone.trim() || undefined,
        locationId:   form.locationId,
        pavilionNumber: fullPavilion,
        entityType:   form.entityType,
        categoryIds:  catIds,
        inn:          form.inn.trim() || undefined,
        ogrnip:       form.ogrnip.trim() || undefined,
        passPhotoUrl:      form.passPhotoUrl,
        passSelfiePhotoUrl: form.passSelfiePhotoUrl,
        avatarUrl:     form.avatarUrl || undefined,
      });
      clearDraft();
      router.replace("/dashboard?submitted=1");
    } catch (e: any) { setError(e.message ?? "Ошибка отправки"); }
    finally { setSubmitting(false); }
  };

  const handleBack = () => {
    saveDraft(form);
    router.replace("/dashboard");
  };

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="w-9 h-9 rounded-full border-4 border-primary border-t-transparent animate-spin" />
    </div>
  );

  return (
    <div className="min-h-screen flex flex-col bg-background">

      {/* ── Header ── */}
      <div
        className="sticky top-0 z-30 px-4 h-14 flex items-center justify-between"
        style={{ background: "rgba(255,255,255,0.92)", backdropFilter: "blur(16px)", borderBottom: "1px solid var(--border)" }}
      >
        <button
          onClick={handleBack}
          className="w-9 h-9 flex items-center justify-center rounded-xl active:bg-accent transition"
          style={{ WebkitTapHighlightColor: "transparent" }}
        >
          <ChevronLeft className="w-5 h-5 text-foreground" />
        </button>
        <div className="flex flex-col items-center">
          <span className="font-bold text-base leading-tight">Верификация</span>
          <span className="text-[11px] text-muted">{STEPS[step-1]?.label}</span>
        </div>
        <div className="w-9 h-9 flex items-center justify-center">
          <span className="text-xs font-bold text-primary bg-primary/10 px-2.5 py-1 rounded-full">{step}/{STEPS.length}</span>
        </div>
      </div>

      {/* ── Step indicator ── */}
      <div className="bg-card border-b border-border px-4 pt-4 pb-4">
        <div className="max-w-sm mx-auto relative">
          <div className="absolute top-5 left-5 right-5 h-0.5 bg-border" style={{ zIndex: 0 }}>
            <div
              className="h-full bg-primary rounded-full transition-all duration-500"
              style={{ width: `${((step - 1) / (STEPS.length - 1)) * 100}%` }}
            />
          </div>
          <div className="relative flex items-start justify-between" style={{ zIndex: 1 }}>
            {STEPS.map((s) => {
              const isDone   = step > s.num;
              const isActive = step === s.num;
              const Icon = s.icon;
              return (
                <div key={s.num} className="flex flex-col items-center gap-1.5">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center border-2 transition-all duration-300 ${
                    isDone   ? "bg-primary border-primary text-white"
                    : isActive ? "bg-white border-primary text-primary"
                    : "bg-card border-border text-muted"
                  }`}
                    style={isActive ? { boxShadow: "0 0 0 4px rgba(26,26,26,0.08)" } : undefined}
                  >
                    {isDone ? <Check className="w-4 h-4" /> : <Icon className="w-4 h-4" />}
                  </div>
                  <span className={`text-[10px] font-semibold leading-none text-center ${
                    isActive ? "text-primary" : isDone ? "text-foreground" : "text-muted"
                  }`}>{s.label}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* ── Content ── */}
      <main className="flex-1 max-w-lg mx-auto w-full px-4 py-5 pb-32">

        {/* Revision banner */}
        {rejectionReason && step === 1 && (
          <div className="mb-5 bg-orange-50 border border-orange-200 rounded-2xl p-4 flex gap-3">
            <span className="text-xl leading-none shrink-0">⚠️</span>
            <div>
              <p className="font-semibold text-sm text-orange-700">Требуются правки</p>
              <p className="text-xs text-orange-600 mt-1">{rejectionReason}</p>
              <p className="text-xs text-muted mt-1.5">Исправьте указанные данные и отправьте заявку повторно.</p>
            </div>
          </div>
        )}

        {/* Step 1: Personal data */}
        {step === 1 && (
          <div className="space-y-5 animate-[fadeIn_0.2s_ease-out]">
            <div>
              <h2 className="text-xl font-bold">Данные аккаунта</h2>
              <p className="text-sm text-muted mt-1">ФИО должно совпадать с паспортом.</p>
            </div>
            <div className="bg-card rounded-2xl border border-border divide-y divide-border overflow-hidden">
              <div className="p-4 grid grid-cols-2 gap-3">
                <Field label="Фамилия *" value={form.lastName}  onChange={v => set("lastName", v)}  placeholder="Иванов" />
                <Field label="Имя *"     value={form.firstName} onChange={v => set("firstName", v)} placeholder="Иван" />
              </div>
              <div className="p-4">
                <Field label="Отчество" value={form.middleName} onChange={v => set("middleName", v)} placeholder="Иванович (если есть)" />
              </div>
              <div className="p-4">
                <Field label="Телефон" value={form.phone} onChange={v => set("phone", v)} placeholder="+7..." />
              </div>
            </div>
            <div className="flex items-start gap-2.5 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-xs text-amber-700">
              <span className="text-base leading-none mt-0.5">⚠️</span>
              <span>ФИО сверяется с паспортными данными при проверке заявки администратором.</span>
            </div>
          </div>
        )}

        {/* Step 2: Pavilion address */}
        {step === 2 && (
          <div className="space-y-5 animate-[fadeIn_0.2s_ease-out]">
            <div>
              <h2 className="text-xl font-bold">Адрес торговой точки</h2>
              <p className="text-sm text-muted mt-1">Укажите номер павильона и название магазина.</p>
            </div>

            {/* Single pavilion input */}
            <div className="bg-card rounded-2xl border border-border p-4 space-y-3">
              <div>
                <label className="block text-[11px] font-semibold text-muted mb-1.5 uppercase tracking-wide">
                  Номер павильона *
                </label>
                <input
                  type="text"
                  value={form.pavilionNumber}
                  onChange={e => set("pavilionNumber", e.target.value)}
                  placeholder="Например: СТ7-42"
                  className="w-full border border-border rounded-xl px-3.5 py-2.5 bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 transition"
                />
                <p className="text-[11px] text-muted mt-1.5">
                  Например: СТ5-01 до СТ5-170+ · С1-15 · СТ7-83 и т.д.
                </p>
              </div>

              {/* Brand name */}
              <div>
                <label className="block text-[11px] font-semibold text-muted mb-1.5 uppercase tracking-wide">
                  Название магазина / бренда
                </label>
                <input
                  type="text"
                  value={form.signText}
                  onChange={e => set("signText", e.target.value)}
                  placeholder="Например: Бутик Алина, Мода Плюс, LuxStyle..."
                  className="w-full border border-border rounded-xl px-3.5 py-2.5 bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 transition"
                />
                <p className="text-[11px] text-muted mt-1.5">
                  Как называется ваш магазин или бренд — любое название.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-2.5 bg-blue-50 border border-blue-200 rounded-xl px-4 py-3 text-xs text-blue-700">
              <span className="text-base leading-none mt-0.5">📍</span>
              <span>Точный адрес помогает посредникам быстро находить вашу точку при оформлении заказов.</span>
            </div>
          </div>
        )}

        {/* Step 3: Entity type + INN */}
        {step === 3 && (
          <div className="space-y-5 animate-[fadeIn_0.2s_ease-out]">
            <div>
              <h2 className="text-xl font-bold">Форма деятельности</h2>
              <p className="text-sm text-muted mt-1">Как вы работаете юридически?</p>
            </div>
            <div className="space-y-2.5">
              {ENTITY_TYPES.map(et => (
                <button key={et.value} type="button" onClick={() => set("entityType", et.value)}
                  className={`w-full flex items-start gap-4 p-4 rounded-2xl border-2 text-left transition-all active:scale-[0.99] ${
                    form.entityType === et.value ? "bg-primary/5 border-primary" : "bg-card border-border"
                  }`}
                  style={{ WebkitTapHighlightColor: "transparent" }}
                >
                  <div className={`w-5 h-5 rounded-full border-2 shrink-0 mt-0.5 flex items-center justify-center ${
                    form.entityType === et.value ? "border-primary bg-primary" : "border-border"
                  }`}>
                    {form.entityType === et.value && <div className="w-2 h-2 rounded-full bg-white" />}
                  </div>
                  <div>
                    <p className="font-semibold text-sm">{et.label}</p>
                    <p className="text-xs text-muted mt-0.5">{et.desc}</p>
                  </div>
                </button>
              ))}
            </div>
            {(form.entityType === "IP" || form.entityType === "OOO" || form.entityType === "SELF_EMPLOYED") && (
              <div className="bg-card rounded-2xl border border-border p-4 space-y-3">
                <p className="text-[11px] font-semibold text-muted uppercase tracking-wide">Реквизиты (необязательно)</p>
                <Field label="ИНН" value={form.inn} onChange={v => set("inn", v)} placeholder="10 или 12 цифр" />
                {(form.entityType === "IP" || form.entityType === "OOO") && (
                  <Field label="ОГРНИП / ОГРН" value={form.ogrnip} onChange={v => set("ogrnip", v)} placeholder="13 или 15 цифр" />
                )}
              </div>
            )}
          </div>
        )}

        {/* Step 4: Categories */}
        {step === 4 && (
          <div className="space-y-5 animate-[fadeIn_0.2s_ease-out]">
            <div className="flex items-start justify-between">
              <div>
                <h2 className="text-xl font-bold">Категории товаров</h2>
                <p className="text-sm text-muted mt-1">Выберите от 1 до 5 категорий.</p>
              </div>
              <div className="flex items-center gap-1 bg-primary/10 text-primary text-xs font-semibold px-3 py-1.5 rounded-full">
                <span>{form.categoryIds.length}</span><span className="text-primary/60">/5</span>
              </div>
            </div>

            {dicts ? (
              <div className="space-y-2">
                {dicts.categories.map(c => {
                  const selected = form.categoryIds.includes(c.id);
                  const disabled = !selected && form.categoryIds.length >= 5;
                  return (
                    <button key={c.id} type="button" onClick={() => toggleCategory(c.id)} disabled={disabled}
                      className={`w-full flex items-center gap-3 p-4 rounded-2xl border-2 text-left transition-all active:scale-[0.99] disabled:opacity-40 ${
                        selected ? "bg-primary/5 border-primary" : "bg-card border-border"
                      }`}
                      style={{ WebkitTapHighlightColor: "transparent" }}
                    >
                      <div className={`w-5 h-5 rounded border-2 shrink-0 flex items-center justify-center ${
                        selected ? "border-primary bg-primary" : "border-border"
                      }`}>
                        {selected && <Check className="w-3 h-3 text-white" />}
                      </div>
                      <span className="font-medium text-sm flex-1">{c.name}</span>
                      {selected && <X className="w-4 h-4 text-muted shrink-0" />}
                    </button>
                  );
                })}
              </div>
            ) : (
              <div className="space-y-2">
                {[0,1,2,3].map(i => <div key={i} className="h-14 rounded-2xl bg-card animate-pulse border border-border" />)}
              </div>
            )}

            {/* Custom category */}
            <div className="bg-card rounded-2xl border border-border p-4 space-y-2">
              <p className="text-[11px] font-semibold text-muted uppercase tracking-wide">Свой вариант (необязательно)</p>
              <input
                type="text"
                value={form.customCategory}
                onChange={e => set("customCategory", e.target.value)}
                placeholder="Например: Купальники, Автозапчасти, Игрушки..."
                className="w-full border border-border rounded-xl px-3.5 py-2.5 bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 transition"
              />
              <p className="text-[11px] text-muted">Если вашей категории нет в списке — опишите её здесь.</p>
            </div>
          </div>
        )}

        {/* Step 5: Documents */}
        {step === 5 && (
          <div className="space-y-5 animate-[fadeIn_0.2s_ease-out]">
            <div className="flex items-start justify-between">
              <div>
                <h2 className="text-xl font-bold">Документы</h2>
                <p className="text-sm text-muted mt-1">Оба документа обязательны для верификации.</p>
              </div>
              <div className="flex items-center gap-1 bg-primary/10 text-primary text-xs font-semibold px-3 py-1.5 rounded-full">
                <span>{[form.passPhotoUrl, form.passSelfiePhotoUrl].filter(Boolean).length}</span>
                <span className="text-primary/60">/2</span>
              </div>
            </div>

            <div className="bg-card rounded-2xl border border-border overflow-hidden">
              <div className="px-4 pt-4 pb-3 flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center shrink-0">
                  <FileText className="w-4 h-4 text-blue-600" />
                </div>
                <div className="flex-1">
                  <p className="font-semibold text-sm">Разворот паспорта *</p>
                  <p className="text-xs text-muted">Страницы 2–3 с фото и данными</p>
                </div>
                {form.passPhotoUrl && <CheckCircle2 className="w-5 h-5 text-success shrink-0" />}
              </div>
              <div className="px-4 pb-4">
                <PhotoUpload
                  label="Разворот паспорта"
                  hint="Все надписи читаемы, ничего не обрезано"
                  value={form.passPhotoUrl}
                  onChange={u => set("passPhotoUrl", u)}
                  example="/examples/passport.png"
                />
              </div>
            </div>

            <div className="bg-card rounded-2xl border border-border overflow-hidden">
              <div className="px-4 pt-4 pb-3 flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-purple-100 flex items-center justify-center shrink-0">
                  <Camera className="w-4 h-4 text-purple-600" />
                </div>
                <div className="flex-1">
                  <p className="font-semibold text-sm">Селфи с паспортом *</p>
                  <p className="text-xs text-muted">Лицо + разворот паспорта в одном кадре</p>
                </div>
                {form.passSelfiePhotoUrl && <CheckCircle2 className="w-5 h-5 text-success shrink-0" />}
              </div>
              <div className="px-4 pb-4">
                <PhotoUpload
                  label="Селфи с паспортом"
                  hint="Держите паспорт рядом с лицом, чтобы оба были в кадре"
                  value={form.passSelfiePhotoUrl}
                  onChange={u => set("passSelfiePhotoUrl", u)}
                  example="/examples/selfie.png"
                />
              </div>
            </div>

            <div className="flex items-start gap-2.5 bg-accent rounded-xl px-4 py-3 text-xs text-muted">
              <span className="text-base leading-none mt-0.5">🔒</span>
              <span>Документы хранятся на защищённом сервере и используются только для верификации.</span>
            </div>
          </div>
        )}

        {/* Step 6: Biometrics */}
        {step === 6 && (
          <div className="space-y-5 animate-[fadeIn_0.2s_ease-out]">
            <div>
              <h2 className="text-xl font-bold">Биометрия лица</h2>
              <p className="text-sm text-muted mt-1">Фото лица для подтверждения личности. Смотрите прямо в камеру.</p>
            </div>

            <div className="bg-card rounded-2xl border border-border p-5">
              <BiometricCapture value={form.avatarUrl} onCapture={url => set("avatarUrl", url)} />
            </div>

            {/* Summary */}
            {canStep[6] && (
              <div className="bg-card rounded-2xl border border-border p-4 space-y-2.5">
                <p className="text-[11px] font-semibold text-muted uppercase tracking-wider">Итог заявки</p>
                <SummaryRow label="ФИО" value={`${form.lastName} ${form.firstName}${form.middleName ? " " + form.middleName : ""}`} />
                <SummaryRow label="Павильон" value={form.pavilionNumber || "—"} ok={!!form.pavilionNumber} />
                {form.signText && <SummaryRow label="Название магазина" value={form.signText} />}
                <SummaryRow label="Форма" value={ENTITY_TYPES.find(e => e.value === form.entityType)?.label ?? "—"} />
                <SummaryRow label="Категорий" value={String(form.categoryIds.length)} />
                <SummaryRow label="Паспорт"   value="✓ Загружен"  ok />
                <SummaryRow label="Селфи"     value="✓ Загружено" ok />
                <SummaryRow label="Биометрия" value="✓ Захвачена" ok />
              </div>
            )}

            {error && (
              <div className="text-sm text-danger bg-danger/5 border border-danger/20 rounded-xl px-4 py-3">{error}</div>
            )}
          </div>
        )}
      </main>

      {/* ── Sticky bottom ── */}
      <div
        className="fixed bottom-0 left-0 right-0 z-40 px-4 py-4"
        style={{ background: "rgba(255,255,255,0.95)", backdropFilter: "blur(16px)", borderTop: "1px solid var(--border)" }}
      >
        <div className="max-w-lg mx-auto flex gap-3">
          {step > 1 && (
            <button
              onClick={() => setStep(s => s - 1)}
              className="h-12 px-4 rounded-2xl border border-border text-sm font-semibold active:bg-accent transition flex items-center gap-1.5 shrink-0"
              style={{ WebkitTapHighlightColor: "transparent" }}
            >
              <ChevronLeft className="w-4 h-4" /> Назад
            </button>
          )}
          {step < STEPS.length ? (
            <button
              onClick={() => setStep(s => s + 1)}
              disabled={!canStep[step]}
              className="flex-1 h-12 rounded-2xl bg-primary text-white font-semibold text-sm transition-all disabled:opacity-40 active:scale-[0.98] flex items-center justify-center gap-2"
              style={{ WebkitTapHighlightColor: "transparent" }}
            >
              Далее <ChevronRight className="w-4 h-4" />
            </button>
          ) : (
            <button
              onClick={handleSubmit}
              disabled={submitting || !canStep[6]}
              className="flex-1 h-12 rounded-2xl bg-success text-white font-semibold text-sm transition-all disabled:opacity-40 active:scale-[0.98] flex items-center justify-center gap-2"
              style={{ WebkitTapHighlightColor: "transparent" }}
            >
              <Send className="w-4 h-4" />
              {submitting ? "Отправка…" : "Отправить заявку"}
            </button>
          )}
        </div>
        {step === 6 && !canStep[6] && (
          <p className="text-center text-xs text-muted mt-2">Захватите биометрию для отправки заявки</p>
        )}
      </div>
    </div>
  );
}
