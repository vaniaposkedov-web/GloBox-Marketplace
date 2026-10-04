"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  CheckCircle2, Clock, RefreshCw, XCircle,
  Phone, Mail, FileText, Star, Bell, BarChart2,
  Lock, MessageSquare, ChevronRight, LogOut, Camera,
  AlertCircle, Shield,
} from "lucide-react";
import { api } from "@/lib/api";
import { getToken, clearSession } from "@/lib/auth";
import { BottomNav } from "@/components/BottomNav";
import type { SellerStatus } from "@/components/VerificationBanner";

// ── Types ─────────────────────────────────────────────────────────────────────

interface ProfileResponse {
  user: { id: string; email: string; firstName: string; lastName: string; phone: string; avatarUrl?: string | null };
  profile: { status: SellerStatus; rejectionReason?: string | null } | null;
}

interface ListingsResponse { items: { id: string }[]; total: number }
type NotifSub = { channel: string; active: boolean };
interface SupportTicket { id: string; status: string; subject: string }
interface LoginEvent { id: string; createdAt: string }
interface Review { id: string; createdAt: string }

// ── Config ────────────────────────────────────────────────────────────────────

const STATUS_CFG: Record<string, { label: string; icon: React.ElementType; color: string; bg: string }> = {
  PENDING:        { label: "На рассмотрении", icon: Clock,       color: "#d97706", bg: "#fffbeb" },
  NEEDS_REVISION: { label: "Требует правок",  icon: RefreshCw,   color: "#ea580c", bg: "#fff7ed" },
  APPROVED:       { label: "Подтверждён",     icon: CheckCircle2,color: "#16a34a", bg: "#f0fdf4" },
  REJECTED:       { label: "Отклонён",        icon: XCircle,     color: "#dc2626", bg: "#fef2f2" },
};

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

function resizeAvatar(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const size = 400;
      const canvas = document.createElement("canvas");
      canvas.width = size; canvas.height = size;
      const ctx = canvas.getContext("2d")!;
      const side = Math.min(img.width, img.height);
      ctx.drawImage(img, (img.width - side) / 2, (img.height - side) / 2, side, side, 0, 0, size, size);
      resolve(canvas.toDataURL("image/jpeg", 0.88));
    };
    img.onerror = () => reject(new Error("Failed to load image"));
    img.src = URL.createObjectURL(file);
  });
}

// ── Badge components ──────────────────────────────────────────────────────────

function GreenBadge({ children }: { children: React.ReactNode }) {
  return (
    <span className="flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-full bg-green-500/10 text-green-600 font-semibold whitespace-nowrap">
      {children}
    </span>
  );
}

function WarningBadge({ children }: { children: React.ReactNode }) {
  return (
    <span className="flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-full bg-amber-500/10 text-amber-600 font-semibold whitespace-nowrap">
      {children}
    </span>
  );
}

function DangerBadge({ children }: { children: React.ReactNode }) {
  return (
    <span className="flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-full bg-red-500/10 text-red-600 font-semibold whitespace-nowrap">
      {children}
    </span>
  );
}

