"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  ChevronRight, ChevronLeft, Check,
  User, FileText, Camera, Send,
  CheckCircle2, RefreshCw, ImageIcon, ShieldCheck, Upload,
} from "lucide-react";
import { api, API_BASE } from "@/lib/api";
import { getToken } from "@/lib/auth";

const STEPS = [
  { num: 1, label: "Данные",     icon: User },
  { num: 2, label: "Документы",  icon: FileText },
  { num: 3, label: "Биометрия",  icon: Camera },
];

interface FormState {
  lastName: string; firstName: string; middleName: string;
  phone: string; email: string;
  passportPhotoUrl: string; passSelfiePhotoUrl: string; passPhotoUrl: string; avatarUrl: string;
}

/* ─── Compress image → JPEG via canvas ─── */
function compressToJpeg(file: File, maxPx = 1500, quality = 0.82): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Не удалось прочитать файл"));
    reader.onload = (ev) => {
      const img = new window.Image();
      img.onerror = () => reject(new Error("Не удалось открыть изображение. Попробуйте другой файл"));
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

/* ─── Upload to server ─── */
async function uploadBase64(dataUrl: string): Promise<string> {
  const res = await api.post<{ url: string }>("/mediator/upload", { data: dataUrl, ext: "jpg" });
  return res.url.startsWith("http") ? res.url : `${API_BASE}${res.url}`;
}

/* ─── PhotoUpload: shows example image, then replaced by actual upload ─── */
function PhotoUpload({
  label, hint, value, onChange, example,
}: {
  label: string;
  hint: string;
  value: string;
  onChange: (url: string) => void;
  example: string;
}) {
  const [uploading, setUploading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = async (file: File) => {
    setUploading(true);
    setErr(null);
    try {
      const jpeg = await compressToJpeg(file);
      const url = await uploadBase64(jpeg);
      onChange(url);
    } catch (e: any) {
      setErr(e?.message ?? "Ошибка загрузки. Попробуйте ещё раз.");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-2">
      {/* Photo area */}
      <div className="relative rounded-2xl overflow-hidden aspect-4/3 bg-muted/30">

        {/* Background: example or uploaded image */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={value || example}
          alt={label}
          className="w-full h-full object-cover"
          style={value ? {} : { filter: "brightness(0.55) blur(1px)" }}
        />

        {uploading ? (
          /* Loading overlay */
          <div className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center gap-3">
            <div className="w-10 h-10 rounded-full border-4 border-white/30 border-t-white animate-spin" />
            <p className="text-white text-sm font-medium">Загрузка…</p>
          </div>
        ) : value ? (
          /* Uploaded state */
          <>
            <div className="absolute top-3 left-3 bg-green-500 text-white text-xs px-3 py-1 rounded-full flex items-center gap-1.5 font-semibold shadow">
              <Check className="w-3 h-3" /> Загружено
            </div>
            <button
              onClick={() => { onChange(""); setErr(null); }}
              className="absolute top-3 right-3 bg-black/60 hover:bg-black/80 text-white text-xs px-3 py-1.5 rounded-full flex items-center gap-1.5 transition"
            >
              <RefreshCw className="w-3 h-3" /> Заменить
            </button>
          </>
        ) : (
          /* Not uploaded: overlay with ПРИМЕР badge + upload button */
          <>
            <div className="absolute top-3 left-3 bg-black/55 text-white/90 text-[11px] px-2.5 py-1 rounded-full font-semibold tracking-wide uppercase">
              Пример
            </div>
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 px-4">
              <button
                onClick={() => inputRef.current?.click()}
                className="flex items-center gap-2 px-6 py-3 rounded-xl bg-white text-foreground text-sm font-bold shadow-xl hover:bg-white/95 active:scale-[0.97] transition"
              >
                <Upload className="w-4 h-4" />
                Загрузить своё фото
              </button>
              <p className="text-white/75 text-xs text-center">{hint}</p>
            </div>
          </>
        )}
      </div>

      {err && <p className="text-xs text-danger bg-danger/5 rounded-xl px-3 py-2">{err}</p>}

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) handleFile(f);
          e.target.value = "";
        }}
      />
    </div>
  );
}

/* ─── BiometricCapture ─── */
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
    setState("starting");
    setUploadErr(null);
    try {
      const s = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user", width: { ideal: 720 }, height: { ideal: 720 } },
        audio: false,
      });
      streamRef.current = s;
      setState("scanning");
      setTimeout(() => { if (videoRef.current) videoRef.current.srcObject = s; }, 100);
    } catch {
      setState("error");
    }
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
    } catch (e: any) {
      setUploadErr(e?.message ?? "Ошибка загрузки"); setState("error");
    }
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
    } catch (e: any) {
      setUploadErr(e?.message ?? "Ошибка загрузки"); setState("error");
    }
  };

  const retry = () => {
    setPreview(null); onCapture(""); setState("idle"); setCount(3); setUploadErr(null);
  };

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
          <p className="text-center text-xs text-muted max-w-[240px]">Смотрите прямо в камеру, лицо по центру круга</p>
          <div className="flex flex-col gap-2 w-full max-w-[220px]">
            <button onClick={startCamera}
              className="w-full px-6 py-3.5 rounded-xl bg-primary text-white font-semibold text-sm hover:bg-primary-hover transition flex items-center justify-center gap-2">
              <Camera className="w-4 h-4" /> Открыть камеру
            </button>
            <button onClick={() => fallbackRef.current?.click()}
              className="w-full px-6 py-3 rounded-xl border border-border text-sm font-medium text-muted hover:bg-accent transition flex items-center justify-center gap-2">
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
                <mask id="fm"><rect width={SIZE} height={SIZE} fill="white" /><circle cx={SIZE/2} cy={SIZE/2} r={R-2} fill="black" /></mask>
              </defs>
              <rect width={SIZE} height={SIZE} fill="rgba(0,0,0,0.5)" mask="url(#fm)" />
              <circle cx={SIZE/2} cy={SIZE/2} r={R} fill="none" stroke="rgba(255,255,255,0.25)" strokeWidth="3" />
              <circle cx={SIZE/2} cy={SIZE/2} r={R} fill="none"
                stroke={state === "countdown" ? "#22c55e" : "#3b82f6"}
                strokeWidth="4" strokeLinecap="round"
                strokeDasharray={`${state === "countdown" ? CIRC*0.9 : CIRC*0.25} ${CIRC}`}
                style={{ transformOrigin:`${SIZE/2}px ${SIZE/2}px`,
                  animation: `scanRotate ${state === "countdown" ? "0.8s" : "1.8s"} linear infinite` }} />
            </svg>
            {state === "countdown" && (
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <span className="text-white text-7xl font-bold drop-shadow-2xl">{count}</span>
              </div>
            )}
          </div>
          <canvas ref={canvasRef} className="hidden" />
          <p className="text-xs text-muted text-center">
            {state === "countdown" ? "Не двигайтесь…" : "Расположите лицо в круге"}
          </p>
          {state === "scanning" && (
            <button onClick={startCountdown}
              className="px-8 py-3.5 rounded-xl bg-primary text-white font-semibold hover:bg-primary-hover transition">
              Сфотографировать
            </button>
          )}
        </div>
      )}

      {state === "uploading" && (
        <div className="flex flex-col items-center gap-3 py-6">
          {preview && (
            <div className="relative w-40 h-40 rounded-full overflow-hidden border-4 border-primary/30">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={preview} alt="" className="w-full h-full object-cover" style={{ transform:"scaleX(-1)" }} />
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
              // eslint-disable-next-line @next/next/no-img-element
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
          <button onClick={retry} className="text-xs text-muted hover:text-foreground flex items-center gap-1.5 underline underline-offset-2">
            <RefreshCw className="w-3.5 h-3.5" /> Переснять
          </button>
        </div>
      )}

      {state === "error" && (
        <div className="text-center space-y-4 py-6">
          <p className="text-sm text-danger">{uploadErr ?? "Камера недоступна — проверьте разрешения браузера"}</p>
          <div className="flex flex-col gap-2 max-w-[220px] mx-auto">
            <button onClick={startCamera}
              className="px-6 py-2.5 rounded-xl bg-primary text-white text-sm font-semibold hover:bg-primary-hover transition flex items-center justify-center gap-2">
              <Camera className="w-4 h-4" /> Попробовать снова
            </button>
            <button onClick={() => fallbackRef.current?.click()}
              className="px-6 py-2.5 rounded-xl border border-border text-sm hover:bg-accent transition flex items-center justify-center gap-2">
              <ImageIcon className="w-4 h-4" /> Загрузить фото
            </button>
          </div>
          <input ref={fallbackRef} type="file" accept="image/*" className="hidden"
            onChange={e => { const f = e.target.files?.[0]; if (f) handleFallback(f); e.target.value = ""; }} />
        </div>
      )}

      <style>{`
        @keyframes scanRotate { from { transform:rotate(-90deg); } to { transform:rotate(270deg); } }
      `}</style>
    </div>
  );
}

