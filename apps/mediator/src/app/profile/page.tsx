"use client";

import { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import {
  Star, Shield, Award, LogOut, ChevronRight,
  Phone, Mail, AlertCircle, Bell,
  CheckCircle2, Clock, XCircle, RefreshCw, FileText, Camera, Snowflake,
  Lock, Wallet, CreditCard, AlertTriangle,
} from "lucide-react";
import { BottomNav } from "@/components/BottomNav";
import { VerificationBanner } from "@/components/VerificationBanner";
import { NotifModal } from "@/components/NotifModal";
import { useMediator } from "@/hooks/useMediator";
import { clearSession } from "@/lib/auth";
import { api } from "@/lib/api";
import { useRouter, useSearchParams } from "next/navigation";

type NotifSub = { channel: string; active: boolean };

export default function ProfilePage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><div className="w-8 h-8 border-2 border-foreground border-t-transparent rounded-full animate-spin" /></div>}>
      <ProfileContent />
    </Suspense>
  );
}

function ProfileContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { profile, user, loading, isApproved, isPending, isNeedsRevision, isRejected, isFrozen, hasNoProfile, isCardConfigured, displayName, refetch } = useMediator();
  const [showNotif, setShowNotif] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [notifSubs, setNotifSubs] = useState<NotifSub[]>([]);
  const [notifLoaded, setNotifLoaded] = useState(false);
  const [reviewCount, setReviewCount] = useState<number | null>(null);
  const [showLeaderboard, setShowLeaderboard] = useState(false);
  const [leaderboard, setLeaderboard] = useState<LeaderboardData | null>(null);
  const [leaderboardLoading, setLeaderboardLoading] = useState(false);

  // Fetch notification subs for status icons
  useEffect(() => {
    api.get<NotifSub[]>("/notifications/my")
      .then(data => setNotifSubs(data))
      .catch(() => {})
      .finally(() => setNotifLoaded(true));
  }, []);

  // Fetch review count
  useEffect(() => {
    if (!isApproved) return;
    api.get<{ total: number }>("/mediator/my-reviews")
      .then(d => setReviewCount(d.total))
      .catch(() => setReviewCount(0));
  }, [isApproved]);

  // Show notification modal only if no active subs exist
  useEffect(() => {
    if (!notifLoaded) return;
    if (searchParams.get("verified") === "1") {
      const hasActive = notifSubs.some(s => s.active);
      if (!hasActive) {
        const t = setTimeout(() => setShowNotif(true), 1000);
        return () => clearTimeout(t);
      }
    }
  }, [notifLoaded, notifSubs, searchParams]);

  const handleLogout = () => {
    clearSession();
    router.replace("/login");
  };

  const openLeaderboard = async () => {
    setShowLeaderboard(true);
    if (leaderboard) return;
    setLeaderboardLoading(true);
    try {
      const data = await api.get<LeaderboardData>("/mediator/leaderboard");
      setLeaderboard(data);
    } catch {
      setLeaderboard(null);
    } finally {
      setLeaderboardLoading(false);
    }
  };

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    // Reset input so same file can be selected again
    e.target.value = "";
    setUploadError(null);
    setUploading(true);
    try {
      if (file.size > 5 * 1024 * 1024) {
        setUploadError("Файл слишком большой. Максимум 5 МБ.");
        return;
      }
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
      const ext = (file.name.split(".").pop() ?? "jpg").toLowerCase();
      const { url } = await api.post<{ url: string }>("/mediator/upload", { data: base64, ext });
      await api.patch("/mediator/settings", { avatarUrl: url });
      refetch();
    } catch (err: any) {
      setUploadError(err?.message ?? "Не удалось загрузить фото. Попробуйте ещё раз.");
    } finally {
      setUploading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-foreground border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const rating = profile?.rating ?? null;
  const completedOrders = profile?.completedOrdersCount ?? 0;
  const commission = profile?.commissionRate ?? null;
  const phone = profile?.phone ?? user?.phone ?? "—";
  const email = user?.email ?? "—";
  const avatarUrl = profile?.avatarUrl;

  const expiryDays = (() => {
    if (!profile?.accountExpiresAt) return null;
    const diff = new Date(profile.accountExpiresAt).getTime() - Date.now();
    return Math.ceil(diff / (1000 * 60 * 60 * 24));
  })();

  return (
    <div className="min-h-screen pb-20 bg-background">
      <VerificationBanner status={profile?.status ?? null} rejectionReason={profile?.rejectionReason} />

      <div className="sticky top-0 z-40 bg-card/95 backdrop-blur-lg border-b border-border px-4 h-14 flex items-center">
        <h1 className="text-lg font-bold">Профиль</h1>
      </div>

      <div className="px-4 pt-4 space-y-4 max-w-lg mx-auto">

        {/* Top profile card */}
        <div className="bg-card rounded-2xl border border-border p-5 animate-[slideUp_0.25s_ease-out]">
          {/* Avatar + name row */}
          <div className="flex items-center gap-4">
            <div className="relative shrink-0">
              <div className="w-16 h-16 rounded-full overflow-hidden bg-accent flex items-center justify-center text-foreground text-2xl font-bold ring-2 ring-border">
                {uploading ? (
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : avatarUrl ? (
                  <img src={avatarUrl} alt="Аватар" className="w-full h-full object-cover" />
                ) : (
                  displayName[0]
                )}
              </div>
              <label className={`absolute -bottom-0.5 -right-0.5 w-6 h-6 rounded-full bg-primary text-white flex items-center justify-center shadow cursor-pointer transition hover:bg-primary-hover ${uploading ? "opacity-50 pointer-events-none" : ""}`}>
                <Camera className="w-3 h-3" />
                <input type="file" accept="image/jpeg,image/png,image/webp,image/heic" onChange={handleAvatarChange} className="sr-only" />
              </label>
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-bold text-base leading-tight truncate">{displayName}</p>
              <div className="mt-1">
                <VerificationBadge isApproved={isApproved} isPending={isPending} isNeedsRevision={isNeedsRevision} isRejected={isRejected} isFrozen={isFrozen} />
              </div>
              {isApproved && expiryDays !== null && (
                <span className={`inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full font-medium mt-1 ${
                  expiryDays <= 7 ? "bg-danger/10 text-danger" : expiryDays <= 30 ? "bg-warning/10 text-warning" : "bg-muted/10 text-muted"
                }`}>
                  <Clock className="w-3 h-3 shrink-0" />
                  Пропуск до {new Date(profile!.accountExpiresAt!).toLocaleDateString("ru-RU", { day: "numeric", month: "short", year: "numeric" })} · {expiryDays > 0 ? `${expiryDays} дн.` : "истёк"}
                </span>
              )}
            </div>
          </div>

          {/* Stats row */}
          {isApproved && (
            <div className="flex items-center gap-0 mt-4 pt-4 border-t border-border">
              <div className="flex-1 flex flex-col items-center gap-0.5">
                <span className="text-base font-bold">{completedOrders}</span>
                <span className="text-[10px] text-muted">заказов</span>
              </div>
              <div className="w-px h-8 bg-border" />
              <button onClick={openLeaderboard} className="flex-1 flex flex-col items-center gap-0.5 active:opacity-70 transition">
                <span className="text-base font-bold">{rating !== null ? Number(rating).toFixed(1) : "—"}</span>
                <span className="text-[10px] text-primary underline underline-offset-2">рейтинг</span>
              </button>
              <div className="w-px h-8 bg-border" />
              <div className="flex-1 flex flex-col items-center gap-0.5">
                <span className="text-base font-bold">{commission !== null && commission > 0 ? `${commission}%` : "—"}</span>
                <span className="text-[10px] text-muted">комиссия</span>
              </div>
            </div>
          )}
        </div>

        {/* Upload error */}
        {uploadError && (
          <p className="text-xs text-danger text-center -mt-1 animate-[slideUp_0.2s_ease-out]">{uploadError}</p>
        )}

        {/* ─── VERIFICATION BLOCKS ─── */}

        {/* 1. No profile yet — show verification wizard CTA */}
        {hasNoProfile && (
          <div className="bg-primary/5 rounded-2xl border-2 border-primary/20 p-6 space-y-4 animate-[slideUp_0.28s_ease-out]">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-full bg-primary/15 flex items-center justify-center shrink-0 mt-0.5">
                <AlertCircle className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="font-bold text-base">Пройдите верификацию</p>
                <p className="text-xs text-muted mt-1">
                  Для приёма заказов нужно подтвердить личность и указать условия работы.
                  Займёт 3–5 минут.
                </p>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-2 text-center">
              {[
                { n: 1, t: "Условия" },
                { n: 2, t: "Паспорт" },
                { n: 3, t: "Пропуск" },
              ].map((s) => (
                <div key={s.n} className="bg-background rounded-xl py-2.5 px-1">
                  <p className="text-xs font-bold text-primary">{s.n}</p>
                  <p className="text-[10px] text-muted mt-0.5">{s.t}</p>
                </div>
              ))}
            </div>
            <Link
              href="/verify"
              className="block w-full py-3.5 rounded-xl bg-primary text-white font-bold text-sm text-center hover:bg-primary-hover transition active:scale-[0.98]"
            >
              Начать верификацию →
            </Link>
          </div>
        )}

        {/* 2. PENDING */}
        {isPending && (
          <div className="bg-warning/5 rounded-2xl border border-warning/20 p-5 space-y-4 animate-[slideUp_0.28s_ease-out]">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-warning/15 flex items-center justify-center shrink-0">
                <Clock className="w-5 h-5 text-warning" />
              </div>
              <div>
                <p className="font-semibold text-sm">Заявка на рассмотрении</p>
                <p className="text-xs text-muted mt-0.5">Администратор проверит данные в течение 24 часов.</p>
              </div>
            </div>
            <Link
              href="/profile/documents"
              className="w-full flex items-center justify-between py-3 px-4 rounded-xl bg-warning/10 border border-warning/25 text-sm font-semibold text-warning hover:bg-warning/15 transition"
            >
              <span className="flex items-center gap-2">
                <FileText className="w-4 h-4" />
                Посмотреть документы
              </span>
              <ChevronRight className="w-4 h-4" />
            </Link>
            <Link
              href="/settings/notifications"
              className="w-full flex items-center justify-between py-3 px-4 rounded-xl bg-primary/5 border border-primary/20 text-sm font-medium text-primary hover:bg-primary/10 transition"
            >
              <span className="flex items-center gap-2">
                <Bell className="w-4 h-4" />
                Подключите уведомления, чтобы не пропустить ответ
              </span>
              <ChevronRight className="w-4 h-4" />
            </Link>
          </div>
        )}

        {/* 3. NEEDS_REVISION */}
        {isNeedsRevision && (
          <div className="bg-orange-500/5 rounded-2xl border border-orange-500/20 p-5 space-y-4 animate-[slideUp_0.28s_ease-out]">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-orange-500/15 flex items-center justify-center shrink-0">
                <RefreshCw className="w-5 h-5 text-orange-500" />
              </div>
              <div>
                <p className="font-semibold text-sm">Требуются правки</p>
                <p className="text-xs text-muted mt-0.5">Обновите документы и отправьте заявку повторно.</p>
              </div>
            </div>
            {profile?.rejectionReason && (
              <div className="bg-orange-500/10 rounded-xl px-4 py-3 border border-orange-500/20">
                <p className="text-xs font-semibold text-orange-700 mb-0.5">Комментарий администратора:</p>
                <p className="text-sm text-orange-800">{profile.rejectionReason}</p>
              </div>
            )}
            <Link
              href="/profile/documents"
              className="w-full flex items-center justify-between py-3 px-4 rounded-xl bg-orange-500/10 border border-orange-500/25 text-sm font-semibold text-orange-600 hover:bg-orange-500/15 transition"
            >
              <span className="flex items-center gap-2">
                <FileText className="w-4 h-4" />
                Посмотреть и обновить документы
              </span>
              <ChevronRight className="w-4 h-4" />
            </Link>
          </div>
        )}

        {/* 4. FROZEN */}
        {isFrozen && (
          <div className="bg-blue-500/5 rounded-2xl border border-blue-500/20 p-5 space-y-4 animate-[slideUp_0.28s_ease-out]">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-blue-500/15 flex items-center justify-center shrink-0">
                <Snowflake className="w-5 h-5 text-blue-500" />
              </div>
              <div>
                <p className="font-semibold text-sm text-blue-700">Аккаунт заморожен</p>
                <p className="text-xs text-muted mt-0.5">Срок действия пропуска истёк. Обновите данные, чтобы продолжить работу.</p>
              </div>
            </div>
            {profile?.accountExpiresAt && (
              <div className="bg-blue-500/10 rounded-xl px-4 py-3 border border-blue-500/20">
                <p className="text-xs text-blue-700">Пропуск истёк: <span className="font-semibold">{new Date(profile.accountExpiresAt).toLocaleDateString("ru-RU")}</span></p>
              </div>
            )}
            <Link
              href="/verify"
              className="block w-full py-3.5 rounded-xl bg-blue-600 text-white font-bold text-sm text-center hover:bg-blue-700 transition active:scale-[0.98]"
            >
              Обновить пропуск и отправить заявку →
            </Link>
          </div>
        )}

        {/* 5. REJECTED */}
        {isRejected && (
          <div className="bg-danger/5 rounded-2xl border border-danger/20 p-5 space-y-2 animate-[slideUp_0.28s_ease-out]">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-danger/15 flex items-center justify-center shrink-0">
                <XCircle className="w-5 h-5 text-danger" />
              </div>
              <div>
                <p className="font-semibold text-sm text-danger">Заявка отклонена</p>
                {profile?.rejectionReason && (
                  <p className="text-xs text-muted mt-0.5">{profile.rejectionReason}</p>
                )}
              </div>
            </div>
            <Link
              href="/support"
              className="block w-full py-2.5 rounded-xl bg-danger/10 text-danger font-semibold text-sm text-center hover:bg-danger/20 transition"
            >
              Обратиться в поддержку
            </Link>
          </div>
        )}

        {/* Info cards — only if approved */}
        {isApproved && (
          <div className="animate-[slideUp_0.35s_ease-out]">
            <div className="grid grid-cols-2 gap-3">
              <InfoCard icon={Phone} label="Телефон" value={phone} />
              <InfoCard icon={Mail} label="Email" value={email} />
            </div>
          </div>
        )}

        {/* Badges — only if approved */}
        {isApproved && completedOrders > 0 && (
          <div className="animate-[slideUp_0.3s_ease-out]">
            <p className="text-[10px] text-muted uppercase tracking-widest mb-2">Бейджи</p>
            <div className="flex gap-2 overflow-x-auto pb-1">
              {completedOrders >= 1 && <Badge label="Начинающий" earned />}
              {completedOrders >= 10 && <Badge label="10 заказов" earned />}
              {completedOrders >= 50 && <Badge label="50 заказов" earned />}
              {completedOrders >= 100 && <Badge label="100 заказов" earned />}
            </div>
          </div>
        )}

        {/* Menu */}
        {(() => {
          const notifActive = notifSubs.filter(s => s.active).length;
          const docsBadge = isApproved
            ? <span className="flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-full bg-green-500/10 text-green-600 font-medium"><CheckCircle2 className="w-3 h-3" />Ок</span>
            : isPending
            ? <span className="flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-full bg-warning/10 text-warning font-medium"><Clock className="w-3 h-3" />На проверке</span>
            : isNeedsRevision || isFrozen
            ? <span className="flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-full bg-orange-500/10 text-orange-500 font-medium"><AlertCircle className="w-3 h-3" />Правки</span>
            : isRejected
            ? <span className="flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-full bg-danger/10 text-danger font-medium"><XCircle className="w-3 h-3" />Откл.</span>
            : null;
          const notifBadge = notifLoaded
            ? notifActive === 0
              ? <span className="flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-full bg-warning/10 text-warning font-medium"><Bell className="w-3 h-3" />0/3</span>
              : <span className="flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-full bg-green-500/10 text-green-600 font-medium"><CheckCircle2 className="w-3 h-3" />{notifActive}/3</span>
            : null;
          const cardBadge = isApproved
            ? isCardConfigured
              ? <span className="flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-full bg-green-500/10 text-green-600 font-medium"><CheckCircle2 className="w-3 h-3" />Заполнена</span>
              : <span className="flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-full bg-warning/10 text-warning font-medium animate-pulse"><AlertCircle className="w-3 h-3" />Заполните</span>
            : null;
          const reviewBadge = (reviewCount !== null && reviewCount > 0)
            ? <span className="text-[10px] px-2 py-0.5 rounded-full bg-primary/10 text-primary font-bold">{reviewCount}</span>
            : null;
          return (
            <div className="space-y-1.5 animate-[slideUp_0.4s_ease-out]">
              {/* Card not configured banner */}
              {isApproved && !isCardConfigured && (
                <Link
                  href="/profile/conditions"
                  className="flex items-center gap-3 px-4 py-3.5 rounded-xl bg-warning/8 border border-warning/30 hover:bg-warning/12 transition mb-1"
                >
                  <AlertTriangle className="w-5 h-5 text-warning shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-warning">Карточка не заполнена</p>
                    <p className="text-xs text-muted mt-0.5">Заполните карточку, чтобы принимать заказы</p>
                  </div>
                  <ChevronRight className="w-4 h-4 text-warning shrink-0" />
                </Link>
              )}
              <MenuItemBadge icon={FileText} label="Документы" href="/profile/documents" badge={docsBadge} />
              <MenuItemBadge icon={CreditCard} label="Моя карточка" href="/profile/conditions" badge={cardBadge} />
              <MenuItemBadge icon={Star} label="Отзывы" href="/profile/reviews" badge={reviewBadge} />
              <MenuItemBadge icon={Bell} label="Уведомления" href="/settings/notifications" badge={notifBadge} />
              <MenuItemBadge icon={Wallet} label="Финансы" href="/finance" badge={null} />
              <MenuItemBadge icon={Lock} label="Безопасность" href="/profile/security" badge={null} />
              <MenuItemBadge icon={Shield} label="Поддержка" href="/support" badge={null} />
            </div>
          );
        })()}

        {/* Logout */}
        <button
          onClick={handleLogout}
          className="w-full flex items-center justify-center gap-2 min-h-[48px] rounded-xl bg-danger/10 text-danger font-semibold text-sm active:scale-95 transition animate-[slideUp_0.45s_ease-out]"
        >
          <LogOut className="w-4 h-4" />
          Выйти
        </button>
      </div>

      {showNotif && (
        <NotifModal onClose={() => {
          setShowNotif(false);
          router.replace("/profile", { scroll: false });
        }} />
      )}

      {showLeaderboard && (
        <LeaderboardModal
          data={leaderboard}
          loading={leaderboardLoading}
          myRank={leaderboard?.myRank ?? null}
          onClose={() => setShowLeaderboard(false)}
        />
      )}

      <BottomNav />
    </div>
  );
}

function VerificationBadge({ isApproved, isPending, isNeedsRevision, isRejected, isFrozen }: {
  isApproved: boolean; isPending: boolean; isNeedsRevision: boolean; isRejected: boolean; isFrozen?: boolean;
}) {
  if (isApproved) return (
    <span className="flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-success/10 text-success font-medium">
      <CheckCircle2 className="w-3 h-3" /> Подтверждён
    </span>
  );
  if (isFrozen) return (
    <span className="flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-600 font-medium">
      <Snowflake className="w-3 h-3" /> Заморожен
    </span>
  );
  if (isPending) return (
    <span className="flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-warning/10 text-warning font-medium">
      <Clock className="w-3 h-3" /> На проверке
    </span>
  );
  if (isNeedsRevision) return (
    <span className="flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-orange-500/10 text-orange-500 font-medium">
      <RefreshCw className="w-3 h-3" /> Правки
    </span>
  );
  if (isRejected) return (
    <span className="flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-danger/10 text-danger font-medium">
      <XCircle className="w-3 h-3" /> Отклонён
    </span>
  );
  return null;
}


function InfoCard({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value: string }) {
  return (
    <div className="bg-card rounded-xl border border-border p-3.5">
      <div className="flex items-center gap-2 mb-1">
        <Icon className="w-4 h-4 text-muted" />
        <span className="text-[10px] text-muted uppercase tracking-wider">{label}</span>
      </div>
      <p className="text-sm font-semibold truncate">{value}</p>
    </div>
  );
}

function MenuItemBadge({ icon: Icon, label, href, badge }: { icon: React.ElementType; label: string; href: string; badge?: React.ReactNode }) {
  return (
    <Link href={href} className="w-full bg-card rounded-xl border border-border p-4 flex items-center gap-3 hover:bg-card-hover transition active:scale-[0.98] min-h-[52px]">
      <Icon className="w-5 h-5 text-muted" />
      <span className="text-sm font-medium flex-1 text-left">{label}</span>
      {badge}
      <ChevronRight className="w-4 h-4 text-muted" />
    </Link>
  );
}

function Badge({ label, earned }: { label: string; earned: boolean }) {
  return (
    <div className={`shrink-0 px-3 py-2 rounded-xl text-xs font-medium border flex items-center gap-1 ${
      earned ? "bg-foreground/5 border-foreground/20 text-foreground" : "bg-accent border-border text-muted"
    }`}>
      <Award className="w-3.5 h-3.5" />
      {label}
    </div>
  );
}

// ─── Types ───────────────────────────────────────────────────────────────────

type LeaderboardEntry = {
  rank: number;
  id: string;
  userId: string;
  displayName: string;
  avatarUrl: string | null;
  completedOrders: number;
  rating: number | null;
  score: number;
};

type LeaderboardData = {
  leaderboard: LeaderboardEntry[];
  myRank: number | null;
  myEntry: LeaderboardEntry | null;
  total: number;
};

// ─── Leaderboard Modal ───────────────────────────────────────────────────────

const MEDALS = ["🥇", "🥈", "🥉"];

function LeaderboardModal({ data, loading, myRank, onClose }: {
  data: LeaderboardData | null;
  loading: boolean;
  myRank: number | null;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center" onClick={onClose}>
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
      <div
        className="relative w-full max-w-lg bg-card rounded-t-3xl border-t border-border pb-safe animate-[slideUp_0.25s_ease-out] max-h-[85vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Handle */}
        <div className="flex justify-center pt-3 pb-1 shrink-0">
          <div className="w-10 h-1 rounded-full bg-border" />
        </div>

        {/* Header */}
        <div className="px-5 pb-3 shrink-0">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold">Рейтинг посредников</h2>
              <p className="text-xs text-muted mt-0.5">
                Чем больше выполненных заказов и выше оценки — тем выше позиция
              </p>
            </div>
            {myRank && (
              <div className="shrink-0 text-right">
                <p className="text-2xl font-black text-primary">#{myRank}</p>
                <p className="text-[10px] text-muted">ваше место</p>
              </div>
            )}
          </div>
        </div>

        <div className="border-t border-border mx-5 shrink-0" />

        {/* List */}
        <div className="overflow-y-auto flex-1 px-5 py-3 space-y-1.5">
          {loading && (
            <div className="flex items-center justify-center py-10">
              <div className="w-7 h-7 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            </div>
          )}

          {!loading && data && (
            <>
              {data.leaderboard.map((entry) => (
                <LeaderboardRow key={entry.id} entry={entry} isMe={entry.rank === myRank} />
              ))}

              {/* Current user outside top-10 */}
              {data.myEntry && (
                <>
                  <div className="flex items-center gap-2 py-1">
                    <div className="flex-1 border-t border-dashed border-border" />
                    <span className="text-[10px] text-muted">ваша позиция</span>
                    <div className="flex-1 border-t border-dashed border-border" />
                  </div>
                  <LeaderboardRow entry={data.myEntry} isMe />
                </>
              )}

              {data.total === 0 && (
                <p className="text-center text-sm text-muted py-8">Пока нет данных</p>
              )}
            </>
          )}
        </div>

        {/* Score explanation */}
        <div className="px-5 py-3 border-t border-border shrink-0">
          <p className="text-[10px] text-muted text-center leading-relaxed">
            Рейтинг = кол-во заказов × средняя оценка · Обновляется в реальном времени
          </p>
        </div>
      </div>
    </div>
  );
}

function LeaderboardRow({ entry, isMe }: { entry: LeaderboardEntry; isMe: boolean }) {
  const initials = entry.displayName[0]?.toUpperCase() ?? "?";
  const hue = initials.charCodeAt(0) * 37 % 360;

  return (
    <div className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition ${
      isMe ? "bg-primary/8 border border-primary/20" : "bg-accent/40"
    }`}>
      {/* Rank */}
      <div className="w-7 text-center shrink-0">
        {entry.rank <= 3
          ? <span className="text-lg leading-none">{MEDALS[entry.rank - 1]}</span>
          : <span className="text-sm font-bold text-muted">{entry.rank}</span>
        }
      </div>

      {/* Avatar */}
      <div className="w-9 h-9 rounded-full overflow-hidden shrink-0 flex items-center justify-center text-white text-sm font-bold"
        style={{ background: entry.avatarUrl ? undefined : `hsl(${hue},55%,48%)` }}>
        {entry.avatarUrl
          ? <img src={entry.avatarUrl} alt="" className="w-full h-full object-cover" />
          : initials}
      </div>

      {/* Name + stars */}
      <div className="flex-1 min-w-0">
        <p className={`text-sm font-semibold truncate ${isMe ? "text-primary" : ""}`}>
          {entry.displayName}{isMe ? " (вы)" : ""}
        </p>
        <div className="flex items-center gap-1 mt-0.5">
          {[1,2,3,4,5].map(s => (
            <Star key={s} className={`w-3 h-3 ${entry.rating && s <= Math.round(entry.rating) ? "text-warning fill-warning" : "text-border"}`} />
          ))}
          {entry.rating && <span className="text-[10px] text-muted ml-0.5">{entry.rating.toFixed(1)}</span>}
        </div>
      </div>

      {/* Stats */}
      <div className="text-right shrink-0">
        <p className="text-sm font-bold">{entry.completedOrders}</p>
        <p className="text-[10px] text-muted">заказов</p>
      </div>
    </div>
  );
}
