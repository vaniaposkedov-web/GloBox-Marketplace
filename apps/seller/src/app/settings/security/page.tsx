"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Lock, Eye, EyeOff, Mail, Phone, Shield,
  ArrowLeft, AlertTriangle, CheckCircle2,
  Monitor, Smartphone, MapPin, Globe,
} from "lucide-react";
import { api } from "@/lib/api";
import { getToken } from "@/lib/auth";
import Link from "next/link";

interface UserData {
  email: string | null;
  firstName: string;
  lastName: string;
  phone: string | null;
}

interface LoginEvent {
  id: string;
  ip: string | null;
  userAgent: string | null;
  createdAt: string;
}

type SecurityTab = "password" | "email" | "phone" | null;

function parseDevice(ua: string | null): { label: string; isMobile: boolean } {
  if (!ua) return { label: "Неизвестное устройство", isMobile: false };
  if (/iPhone/i.test(ua)) return { label: "Safari, iPhone", isMobile: true };
  if (/iPad/i.test(ua)) return { label: "Safari, iPad", isMobile: true };
  if (/Android/i.test(ua)) {
    if (/Chrome/i.test(ua)) return { label: "Chrome, Android", isMobile: true };
    return { label: "Браузер, Android", isMobile: true };
  }
  if (/Windows/i.test(ua)) {
    if (/Edg/i.test(ua)) return { label: "Edge, Windows", isMobile: false };
    if (/Chrome/i.test(ua)) return { label: "Chrome, Windows", isMobile: false };
    if (/Firefox/i.test(ua)) return { label: "Firefox, Windows", isMobile: false };
    return { label: "Браузер, Windows", isMobile: false };
  }
  if (/Mac/i.test(ua)) {
    if (/Chrome/i.test(ua)) return { label: "Chrome, macOS", isMobile: false };
    if (/Firefox/i.test(ua)) return { label: "Firefox, macOS", isMobile: false };
    return { label: "Safari, macOS", isMobile: false };
  }
  if (/Linux/i.test(ua)) return { label: "Браузер, Linux", isMobile: false };
  return { label: "Неизвестное устройство", isMobile: false };
}

