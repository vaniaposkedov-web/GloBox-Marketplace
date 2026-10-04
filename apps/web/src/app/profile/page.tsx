"use client";

import { useEffect, useMemo, useState, useCallback, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ShoppingBag,
  Heart,
  Package,
  Store,
  LogOut,
  Camera,
  BadgeCheck,
  Mail,
  Phone,
  ChevronRight,
  Settings,
  Shield,
  Calendar,
  MapPin,
  Gift,
  Bell,
  Sparkles,
  TrendingUp,
  Eye,
  Star,
  Truck,
  CreditCard,
  MessageCircle,
  HelpCircle,
  Pencil,
  X,
  Check,
  Loader2,
} from "lucide-react";
import { SiteHeader } from "@/widgets/header";
import { Button, Field } from "@/shared/ui";
import { ApiError, api } from "@/shared/api/client";
import {
  canSell,
  clearSession,
  setSession,
  useSession,
} from "@/shared/auth";
import { fetchMe, updateMe, type MeDto } from "@/features/auth-session";
import { getCart, getFavorites, getMyOrders } from "@/features/commerce";
import {
  nameSchema,
  updateProfileSchema,
  formatPrice,
  ORDER_STATUS_LABEL,
  type OrderDto,
} from "@/shared/lib";

const ROLE_LABEL: Record<string, string> = {
  BUYER: "Покупатель",
  SUPPLIER: "Продавец",
  MEDIATOR: "Посредник",
  ADMIN: "Администратор",
};

const ROLE_EMOJI: Record<string, string> = {
  BUYER: "bag",
  SUPPLIER: "store",
  MEDIATOR: "link",
  ADMIN: "crown",
};

const ROLE_GRADIENT: Record<string, string> = {
  BUYER: "from-fuchsia-400 via-rose-400 to-pink-400",
  SUPPLIER: "from-slate-500 via-zinc-500 to-stone-500",
  MEDIATOR: "from-sky-400 via-cyan-400 to-teal-400",
  ADMIN: "from-violet-500 via-purple-500 to-fuchsia-500",
};

const ROLE_BADGE_STYLE: Record<string, string> = {
  BUYER: "bg-gradient-to-r from-fuchsia-500 to-rose-500 text-white",
  SUPPLIER: "bg-gradient-to-r from-slate-600 to-zinc-500 text-white",
  MEDIATOR: "bg-gradient-to-r from-sky-500 to-cyan-500 text-white",
  ADMIN: "bg-gradient-to-r from-violet-500 to-purple-600 text-white",
};

interface Stats {
  cartCount: number;
  favoritesCount: number;
  ordersCount: number;
}

