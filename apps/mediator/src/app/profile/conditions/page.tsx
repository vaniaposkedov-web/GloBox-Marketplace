"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft, CheckCircle2, Save, X, Eye, Zap, AlertCircle,
  Phone, Mail,
} from "lucide-react";
import { useMediator } from "@/hooks/useMediator";
import { api } from "@/lib/api";

// ── Constants ─────────────────────────────────────────────────────────────────

type BadgeKey = "rating" | "commission" | "orders" | "minOrder" | "rank";

const BADGE_META: Record<BadgeKey, { label: string; icon: string }> = {
  rating:     { label: "Рейтинг",    icon: "★" },
  commission: { label: "Комиссия",   icon: "%" },
  orders:     { label: "Заказов",    icon: "✓" },
  minOrder:   { label: "Мин. заказ", icon: "₽" },
  rank:       { label: "Место",      icon: "🏆" },
};

const CAT_TAGS = [
  "Одежда", "Электроника", "Косметика", "Детские товары",
  "Спорт", "Дом и сад", "Авто", "Книги", "Игрушки", "Продукты",
];

const HIGHLIGHTS = [
  { id: "h1",  emoji: "⚡", text: "Отвечаю в течение часа" },
  { id: "h2",  emoji: "📸", text: "Отправляю фотоотчёт перед покупкой" },
  { id: "h3",  emoji: "🛡️", text: "Гарантирую оригинальность товара" },
  { id: "h4",  emoji: "💰", text: "Найду товар дешевле аналогов" },
  { id: "h5",  emoji: "🚀", text: "Оформляю заказ в день обращения" },
  { id: "h6",  emoji: "🔄", text: "Помогаю с возвратом и обменом" },
  { id: "h7",  emoji: "🌍", text: "Работаю с зарубежными площадками" },
  { id: "h8",  emoji: "📦", text: "Принимаю групповые заказы" },
  { id: "h9",  emoji: "🎯", text: "Подберу аналог по вашему запросу" },
  { id: "h10", emoji: "💬", text: "На связи 24/7" },
];

const MIN_ORDER_PRESETS = [500, 1000, 2000, 5000];

interface CardCfg {
  compactBadges: BadgeKey[];
  negotiableRate: boolean;
  tags: string[];
  highlights: string[];
}

