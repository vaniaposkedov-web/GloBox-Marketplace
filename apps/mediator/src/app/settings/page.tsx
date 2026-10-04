"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Save, Info, Lock, Eye, EyeOff, ChevronDown, ChevronUp,
  Mail, Phone, Shield, ArrowLeft, Calculator, Percent,
} from "lucide-react";
import { BottomNav } from "@/components/BottomNav";
import { api } from "@/lib/api";
import { getToken } from "@/lib/auth";
import Link from "next/link";

const MIN_RATE = 3;
const MAX_RATE = 20;
const SERVICE_FEE_PERCENT = 5;

interface Profile {
  commissionRate: number;
  minOrderAmount: number;
  avatarUrl?: string | null;
  status: "PENDING" | "NEEDS_REVISION" | "APPROVED" | "REJECTED";
}

interface UserData {
  email: string | null;
  firstName: string;
  lastName: string;
  phone: string | null;
}

type SecurityTab = "password" | "email" | "phone" | null;

export default function SettingsPage() {
  const router = useRouter();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [userData, setUserData] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [rate, setRate] = useState("10");
  const [minAmount, setMinAmount] = useState("0");

  // Calculator state
  const [calcOrders, setCalcOrders] = useState("5");
  const [calcCheck, setCalcCheck] = useState("8000");

  // Security section
  const [secOpen, setSecOpen] = useState(false);
  const [secTab, setSecTab] = useState<SecurityTab>(null);

  // Password change state
  const [currentPw, setCurrentPw] = useState("");
  const [newPw, setNewPw] = useState("");
  const [confirmPw, setConfirmPw] = useState("");
  const [showCurrentPw, setShowCurrentPw] = useState(false);
  const [showNewPw, setShowNewPw] = useState(false);
  const [pwSaving, setPwSaving] = useState(false);
  const [pwNotice, setPwNotice] = useState<string | null>(null);
  const [pwError, setPwError] = useState<string | null>(null);

  // Email change state
  const [newEmail, setNewEmail] = useState("");
  const [emailCode, setEmailCode] = useState("");
  const [emailCodeSent, setEmailCodeSent] = useState(false);
  const [emailSaving, setEmailSaving] = useState(false);
  const [emailNotice, setEmailNotice] = useState<string | null>(null);
  const [emailError, setEmailError] = useState<string | null>(null);

  // Phone change state
  const [newPhone, setNewPhone] = useState("");
  const [phoneCode, setPhoneCode] = useState("");
  const [phoneCodeSent, setPhoneCodeSent] = useState(false);
  const [phoneSaving, setPhoneSaving] = useState(false);
  const [phoneNotice, setPhoneNotice] = useState<string | null>(null);
  const [phoneError, setPhoneError] = useState<string | null>(null);

  useEffect(() => {
    if (!getToken()) { router.replace("/login"); return; }
    api
      .get<{ user: UserData; profile: Profile | null }>("/mediator/me")
      .then((d) => {
        setUserData(d.user);
        if (!d.profile) return;
        setProfile(d.profile);
        setRate(String(d.profile.commissionRate));
        setMinAmount(String(d.profile.minOrderAmount));
      })
      .catch(() => router.replace("/login"))
      .finally(() => setLoading(false));
  }, [router]);

  // ── Save work conditions ──
  const save = async () => {
    setError(null); setNotice(null);
    const rateNum = Number(rate);
    const amountNum = Number(minAmount);
    if (Number.isNaN(rateNum) || rateNum < MIN_RATE || rateNum > MAX_RATE) {
      setError(`Ставка должна быть от ${MIN_RATE}% до ${MAX_RATE}%`); return;
    }
    if (Number.isNaN(amountNum) || amountNum < 0) {
      setError("Минимальная сумма не может быть отрицательной"); return;
    }
    setSaving(true);
    try {
      const updated = await api.patch<Profile>("/mediator/settings", { commissionRate: rateNum, minOrderAmount: amountNum });
      setProfile(updated);
      setNotice("Настройки сохранены");
    } catch (err: any) { setError(err.message ?? "Ошибка сохранения"); }
    finally { setSaving(false); }
  };

  // ── Password ──
  const changePassword = async () => {
    setPwError(null); setPwNotice(null);
    if (!currentPw || !newPw) { setPwError("Заполните все поля"); return; }
    if (newPw.length < 6) { setPwError("Минимальная длина пароля — 6 символов"); return; }
    if (newPw !== confirmPw) { setPwError("Пароли не совпадают"); return; }
    setPwSaving(true);
    try {
      await api.post("/mediator/change-password", { currentPassword: currentPw, newPassword: newPw });
      setPwNotice("Пароль успешно изменён");
      setCurrentPw(""); setNewPw(""); setConfirmPw("");
    } catch (err: any) { setPwError(err.message ?? "Ошибка смены пароля"); }
    finally { setPwSaving(false); }
  };

  // ── Email change ──
  const requestEmailCode = async () => {
    setEmailError(null); setEmailNotice(null);
    if (!newEmail || !newEmail.includes("@")) { setEmailError("Введите корректный email"); return; }
    setEmailSaving(true);
    try {
      await api.post("/mediator/change-email/request", { newEmail });
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
      await api.post("/mediator/change-email/confirm", { newEmail, code: emailCode });
      setEmailNotice("Email успешно изменён!");
      setUserData((prev) => prev ? { ...prev, email: newEmail } : prev);
      setNewEmail(""); setEmailCode(""); setEmailCodeSent(false);
    } catch (err: any) { setEmailError(err.message ?? "Ошибка подтверждения"); }
    finally { setEmailSaving(false); }
  };

  // ── Phone change ──
  const requestPhoneCode = async () => {
    setPhoneError(null); setPhoneNotice(null);
    if (!newPhone || newPhone.length < 10) { setPhoneError("Введите корректный номер"); return; }
    setPhoneSaving(true);
    try {
      await api.post("/mediator/change-phone/request", { newPhone });
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
      await api.post("/mediator/change-phone/confirm", { newPhone, code: phoneCode });
      setPhoneNotice("Номер телефона успешно изменён!");
      setUserData((prev) => prev ? { ...prev, phone: newPhone } : prev);
      setNewPhone(""); setPhoneCode(""); setPhoneCodeSent(false);
    } catch (err: any) { setPhoneError(err.message ?? "Ошибка подтверждения"); }
    finally { setPhoneSaving(false); }
  };

  // Calculator
  const rateNum = Number(rate) || 0;
  const ordersPerDay = Number(calcOrders) || 0;
  const avgCheck = Number(calcCheck) || 0;
  const earningsPerDay = Math.round(ordersPerDay * avgCheck * rateNum / 100);
  const earningsPerMonth = earningsPerDay * 30;

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-foreground border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-20 bg-background">
      {/* Simple sticky header */}
      <div className="sticky top-0 z-40 bg-card/95 backdrop-blur-lg border-b border-border px-4 h-14 flex items-center gap-3">
        <Link href="/profile" className="text-muted hover:text-foreground transition">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <h1 className="text-lg font-bold">Настройки</h1>
      </div>

      <main className="max-w-lg mx-auto w-full px-4 py-5 space-y-5">

        {notice && <div className="text-sm text-green-700 bg-green-50 rounded-xl px-4 py-2.5">{notice}</div>}
        {error && <div className="text-sm text-danger bg-red-50 rounded-xl px-4 py-2.5">{error}</div>}

        {/* ═══ Условия работы + Калькулятор ═══ */}
        <section className="bg-card rounded-2xl border border-border p-5 space-y-5 animate-[slideUp_0.25s_ease-out]">
          <div>
            <h2 className="font-semibold text-base flex items-center gap-2">
              <Percent className="w-5 h-5 text-primary" />
              Условия работы
            </h2>
            <p className="text-xs text-muted mt-1">Применится к новым заказам</p>
          </div>

          {/* Min amount */}
          <div>
            <label className="block text-sm font-medium mb-1">Минимальная сумма заказа, ₽</label>
            <input
              type="number" min={0} step={100}
              value={minAmount} onChange={(e) => setMinAmount(e.target.value)}
              className="w-full border border-border rounded-xl px-4 py-2.5 bg-background focus:outline-none focus:ring-2 focus:ring-primary/25"
            />
          </div>

          {/* Earnings calculator — like glo-box.ru */}
          <div className="border-t border-border pt-4">
            <div className="flex items-center gap-2 mb-4">
              <Calculator className="w-4 h-4 text-primary" />
              <span className="text-sm font-semibold">Калькулятор заработка</span>
            </div>

            {/* Slider: Rate */}
            <div className="mb-4">
              <div className="flex justify-between items-baseline mb-1.5">
                <span className="text-sm font-medium">Ваша ставка</span>
                <span className="text-sm font-bold text-primary">{rate}%</span>
              </div>
              <input
                type="range" min={MIN_RATE} max={MAX_RATE} step={0.5}
                value={rate} onChange={(e) => setRate(e.target.value)}
                className="w-full h-2 rounded-full appearance-none cursor-pointer accent-primary"
                style={{ background: `linear-gradient(to right, #e040fb ${((Number(rate) - MIN_RATE) / (MAX_RATE - MIN_RATE)) * 100}%, #e5e7eb ${((Number(rate) - MIN_RATE) / (MAX_RATE - MIN_RATE)) * 100}%)` }}
              />
            </div>

            {/* Slider: Orders per day */}
            <div className="mb-4">
              <div className="flex justify-between items-baseline mb-1.5">
                <span className="text-sm font-medium">Заказов в день</span>
                <span className="text-sm font-bold text-primary">{calcOrders}</span>
              </div>
              <input
                type="range" min={1} max={30} step={1}
                value={calcOrders} onChange={(e) => setCalcOrders(e.target.value)}
                className="w-full h-2 rounded-full appearance-none cursor-pointer accent-primary"
                style={{ background: `linear-gradient(to right, #e040fb ${((Number(calcOrders) - 1) / 29) * 100}%, #e5e7eb ${((Number(calcOrders) - 1) / 29) * 100}%)` }}
              />
            </div>

            {/* Slider: Average check */}
            <div className="mb-5">
              <div className="flex justify-between items-baseline mb-1.5">
                <span className="text-sm font-medium">Средний чек заказа</span>
                <span className="text-sm font-bold text-primary">{Number(calcCheck).toLocaleString("ru-RU")} ₽</span>
              </div>
              <input
                type="range" min={1000} max={50000} step={500}
                value={calcCheck} onChange={(e) => setCalcCheck(e.target.value)}
                className="w-full h-2 rounded-full appearance-none cursor-pointer accent-primary"
                style={{ background: `linear-gradient(to right, #e040fb ${((Number(calcCheck) - 1000) / 49000) * 100}%, #e5e7eb ${((Number(calcCheck) - 1000) / 49000) * 100}%)` }}
              />
            </div>

            {/* Results: day + month */}
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-xl border border-border p-4 text-center">
                <p className="text-[10px] text-muted uppercase tracking-wider mb-1">В день</p>
                <p className="text-2xl font-extrabold">{earningsPerDay.toLocaleString("ru-RU")} ₽</p>
              </div>
              <div className="rounded-xl p-4 text-center text-white" style={{ background: "linear-gradient(135deg, #e040fb 0%, #ff6b6b 100%)" }}>
                <p className="text-[10px] uppercase tracking-wider mb-1 opacity-80">В месяц</p>
                <p className="text-2xl font-extrabold">{earningsPerMonth.toLocaleString("ru-RU")} ₽</p>
              </div>
            </div>

            <p className="text-[10px] text-muted text-center mt-3">
              * Расчёт приблизительный. Реальный доход зависит от количества заказов и суммы выкупа.
            </p>
          </div>

          <button
            onClick={save} disabled={saving}
            className="w-full py-3 rounded-xl bg-primary text-white font-semibold hover:bg-primary-hover transition disabled:opacity-50 inline-flex items-center justify-center gap-2"
          >
            <Save className="w-4 h-4" />
            {saving ? "Сохранение…" : "Сохранить настройки"}
          </button>
        </section>

        {/* ═══ Безопасность ═══ */}
        <section className="bg-card rounded-2xl border border-border shadow-sm overflow-hidden animate-[slideUp_0.3s_ease-out]">
          <button
            type="button"
            onClick={() => { setSecOpen(!secOpen); if (!secOpen) setSecTab(null); }}
            className="w-full p-5 flex items-center gap-4 hover:bg-accent/50 transition"
          >
            <div className="w-10 h-10 rounded-xl bg-orange-500/10 flex items-center justify-center shrink-0">
              <Shield className="w-5 h-5 text-orange-600" />
            </div>
            <div className="flex-1 text-left">
              <p className="font-semibold text-sm">Безопасность</p>
              <p className="text-xs text-muted">Пароль, email, телефон</p>
            </div>
            {secOpen ? <ChevronUp className="w-5 h-5 text-muted" /> : <ChevronDown className="w-5 h-5 text-muted" />}
          </button>

          {secOpen && (
            <div className="border-t border-border p-4 space-y-3">
              {/* Current info */}
              <div className="grid grid-cols-2 gap-2 text-xs mb-2">
                <div className="bg-accent rounded-lg p-2.5">
                  <span className="text-muted block">Email</span>
                  <span className="font-medium truncate block">{userData?.email ?? "—"}</span>
                </div>
                <div className="bg-accent rounded-lg p-2.5">
                  <span className="text-muted block">Телефон</span>
                  <span className="font-medium">{userData?.phone ?? "—"}</span>
                </div>
              </div>

              {/* Tab buttons */}
              <div className="flex gap-2">
                <button
                  onClick={() => setSecTab(secTab === "password" ? null : "password")}
                  className={`flex-1 py-2.5 rounded-xl text-xs font-semibold transition flex items-center justify-center gap-1.5 border ${
                    secTab === "password" ? "bg-orange-500/10 border-orange-500/30 text-orange-600" : "border-border hover:bg-accent"
                  }`}
                >
                  <Lock className="w-3.5 h-3.5" />Пароль
                </button>
                <button
                  onClick={() => setSecTab(secTab === "email" ? null : "email")}
                  className={`flex-1 py-2.5 rounded-xl text-xs font-semibold transition flex items-center justify-center gap-1.5 border ${
                    secTab === "email" ? "bg-blue-500/10 border-blue-500/30 text-blue-600" : "border-border hover:bg-accent"
                  }`}
                >
                  <Mail className="w-3.5 h-3.5" />Email
                </button>
                <button
                  onClick={() => setSecTab(secTab === "phone" ? null : "phone")}
                  className={`flex-1 py-2.5 rounded-xl text-xs font-semibold transition flex items-center justify-center gap-1.5 border ${
                    secTab === "phone" ? "bg-green-500/10 border-green-500/30 text-green-600" : "border-border hover:bg-accent"
                  }`}
                >
                  <Phone className="w-3.5 h-3.5" />Телефон
                </button>
              </div>

              {/* ── Password tab ── */}
              {secTab === "password" && (
                <div className="space-y-3 pt-2">
                  {pwNotice && <div className="text-xs text-green-700 bg-green-50 rounded-lg px-3 py-2">{pwNotice}</div>}
                  {pwError && <div className="text-xs text-danger bg-red-50 rounded-lg px-3 py-2">{pwError}</div>}

                  <div>
                    <label className="block text-xs font-medium mb-1">Текущий пароль</label>
                    <div className="relative">
                      <input
                        type={showCurrentPw ? "text" : "password"}
                        value={currentPw} onChange={(e) => setCurrentPw(e.target.value)}
                        placeholder="Введите текущий пароль"
                        className="w-full border border-border rounded-xl px-3 py-2.5 pr-10 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/25"
                      />
                      <button type="button" onClick={() => setShowCurrentPw(!showCurrentPw)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-foreground">
                        {showCurrentPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-medium mb-1">Новый пароль</label>
                    <div className="relative">
                      <input
                        type={showNewPw ? "text" : "password"}
                        value={newPw} onChange={(e) => setNewPw(e.target.value)}
                        placeholder="Минимум 6 символов"
                        className="w-full border border-border rounded-xl px-3 py-2.5 pr-10 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/25"
                      />
                      <button type="button" onClick={() => setShowNewPw(!showNewPw)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-foreground">
                        {showNewPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-medium mb-1">Подтвердите</label>
                    <input
                      type="password" value={confirmPw} onChange={(e) => setConfirmPw(e.target.value)}
                      placeholder="Повторите пароль"
                      className="w-full border border-border rounded-xl px-3 py-2.5 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/25"
                    />
                    {confirmPw && newPw !== confirmPw && (
                      <p className="text-xs text-danger mt-1">Пароли не совпадают</p>
                    )}
                  </div>

                  <button
                    onClick={changePassword}
                    disabled={pwSaving || !currentPw || !newPw || newPw !== confirmPw}
                    className="w-full py-2.5 rounded-xl bg-orange-500 text-white font-semibold text-sm hover:bg-orange-600 transition disabled:opacity-50 inline-flex items-center justify-center gap-2"
                  >
                    <Lock className="w-4 h-4" />
                    {pwSaving ? "Сохранение…" : "Сменить пароль"}
                  </button>
                </div>
              )}

              {/* ── Email tab ── */}
              {secTab === "email" && (
                <div className="space-y-3 pt-2">
                  {emailNotice && <div className="text-xs text-green-700 bg-green-50 rounded-lg px-3 py-2">{emailNotice}</div>}
                  {emailError && <div className="text-xs text-danger bg-red-50 rounded-lg px-3 py-2">{emailError}</div>}

                  <div>
                    <label className="block text-xs font-medium mb-1">Новый email</label>
                    <input
                      type="email" value={newEmail} onChange={(e) => setNewEmail(e.target.value)}
                      placeholder="example@mail.ru"
                      className="w-full border border-border rounded-xl px-3 py-2.5 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/25"
                    />
                  </div>

                  {!emailCodeSent ? (
                    <button
                      onClick={requestEmailCode}
                      disabled={emailSaving || !newEmail}
                      className="w-full py-2.5 rounded-xl bg-blue-500 text-white font-semibold text-sm hover:bg-blue-600 transition disabled:opacity-50 inline-flex items-center justify-center gap-2"
                    >
                      <Mail className="w-4 h-4" />
                      {emailSaving ? "Отправка…" : "Отправить код на email"}
                    </button>
                  ) : (
                    <>
                      <div>
                        <label className="block text-xs font-medium mb-1">Код из письма</label>
                        <input
                          type="text" inputMode="numeric" maxLength={6}
                          value={emailCode} onChange={(e) => setEmailCode(e.target.value.replace(/\D/g, ""))}
                          placeholder="6-значный код"
                          className="w-full border border-border rounded-xl px-3 py-2.5 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/25 tracking-widest text-center font-mono text-lg"
                        />
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => { setEmailCodeSent(false); setEmailCode(""); setEmailNotice(null); }}
                          className="flex-1 py-2.5 rounded-xl border border-border text-sm font-medium hover:bg-accent transition"
                        >
                          Назад
                        </button>
                        <button
                          onClick={confirmEmail}
                          disabled={emailSaving || emailCode.length !== 6}
                          className="flex-1 py-2.5 rounded-xl bg-blue-500 text-white font-semibold text-sm hover:bg-blue-600 transition disabled:opacity-50"
                        >
                          {emailSaving ? "Проверка…" : "Подтвердить"}
                        </button>
                      </div>
                    </>
                  )}
                </div>
              )}

              {/* ── Phone tab ── */}
              {secTab === "phone" && (
                <div className="space-y-3 pt-2">
                  {phoneNotice && <div className="text-xs text-green-700 bg-green-50 rounded-lg px-3 py-2">{phoneNotice}</div>}
                  {phoneError && <div className="text-xs text-danger bg-red-50 rounded-lg px-3 py-2">{phoneError}</div>}

                  <div>
                    <label className="block text-xs font-medium mb-1">Новый номер телефона</label>
                    <input
                      type="tel" value={newPhone} onChange={(e) => setNewPhone(e.target.value)}
                      placeholder="+7 (900) 123-45-67"
                      className="w-full border border-border rounded-xl px-3 py-2.5 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/25"
                    />
                  </div>

                  {!phoneCodeSent ? (
                    <button
                      onClick={requestPhoneCode}
                      disabled={phoneSaving || !newPhone}
                      className="w-full py-2.5 rounded-xl bg-green-500 text-white font-semibold text-sm hover:bg-green-600 transition disabled:opacity-50 inline-flex items-center justify-center gap-2"
                    >
                      <Phone className="w-4 h-4" />
                      {phoneSaving ? "Отправка…" : "Отправить SMS-код"}
                    </button>
                  ) : (
                    <>
                      <div>
                        <label className="block text-xs font-medium mb-1">Код из SMS</label>
                        <input
                          type="text" inputMode="numeric" maxLength={6}
                          value={phoneCode} onChange={(e) => setPhoneCode(e.target.value.replace(/\D/g, ""))}
                          placeholder="6-значный код"
                          className="w-full border border-border rounded-xl px-3 py-2.5 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/25 tracking-widest text-center font-mono text-lg"
                        />
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => { setPhoneCodeSent(false); setPhoneCode(""); setPhoneNotice(null); }}
                          className="flex-1 py-2.5 rounded-xl border border-border text-sm font-medium hover:bg-accent transition"
                        >
                          Назад
                        </button>
                        <button
                          onClick={confirmPhone}
                          disabled={phoneSaving || phoneCode.length !== 6}
                          className="flex-1 py-2.5 rounded-xl bg-green-500 text-white font-semibold text-sm hover:bg-green-600 transition disabled:opacity-50"
                        >
                          {phoneSaving ? "Проверка…" : "Подтвердить"}
                        </button>
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>
          )}
        </section>

        {/* ═══ Инфо ═══ */}
        <section className="bg-accent rounded-2xl border border-border p-4 text-sm animate-[slideUp_0.35s_ease-out]">
          <div className="flex items-start gap-2">
            <Info className="w-5 h-5 text-muted shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold">Меняется только через поддержку</p>
              <p className="text-muted mt-1">
                ФИО, фотография паспорта, пропуск.
                <Link href="/support" className="text-primary ml-1 hover:underline">Обратиться →</Link>
              </p>
            </div>
          </div>
        </section>
      </main>

      <BottomNav />
    </div>
  );
}