function BlueBadge({ children }: { children: React.ReactNode }) {
  return (
    <span className="flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-full bg-blue-500/10 text-blue-600 font-semibold whitespace-nowrap">
      {children}
    </span>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function ProfilePage() {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);

  const [data, setData]         = useState<ProfileResponse | null>(null);
  const [listingCount, setListingCount] = useState<number>(0);
  const [loading, setLoading]   = useState(true);

  // Badge data
  const [notifSubs, setNotifSubs]         = useState<NotifSub[]>([]);
  const [notifLoaded, setNotifLoaded]     = useState(false);
  const [supportWaiting, setSupportWaiting] = useState(0);
  const [loginCount, setLoginCount]       = useState(0);
  const [newReviews, setNewReviews]       = useState(0);
  const [badgesLoaded, setBadgesLoaded]   = useState(false);

  // Avatar
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [avatarToast, setAvatarToast]     = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!getToken()) { router.replace("/login"); return; }
    try {
      const [me, listings] = await Promise.all([
        api.get<ProfileResponse>("/supplier/me"),
        api.get<ListingsResponse>("/supplier/my-listings").catch(() => ({ items: [], total: 0 })),
      ]);
      setData(me);
      setListingCount(listings.total ?? listings.items.length);
    } catch {
      clearSession();
      router.replace("/login");
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => { load(); }, [load]);

  // Load badge data in background
  useEffect(() => {
    const LAST_VISIT_KEY = "seller-last-visit";
    const lastVisit = localStorage.getItem(LAST_VISIT_KEY);
    localStorage.setItem(LAST_VISIT_KEY, new Date().toISOString());

    Promise.all([
      // Notifications
      api.get<NotifSub[]>("/notifications/my").catch(() => []),
      // Support tickets with admin reply waiting
      api.get<{ tickets: SupportTicket[] }>("/support/tickets?limit=50").catch(() => ({ tickets: [] })),
      // Login events
      api.get<LoginEvent[]>("/supplier/login-events").catch(() => []),
      // Reviews
      api.get<{ items: Review[]; total: number }>("/supplier/my-listings")
        .catch(() => ({ items: [], total: 0 })),
    ]).then(([notifs, supportData, events, _]) => {
      setNotifSubs(notifs);
      setNotifLoaded(true);

      // Count support tickets where admin replied (WAITING_USER = waiting for user to respond)
      const waiting = (supportData as any)?.tickets?.filter(
        (t: SupportTicket) => t.status === "WAITING_USER"
      ).length ?? 0;
      setSupportWaiting(waiting);

      // Count logins since last visit
      const sinceDate = lastVisit ? new Date(lastVisit) : null;
      const recentLogins = sinceDate
        ? events.filter(e => new Date(e.createdAt) > sinceDate).length
        : 0;
      setLoginCount(recentLogins);

      setBadgesLoaded(true);
    }).catch(() => setBadgesLoaded(true));
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleAvatarFile = async (file: File | null) => {
    if (!file) return;
    setAvatarUploading(true);
    try {
      const base64 = await resizeAvatar(file);
      setAvatarPreview(base64);
      const { url } = await api.post<{ url: string }>("/supplier/upload", { data: base64, ext: "jpg" });
      await api.patch("/supplier/avatar", { avatarUrl: url });
      setData(prev => prev ? { ...prev, user: { ...prev.user, avatarUrl: url } } : prev);
      setAvatarPreview(null);
      showToast("Фото обновлено!");
    } catch (err: any) {
      setAvatarPreview(null);
      showToast(err.message || "Ошибка при загрузке фото");
    } finally { setAvatarUploading(false); }
  };

  const showToast = (msg: string) => {
    setAvatarToast(msg);
    setTimeout(() => setAvatarToast(null), 3000);
  };

  const logout = () => { clearSession(); router.replace("/"); };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="w-9 h-9 rounded-full border-4 border-primary border-t-transparent animate-spin" />
      </div>
    );
  }

  if (!data) return null;

  const { user, profile } = data;
  const status   = profile?.status ?? null;
  const cfg      = status ? STATUS_CFG[status] : null;
  const StatusIcon = cfg?.icon;
  const displayName = `${user.firstName} ${user.lastName}`.trim() || user.email;
  const avatarSrc = avatarPreview ?? user.avatarUrl ?? null;

  const isApproved = status === "APPROVED";
  const isPending  = status === "PENDING";
  const isRevision = status === "NEEDS_REVISION";
  const isRejected = status === "REJECTED";

  const notifActive = notifSubs.filter(s => s.active).length;

  // ── Build badges ──

  const docsBadge = (() => {
    if (isApproved)  return <GreenBadge><CheckCircle2 className="w-3 h-3" />Проверены</GreenBadge>;
    if (isRevision)  return <DangerBadge><RefreshCw className="w-3 h-3" />Правки</DangerBadge>;
    if (isPending)   return <WarningBadge><Clock className="w-3 h-3" />На проверке</WarningBadge>;
    if (isRejected)  return <DangerBadge><XCircle className="w-3 h-3" />Отклонены</DangerBadge>;
    return <WarningBadge><AlertCircle className="w-3 h-3" />Не поданы</WarningBadge>;
  })();

  const notifBadge = notifLoaded
    ? notifActive === 0
      ? <WarningBadge><Bell className="w-3 h-3" />0/3</WarningBadge>
      : <GreenBadge><CheckCircle2 className="w-3 h-3" />{notifActive}/3</GreenBadge>
    : null;

  const supportBadge = badgesLoaded && supportWaiting > 0
    ? <DangerBadge><MessageSquare className="w-3 h-3" />{supportWaiting} новых</DangerBadge>
    : null;

  const securityBadge = badgesLoaded && loginCount > 0
    ? <BlueBadge><Shield className="w-3 h-3" />{loginCount} {loginCount === 1 ? "вход" : loginCount < 5 ? "входа" : "входов"}</BlueBadge>
    : null;

  const reviewsBadge = badgesLoaded && newReviews > 0
    ? <GreenBadge><Star className="w-3 h-3" />Новые</GreenBadge>
    : null;

  const NAV_ITEMS = [
    { icon: FileText,      label: "Документы",    sub: isRevision ? "Требуются правки" : isApproved ? "Верифицированы" : "Верификация аккаунта", href: "/profile/documents",       badge: docsBadge },
    { icon: Star,          label: "Отзывы",       sub: "Рейтинг и комментарии",  href: "/reviews",                 badge: reviewsBadge },
    { icon: Bell,          label: "Уведомления",  sub: "Telegram, ВКонтакте",   href: "/settings/notifications",  badge: notifBadge },
    { icon: BarChart2,     label: "Аналитика",    sub: "Просмотры и клики",      href: "/analytics",               badge: null },
    { icon: Lock,          label: "Безопасность", sub: "Пароль, email, телефон", href: "/settings/security",       badge: securityBadge },
    { icon: MessageSquare, label: "Поддержка",    sub: "Чат и заявки",           href: "/support",                 badge: supportBadge },
  ];

  return (
    <div className="min-h-screen bg-background">
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={e => { handleAvatarFile(e.target.files?.[0] ?? null); e.target.value = ""; }}
      />

      {/* Toast */}
      {avatarToast && (
        <div
          className="fixed top-16 left-1/2 -translate-x-1/2 z-50 px-4 py-2.5 rounded-2xl text-sm font-medium shadow-lg text-white"
          style={{ background: "#1a1a1a", animation: "slideUp 0.2s ease-out", whiteSpace: "nowrap" }}
        >
          {avatarToast}
        </div>
      )}

      {/* ── Sticky header ── */}
      <div
        className="sticky top-0 z-40 px-4 py-3"
        style={{ background: "rgba(255,255,255,0.92)", backdropFilter: "blur(16px)", borderBottom: "1px solid var(--border)" }}
      >
        <div className="max-w-lg mx-auto">
          <h1 className="text-lg font-bold text-foreground">Профиль</h1>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 pt-4 pb-24 space-y-4">

        {/* ── Top card ── */}
        <div className="bg-card rounded-2xl border border-border p-5" style={{ animation: "slideUp 0.22s ease-out" }}>
          <div className="flex items-center gap-4 mb-4">
            <div className="relative shrink-0">
              {avatarSrc ? (
                <img
                  src={avatarSrc}
                  alt=""
                  className="w-16 h-16 rounded-full object-cover border border-border"
                  style={{ opacity: avatarUploading ? 0.6 : 1, transition: "opacity 0.2s" }}
                />
              ) : (
                <div
                  className="w-16 h-16 rounded-full flex items-center justify-center text-white font-bold text-xl"
                  style={{ background: avatarGradient(displayName), opacity: avatarUploading ? 0.6 : 1 }}
                >
                  {displayName[0]?.toUpperCase()}
                </div>
              )}
              <button
                onClick={() => fileRef.current?.click()}
                disabled={avatarUploading}
                className="absolute bottom-0 right-0 w-6 h-6 rounded-full bg-primary flex items-center justify-center active:scale-90 transition-transform disabled:opacity-60"
                style={{ WebkitTapHighlightColor: "transparent", boxShadow: "0 0 0 2px white" }}
              >
                {avatarUploading
                  ? <div className="w-3 h-3 border-[1.5px] border-white border-t-transparent rounded-full animate-spin" />
                  : <Camera className="w-3 h-3 text-white" />
                }
              </button>
            </div>

            <div className="flex-1 min-w-0">
              <p className="font-bold text-foreground text-base truncate">{displayName}</p>
              {cfg && StatusIcon && (
                <div
                  className="inline-flex items-center gap-1.5 mt-1 px-2 py-0.5 rounded-full text-xs font-medium"
                  style={{ background: cfg.bg, color: cfg.color }}
                >
                  <StatusIcon className="w-3 h-3" />
                  {cfg.label}
                </div>
              )}
              <button
                onClick={() => fileRef.current?.click()}
                disabled={avatarUploading}
                className="mt-1 text-[11px] text-muted disabled:opacity-50"
                style={{ WebkitTapHighlightColor: "transparent" }}
              >
                {avatarUploading ? "Загрузка…" : "Изменить фото"}
              </button>
            </div>
          </div>

          {/* Stats */}
          <div className="border-t border-border pt-4 grid grid-cols-2">
            <div className="text-center">
              <p className="text-2xl font-black text-foreground">{listingCount}</p>
              <p className="text-xs text-muted">товаров</p>
            </div>
            <div className="text-center border-l border-border">
              <p className="text-2xl font-black text-foreground">—</p>
              <p className="text-xs text-muted">просмотров</p>
            </div>
          </div>
        </div>

        {/* ── Revision alert ── */}
        {isRevision && profile?.rejectionReason && (
          <div
            className="bg-orange-50 border border-orange-200 rounded-2xl p-4 flex items-start gap-3"
            style={{ animation: "slideUp 0.28s ease-out" }}
          >
            <div className="w-9 h-9 rounded-xl bg-orange-100 flex items-center justify-center shrink-0">
              <RefreshCw className="w-4 h-4 text-orange-600" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-sm text-orange-700">Требуются правки в заявке</p>
              <p className="text-xs text-orange-600 mt-0.5">{profile.rejectionReason}</p>
              <a
                href="/verify"
                className="inline-flex items-center gap-1.5 mt-2 text-xs font-semibold text-white bg-orange-500 px-3 py-1.5 rounded-xl active:scale-[0.97] transition"
                style={{ WebkitTapHighlightColor: "transparent" }}
              >
                <RefreshCw className="w-3 h-3" /> Исправить и переотправить
              </a>
            </div>
          </div>
        )}

        {/* ── Contacts ── */}
        <div className="grid grid-cols-2 gap-3" style={{ animation: "slideUp 0.28s ease-out" }}>
          <div className="bg-card rounded-2xl border border-border p-4 flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-blue-50 flex items-center justify-center shrink-0">
              <Phone className="w-4 h-4 text-blue-600" />
            </div>
            <div className="min-w-0">
              <p className="text-[10px] text-muted">Телефон</p>
              <p className="text-sm font-medium truncate">{user.phone || "—"}</p>
            </div>
          </div>
          <div className="bg-card rounded-2xl border border-border p-4 flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-green-50 flex items-center justify-center shrink-0">
              <Mail className="w-4 h-4 text-green-600" />
            </div>
            <div className="min-w-0">
              <p className="text-[10px] text-muted">Email</p>
              <p className="text-sm font-medium truncate">{user.email}</p>
            </div>
          </div>
        </div>

        {/* ── Nav menu with badges ── */}
        <div className="space-y-1.5" style={{ animation: "slideUp 0.32s ease-out" }}>
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            return (
              <a
                key={item.href}
                href={item.href}
                className="bg-card rounded-2xl border border-border px-4 py-3.5 flex items-center gap-3 active:scale-[0.99] transition-transform min-h-14"
                style={{ WebkitTapHighlightColor: "transparent" }}
              >
                <div className="w-9 h-9 rounded-xl bg-accent flex items-center justify-center shrink-0">
                  <Icon className="w-4 h-4 text-muted" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground">{item.label}</p>
                  <p className="text-xs text-muted truncate">{item.sub}</p>
                </div>
                {item.badge}
                <ChevronRight className="w-4 h-4 text-muted shrink-0" />
              </a>
            );
          })}
        </div>

        {/* ── Logout ── */}
        <button
          onClick={logout}
          className="w-full py-3.5 rounded-2xl flex items-center justify-center gap-2 text-sm font-semibold text-red-600 active:scale-[0.98] transition-transform"
          style={{ background: "#fef2f2", border: "1px solid #fecaca", WebkitTapHighlightColor: "transparent" }}
        >
          <LogOut className="w-4 h-4" />
          Выйти из аккаунта
        </button>
      </div>

      <BottomNav />
    </div>
  );
}