export default function ProfilePage() {
  const router = useRouter();
  const { user, hydrated, token } = useSession();
  const [me, setMe] = useState<MeDto | null>(null);
  const [recentOrders, setRecentOrders] = useState<OrderDto[]>([]);

  const [editing, setEditing] = useState(false);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [saveBusy, setSaveBusy] = useState(false);
  const [errors, setErrors] = useState<{
    firstName?: string;
    lastName?: string;
    avatarUrl?: string;
    form?: string;
  }>({});

  const [stats, setStats] = useState<Stats | null>(null);
  const [activeTab, setActiveTab] = useState<"overview" | "orders" | "settings">("overview");

  useEffect(() => {
    if (!hydrated) return;
    if (!user) {
      router.replace("/login?next=/profile");
      return;
    }
    fetchMe()
      .then((m) => {
        setMe(m);
        setFirstName(m.firstName ?? "");
        setLastName(m.lastName ?? "");
        setAvatarUrl(m.avatarUrl ?? "");
        if (m.marketplace) {
          setStats({
            cartCount: m.marketplace.cartCount,
            favoritesCount: m.marketplace.favoritesCount,
            ordersCount: m.marketplace.ordersCount,
          });
        }
      })
      .catch(() => undefined);
    void Promise.all([
      getCart().then((c) => c.count).catch(() => 0),
      getFavorites().then((l) => l.length).catch(() => 0),
      getMyOrders().then((o) => { setRecentOrders(o.slice(0, 3)); return o.length; }).catch(() => 0),
    ]).then(([cartCount, favoritesCount, ordersCount]) =>
      setStats({ cartCount, favoritesCount, ordersCount }),
    );
  }, [hydrated, user, router]);

  const canSubmit = useMemo(() => {
    if (!me) return false;
    return (
      firstName.trim() !== (me.firstName ?? "") ||
      lastName.trim() !== (me.lastName ?? "") ||
      avatarUrl.trim() !== (me.avatarUrl ?? "")
    );
  }, [firstName, lastName, avatarUrl, me]);

  const handleSave = useCallback(async (e: FormEvent) => {
    e.preventDefault();
    setErrors({});

    const parsed = updateProfileSchema.safeParse({
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      avatarUrl: avatarUrl.trim(),
    });
    if (!parsed.success) {
      const fe: typeof errors = {};
      for (const issue of parsed.error.issues) {
        const key = issue.path[0] as keyof typeof fe;
        if (!fe[key]) fe[key] = issue.message;
      }
      setErrors(fe);
      return;
    }

    const fn = nameSchema.safeParse(firstName.trim());
    const ln = nameSchema.safeParse(lastName.trim());
    if (!fn.success) {
      setErrors({ firstName: fn.error.issues[0]?.message ?? "Ошибка" });
      return;
    }
    if (!ln.success) {
      setErrors({ lastName: ln.error.issues[0]?.message ?? "Ошибка" });
      return;
    }

    setSaveBusy(true);
    try {
      const updated = await updateMe(parsed.data);
      setMe(updated);
      setEditing(false);
      if (token) {
        setSession(token, {
          id: updated.id,
          email: updated.email,
          firstName: updated.firstName,
          lastName: updated.lastName,
          role: updated.role,
          roles: updated.roles,
          avatarUrl: updated.avatarUrl,
        });
      }
    } catch (err) {
      setErrors({
        form: err instanceof ApiError ? err.payload.message : "Ошибка",
      });
    } finally {
      setSaveBusy(false);
    }
  }, [firstName, lastName, avatarUrl, me, token, errors]);

  function handleLogout() {
    clearSession();
    router.push("/");
  }

  const gradClass = me ? (ROLE_GRADIENT[me.role] ?? ROLE_GRADIENT.BUYER) : ROLE_GRADIENT.BUYER;

  /* ── Loading skeleton ── */
  if (!hydrated || !user || !me) {
    return (
      <div className="min-h-screen flex flex-col" style={{ background: "linear-gradient(135deg, #fdf4ff 0%, #fff1f2 50%, #fafaf9 100%)" }}>
        <SiteHeader />
        <div className="flex-1 max-w-4xl w-full mx-auto px-4 py-6 space-y-4">
          {/* Hero skeleton */}
          <div className="rounded-3xl overflow-hidden">
            <div className="h-32 sm:h-40 bg-gradient-to-r from-fuchsia-200/60 to-rose-200/60 animate-pulse" />
            <div className="bg-white p-5 pb-6 -mt-12 sm:-mt-14 relative">
              <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl bg-stone-200 animate-pulse border-4 border-white" />
              <div className="mt-3 space-y-2">
                <div className="h-6 w-40 bg-stone-200 rounded-lg animate-pulse" />
                <div className="h-4 w-28 bg-stone-100 rounded-lg animate-pulse" />
              </div>
            </div>
          </div>
          {/* Stats skeleton */}
          <div className="grid grid-cols-3 gap-3">
            {[0, 1, 2].map((i) => (
              <div key={i} className="h-24 rounded-2xl bg-white border border-border/40 animate-pulse" />
            ))}
          </div>
          {/* Links skeleton */}
          <div className="space-y-2">
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="h-16 rounded-2xl bg-white border border-border/40 animate-pulse" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  const initials = `${me.firstName?.[0] ?? ""}${me.lastName?.[0] ?? ""}`.toUpperCase();
  const memberSince = me.createdAt
    ? new Date(me.createdAt).toLocaleDateString("ru-RU", { month: "long", year: "numeric" })
    : null;

  return (
    <div className="min-h-screen flex flex-col" style={{ background: "linear-gradient(135deg, #fdf4ff 0%, #fff1f2 50%, #fafaf9 100%)" }}>
      <SiteHeader />

      <main className="flex-1 max-w-4xl w-full mx-auto px-4 py-4 sm:py-6 space-y-4 sm:space-y-5 pb-8">

        {/* ── Hero card ── */}
        <section className="relative rounded-3xl overflow-hidden bg-white border border-border/40 shadow-lg shadow-fuchsia-900/5 fade-in-up">
          {/* Gradient banner */}
          <div className={`h-28 sm:h-36 bg-gradient-to-r ${gradClass} relative overflow-hidden`}>
            <div className="absolute inset-0 opacity-20"
              style={{
                backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.4'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
              }}
            />
            {/* Decorative circles */}
            <div className="absolute -top-6 -right-6 w-28 h-28 rounded-full bg-white/10 blur-sm" />
            <div className="absolute -bottom-8 -left-8 w-36 h-36 rounded-full bg-white/5" />
            <div className="absolute top-4 right-4 w-16 h-16 rounded-full bg-white/10" />
          </div>

          {/* Content area */}
          <div className="relative px-4 sm:px-6 pb-5 sm:pb-6 -mt-12 sm:-mt-14">
            <div className="flex items-end gap-4 sm:gap-5">
              {/* Avatar */}
              <div className="relative shrink-0 group">
                <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl bg-white border-4 border-white shadow-xl flex items-center justify-center overflow-hidden text-2xl sm:text-3xl font-bold text-fuchsia-600 ring-2 ring-fuchsia-100/50">
                  {me.avatarUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={me.avatarUrl} alt={me.firstName} className="w-full h-full object-cover" />
                  ) : (
                    <span className="bg-gradient-to-br from-fuchsia-100 to-rose-50 w-full h-full flex items-center justify-center">
                      {initials || "?"}
                    </span>
                  )}
                </div>
                {!editing && (
                  <button
                    type="button"
                    onClick={() => setEditing(true)}
                    className="absolute -bottom-1 -right-1 w-8 h-8 rounded-xl bg-white text-fuchsia-600 border border-border/60 flex items-center justify-center hover:bg-fuchsia-50 transition shadow-md opacity-0 group-hover:opacity-100 sm:opacity-100"
                    title="Изменить профиль"
                  >
                    <Camera className="w-3.5 h-3.5" />
                  </button>
                )}
                {/* Online indicator */}
                <div className="absolute top-0 right-0 w-4 h-4 rounded-full bg-green-400 border-2 border-white shadow-sm" />
              </div>

              {/* Name + badges */}
              <div className="min-w-0 pb-1">
                <h1 className="text-lg sm:text-2xl font-extrabold tracking-tight text-foreground truncate">
                  {me.firstName} {me.lastName}
                </h1>
                <div className="mt-1 flex items-center gap-1.5 flex-wrap">
                  <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold shadow-sm ${ROLE_BADGE_STYLE[me.role] ?? ROLE_BADGE_STYLE.BUYER}`}>
                    {ROLE_LABEL[me.role] ?? me.role}
                  </span>
                  {me.emailVerified && (
                    <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-600 border border-emerald-100">
                      <BadgeCheck className="w-3 h-3" />
                      Верифицирован
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Contact info row */}
            {!editing && (
              <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-muted">
                {me.email && (
                  <div className="flex items-center gap-1.5">
                    <Mail className="w-3.5 h-3.5 text-fuchsia-500" />
                    <span className="truncate max-w-[200px]">{me.email}</span>
                  </div>
                )}
                {me.phone && (
                  <div className="flex items-center gap-1.5">
                    <Phone className="w-3.5 h-3.5 text-fuchsia-500" />
                    <span>{me.phone}</span>
                  </div>
                )}
                {memberSince && (
                  <div className="flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-fuchsia-500" />
                    <span>С {memberSince}</span>
                  </div>
                )}
              </div>
            )}

            {/* Inline edit form */}
            {editing && (
              <form onSubmit={handleSave} className="mt-4 space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <Field
                    label="Имя"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    error={errors.firstName}
                    required
                  />
                  <Field
                    label="Фамилия"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    error={errors.lastName}
                    required
                  />
                </div>
                <Field
                  label="URL аватара"
                  type="url"
                  placeholder="https://..."
                  value={avatarUrl}
                  onChange={(e) => setAvatarUrl(e.target.value)}
                  error={errors.avatarUrl}
                  hint="Ссылка на картинку (jpg, png). Пусто — стандартная."
                />
                {errors.form && (
                  <p className="text-sm text-danger">{errors.form}</p>
                )}
                <div className="flex gap-2 pt-1">
                  <Button type="submit" loading={saveBusy} disabled={!canSubmit}>
                    <Check className="w-4 h-4" />
                    Сохранить
                  </Button>
                  <button
                    type="button"
                    onClick={() => {
                      setEditing(false);
                      setFirstName(me.firstName ?? "");
                      setLastName(me.lastName ?? "");
                      setAvatarUrl(me.avatarUrl ?? "");
                      setErrors({});
                    }}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg border border-border hover:bg-stone-50 text-sm font-medium transition"
                  >
                    <X className="w-4 h-4" />
                    Отмена
                  </button>
                </div>
              </form>
            )}
          </div>
        </section>

        {/* ── Quick stats strip ── */}
        <section className="grid grid-cols-3 gap-2.5 sm:gap-3 fade-in-up" style={{ animationDelay: "0.08s" }}>
          <QuickStatCard
            icon={<ShoppingBag className="w-5 h-5" />}
            label="Корзина"
            value={stats?.cartCount ?? null}
            href="/cart"
            gradient="from-fuchsia-500 to-rose-500"
            bgLight="bg-fuchsia-50"
          />
          <QuickStatCard
            icon={<Heart className="w-5 h-5" />}
            label="Избранное"
            value={stats?.favoritesCount ?? null}
            href="/favorites"
            gradient="from-rose-400 to-pink-500"
            bgLight="bg-rose-50"
          />
          <QuickStatCard
            icon={<Package className="w-5 h-5" />}
            label="Заказы"
            value={stats?.ordersCount ?? null}
            href="/orders"
            gradient="from-violet-500 to-purple-500"
            bgLight="bg-violet-50"
          />
        </section>

        {/* ── Tab navigation (mobile-friendly) ── */}
        <div className="flex gap-1 bg-white rounded-2xl border border-border/40 p-1 shadow-sm fade-in-up" style={{ animationDelay: "0.12s" }}>
          {(["overview", "orders", "settings"] as const).map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => setActiveTab(tab)}
              className="relative flex-1 py-2.5 rounded-xl text-sm font-semibold overflow-hidden"
            >
              <span
                className="absolute inset-0 rounded-xl bg-gradient-to-r from-fuchsia-400 to-rose-400 shadow-md shadow-fuchsia-400/20 transition-opacity duration-300 ease-in-out"
                style={{ opacity: activeTab === tab ? 1 : 0 }}
              />
              <span className={`relative z-10 transition-colors duration-300 ease-in-out ${activeTab === tab ? "text-white" : "text-gray-400 hover:text-foreground"}`}>
                {tab === "overview" ? "Обзор" : tab === "orders" ? "Заказы" : "Настройки"}
              </span>
            </button>
          ))}
        </div>

        {/* ── Tab content ── */}
        {activeTab === "overview" && (
          <div className="space-y-4 sm:space-y-5 fade-in-up" style={{ animationDelay: "0.15s" }}>

            {/* Action grid — WB/Ozon style */}
            <section className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-3">
              <ActionTile
                href="/orders"
                icon={<Truck className="w-6 h-6" />}
                title="Доставки"
                subtitle={stats?.ordersCount ? `${stats.ordersCount} заказов` : "Нет заказов"}
                color="fuchsia"
              />
              <ActionTile
                href="/favorites"
                icon={<Heart className="w-6 h-6" />}
                title="Избранное"
                subtitle={stats?.favoritesCount ? `${stats.favoritesCount} товаров` : "Пусто"}
                color="rose"
              />
              <ActionTile
                href="/cart"
                icon={<ShoppingBag className="w-6 h-6" />}
                title="Корзина"
                subtitle={stats?.cartCount ? `${stats.cartCount} товаров` : "Пусто"}
                color="fuchsia"
              />
              <ActionTile
                href="/listings"
                icon={<Sparkles className="w-6 h-6" />}
                title="Каталог"
                subtitle="Все товары"
                color="violet"
              />
            </section>

            {/* Recent orders preview */}
            {recentOrders.length > 0 && (
              <section className="rounded-2xl border border-border/40 bg-white shadow-sm overflow-hidden">
                <div className="px-4 sm:px-5 pt-4 pb-3 flex items-center justify-between">
                  <h2 className="font-bold text-base">Последние заказы</h2>
                  <Link href="/orders" className="text-xs font-semibold text-fuchsia-600 hover:text-fuchsia-700 transition">
                    Все заказы
                    <ChevronRight className="w-3.5 h-3.5 inline ml-0.5" />
                  </Link>
                </div>
                <div className="divide-y divide-border/40">
                  {recentOrders.map((o) => (
                    <Link
                      key={o.id}
                      href={`/orders/${o.id}`}
                      className="flex items-center gap-3 px-4 sm:px-5 py-3 hover:bg-fuchsia-50/30 transition"
                    >
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${orderStatusBg(o.status)}`}>
                        <Package className="w-5 h-5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-semibold truncate">
                          {o.items.map((i) => i.title).join(", ")}
                        </div>
                        <div className="text-xs text-muted mt-0.5">
                          {new Date(o.createdAt).toLocaleDateString("ru-RU", { day: "numeric", month: "short" })}
                          {" "}&middot;{" "}
                          <span className={orderStatusTextColor(o.status)}>
                            {ORDER_STATUS_LABEL[o.status]}
                          </span>
                        </div>
                      </div>
                      <div className="text-sm font-bold shrink-0">
                        {formatPrice(o.totalAmount, o.currency)}
                      </div>
                    </Link>
                  ))}
                </div>
              </section>
            )}

            {/* Quick links list */}
            <section className="rounded-2xl border border-border/40 bg-white shadow-sm overflow-hidden divide-y divide-border/40">
              <ProfileLink
                href="/orders"
                icon={<Package className="w-5 h-5" />}
                title="Мои заказы"
                subtitle="История и отслеживание"
                iconBg="bg-fuchsia-50 text-fuchsia-600"
              />
              <ProfileLink
                href="/favorites"
                icon={<Heart className="w-5 h-5" />}
                title="Избранное"
                subtitle="Сохранённые товары"
                iconBg="bg-rose-50 text-rose-500"
              />
              <ProfileLink
                href="/cart"
                icon={<ShoppingBag className="w-5 h-5" />}
                title="Корзина"
                subtitle="Товары к покупке"
                iconBg="bg-fuchsia-50 text-fuchsia-600"
              />
              {canSell(me.role, me.roles) && (
                <ProfileLink
                  href="/my-listings"
                  icon={<Store className="w-5 h-5" />}
                  title="Мои товары"
                  subtitle="Управление магазином"
                  iconBg="bg-blue-50 text-blue-600"
                />
              )}
            </section>
          </div>
        )}

        {activeTab === "orders" && (
          <div className="space-y-3 fade-in-up">
            {recentOrders.length === 0 ? (
              <div className="text-center py-16 rounded-2xl bg-white border border-border/40">
                <div className="w-16 h-16 mx-auto rounded-2xl bg-fuchsia-50 flex items-center justify-center mb-4">
                  <Package className="w-8 h-8 text-fuchsia-400" />
                </div>
                <p className="font-semibold text-foreground">Заказов пока нет</p>
                <p className="text-sm text-muted mt-1">Ваши заказы появятся здесь</p>
                <Link href="/listings" className="inline-flex items-center gap-1 mt-4 text-sm font-semibold text-fuchsia-600 hover:text-fuchsia-700">
                  Перейти в каталог
                  <ChevronRight className="w-4 h-4" />
                </Link>
              </div>
            ) : (
              <>
                {recentOrders.map((o) => (
                  <Link
                    key={o.id}
                    href={`/orders/${o.id}`}
                    className="block rounded-2xl border border-border/40 bg-white p-4 hover:shadow-md hover:border-fuchsia-200/60 transition"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-lg text-xs font-semibold ${orderStatusBg(o.status)} ${orderStatusTextColor(o.status)}`}>
                            {ORDER_STATUS_LABEL[o.status]}
                          </span>
                          <span className="text-xs text-muted">
                            {new Date(o.createdAt).toLocaleDateString("ru-RU", { day: "numeric", month: "long" })}
                          </span>
                        </div>
                        <div className="mt-2 text-sm font-medium truncate">
                          {o.items.map((i) => i.title).join(", ")}
                        </div>
                        <div className="text-xs text-muted mt-1">
                          {o.items.length} товар(а) &middot; #{o.id.slice(0, 8)}
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <div className="text-lg font-bold">
                          {formatPrice(o.totalAmount, o.currency)}
                        </div>
                      </div>
                    </div>
                  </Link>
                ))}
                <Link
                  href="/orders"
                  className="block text-center py-3 rounded-2xl border border-dashed border-border/60 text-sm font-semibold text-fuchsia-600 hover:bg-fuchsia-50/50 transition"
                >
                  Посмотреть все заказы
                </Link>
              </>
            )}
          </div>
        )}

        {activeTab === "settings" && (
          <div className="space-y-4 fade-in-up">
            {/* Profile edit section */}
            <section className="rounded-2xl border border-border/40 bg-white shadow-sm overflow-hidden">
              <div className="px-4 sm:px-5 pt-4 pb-3 flex items-center justify-between">
                <h2 className="font-bold text-base">Личные данные</h2>
                {!editing && (
                  <button
                    type="button"
                    onClick={() => setEditing(true)}
                    className="inline-flex items-center gap-1 text-xs font-semibold text-fuchsia-600 hover:text-fuchsia-700 transition"
                  >
                    <Pencil className="w-3.5 h-3.5" />
                    Изменить
                  </button>
                )}
              </div>
              <div className="px-4 sm:px-5 pb-5">
                {!editing ? (
                  <div className="space-y-3">
                    <SettingsRow icon={<Mail className="w-4 h-4" />} label="Email" value={me.email ?? "Не указан"} />
                    <SettingsRow icon={<Phone className="w-4 h-4" />} label="Телефон" value={me.phone ?? "Не указан"} />
                    <SettingsRow icon={<Calendar className="w-4 h-4" />} label="Дата регистрации" value={memberSince ?? "—"} />
                    <SettingsRow
                      icon={<BadgeCheck className="w-4 h-4" />}
                      label="Статус"
                      value={me.emailVerified ? "Подтверждён" : "Не подтверждён"}
                      valueClass={me.emailVerified ? "text-emerald-600" : "text-fuchsia-600"}
                    />
                  </div>
                ) : (
                  <form onSubmit={handleSave} className="space-y-3">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <Field
                        label="Имя"
                        value={firstName}
                        onChange={(e) => setFirstName(e.target.value)}
                        error={errors.firstName}
                        required
                      />
                      <Field
                        label="Фамилия"
                        value={lastName}
                        onChange={(e) => setLastName(e.target.value)}
                        error={errors.lastName}
                        required
                      />
                    </div>
                    <Field
                      label="URL аватара"
                      type="url"
                      placeholder="https://..."
                      value={avatarUrl}
                      onChange={(e) => setAvatarUrl(e.target.value)}
                      error={errors.avatarUrl}
                      hint="Ссылка на картинку (jpg, png). Пусто — стандартная."
                    />
                    {errors.form && <p className="text-sm text-danger">{errors.form}</p>}
                    <div className="flex gap-2 pt-1">
                      <Button type="submit" loading={saveBusy} disabled={!canSubmit}>
                        <Check className="w-4 h-4" /> Сохранить
                      </Button>
                      <button
                        type="button"
                        onClick={() => {
                          setEditing(false);
                          setFirstName(me.firstName ?? "");
                          setLastName(me.lastName ?? "");
                          setAvatarUrl(me.avatarUrl ?? "");
                          setErrors({});
                        }}
                        className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg border border-border hover:bg-stone-50 text-sm font-medium transition"
                      >
                        <X className="w-4 h-4" /> Отмена
                      </button>
                    </div>
                  </form>
                )}
              </div>
            </section>

            {/* Notification settings */}
            <NotificationsSection />

            {/* Account actions */}
            <section className="rounded-2xl border border-border/40 bg-white shadow-sm overflow-hidden divide-y divide-border/40">
              <ProfileLink
                href="/forgot"
                icon={<Shield className="w-5 h-5" />}
                title="Сменить пароль"
                subtitle="Через код подтверждения"
                iconBg="bg-violet-50 text-violet-600"
              />
              {!canSell(me.role, me.roles) && (
                <ProfileLink
                  href="/seller"
                  icon={<Store className="w-5 h-5" />}
                  title="Стать продавцом"
                  subtitle="Начните продавать на Globox"
                  iconBg="bg-blue-50 text-blue-600"
                />
              )}
              <ProfileLink
                href="/privacy"
                icon={<HelpCircle className="w-5 h-5" />}
                title="Политика конфиденциальности"
                subtitle="Условия использования"
                iconBg="bg-stone-100 text-stone-500"
              />
            </section>

            {/* Logout */}
            <button
              type="button"
              onClick={handleLogout}
              className="w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl border border-red-200/60 bg-white text-red-500 hover:bg-red-50 transition font-semibold text-sm shadow-sm"
            >
              <LogOut className="w-4 h-4" />
              Выйти из аккаунта
            </button>
          </div>
        )}

      </main>
    </div>
  );
}

/* ── Notifications Section ── */

type NotifChannel = "TELEGRAM" | "VK" | "MAX";

interface NotifSub { channel: NotifChannel; active: boolean }

function TgIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 48 48" fill="none">
      <path d="M38.8 10.4L34.2 36.8c-.3 1.6-1.2 2-2.5 1.2l-6.8-5-3.3 3.2c-.4.4-.7.7-1.4.7l.5-7L33.5 18c.5-.5-.1-.7-.8-.3L16.9 27.8l-6.6-2.1c-1.4-.4-1.5-1.4.3-2.1l25.8-10c1.2-.4 2.2.3 1.8 2.1l.6-5.3z" fill="currentColor" />
    </svg>
  );
}

function VkIconSmall({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 48 48" fill="none">
      <path d="M25.54 34.58c-10.94 0-17.18-7.5-17.44-19.98h5.48c.18 9.14 4.2 13.02 7.4 13.82V14.6h5.16v7.88c3.16-.34 6.48-3.94 7.6-7.88h5.16c-.86 4.86-4.46 8.46-7.02 9.94 2.56 1.2 6.64 4.36 8.2 10.04h-5.68c-1.22-3.82-4.28-6.78-8.26-7.18v7.18h-.6z" fill="currentColor" />
    </svg>
  );
}

const NOTIF_CHANNELS: { id: NotifChannel; name: string; desc: string; color: string; iconBg: string; icon: React.ReactNode }[] = [
  {
    id: "TELEGRAM",
    name: "Telegram",
    desc: "Уведомления через Telegram-бот",
    color: "#26A5E4",
    iconBg: "bg-[#26A5E4]",
    icon: <TgIcon className="w-6 h-6 text-white" />,
  },
  {
    id: "VK",
    name: "ВКонтакте",
    desc: "Уведомления через сообщество ВК",
    color: "#0077FF",
    iconBg: "bg-[#0077FF]",
    icon: <VkIconSmall className="w-6 h-6 text-white" />,
  },
  {
    id: "MAX",
    name: "Max",
    desc: "Уведомления через бот в Max",
    color: "#8B5CF6",
    iconBg: "bg-purple-500",
    // eslint-disable-next-line @next/next/no-img-element
    icon: <img src="/max-icon.png" alt="Max" className="w-10 h-10 object-contain" />,
  },
];

function NotificationsSection() {
  const [subs, setSubs] = useState<NotifSub[]>([]);
  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState<NotifChannel | null>(null);
  const [disconnecting, setDisconnecting] = useState<NotifChannel | null>(null);
  const [vkToken, setVkToken] = useState<string | null>(null);

  const fetchSubs = useCallback(async () => {
    try {
      const data = await api.get<NotifSub[]>("/notifications/my");
      setSubs(data);
    } catch { /* ignore */ }
  }, []);

  useEffect(() => { fetchSubs().finally(() => setLoading(false)); }, [fetchSubs]);

  const handleConnect = async (ch: typeof NOTIF_CHANNELS[0]) => {
    if (connecting || disconnecting) return;
    setConnecting(ch.id);
    setVkToken(null);
    try {
      const res = await api.post<{ link: string; token: string }>(`/notifications/link/${ch.id}`, {});
      if (ch.id === "VK" && res.token) setVkToken(res.token);
      window.open(res.link, "_blank", "noopener");
      let attempts = 0;
      const poll = setInterval(async () => {
        attempts++;
        try {
          const fresh = await api.get<NotifSub[]>("/notifications/my");
          setSubs(fresh);
          const found = fresh.find((s) => s.channel === ch.id && s.active);
          if (found || attempts > 30) { clearInterval(poll); setConnecting(null); }
        } catch { clearInterval(poll); setConnecting(null); }
      }, 3000);
      setTimeout(() => { clearInterval(poll); setConnecting(null); }, 90_000);
    } catch { setConnecting(null); }
  };

  const handleDisconnect = async (channel: NotifChannel) => {
    if (connecting || disconnecting) return;
    setDisconnecting(channel);
    try {
      await api.del(`/notifications/${channel}`);
      setSubs((prev) => prev.filter((s) => s.channel !== channel));
    } catch { /* ignore */ }
    setDisconnecting(null);
  };

  const isActive = (ch: NotifChannel) => subs.some((s) => s.channel === ch && s.active);

  return (
    <section className="rounded-2xl border border-border/40 bg-white shadow-sm overflow-hidden">
      <div className="px-4 sm:px-5 pt-4 pb-3 flex items-center gap-2">
        <Bell className="w-4 h-4 text-fuchsia-500" />
        <h2 className="font-bold text-base">Уведомления</h2>
        {!loading && subs.filter((s) => s.active).length > 0 && (
          <span className="ml-auto text-[11px] font-semibold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-600 border border-emerald-200/60">
            {subs.filter((s) => s.active).length} подкл.
          </span>
        )}
      </div>

      {loading ? (
        <div className="flex justify-center py-6">
          <Loader2 className="w-5 h-5 animate-spin text-muted" />
        </div>
      ) : (
        <div className="px-4 sm:px-5 pb-4 space-y-2">
          {NOTIF_CHANNELS.map((ch) => {
            const active = isActive(ch.id);
            const isConn = connecting === ch.id;
            const isDisconn = disconnecting === ch.id;
            return (
              <div
                key={ch.id}
                className={`flex items-center gap-3 rounded-xl border px-3 py-3 transition-all ${
                  active ? "border-emerald-200/70 bg-emerald-50/40" : "border-border/40 bg-stone-50/50"
                } ${isDisconn ? "opacity-50" : ""}`}
              >
                <div className={`w-10 h-10 rounded-xl ${ch.iconBg} flex items-center justify-center shrink-0 shadow-sm overflow-hidden`}>
                  {ch.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <p className="font-semibold text-sm text-foreground">{ch.name}</p>
                    {active && (
                      <span className="flex items-center gap-0.5 text-[10px] px-1.5 py-0.5 rounded-full bg-emerald-100 text-emerald-700 font-medium">
                        <Check className="w-2.5 h-2.5" /> Подключено
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-muted">{ch.desc}</p>
                </div>
                {active ? (
                  <button
                    onClick={() => handleDisconnect(ch.id)}
                    disabled={!!disconnecting || !!connecting}
                    className="shrink-0 px-3 py-1.5 rounded-lg border border-red-200/60 bg-red-50 text-red-500 text-xs font-semibold hover:bg-red-100 transition disabled:opacity-50 flex items-center gap-1"
                  >
                    {isDisconn ? <Loader2 className="w-3 h-3 animate-spin" /> : <X className="w-3 h-3" />}
                    Отключить
                  </button>
                ) : (
                  <button
                    onClick={() => handleConnect(ch)}
                    disabled={!!connecting || !!disconnecting}
                    className="shrink-0 px-3 py-1.5 rounded-lg text-white text-xs font-semibold transition disabled:opacity-50 flex items-center gap-1 active:scale-[0.97]"
                    style={{ backgroundColor: ch.color }}
                  >
                    {isConn ? <Loader2 className="w-3 h-3 animate-spin" /> : null}
                    {isConn ? "Ожидание..." : "Подключить"}
                  </button>
                )}
              </div>
            );
          })}

          {vkToken && connecting === "VK" && (
            <div className="bg-blue-50 rounded-xl px-4 py-3 border border-blue-100 space-y-1.5">
              <p className="text-xs font-semibold text-blue-700">Отправьте этот код боту ВК:</p>
              <div className="flex items-center gap-2">
                <code className="flex-1 bg-white rounded-lg px-3 py-1.5 text-xs font-mono border border-blue-100 select-all break-all">{vkToken}</code>
                <button
                  onClick={() => navigator.clipboard.writeText(vkToken)}
                  className="px-2.5 py-1.5 rounded-lg bg-[#0077FF] text-white text-[11px] font-medium shrink-0"
                >
                  Копировать
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </section>
  );
}

/* ── Quick Stat Card ── */

function QuickStatCard({
  icon,
  label,
  value,
  href,
  gradient,
  bgLight,
}: {
  icon: React.ReactNode;
  label: string;
  value: number | null;
  href: string;
  gradient: string;
  bgLight: string;
}) {
  return (
    <Link
      href={href}
      className="group relative rounded-2xl border border-border/40 bg-white p-3.5 sm:p-4 hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300 overflow-hidden"
    >
      <div className={`absolute inset-0 bg-gradient-to-br ${gradient} opacity-0 group-hover:opacity-[0.04] transition-opacity`} />
      <div className={`w-10 h-10 rounded-xl ${bgLight} flex items-center justify-center mb-2.5`}>
        <span className={`bg-gradient-to-br ${gradient} bg-clip-text text-transparent`}>{icon}</span>
      </div>
      <div className="text-2xl sm:text-3xl font-extrabold text-foreground tabular-nums leading-none">
        {value === null ? <span className="text-border">—</span> : value}
      </div>
      <div className="text-xs text-muted mt-1 font-medium">{label}</div>
    </Link>
  );
}

/* ── Action Tile (WB/Ozon grid style) ── */

function ActionTile({
  href,
  icon,
  title,
  subtitle,
  color,
}: {
  href: string;
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  color: "fuchsia" | "rose" | "amber" | "violet";
}) {
  const styles: Record<string, { bg: string; iconColor: string }> = {
    fuchsia: { bg: "bg-fuchsia-50", iconColor: "text-fuchsia-500" },
    rose: { bg: "bg-rose-50", iconColor: "text-rose-500" },
    amber: { bg: "bg-fuchsia-50", iconColor: "text-fuchsia-500" },
    violet: { bg: "bg-violet-50", iconColor: "text-violet-500" },
  };
  const s = styles[color];
  return (
    <Link
      href={href}
      className="group rounded-2xl border border-border/40 bg-white p-3.5 sm:p-4 hover:bg-fuchsia-50/60 hover:border-fuchsia-200/60 hover:shadow-md hover:-translate-y-0.5 transition-all duration-300"
    >
      <div className={`w-11 h-11 rounded-xl ${s.bg} ${s.iconColor} flex items-center justify-center mb-2 group-hover:scale-110 transition-transform`}>
        {icon}
      </div>
      <div className="text-sm font-bold text-foreground leading-tight">{title}</div>
      <div className="text-[11px] text-muted mt-0.5 leading-snug">{subtitle}</div>
    </Link>
  );
}

/* ── Profile Link Row ── */

function ProfileLink({
  href,
  icon,
  title,
  subtitle,
  iconBg = "bg-fuchsia-50 text-fuchsia-600",
}: {
  href: string;
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  iconBg?: string;
}) {
  return (
    <Link
      href={href}
      className="group flex items-center gap-3.5 px-4 sm:px-5 py-3.5 hover:bg-fuchsia-50/30 active:bg-fuchsia-50/50 transition"
    >
      <div className={`w-10 h-10 rounded-xl ${iconBg} flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform`}>
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <div className="font-semibold text-sm">{title}</div>
        <div className="text-xs text-muted mt-0.5">{subtitle}</div>
      </div>
      <ChevronRight className="w-4 h-4 text-muted/40 group-hover:text-muted group-hover:translate-x-0.5 transition-all" />
    </Link>
  );
}

/* ── Settings Row ── */

function SettingsRow({
  icon,
  label,
  value,
  valueClass,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  valueClass?: string;
}) {
  return (
    <div className="flex items-center gap-3 py-2 border-b border-border/30 last:border-0">
      <div className="w-8 h-8 rounded-lg bg-stone-50 flex items-center justify-center text-muted shrink-0">
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-xs text-muted">{label}</div>
        <div className={`text-sm font-medium truncate ${valueClass ?? ""}`}>{value}</div>
      </div>
    </div>
  );
}

/* ── Helpers ── */

function orderStatusBg(status: string): string {
  switch (status) {
    case "PENDING": return "bg-amber-50 text-amber-600";
    case "CONFIRMED": return "bg-blue-50 text-blue-600";
    case "SHIPPED": return "bg-indigo-50 text-indigo-600";
    case "DELIVERED": return "bg-emerald-50 text-emerald-600";
    case "CANCELLED": return "bg-stone-100 text-stone-400";
    default: return "bg-stone-100 text-stone-500";
  }
}

function orderStatusTextColor(status: string): string {
  switch (status) {
    case "PENDING": return "text-amber-600";
    case "CONFIRMED": return "text-blue-600";
    case "SHIPPED": return "text-indigo-600";
    case "DELIVERED": return "text-emerald-600";
    case "CANCELLED": return "text-stone-400";
    default: return "text-stone-500";
  }
}