const DEFAULT_CFG: CardCfg = {
  compactBadges: ["rating", "commission", "orders"],
  negotiableRate: false,
  tags: [],
  highlights: [],
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function getBadgeValue(key: BadgeKey, commission: number, negotiable: boolean, minOrder: number, orders: number, rating: number, rank: number | null, total: number) {
  if (key === "rating")     return `${rating.toFixed(1)} ★`;
  if (key === "commission") return negotiable ? "Договорная" : `${commission}%`;
  if (key === "minOrder")   return `от ${minOrder.toLocaleString("ru-RU")} ₽`;
  if (key === "rank")       return rank ? `#${rank} в рейтинге` : "—";
  return `${orders} заказ.`;
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function ConditionsPage() {
  const router = useRouter();
  const { profile, user, loading } = useMediator();

  const [cfg, setCfg]               = useState<CardCfg>(DEFAULT_CFG);
  const [description, setDescr]     = useState("");
  const [commission, setCommission] = useState(5);
  const [minOrder, setMinOrder]     = useState(1000);
  const [customMin, setCustomMin]   = useState(false);
  const [customMinVal, setCustomMinVal] = useState("");
  const [saving, setSaving]         = useState(false);
  const [saved, setSaved]           = useState(false);
  const [mobilePreview, setMobilePreview] = useState(false);
  const [expandPreview, setExpandPreview] = useState(false);
  const [myRank, setMyRank]         = useState<number | null>(null);
  const [totalMediators, setTotal]  = useState(0);

  useEffect(() => {
    api.get<{ myRank: number | null; total: number }>("/mediator/leaderboard")
      .then((d) => { setMyRank(d.myRank); setTotal(d.total); })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!profile) return;
    const base = profile.cardConfig as Partial<CardCfg> | null;
    setCfg({ ...DEFAULT_CFG, ...(base ?? {}) });
    setDescr(profile.description ?? (base as any)?.description ?? "");
    setCommission(Number(profile.commissionRate) || 5);
    setMinOrder(Number(profile.minOrderAmount) || 1000);
    if (base?.negotiableRate) setCfg((p) => ({ ...p, negotiableRate: true }));
  }, [profile]);

  const upd = (patch: Partial<CardCfg>) => setCfg((p) => ({ ...p, ...patch }));

  const toggleBadge = (key: BadgeKey) => {
    const cur = cfg.compactBadges;
    if (cur.includes(key)) upd({ compactBadges: cur.filter((k) => k !== key) });
    else if (cur.length < 3) upd({ compactBadges: [...cur, key] });
  };

  const toggleTag = (t: string) => {
    const cur = cfg.tags;
    upd({ tags: cur.includes(t) ? cur.filter((x) => x !== t) : [...cur, t] });
  };

  const toggleHL = (id: string) => {
    const cur = cfg.highlights;
    if (cur.includes(id)) { upd({ highlights: cur.filter((x) => x !== id) }); return; }
    if (cur.length >= 3) return;
    upd({ highlights: [...cur, id] });
  };

  const resolvedMin = customMin ? (parseInt(customMinVal) || minOrder) : minOrder;

  const isDescOk = description.trim().length >= 20;
  const isCommOk = cfg.negotiableRate || commission > 0;
  const isConfigured = isDescOk && isCommOk;

  const save = async () => {
    setSaving(true);
    try {
      const finalMin = resolvedMin;
      await Promise.all([
        api.patch("/mediator/card-config", {
          description,
          cardConfig: { ...cfg, description },
        }),
        api.patch("/mediator/settings", {
          commissionRate: cfg.negotiableRate ? 0 : commission,
          minOrderAmount: finalMin,
        }),
      ]);
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch {
      /* ignore */
    } finally {
      setSaving(false);
    }
  };

  const displayName = `${profile?.firstName ?? user?.firstName ?? ""} ${profile?.lastName ?? user?.lastName ?? ""}`.trim() || "Посредник";
  const avatarUrl   = profile?.avatarUrl ?? null;
  const orders      = profile?.completedOrdersCount ?? 0;
  const rating      = profile?.rating ? Number(profile.rating) : 4.8;

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-foreground border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const previewData = { displayName, avatarUrl, commission, negotiable: cfg.negotiableRate, minOrder: resolvedMin, orders, rating, rank: myRank, total: totalMediators };

  return (
    <div className="min-h-screen bg-background">

      {/* ── Header ── */}
      <div className="sticky top-0 z-40 bg-card/95 backdrop-blur-lg border-b border-border px-4 h-14 flex items-center gap-3">
        <button onClick={() => router.back()} className="p-1.5 rounded-lg hover:bg-accent transition shrink-0">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="text-lg font-bold flex-1">Моя карточка</h1>
        {!isConfigured && (
          <span className="hidden sm:flex items-center gap-1 text-[11px] text-warning bg-warning/10 px-2.5 py-1 rounded-full font-medium">
            <AlertCircle className="w-3 h-3" /> Не заполнена
          </span>
        )}
        <button
          onClick={() => setMobilePreview(true)}
          className="lg:hidden flex items-center gap-1.5 text-sm text-primary font-medium px-3 py-1.5 rounded-lg hover:bg-primary/10 transition"
        >
          <Eye className="w-4 h-4" /> Превью
        </button>
        <button
          onClick={save}
          disabled={saving}
          className="flex items-center gap-1.5 text-sm font-bold px-4 py-2 rounded-xl bg-primary text-white hover:bg-primary-hover transition disabled:opacity-60 shrink-0"
        >
          {saved ? <><CheckCircle2 className="w-4 h-4" /> Сохранено</> : <><Save className="w-4 h-4" /> {saving ? "…" : "Сохранить"}</>}
        </button>
      </div>

      {/* ── Body ── */}
      <div className="flex items-start gap-6 max-w-5xl mx-auto px-4 pt-5 pb-28">

        {/* ═══ EDITOR ═══ */}
        <div className="flex-1 space-y-4 min-w-0">

          {/* Required banner */}
          {!isConfigured && (
            <div className="bg-warning/8 border border-warning/30 rounded-2xl px-4 py-3.5 flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-warning mt-0.5 shrink-0" />
              <div>
                <p className="text-sm font-semibold text-warning">Заполните карточку для приёма заказов</p>
                <p className="text-xs text-muted mt-0.5">Минимум: описание (≥ 20 символов) и процент комиссии.</p>
              </div>
            </div>
          )}

          {/* ─── 1. Compact card ─── */}
          <EditorSection num="1" title="Компактная карточка" subtitle="Так выглядит ваша карточка в каталоге">
            <div className="mb-4 bg-accent rounded-2xl p-1.5">
              <p className="text-[10px] text-muted text-center py-1 uppercase tracking-widest">Превью</p>
              <CompactCard data={previewData} cfg={cfg} />
            </div>
            <p className="text-xs text-muted mb-2.5">Выберите до <span className="font-semibold text-foreground">3 значков</span> — фото и имя показываются всегда:</p>
            <div className="flex flex-wrap gap-2">
              {(Object.keys(BADGE_META) as BadgeKey[]).map((key) => {
                const sel = cfg.compactBadges.includes(key);
                const pos = cfg.compactBadges.indexOf(key);
                const disabled = !sel && cfg.compactBadges.length >= 3;
                return (
                  <button
                    key={key}
                    onClick={() => toggleBadge(key)}
                    disabled={disabled}
                    className={`relative flex items-center gap-1.5 pl-3 pr-4 py-2 rounded-full border text-sm font-medium transition ${
                      sel ? "bg-primary text-white border-primary shadow-sm"
                        : disabled ? "bg-accent text-muted border-border opacity-40 cursor-not-allowed"
                        : "bg-card text-foreground border-border hover:border-primary/50 hover:bg-primary/5"
                    }`}
                  >
                    <span className={`text-base leading-none ${sel ? "text-white/80" : "text-warning"}`}>{BADGE_META[key].icon}</span>
                    {BADGE_META[key].label}
                    {sel && (
                      <span className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-foreground text-background text-[9px] font-black flex items-center justify-center border-2 border-card">
                        {pos + 1}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </EditorSection>

          {/* ─── 2. Commission ─── */}
          <EditorSection
            num="2"
            title="Комиссия за работу"
            subtitle="Сколько процентов от суммы заказа вы берёте"
            required
            filled={isCommOk}
          >
            <div className="space-y-4">
              {/* Negotiable toggle */}
              <button
                onClick={() => upd({ negotiableRate: !cfg.negotiableRate })}
                className={`w-full flex items-center justify-between px-4 py-3 rounded-xl border text-sm transition ${
                  cfg.negotiableRate ? "bg-primary/8 border-primary/30" : "bg-accent border-border"
                }`}
              >
                <div className="text-left">
                  <p className="font-semibold text-sm">Договорная</p>
                  <p className="text-[11px] text-muted mt-0.5">Процент обсуждается индивидуально с каждым клиентом</p>
                </div>
                <div className={`w-11 h-6 rounded-full transition-colors shrink-0 relative ${cfg.negotiableRate ? "bg-primary" : "bg-border"}`}>
                  <div className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${cfg.negotiableRate ? "translate-x-5" : "translate-x-0.5"}`} />
                </div>
              </button>

              {/* Slider */}
              {!cfg.negotiableRate && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted">0%</span>
                    <span className="text-2xl font-black text-primary">{commission}%</span>
                    <span className="text-xs text-muted">20%</span>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={20}
                    step={0.5}
                    value={commission}
                    onChange={(e) => setCommission(Number(e.target.value))}
                    className="w-full h-2 rounded-full appearance-none cursor-pointer accent-primary bg-accent"
                  />
                  <div className="flex justify-between">
                    {[0, 5, 10, 15, 20].map((v) => (
                      <button
                        key={v}
                        onClick={() => setCommission(v)}
                        className={`text-[11px] px-2 py-1 rounded-lg transition ${
                          commission === v ? "bg-primary text-white font-bold" : "text-muted hover:text-foreground"
                        }`}
                      >
                        {v}%
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </EditorSection>

          {/* ─── 3. Min order ─── */}
          <EditorSection num="3" title="Минимальная сумма заказа" subtitle="С какой суммы вы готовы работать">
            <div className="space-y-3">
              <div className="flex flex-wrap gap-2">
                {MIN_ORDER_PRESETS.map((v) => (
                  <button
                    key={v}
                    onClick={() => { setMinOrder(v); setCustomMin(false); }}
                    className={`px-4 py-2 rounded-xl border text-sm font-semibold transition ${
                      !customMin && minOrder === v
                        ? "bg-primary text-white border-primary"
                        : "bg-accent border-border text-muted hover:border-primary/40 hover:text-foreground"
                    }`}
                  >
                    {v.toLocaleString("ru-RU")} ₽
                  </button>
                ))}
                <button
                  onClick={() => setCustomMin(true)}
                  className={`px-4 py-2 rounded-xl border text-sm font-semibold transition ${
                    customMin ? "bg-primary text-white border-primary" : "bg-accent border-border text-muted hover:border-primary/40"
                  }`}
                >
                  Другая
                </button>
              </div>
              {customMin && (
                <div className="flex items-center gap-2 bg-accent rounded-xl px-4 py-2 border border-primary/30">
                  <input
                    type="number"
                    min={0}
                    value={customMinVal}
                    onChange={(e) => setCustomMinVal(e.target.value)}
                    placeholder="Введите сумму"
                    className="flex-1 bg-transparent text-sm outline-none"
                  />
                  <span className="text-sm text-muted font-medium">₽</span>
                </div>
              )}
              {!customMin && (
                <p className="text-xs text-muted">Вы готовы работать с заказами от <span className="font-semibold text-foreground">{minOrder.toLocaleString("ru-RU")} ₽</span></p>
              )}
            </div>
          </EditorSection>

          {/* ─── 4. Description ─── */}
          <EditorSection
            num="4"
            title="Описание"
            subtitle="Расскажите о себе — покупатели читают это перед выбором"
            required
            filled={isDescOk}
          >
            <textarea
              value={description}
              onChange={(e) => setDescr(e.target.value)}
              placeholder="Пример: Работаю с Wildberries и Ozon уже 3 года. Помогу выбрать товар, отслежу заказ и решу спорные ситуации. Отвечаю быстро, работаю в выходные."
              rows={4}
              maxLength={500}
              className={`w-full bg-accent rounded-xl px-4 py-3 text-sm resize-none focus:outline-none focus:ring-2 placeholder:text-muted leading-relaxed transition ${
                description.length > 0 && !isDescOk ? "ring-2 ring-warning/50" : "focus:ring-primary/40"
              }`}
            />
            <div className="flex items-center justify-between mt-1">
              {description.length > 0 && !isDescOk ? (
                <p className="text-[11px] text-warning">Минимум 20 символов ({20 - description.trim().length} ещё)</p>
              ) : (
                <span />
              )}
              <p className="text-[11px] text-muted">{description.length}/500</p>
            </div>
          </EditorSection>

          {/* ─── 5. Tags ─── */}
          <EditorSection num="5" title="Специализация" subtitle="Категории товаров, с которыми вы работаете">
            <div className="flex flex-wrap gap-2">
              {CAT_TAGS.map((t) => (
                <button
                  key={t}
                  onClick={() => toggleTag(t)}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium border transition ${
                    cfg.tags.includes(t)
                      ? "bg-primary text-white border-primary"
                      : "bg-accent text-muted border-border hover:border-primary/40 hover:text-foreground"
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
            {cfg.tags.length > 0 && (
              <p className="text-[11px] text-primary mt-2">Выбрано: {cfg.tags.join(", ")}</p>
            )}
          </EditorSection>

          {/* ─── 6. Highlights ─── */}
          <EditorSection
            num="6"
            title="Преимущества"
            subtitle="Ключевые плюсы — выберите до 3, покупатели видят их первыми"
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {HIGHLIGHTS.map((h) => {
                const sel = cfg.highlights.includes(h.id);
                const maxReached = cfg.highlights.length >= 3 && !sel;
                return (
                  <button
                    key={h.id}
                    onClick={() => toggleHL(h.id)}
                    disabled={maxReached}
                    className={`flex items-center gap-3 px-4 py-3 rounded-xl border text-sm transition text-left ${
                      sel ? "bg-success/8 border-success/40 text-foreground"
                        : maxReached ? "bg-accent border-border text-muted opacity-40 cursor-not-allowed"
                        : "bg-accent border-border text-muted hover:border-success/30 hover:text-foreground"
                    }`}
                  >
                    <span className="text-xl leading-none">{h.emoji}</span>
                    <span className="flex-1 text-[13px]">{h.text}</span>
                    <div className={`w-5 h-5 rounded-full border-2 shrink-0 flex items-center justify-center transition ${
                      sel ? "bg-success border-success" : "border-border"
                    }`}>
                      {sel && (
                        <svg viewBox="0 0 10 10" className="w-3 h-3">
                          <path d="M1.5 5L3.8 7.5L8.5 2.5" stroke="white" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
            <div className="flex items-center justify-between mt-2">
              <p className="text-[11px] text-muted">Выбрано: {cfg.highlights.length}/3</p>
              {cfg.highlights.length === 3 && (
                <p className="text-[11px] text-success font-medium">Максимум выбран</p>
              )}
            </div>
          </EditorSection>

          {/* ─── Save ─── */}
          <button
            onClick={save}
            disabled={saving}
            className="w-full py-4 rounded-2xl bg-primary text-white font-bold text-sm flex items-center justify-center gap-2 hover:bg-primary-hover transition active:scale-[0.98] disabled:opacity-60"
          >
            {saved ? (
              <><CheckCircle2 className="w-5 h-5" /> Изменения сохранены</>
            ) : (
              <><Save className="w-5 h-5" /> {saving ? "Сохранение…" : "Сохранить карточку"}</>
            )}
          </button>

        </div>

        {/* ═══ STICKY PREVIEW (desktop) ═══ */}
        <div className="hidden lg:block w-75 shrink-0">
          <div className="sticky top-20 space-y-5">
            <p className="text-[10px] text-muted uppercase tracking-widest text-center font-semibold">Компактная</p>
            <CompactCard data={previewData} cfg={cfg} />
            <p className="text-[10px] text-muted uppercase tracking-widest text-center font-semibold">Полная карточка</p>
            <FullCard data={previewData} cfg={cfg} description={description} expanded={expandPreview} onExpand={() => setExpandPreview((p) => !p)} />
          </div>
        </div>

      </div>

      {/* ── Mobile preview modal ── */}
      {mobilePreview && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm overflow-y-auto" onClick={() => setMobilePreview(false)}>
          <div className="min-h-screen flex flex-col items-center pt-6 pb-12 px-4">
            <div className="w-full max-w-sm space-y-5" onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center justify-between">
                <p className="text-white font-bold text-lg">Предпросмотр</p>
                <button onClick={() => setMobilePreview(false)} className="text-white/60 hover:text-white p-1"><X className="w-6 h-6" /></button>
              </div>
              <div>
                <p className="text-[10px] text-white/50 uppercase tracking-widest mb-2 text-center">Компактная</p>
                <CompactCard data={previewData} cfg={cfg} />
              </div>
              <div>
                <p className="text-[10px] text-white/50 uppercase tracking-widest mb-2 text-center">Полная карточка</p>
                <FullCard data={previewData} cfg={cfg} description={description} expanded={expandPreview} onExpand={() => setExpandPreview((p) => !p)} />
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

// ── EditorSection ─────────────────────────────────────────────────────────────

function EditorSection({ num, title, subtitle, required, filled, children }: {
  num: string; title: string; subtitle: string; required?: boolean; filled?: boolean; children: React.ReactNode;
}) {
  return (
    <div className="bg-card rounded-2xl border border-border overflow-hidden">
      <div className="px-5 pt-4 pb-3 border-b border-border/60 flex items-start gap-3">
        <div className={`w-6 h-6 rounded-full text-[11px] font-black flex items-center justify-center shrink-0 mt-0.5 ${
          required && filled === false ? "bg-warning text-white" : "bg-primary text-white"
        }`}>
          {required && filled ? <CheckCircle2 className="w-3.5 h-3.5" /> : num}
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <p className="font-bold text-sm">{title}</p>
            {required && (
              <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${
                filled ? "bg-success/10 text-success" : "bg-warning/10 text-warning"
              }`}>
                {filled ? "Заполнено" : "Обязательно"}
              </span>
            )}
          </div>
          <p className="text-[11px] text-muted mt-0.5">{subtitle}</p>
        </div>
      </div>
      <div className="px-5 py-4">{children}</div>
    </div>
  );
}

// ── Preview components ────────────────────────────────────────────────────────

interface PreviewData {
  displayName: string; avatarUrl: string | null; commission: number; negotiable: boolean;
  minOrder: number; orders: number; rating: number; rank: number | null; total: number;
}

function CompactCard({ data, cfg }: { data: PreviewData; cfg: CardCfg }) {
  const { displayName, avatarUrl, commission, negotiable, minOrder, orders, rating, rank, total } = data;
  return (
    <div className="bg-card rounded-2xl border border-border p-4 text-left shadow-sm">
      <div className="flex items-center gap-3">
        <div className="w-12 h-12 rounded-full overflow-hidden bg-accent flex items-center justify-center text-xl font-bold shrink-0 ring-2 ring-border">
          {avatarUrl ? <img src={avatarUrl} alt="" className="w-full h-full object-cover" /> : <span>{displayName[0]}</span>}
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-bold text-sm truncate">{displayName}</p>
          <span className="inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-full bg-success/10 text-success font-medium mt-0.5">
            <CheckCircle2 className="w-2.5 h-2.5" /> Проверен
          </span>
        </div>
        <button className="text-[11px] text-primary font-semibold px-2.5 py-1.5 rounded-lg bg-primary/10 shrink-0 hover:bg-primary/20 transition">
          Подробнее
        </button>
      </div>
      {cfg.compactBadges.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mt-3">
          {cfg.compactBadges.map((key) => (
            <span key={key} className="text-[11px] bg-accent text-foreground px-2.5 py-1 rounded-full font-medium">
              {getBadgeValue(key, commission, negotiable, minOrder, orders, rating, rank, total)}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

function FullCard({ data, cfg, description, expanded, onExpand }: {
  data: PreviewData; cfg: CardCfg; description: string; expanded: boolean; onExpand: () => void;
}) {
  const { displayName, avatarUrl, commission, negotiable, minOrder, orders, rating, rank, total } = data;
  return (
    <div className="bg-card rounded-2xl border border-border overflow-hidden shadow-sm text-left">
      <div className="p-4 border-b border-border/60">
        <div className="flex items-start gap-3">
          <div className="w-14 h-14 rounded-xl overflow-hidden bg-accent flex items-center justify-center text-xl font-bold shrink-0 ring-2 ring-border">
            {avatarUrl ? <img src={avatarUrl} alt="" className="w-full h-full object-cover" /> : <span>{displayName[0]}</span>}
          </div>
          <div className="flex-1 min-w-0 pt-0.5">
            <p className="font-bold truncate">{displayName}</p>
            <div className="flex items-center gap-2 mt-1 flex-wrap">
              <span className="inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-full bg-success/10 text-success font-medium">
                <CheckCircle2 className="w-2.5 h-2.5" /> Проверен
              </span>
              <span className="inline-flex items-center gap-1 text-[10px] text-muted">
                <Zap className="w-2.5 h-2.5 text-success" /> В сети
              </span>
            </div>
          </div>
        </div>
      </div>

      <button
        onClick={onExpand}
        className="w-full flex items-center justify-between px-4 py-2.5 text-xs text-muted hover:text-primary transition bg-accent/50 hover:bg-accent"
      >
        <span>{expanded ? "Скрыть детали" : "Открыть полную карточку"}</span>
        <span>{expanded ? "▲" : "▼"}</span>
      </button>

      {expanded && (
        <div className="p-4 space-y-3.5">
          {description && <p className="text-sm text-muted leading-relaxed">{description}</p>}

          <div className="grid grid-cols-2 gap-2 text-sm">
            <div className="bg-accent rounded-xl px-3 py-2.5">
              <p className="text-[10px] text-muted uppercase">Комиссия</p>
              <p className="font-bold mt-0.5">{negotiable ? "Договорная" : `${commission}%`}</p>
            </div>
            <div className="bg-accent rounded-xl px-3 py-2.5">
              <p className="text-[10px] text-muted uppercase">Мин. заказ</p>
              <p className="font-bold mt-0.5">от {minOrder.toLocaleString("ru-RU")} ₽</p>
            </div>
            <div className="bg-accent rounded-xl px-3 py-2.5">
              <p className="text-[10px] text-muted uppercase">Заказов</p>
              <p className="font-bold mt-0.5">{orders}</p>
            </div>
            <div className="bg-accent rounded-xl px-3 py-2.5">
              <p className="text-[10px] text-muted uppercase">Рейтинг</p>
              <p className="font-bold mt-0.5">{rating.toFixed(1)} ★</p>
            </div>
            {rank && (
              <div className="bg-accent rounded-xl px-3 py-2.5 col-span-2">
                <p className="text-[10px] text-muted uppercase">Место в рейтинге</p>
                <p className="font-bold mt-0.5">🏆 #{rank} в рейтинге</p>
              </div>
            )}
          </div>

          {cfg.tags.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {cfg.tags.map((t) => (
                <span key={t} className="text-[11px] bg-primary/10 text-primary px-2.5 py-1 rounded-full font-medium">{t}</span>
              ))}
            </div>
          )}

          {cfg.highlights.length > 0 && (
            <div className="space-y-1.5">
              {HIGHLIGHTS.filter((h) => cfg.highlights.includes(h.id)).map((h) => (
                <div key={h.id} className="flex items-center gap-2 text-sm">
                  <span>{h.emoji}</span>
                  <span>{h.text}</span>
                </div>
              ))}
            </div>
          )}

          <button className="w-full py-3 rounded-xl bg-primary text-white font-bold text-sm hover:bg-primary-hover transition">
            Выбрать посредника
          </button>
        </div>
      )}
    </div>
  );
}