export default function SecurityPage() {
  const router = useRouter();
  const [userData, setUserData]     = useState<UserData | null>(null);
  const [loading, setLoading]       = useState(true);
  const [secTab, setSecTab]         = useState<SecurityTab>(null);
  const [loginEvents, setLoginEvents]         = useState<LoginEvent[]>([]);
  const [loginEventsLoading, setLoginEventsLoading] = useState(true);

  // Password
  const [currentPw, setCurrentPw]       = useState("");
  const [newPw, setNewPw]               = useState("");
  const [confirmPw, setConfirmPw]       = useState("");
  const [showCurrentPw, setShowCurrentPw] = useState(false);
  const [showNewPw, setShowNewPw]         = useState(false);
  const [pwSaving, setPwSaving]     = useState(false);
  const [pwNotice, setPwNotice]     = useState<string | null>(null);
  const [pwError, setPwError]       = useState<string | null>(null);

  // Email
  const [newEmail, setNewEmail]             = useState("");
  const [emailCode, setEmailCode]           = useState("");
  const [emailCodeSent, setEmailCodeSent]   = useState(false);
  const [emailSaving, setEmailSaving]       = useState(false);
  const [emailNotice, setEmailNotice]       = useState<string | null>(null);
  const [emailError, setEmailError]         = useState<string | null>(null);

  // Phone
  const [newPhone, setNewPhone]             = useState("");
  const [phoneCode, setPhoneCode]           = useState("");
  const [phoneCodeSent, setPhoneCodeSent]   = useState(false);
  const [phoneSaving, setPhoneSaving]       = useState(false);
  const [phoneNotice, setPhoneNotice]       = useState<string | null>(null);
  const [phoneError, setPhoneError]         = useState<string | null>(null);

  useEffect(() => {
    if (!getToken()) { router.replace("/login"); return; }
    api.get<{ user: UserData; profile: any }>("/supplier/me")
      .then(d => setUserData(d.user))
      .catch(() => router.replace("/login"))
      .finally(() => setLoading(false));
    api.get<LoginEvent[]>("/supplier/login-events")
      .then(d => setLoginEvents(d))
      .catch(() => {})
      .finally(() => setLoginEventsLoading(false));
  }, [router]);

  // ── Password ──
  const changePassword = async () => {
    setPwError(null); setPwNotice(null);
    if (!currentPw || !newPw) { setPwError("Заполните все поля"); return; }
    if (newPw.length < 6) { setPwError("Минимальная длина пароля — 6 символов"); return; }
    if (newPw !== confirmPw) { setPwError("Пароли не совпадают"); return; }
    setPwSaving(true);
    try {
      await api.post("/supplier/change-password", { currentPassword: currentPw, newPassword: newPw });
      setPwNotice("Пароль успешно изменён");
      setCurrentPw(""); setNewPw(""); setConfirmPw("");
    } catch (err: any) { setPwError(err.message ?? "Ошибка смены пароля"); }
    finally { setPwSaving(false); }
  };

  // ── Email ──
  const requestEmailCode = async () => {
    setEmailError(null); setEmailNotice(null);
    if (!newEmail || !newEmail.includes("@")) { setEmailError("Введите корректный email"); return; }
    setEmailSaving(true);
    try {
      await api.post("/supplier/change-email/request", { newEmail });
      setEmailCodeSent(true);
      setEmailNotice("Код отправлен на " + newEmail);
    } catch (err: any) { setEmailError(err.message ?? "Ошибка отправки кода"); }
    finally { setEmailSaving(false); }
  };

  const confirmEmail = async () => {
    setEmailError(null); setEmailNotice(null);
    if (!emailCode || emailCode.length !== 6) { setEmailError("Введите 6-значный код"); return; }
    setEmailSaving(true);
    try {
      await api.post("/supplier/change-email/confirm", { newEmail, code: emailCode });
      setEmailNotice("Email успешно изменён!");
      setUserData(prev => prev ? { ...prev, email: newEmail } : prev);
      setNewEmail(""); setEmailCode(""); setEmailCodeSent(false);
    } catch (err: any) { setEmailError(err.message ?? "Ошибка подтверждения"); }
    finally { setEmailSaving(false); }
  };

  // ── Phone ──
  const requestPhoneCode = async () => {
    setPhoneError(null); setPhoneNotice(null);
    if (!newPhone || newPhone.length < 10) { setPhoneError("Введите корректный номер"); return; }
    setPhoneSaving(true);
    try {
      await api.post("/supplier/change-phone/request", { newPhone });
      setPhoneCodeSent(true);
      setPhoneNotice("SMS-код отправлен на " + newPhone);
    } catch (err: any) { setPhoneError(err.message ?? "Ошибка отправки кода"); }
    finally { setPhoneSaving(false); }
  };

  const confirmPhone = async () => {
    setPhoneError(null); setPhoneNotice(null);
    if (!phoneCode || phoneCode.length !== 6) { setPhoneError("Введите 6-значный код"); return; }
    setPhoneSaving(true);
    try {
      await api.post("/supplier/change-phone/confirm", { newPhone, code: phoneCode });
      setPhoneNotice("Номер телефона успешно изменён!");
      setUserData(prev => prev ? { ...prev, phone: newPhone } : prev);
      setNewPhone(""); setPhoneCode(""); setPhoneCodeSent(false);
    } catch (err: any) { setPhoneError(err.message ?? "Ошибка подтверждения"); }
    finally { setPhoneSaving(false); }
  };

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="w-8 h-8 border-2 border-foreground border-t-transparent rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="min-h-screen pb-8 bg-background">
      {/* Header */}
      <div className="sticky top-0 z-40 bg-card/95 backdrop-blur-lg border-b border-border px-4 h-14 flex items-center gap-3">
        <Link
          href="/profile"
          className="text-muted transition"
          style={{ WebkitTapHighlightColor: "transparent" }}
        >
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <Shield className="w-5 h-5 text-orange-500" />
        <h1 className="text-lg font-bold">Безопасность</h1>
      </div>

      <main className="max-w-lg mx-auto w-full px-4 py-5 space-y-5">

        {/* ── Current data ── */}
        <section className="bg-card rounded-2xl border border-border p-5 space-y-4" style={{ animation: "slideUp 0.22s ease-out" }}>
          <h2 className="font-semibold text-sm flex items-center gap-2">
            <Shield className="w-4 h-4 text-orange-500" />
            Текущие данные
          </h2>
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-accent rounded-xl p-3">
              <span className="text-[10px] text-muted uppercase tracking-wider block">Email</span>
              <span className="text-sm font-medium truncate block mt-0.5">{userData?.email ?? "—"}</span>
            </div>
            <div className="bg-accent rounded-xl p-3">
              <span className="text-[10px] text-muted uppercase tracking-wider block">Телефон</span>
              <span className="text-sm font-medium block mt-0.5">{userData?.phone ?? "—"}</span>
            </div>
          </div>
        </section>

        {/* ── Tab buttons ── */}
        <div className="flex gap-2" style={{ animation: "slideUp 0.26s ease-out" }}>
          <TabBtn active={secTab === "password"} onClick={() => setSecTab(secTab === "password" ? null : "password")}
            icon={Lock} label="Пароль" color="orange" />
          <TabBtn active={secTab === "email"} onClick={() => setSecTab(secTab === "email" ? null : "email")}
            icon={Mail} label="Email" color="blue" />
          <TabBtn active={secTab === "phone"} onClick={() => setSecTab(secTab === "phone" ? null : "phone")}
            icon={Phone} label="Телефон" color="green" />
        </div>

        {/* ── Password tab ── */}
        {secTab === "password" && (
          <section className="bg-card rounded-2xl border border-border p-5 space-y-4" style={{ animation: "slideUp 0.18s ease-out" }}>
            <h3 className="font-semibold text-sm flex items-center gap-2">
              <Lock className="w-4 h-4 text-orange-500" /> Смена пароля
            </h3>
            {pwNotice && <Notice type="success" text={pwNotice} />}
            {pwError  && <Notice type="error"   text={pwError}  />}
            <div>
              <label className="block text-xs font-medium mb-1.5">Текущий пароль</label>
              <div className="relative">
                <input type={showCurrentPw ? "text" : "password"} value={currentPw}
                  onChange={e => setCurrentPw(e.target.value)} placeholder="Введите текущий пароль"
                  className="w-full border border-border rounded-xl px-4 py-3 pr-10 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/25" />
                <button type="button" onClick={() => setShowCurrentPw(!showCurrentPw)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted">
                  {showCurrentPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium mb-1.5">Новый пароль</label>
              <div className="relative">
                <input type={showNewPw ? "text" : "password"} value={newPw}
                  onChange={e => setNewPw(e.target.value)} placeholder="Минимум 6 символов"
                  className="w-full border border-border rounded-xl px-4 py-3 pr-10 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/25" />
                <button type="button" onClick={() => setShowNewPw(!showNewPw)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted">
                  {showNewPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium mb-1.5">Подтвердите пароль</label>
              <input type="password" value={confirmPw} onChange={e => setConfirmPw(e.target.value)}
                placeholder="Повторите пароль"
                className="w-full border border-border rounded-xl px-4 py-3 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/25" />
              {confirmPw && newPw !== confirmPw && <p className="text-xs text-danger mt-1">Пароли не совпадают</p>}
            </div>
            <button onClick={changePassword} disabled={pwSaving || !currentPw || !newPw || newPw !== confirmPw}
              className="w-full py-3 rounded-xl bg-orange-500 text-white font-semibold text-sm hover:bg-orange-600 transition disabled:opacity-50 active:scale-[0.98] inline-flex items-center justify-center gap-2">
              <Lock className="w-4 h-4" />{pwSaving ? "Сохранение…" : "Сменить пароль"}
            </button>
          </section>
        )}

        {/* ── Email tab ── */}
        {secTab === "email" && (
          <section className="bg-card rounded-2xl border border-border p-5 space-y-4" style={{ animation: "slideUp 0.18s ease-out" }}>
            <h3 className="font-semibold text-sm flex items-center gap-2">
              <Mail className="w-4 h-4 text-blue-500" /> Смена email
            </h3>
            {emailNotice && <Notice type="success" text={emailNotice} />}
            {emailError  && <Notice type="error"   text={emailError}  />}
            <div>
              <label className="block text-xs font-medium mb-1.5">Новый email</label>
              <input type="email" value={newEmail} onChange={e => setNewEmail(e.target.value)}
                placeholder="example@mail.ru"
                className="w-full border border-border rounded-xl px-4 py-3 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/25" />
            </div>
            {!emailCodeSent ? (
              <button onClick={requestEmailCode} disabled={emailSaving || !newEmail}
                className="w-full py-3 rounded-xl bg-blue-500 text-white font-semibold text-sm hover:bg-blue-600 transition disabled:opacity-50 active:scale-[0.98] inline-flex items-center justify-center gap-2">
                <Mail className="w-4 h-4" />{emailSaving ? "Отправка…" : "Отправить код на email"}
              </button>
            ) : (
              <>
                <div>
                  <label className="block text-xs font-medium mb-1.5">Код из письма</label>
                  <input type="text" inputMode="numeric" maxLength={6} value={emailCode}
                    onChange={e => setEmailCode(e.target.value.replace(/\D/g, ""))}
                    placeholder="6-значный код"
                    className="w-full border border-border rounded-xl px-4 py-3 bg-background focus:outline-none focus:ring-2 focus:ring-primary/25 tracking-widest text-center font-mono text-lg" />
                </div>
                <div className="flex gap-2">
                  <button onClick={() => { setEmailCodeSent(false); setEmailCode(""); setEmailNotice(null); }}
                    className="flex-1 py-3 rounded-xl border border-border text-sm font-medium active:bg-accent transition">Назад</button>
                  <button onClick={confirmEmail} disabled={emailSaving || emailCode.length !== 6}
                    className="flex-1 py-3 rounded-xl bg-blue-500 text-white font-semibold text-sm hover:bg-blue-600 transition disabled:opacity-50 active:scale-[0.98]">
                    {emailSaving ? "Проверка…" : "Подтвердить"}
                  </button>
                </div>
              </>
            )}
          </section>
        )}

        {/* ── Phone tab ── */}
        {secTab === "phone" && (
          <section className="bg-card rounded-2xl border border-border p-5 space-y-4" style={{ animation: "slideUp 0.18s ease-out" }}>
            <h3 className="font-semibold text-sm flex items-center gap-2">
              <Phone className="w-4 h-4 text-green-500" /> Смена телефона
            </h3>
            {phoneNotice && <Notice type="success" text={phoneNotice} />}
            {phoneError  && <Notice type="error"   text={phoneError}  />}
            <div>
              <label className="block text-xs font-medium mb-1.5">Новый номер телефона</label>
              <input type="tel" value={newPhone} onChange={e => setNewPhone(e.target.value)}
                placeholder="+7 (900) 123-45-67"
                className="w-full border border-border rounded-xl px-4 py-3 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/25" />
            </div>
            {!phoneCodeSent ? (
              <button onClick={requestPhoneCode} disabled={phoneSaving || !newPhone}
                className="w-full py-3 rounded-xl bg-green-500 text-white font-semibold text-sm hover:bg-green-600 transition disabled:opacity-50 active:scale-[0.98] inline-flex items-center justify-center gap-2">
                <Phone className="w-4 h-4" />{phoneSaving ? "Отправка…" : "Отправить SMS-код"}
              </button>
            ) : (
              <>
                <div>
                  <label className="block text-xs font-medium mb-1.5">Код из SMS</label>
                  <input type="text" inputMode="numeric" maxLength={6} value={phoneCode}
                    onChange={e => setPhoneCode(e.target.value.replace(/\D/g, ""))}
                    placeholder="6-значный код"
                    className="w-full border border-border rounded-xl px-4 py-3 bg-background focus:outline-none focus:ring-2 focus:ring-primary/25 tracking-widest text-center font-mono text-lg" />
                </div>
                <div className="flex gap-2">
                  <button onClick={() => { setPhoneCodeSent(false); setPhoneCode(""); setPhoneNotice(null); }}
                    className="flex-1 py-3 rounded-xl border border-border text-sm font-medium active:bg-accent transition">Назад</button>
                  <button onClick={confirmPhone} disabled={phoneSaving || phoneCode.length !== 6}
                    className="flex-1 py-3 rounded-xl bg-green-500 text-white font-semibold text-sm hover:bg-green-600 transition disabled:opacity-50 active:scale-[0.98]">
                    {phoneSaving ? "Проверка…" : "Подтвердить"}
                  </button>
                </div>
              </>
            )}
          </section>
        )}

        {/* ── Login history ── */}
        <section className="bg-card rounded-2xl border border-border p-5 space-y-4" style={{ animation: "slideUp 0.28s ease-out" }}>
          <h2 className="font-semibold text-sm flex items-center gap-2">
            <Globe className="w-4 h-4 text-primary" />
            История входов
          </h2>
          {loginEventsLoading ? (
            <div className="flex justify-center py-4">
              <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            </div>
          ) : loginEvents.length === 0 ? (
            <p className="text-xs text-muted text-center py-3">История входов пока пуста</p>
          ) : (
            <div className="space-y-2">
              {loginEvents.map((ev, i) => {
                const { label, isMobile } = parseDevice(ev.userAgent);
                const dateStr = new Date(ev.createdAt).toLocaleString("ru-RU", {
                  day: "numeric", month: "short", year: "numeric",
                  hour: "2-digit", minute: "2-digit",
                });
                return (
                  <div key={ev.id}
                    className={`flex items-start gap-3 p-3 rounded-xl ${i === 0 ? "bg-primary/5 border border-primary/15" : "bg-accent"}`}
                  >
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${i === 0 ? "bg-primary/10" : "bg-background"}`}>
                      {isMobile
                        ? <Smartphone className={`w-4 h-4 ${i === 0 ? "text-primary" : "text-muted"}`} />
                        : <Monitor   className={`w-4 h-4 ${i === 0 ? "text-primary" : "text-muted"}`} />
                      }
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-xs font-semibold">{label}</span>
                        {i === 0 && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-primary/10 text-primary font-medium">Последний</span>
                        )}
                      </div>
                      <span className="text-[11px] text-muted">{dateStr}</span>
                      {ev.ip && (
                        <div className="flex items-center gap-1 mt-0.5">
                          <MapPin className="w-3 h-3 text-muted" />
                          <span className="text-[11px] text-muted font-mono">{ev.ip}</span>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
          <p className="text-[10px] text-muted">Показаны последние 20 входов. Видите незнакомый вход — смените пароль.</p>
        </section>

        {/* ── Anti-hijacking ── */}
        <section className="bg-orange-500/5 rounded-2xl border border-orange-500/15 p-4 flex gap-3" style={{ animation: "slideUp 0.3s ease-out" }}>
          <AlertTriangle className="w-5 h-5 text-orange-500 shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold text-sm">Защита аккаунта</p>
            <p className="text-xs text-muted mt-1 leading-relaxed">
              При смене email или телефона отправляется код подтверждения.
              Если вы не запрашивали смену — немедленно смените пароль и{" "}
              <Link href="/support" className="text-primary hover:underline">обратитесь в поддержку</Link>.
            </p>
          </div>
        </section>

        {/* ── Info ── */}
        <section className="bg-accent rounded-2xl border border-border p-4 text-sm" style={{ animation: "slideUp 0.35s ease-out" }}>
          <div className="flex items-start gap-3">
            <CheckCircle2 className="w-5 h-5 text-muted shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold">Меняется только через поддержку</p>
              <p className="text-muted mt-1 text-xs">
                ФИО, фотография паспорта, документы.{" "}
                <Link href="/support" className="text-primary hover:underline">Обратиться →</Link>
              </p>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}

function TabBtn({ active, onClick, icon: Icon, label, color }: {
  active: boolean; onClick: () => void; icon: React.ElementType; label: string; color: string;
}) {
  const colors: Record<string, string> = {
    orange: active ? "bg-orange-500/10 border-orange-500/30 text-orange-600" : "border-border text-muted",
    blue:   active ? "bg-blue-500/10 border-blue-500/30 text-blue-600"       : "border-border text-muted",
    green:  active ? "bg-green-500/10 border-green-500/30 text-green-600"    : "border-border text-muted",
  };
  return (
    <button
      onClick={onClick}
      style={{ WebkitTapHighlightColor: "transparent" }}
      className={`flex-1 py-3 rounded-xl text-xs font-semibold transition-all flex items-center justify-center gap-1.5 border active:scale-[0.97] ${colors[color]}`}
    >
      <Icon className="w-3.5 h-3.5" />{label}
    </button>
  );
}

function Notice({ type, text }: { type: "success" | "error"; text: string }) {
  return (
    <div className={`text-xs rounded-xl px-4 py-2.5 ${
      type === "success" ? "text-green-700 bg-green-50 border border-green-100" : "text-danger bg-red-50 border border-red-100"
    }`}>{text}</div>
  );
}