/* ─── Main Page ─── */
export default function VerifyPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [form, setForm] = useState<FormState>({
    lastName: "", firstName: "", middleName: "", phone: "", email: "",
    passportPhotoUrl: "", passSelfiePhotoUrl: "", passPhotoUrl: "", avatarUrl: "",
  });
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (!getToken()) { router.replace("/login"); return; }
    api.get<{
      profile: { status: string } | null;
      user: { firstName?: string | null; lastName?: string | null; phone?: string | null; email?: string | null };
    }>("/mediator/me")
      .then(d => {
        const s = d.profile?.status;
        if (s === "PENDING" || s === "APPROVED") { router.replace("/profile"); return; }
        const u = d.user;
        setForm(f => ({ ...f, firstName: u.firstName ?? "", lastName: u.lastName ?? "", phone: u.phone ?? "", email: u.email ?? "" }));
      })
      .catch(() => router.replace("/login"))
      .finally(() => setLoading(false));
  }, [router]);

  const set = (k: keyof FormState, v: string) => setForm(f => ({ ...f, [k]: v }));
  const canStep1 = form.firstName.trim().length >= 2 && form.lastName.trim().length >= 2;
  const canStep2 = form.passportPhotoUrl.length > 0 && form.passSelfiePhotoUrl.length > 0 && form.passPhotoUrl.length > 0;
  const canStep3 = form.avatarUrl.length > 0;

  const handleSubmit = async () => {
    setSubmitting(true); setError(null);
    try {
      await api.post("/mediator/profile/submit", {
        firstName: form.firstName.trim(), lastName: form.lastName.trim(),
        middleName: form.middleName.trim() || undefined,
        phone: form.phone.trim() || undefined,
        commissionRate: 7, minOrderAmount: 0,
        passportPhotoUrl: form.passportPhotoUrl,
        passSelfiePhotoUrl: form.passSelfiePhotoUrl,
        passPhotoUrl: form.passPhotoUrl,
        avatarUrl: form.avatarUrl,
      });
      setDone(true);
      router.replace("/profile?verified=1");
    } catch (e: any) { setError(e.message ?? "Ошибка отправки"); }
    finally { setSubmitting(false); }
  };

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="w-9 h-9 rounded-full border-4 border-primary border-t-transparent animate-spin" />
    </div>
  );

  if (done) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="w-9 h-9 rounded-full border-4 border-primary border-t-transparent animate-spin" />
    </div>
  );

  const uploadedCount = [form.passportPhotoUrl, form.passSelfiePhotoUrl, form.passPhotoUrl].filter(Boolean).length;

  return (
    <div className="min-h-screen flex flex-col bg-background">

      {/* ─── Header ─── */}
      <div className="sticky top-0 z-30 bg-card/95 backdrop-blur-lg border-b border-border px-4 h-14 flex items-center justify-between">
        <button
          onClick={() => step > 1 ? setStep(s => s - 1) : router.back()}
          className="w-9 h-9 flex items-center justify-center rounded-xl hover:bg-accent transition text-muted"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
        <span className="font-bold text-base">Верификация</span>
        <span className="text-xs font-semibold text-muted bg-accent px-3 py-1 rounded-full">
          {step} / 3
        </span>
      </div>

      {/* ─── Step indicator ─── */}
      <div className="bg-card border-b border-border px-4 py-4">
        <div className="flex items-center justify-center max-w-xs mx-auto">
          {STEPS.map((s, i) => {
            const isDone   = step > s.num;
            const isActive = step === s.num;
            const Icon = s.icon;
            return (
              <div key={s.num} className="flex items-center">
                {i > 0 && (
                  <div className={`h-0.5 w-12 mx-1 rounded-full transition-all duration-300 ${isDone ? "bg-primary" : "bg-border"}`} />
                )}
                <div className="flex flex-col items-center gap-1.5">
                  <div className={`
                    w-10 h-10 rounded-full flex items-center justify-center border-2 transition-all duration-300
                    ${isDone   ? "bg-primary border-primary text-white shadow-sm shadow-primary/30"
                    : isActive ? "bg-primary/10 border-primary text-primary"
                    : "bg-background border-border text-muted"}
                  `}>
                    {isDone ? <Check className="w-5 h-5" /> : <Icon className="w-4 h-4" />}
                  </div>
                  <span className={`text-[10px] font-semibold ${isActive ? "text-primary" : isDone ? "text-foreground" : "text-muted"}`}>
                    {s.label}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ─── Content ─── */}
      <main className="flex-1 max-w-lg mx-auto w-full px-4 py-5 pb-32">

        {/* ── Step 1: Personal data ── */}
        {step === 1 && (
          <div className="space-y-5 animate-[fadeIn_0.2s_ease-out]">
            <div>
              <h2 className="text-xl font-bold">Проверьте данные</h2>
              <p className="text-sm text-muted mt-1">Данные заполнены из регистрации. Убедитесь, что ФИО совпадает с паспортом.</p>
            </div>

            <div className="bg-card rounded-2xl border border-border divide-y divide-border overflow-hidden">
              <div className="p-4 grid grid-cols-2 gap-3">
                <Field label="Фамилия *" value={form.lastName}   onChange={v => set("lastName", v)}   placeholder="Иванов" />
                <Field label="Имя *"     value={form.firstName}  onChange={v => set("firstName", v)}  placeholder="Иван" />
              </div>
              <div className="p-4">
                <Field label="Отчество" value={form.middleName} onChange={v => set("middleName", v)} placeholder="Иванович (если есть)" />
              </div>
              <div className="p-4 grid grid-cols-2 gap-3">
                <Field label="Email"    value={form.email} onChange={v => set("email", v)} placeholder="email@example.com" />
                <Field label="Телефон"  value={form.phone} onChange={v => set("phone", v)} placeholder="+7..." />
              </div>
            </div>

            <div className="flex items-start gap-2.5 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-xs text-amber-700">
              <span className="text-base leading-none mt-0.5">⚠️</span>
              <span>ФИО должно совпадать с паспортом — администратор сверяет данные перед одобрением.</span>
            </div>
          </div>
        )}

        {/* ── Step 2: Documents ── */}
        {step === 2 && (
          <div className="space-y-5 animate-[fadeIn_0.2s_ease-out]">
            <div className="flex items-start justify-between">
              <div>
                <h2 className="text-xl font-bold">Документы</h2>
                <p className="text-sm text-muted mt-1">Замените примеры своими фото.</p>
              </div>
              <div className="flex items-center gap-1.5 bg-primary/10 text-primary text-xs font-semibold px-3 py-1.5 rounded-full">
                <span>{uploadedCount}</span>
                <span className="text-primary/60">/</span>
                <span className="text-primary/60">3</span>
              </div>
            </div>

            {/* Passport */}
            <div className="bg-card rounded-2xl border border-border overflow-hidden">
              <div className="px-4 pt-4 pb-3 flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center">
                  <FileText className="w-4 h-4 text-blue-600" />
                </div>
                <div>
                  <p className="font-semibold text-sm">Разворот паспорта</p>
                  <p className="text-xs text-muted">Страницы 2–3 с фото и данными</p>
                </div>
                {form.passportPhotoUrl && <CheckCircle2 className="w-5 h-5 text-green-500 ml-auto shrink-0" />}
              </div>
              <div className="px-4 pb-4">
                <PhotoUpload
                  label="Разворот паспорта"
                  hint="Все надписи читаемы, ничего не обрезано"
                  value={form.passportPhotoUrl}
                  onChange={u => set("passportPhotoUrl", u)}
                  example="/examples/passport.png"
                />
              </div>
            </div>

            {/* Selfie */}
            <div className="bg-card rounded-2xl border border-border overflow-hidden">
              <div className="px-4 pt-4 pb-3 flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-purple-100 flex items-center justify-center">
                  <Camera className="w-4 h-4 text-purple-600" />
                </div>
                <div>
                  <p className="font-semibold text-sm">Селфи с паспортом в руке</p>
                  <p className="text-xs text-muted">Лицо + разворот паспорта одновременно</p>
                </div>
                {form.passSelfiePhotoUrl && <CheckCircle2 className="w-5 h-5 text-green-500 ml-auto shrink-0" />}
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

            {/* Sadovod Pass */}
            <div className="bg-card rounded-2xl border border-border overflow-hidden">
              <div className="px-4 pt-4 pb-3 flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-green-100 flex items-center justify-center">
                  <ShieldCheck className="w-4 h-4 text-green-600" />
                </div>
                <div>
                  <p className="font-semibold text-sm">Пропуск из Садовода</p>
                  <p className="text-xs text-muted">Данные и срок действия должны быть читаемы</p>
                </div>
                {form.passPhotoUrl && <CheckCircle2 className="w-5 h-5 text-green-500 ml-auto shrink-0" />}
              </div>
              <div className="px-4 pb-4">
                <PhotoUpload
                  label="Пропуск из Садовода"
                  hint="Сфотографируйте пропуск целиком — имя и срок действия"
                  value={form.passPhotoUrl}
                  onChange={u => set("passPhotoUrl", u)}
                  example="/examples/pass.png"
                />
              </div>

              {/* Pass expiry date */}
            </div>

            <div className="flex items-start gap-2.5 bg-accent rounded-xl px-4 py-3 text-xs text-muted">
              <span className="text-base leading-none mt-0.5">🔒</span>
              <span>Фото хранятся на защищённом сервере и используются только для верификации.</span>
            </div>
          </div>
        )}

        {/* ── Step 3: Biometrics ── */}
        {step === 3 && (
          <div className="space-y-5 animate-[fadeIn_0.2s_ease-out]">
            <div>
              <h2 className="text-xl font-bold">Биометрия</h2>
              <p className="text-sm text-muted mt-1">Фото лица для подтверждения личности. Смотрите прямо в камеру.</p>
            </div>

            <div className="bg-card rounded-2xl border border-border p-5">
              <BiometricCapture value={form.avatarUrl} onCapture={url => set("avatarUrl", url)} />
            </div>

            {error && (
              <div className="text-sm text-danger bg-danger/5 border border-danger/20 rounded-xl px-4 py-3">
                {error}
              </div>
            )}

            {canStep3 && (
              <div className="bg-card rounded-2xl border border-border p-4 space-y-2.5">
                <p className="text-[11px] font-semibold text-muted uppercase tracking-wider">Итог заявки</p>
                <SummaryRow label="ФИО"        value={`${form.lastName} ${form.firstName}${form.middleName ? " " + form.middleName : ""}`} />
                <SummaryRow label="Паспорт"    value="✓ Загружен"   ok />
                <SummaryRow label="Селфи"      value="✓ Загружено"  ok />
                <SummaryRow label="Пропуск"    value="✓ Загружен"   ok />
                <SummaryRow label="Биометрия"  value="✓ Захвачена"  ok />
              </div>
            )}
          </div>
        )}
      </main>

      {/* ─── Sticky bottom buttons ─── */}
      <div className="fixed bottom-0 left-0 right-0 z-40 bg-card/95 backdrop-blur-lg border-t border-border px-4 py-4 safe-bottom">
        <div className="max-w-lg mx-auto flex gap-3">
          {step > 1 && (
            <button
              onClick={() => setStep(s => s - 1)}
              className="h-12 px-5 rounded-xl border border-border text-sm font-semibold hover:bg-accent transition flex items-center gap-1.5 shrink-0"
            >
              <ChevronLeft className="w-4 h-4" /> Назад
            </button>
          )}

          {step < 3 ? (
            <button
              onClick={() => setStep(s => s + 1)}
              disabled={(step === 1 && !canStep1) || (step === 2 && !canStep2)}
              className="flex-1 h-12 rounded-xl bg-primary text-white font-semibold text-sm hover:bg-primary-hover transition disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              Далее <ChevronRight className="w-4 h-4" />
            </button>
          ) : (
            <button
              onClick={handleSubmit}
              disabled={submitting || !canStep3}
              className="flex-1 h-12 rounded-xl bg-green-600 text-white font-semibold text-sm hover:bg-green-700 transition disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              <Send className="w-4 h-4" />
              {submitting ? "Отправка…" : "Отправить заявку"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function Field({ label, value, onChange, placeholder }: {
  label: string; value: string; onChange: (v: string) => void; placeholder?: string;
}) {
  return (
    <div>
      <label className="block text-[11px] font-semibold text-muted mb-1.5 uppercase tracking-wide">{label}</label>
      <input
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full border border-border rounded-xl px-3.5 py-2.5 bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/50 transition"
      />
    </div>
  );
}

function SummaryRow({ label, value, ok }: { label: string; value: string; ok?: boolean }) {
  return (
    <div className="flex items-center justify-between text-sm py-0.5">
      <span className="text-muted">{label}</span>
      <span className={`font-semibold ${ok ? "text-green-600" : ""}`}>{value}</span>
    </div>
  );
}
