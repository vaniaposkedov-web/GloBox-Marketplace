"use client";

import { useState, useRef, useEffect, useCallback, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  ArrowLeft, Send, MessageCircle, RefreshCw,
  CheckCheck, Shield, Search, AlertCircle, X,
  Loader2, Paperclip, ExternalLink,
} from "lucide-react";
import { BottomNav } from "@/components/BottomNav";
import { VerificationBanner } from "@/components/VerificationBanner";
import { useMediator } from "@/hooks/useMediator";
import { api, uploadChatFile } from "@/lib/api";
import { markChatsSeen } from "@/hooks/useNavBadges";

// ── Types ─────────────────────────────────────────────────────────────────────

interface ChatMsg {
  id: string;
  text: string;
  from: "me" | "client" | "system" | "danger";
  time: string;
  dateLabel?: string;
}

interface ChatItem {
  chatId: string;
  orderId: string;
  zid: string;
  buyerName: string;
  lastMessage?: string;
  lastMessageAt?: string;
  status: string;
  type: "direct" | "broadcast";
}

// ── Config ────────────────────────────────────────────────────────────────────

const STATUS_CFG: Record<string, { label: string; color: string }> = {
  CREATED:                { label: "Новая заявка",  color: "#7c3aed" },
  ACCEPTED:               { label: "В работе",      color: "#2563eb" },
  SEARCHING:              { label: "Поиск товара",  color: "#059669" },
  SELECTING:              { label: "Выбор",         color: "#059669" },
  ASSIGNED:               { label: "Назначен",      color: "#d97706" },
  AWAITING_PURCHASE_DATE: { label: "Ожид. даты",   color: "#d97706" },
  PURCHASING:             { label: "Закупка",       color: "#2563eb" },
  DELIVERING:             { label: "Передача",      color: "#0891b2" },
  COMPLETED:              { label: "Завершён",      color: "#6b7280" },
  CANCELLED:              { label: "Отменён",       color: "#dc2626" },
  NOT_FOUND:              { label: "Не найден",     color: "#dc2626" },
  DISPUTE:                { label: "Спор",          color: "#ea580c" },
};

const ACTIVE_STATUSES = ["SEARCHING","SELECTING","ASSIGNED","AWAITING_PURCHASE_DATE","PURCHASING","DELIVERING","CREATED","ACCEPTED"];
const DONE_STATUSES   = ["COMPLETED","CANCELLED","NOT_FOUND","DISPUTE"];

// ── Message attachment helpers ────────────────────────────────────────────────

const IMAGE_EXTS = ["jpg","jpeg","png","webp","gif","bmp","svg","heic","heif","avif"];

function isImageUrl(url: string): boolean {
  const ext = url.split("?")[0].split(".").pop()?.toLowerCase() ?? "";
  return IMAGE_EXTS.includes(ext);
}

type MsgSegment =
  | { kind: "text"; text: string }
  | { kind: "img";  url: string }
  | { kind: "file"; name: string; url: string };

function parseMsgSegments(raw: string): MsgSegment[] {
  const segments: MsgSegment[] = [];
  let rest = raw;
  const imgRe   = /\[img:(https?:\/\/[^\]\s]+)\]/;
  const fileRe  = /\[file:([^\]]*?):(https?:\/\/[^\]\s]+)\]/;
  while (rest.length > 0) {
    const mi = imgRe.exec(rest);
    const mf = fileRe.exec(rest);
    let first: { idx: number; seg: MsgSegment; len: number } | null = null;
    if (mi && (!mf || mi.index <= mf.index))
      first = { idx: mi.index, seg: { kind: "img", url: mi[1] }, len: mi[0].length };
    else if (mf)
      first = { idx: mf.index, seg: { kind: "file", name: mf[1], url: mf[2] }, len: mf[0].length };
    if (!first) { segments.push({ kind: "text", text: rest }); break; }
    if (first.idx > 0) segments.push({ kind: "text", text: rest.slice(0, first.idx) });
    segments.push(first.seg);
    rest = rest.slice(first.idx + first.len);
  }
  return segments.filter((s) => s.kind !== "text" || s.text.trim());
}

function MsgContent({ text, isMe }: { text: string; isMe: boolean }) {
  const segs = parseMsgSegments(text);
  return (
    <div className="space-y-1.5">
      {segs.map((s, i) => {
        if (s.kind === "img") return (
          <a key={i} href={s.url} target="_blank" rel="noopener noreferrer" className="block">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={s.url} alt="фото"
              className="max-w-60 max-h-80 rounded-xl object-cover"
              style={{ border: "1px solid rgba(255,255,255,0.15)" }}
            />
          </a>
        );
        if (s.kind === "file") return (
          <a key={i} href={s.url} target="_blank" rel="noopener noreferrer"
            className={`flex items-center gap-2 px-3 py-2 rounded-xl text-[12px] font-medium transition hover:opacity-80 ${
              isMe ? "bg-white/15 text-white" : "bg-gray-100 text-gray-700"
            }`}
          >
            <span className="text-base leading-none">📎</span>
            <span className="truncate max-w-45">{s.name || "Файл"}</span>
            <span className={`shrink-0 text-[10px] ${isMe ? "text-white/60" : "text-gray-400"}`}>↓</span>
          </a>
        );
        return <p key={i} className="whitespace-pre-wrap wrap-break-word leading-relaxed">{s.text}</p>;
      })}
    </div>
  );
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function avatarGradient(name: string): string {
  const g = [
    "linear-gradient(135deg,#6366f1,#a855f7)",
    "linear-gradient(135deg,#0ea5e9,#6366f1)",
    "linear-gradient(135deg,#10b981,#0ea5e9)",
    "linear-gradient(135deg,#f59e0b,#ef4444)",
    "linear-gradient(135deg,#ec4899,#a855f7)",
    "linear-gradient(135deg,#14b8a6,#6366f1)",
  ];
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) & 0xffff;
  return g[h % g.length];
}

function relativeTime(iso?: string): string {
  if (!iso) return "";
  const m = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (m < 1) return "только что";
  if (m < 60) return `${m} мин`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} ч`;
  const d = new Date(iso);
  const y = new Date(); y.setDate(y.getDate() - 1);
  if (d.toDateString() === y.toDateString()) return "вчера";
  return d.toLocaleDateString("ru-RU", { day: "numeric", month: "short" });
}

function msgDateLabel(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  if (d.toDateString() === now.toDateString()) return "Сегодня";
  const y = new Date(now); y.setDate(now.getDate() - 1);
  if (d.toDateString() === y.toDateString()) return "Вчера";
  return d.toLocaleDateString("ru-RU", { day: "numeric", month: "long" });
}

function detectDanger(text: string): string | null {
  if (/\b\d{4}[\s–\-]?\d{4}[\s–\-]?\d{4}[\s–\-]?\d{4}\b/.test(text))
    return "Номер банковской карты обнаружен. Не переводите деньги вне платформы.";
  if (/(?:\+7|(?<!\d)8)[\s\(\-]?\d{3}[\s\)\-]?\d{3}[\s\-]?\d{2}[\s\-]?\d{2}(?!\d)/.test(text))
    return "Номер телефона обнаружен. Оставайтесь в чате — это защищает вас.";
  if (/telegram|telegr|t\.me|tg\b|whatsapp|watsap|вотсап|ватсап|viber|вайбер/i.test(text))
    return "Упоминание стороннего мессенджера. Не переходите в другие каналы.";
  return null;
}

const SYSTEM_INTRO: ChatMsg[] = [
  {
    id: "sys-init-1",
    text: "Чат создан — общайтесь только здесь для защиты вашего заказа",
    from: "system",
    time: "",
  },
  {
    id: "sys-init-2",
    text: "Не передавайте реквизиты карт, номера телефонов и не переходите в другие мессенджеры — это защищает вас при спорах",
    from: "system",
    time: "",
  },
  {
    id: "sys-init-3",
    text: "Вся переписка сохраняется 90 дней и может быть использована при разрешении споров",
    from: "system",
    time: "",
  },
];

function buildMessages(rawMsgs: any[], type: "direct" | "broadcast", myUserId: string | null): ChatMsg[] {
  const result: ChatMsg[] = [...SYSTEM_INTRO];
  let lastDate = "";
  for (const m of rawMsgs) {
    const text = type === "direct" ? (m.text ?? "") : (m.content ?? m.text ?? "");
    const from: ChatMsg["from"] = !m.senderId ? "system" : m.senderId === myUserId ? "me" : "client";
    const time = new Date(m.createdAt).toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" });
    const label = msgDateLabel(m.createdAt);
    const dateLabel = label !== lastDate ? label : undefined;
    if (dateLabel) lastDate = label;
    result.push({ id: m.id, text, from, time, dateLabel });
    if (from !== "system") {
      const danger = detectDanger(text);
      if (danger) result.push({ id: `danger-${m.id}`, text: danger, from: "danger", time });
    }
  }
  return result;
}

// ── Chat Row ──────────────────────────────────────────────────────────────────

function ChatRow({ c, isSelected, onOpen }: {
  c: ChatItem; isSelected: boolean; onOpen: (c: ChatItem) => void;
}) {
  const cfg = STATUS_CFG[c.status];
  const isActive = ACTIVE_STATUSES.includes(c.status);

  return (
    <button
      type="button"
      onClick={() => onOpen(c)}
      className="w-full flex items-center gap-3 px-4 py-3 text-left transition-colors"
      style={{
        background: isSelected ? "rgba(99,102,241,0.08)" : "transparent",
        borderLeft: `3px solid ${isSelected ? "#6366f1" : "transparent"}`,
        borderBottom: "1px solid var(--color-border)",
      }}
      onMouseEnter={(e) => { if (!isSelected) (e.currentTarget as HTMLElement).style.background = "var(--color-card)"; }}
      onMouseLeave={(e) => { if (!isSelected) (e.currentTarget as HTMLElement).style.background = "transparent"; }}
    >
      <div className="relative shrink-0">
        <div
          className="w-12 h-12 rounded-full flex items-center justify-center text-white font-bold text-base select-none"
          style={{ background: avatarGradient(c.buyerName) }}
        >
          {c.buyerName[0]?.toUpperCase()}
        </div>
        {isActive && (
          <span
            className="absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-background"
            style={{ background: cfg?.color ?? "#6b7280" }}
          />
        )}
        {c.type === "direct" && (
          <span
            className="absolute -top-0.5 -right-0.5 w-4.5 h-4.5 rounded-full border-2 border-background flex items-center justify-center text-[8px] font-bold text-white"
            style={{ background: "#a855f7" }}
          >
            П
          </span>
        )}
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-baseline justify-between gap-2">
          <span className="text-[13.5px] font-semibold truncate text-foreground">{c.buyerName}</span>
          <span className="text-[11px] text-muted shrink-0 tabular-nums">{relativeTime(c.lastMessageAt)}</span>
        </div>
        <p className="text-[12px] text-muted truncate mt-0.5 leading-snug">
          {c.lastMessage ?? "Нет сообщений"}
        </p>
        <div className="flex items-center gap-1.5 mt-1">
          {cfg && (
            <>
              <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: cfg.color }} />
              <span className="text-[10px] font-medium" style={{ color: cfg.color }}>{cfg.label}</span>
            </>
          )}
          <span className="text-[10px] text-muted/50 ml-auto font-mono">{c.zid}</span>
        </div>
      </div>
    </button>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────

export default function ChatsPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-7 h-7 animate-spin text-muted" />
      </div>
    }>
      <ChatsPageInner />
    </Suspense>
  );
}

function ChatsPageInner() {
  const { profile, loading: profileLoading, isApproved, user } = useMediator();
  const myUserId = user?.id ?? null;
  const router   = useRouter();
  const params   = useSearchParams();
  const focusOrderId = params?.get("orderId") ?? null;
  const focusDone    = useRef(false);

  const [allChats, setAllChats]           = useState<ChatItem[]>([]);
  const [activeTab, setActiveTab]         = useState<"active" | "archive">("active");
  const [searchQ, setSearchQ]             = useState("");
  const [selectedChat, setSelectedChat]   = useState<ChatItem | null>(null);
  const [messages, setMessages]           = useState<ChatMsg[]>([]);
  const [input, setInput]                 = useState("");
  const [showSafety, setShowSafety]       = useState(true);
  const [loadingChats, setLoadingChats]   = useState(false);
  const [refreshing, setRefreshing]       = useState(false);
  const [sending, setSending]             = useState(false);
  const [uploading, setUploading]         = useState(false);
  const [uploadErr, setUploadErr]         = useState<string | null>(null);

  const bottomRef  = useRef<HTMLDivElement>(null);
  const inputRef   = useRef<HTMLTextAreaElement>(null);
  const fileRef    = useRef<HTMLInputElement>(null);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  // ── Load chats ──

  const loadChats = useCallback(async (silent = false) => {
    if (!isApproved) return;
    if (!silent) setLoadingChats(true); else setRefreshing(true);
    try {
      const [broadcast, direct] = await Promise.all([
        api.get<any[]>("/mediator-orders/mediator/my").then(async (orders) => {
          const items: ChatItem[] = [];
          for (const o of (orders ?? []).slice(0, 20)) {
            try {
              const cl = await api.get<any[]>(`/mediator-orders/${o.id}/chats`);
              if (Array.isArray(cl) && cl.length > 0) {
                const c = cl[0]; const lm = c.messages?.[0];
                items.push({ chatId: c.id, orderId: o.id, zid: o.zid || `Z-${o.id.slice(-4)}`,
                  buyerName: o.buyerName ?? "Клиент", lastMessage: lm?.content,
                  lastMessageAt: lm?.createdAt, status: o.status, type: "broadcast" });
              }
            } catch {}
          }
          return items;
        }).catch(() => [] as ChatItem[]),
        api.get<any[]>("/order-requests/chats").then((ch) =>
          (ch ?? []).map((c: any) => ({
            chatId: c.id, orderId: c.orderRequestId, zid: c.zid,
            buyerName: c.partnerName ?? "Клиент", lastMessage: c.lastMessage ?? undefined,
            lastMessageAt: c.lastMessageAt ?? undefined, status: c.status, type: "direct" as const,
          }))
        ).catch(() => [] as ChatItem[]),
      ]);
      const merged = [...broadcast, ...direct].sort((a, b) => {
        const ta = a.lastMessageAt ? new Date(a.lastMessageAt).getTime() : 0;
        const tb = b.lastMessageAt ? new Date(b.lastMessageAt).getTime() : 0;
        return tb - ta;
      });
      setAllChats(merged);
    } finally { setLoadingChats(false); setRefreshing(false); }
  }, [isApproved]);

  useEffect(() => { if (!isApproved || profileLoading) return; loadChats(); markChatsSeen(); }, [isApproved, profileLoading, loadChats]);

  // Auto-refresh chat list every 15s to catch new chats without manual refresh
  useEffect(() => {
    if (!isApproved || profileLoading) return;
    const id = setInterval(() => loadChats(true), 15000);
    return () => clearInterval(id);
  }, [isApproved, profileLoading, loadChats]);

  // ── Open chat ──

  const openChat = useCallback(async (chat: ChatItem) => {
    setSelectedChat(chat); setMessages([]); setShowSafety(true); setInput("");
    setTimeout(() => inputRef.current?.focus(), 150);
    const ep = chat.type === "direct"
      ? `/order-requests/chats/${chat.chatId}/messages`
      : `/mediator-orders/chats/${chat.chatId}/messages`;
    try { const m = await api.get<any[]>(ep); setMessages(buildMessages(Array.isArray(m) ? m : [], chat.type, myUserId)); }
    catch { setMessages([]); }
  }, [myUserId]);

  useEffect(() => {
    if (!focusOrderId || focusDone.current || !allChats.length) return;
    const t = allChats.find((c) => c.orderId === focusOrderId);
    if (t) { focusDone.current = true; openChat(t); }
  }, [focusOrderId, allChats, openChat]);

  // ── Poll ──

  useEffect(() => {
    if (!selectedChat) return;
    const { chatId, type } = selectedChat;
    const ep = type === "direct"
      ? `/order-requests/chats/${chatId}/messages`
      : `/mediator-orders/chats/${chatId}/messages`;
    const poll = async () => {
      try {
        const msgs = await api.get<any[]>(ep);
        if (!Array.isArray(msgs)) return;
        setMessages((prev) => {
          const fresh = buildMessages(msgs, type, myUserId);
          const prevReal = prev.filter(
            (m) => !m.id.startsWith("temp") && !m.id.startsWith("danger-temp") && !m.id.startsWith("sys-init-")
          ).length;
          return msgs.length === prevReal ? prev : fresh;
        });
      } catch {}
    };
    const id = setInterval(poll, 8000);
    return () => clearInterval(id);
  }, [selectedChat, myUserId]);

  // ── Send ──

  const sendMessage = useCallback(async (text: string) => {
    if (!text.trim() || !selectedChat || sending) return;
    const trimmed = text.trim();
    const danger = detectDanger(trimmed);
    const tempId = `temp-${Date.now()}`;
    const now = new Date().toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" });
    const toAdd: ChatMsg[] = [{ id: tempId, text: trimmed, from: "me", time: now }];
    if (danger) toAdd.push({ id: `danger-${tempId}`, text: danger, from: "danger", time: now });
    setMessages((p) => [...p, ...toAdd]);
    setInput(""); setSending(true);
    try {
      if (selectedChat.type === "direct")
        await api.post(`/order-requests/chats/${selectedChat.chatId}/messages`, { text: trimmed });
      else
        await api.post(`/mediator-orders/chats/${selectedChat.chatId}/messages`, { content: trimmed });
      setAllChats((p) => p.map((c) =>
        c.chatId === selectedChat.chatId ? { ...c, lastMessage: trimmed, lastMessageAt: new Date().toISOString() } : c
      ));
    } catch {} finally { setSending(false); }
  }, [selectedChat, sending]);

  const handleFileSelect = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !selectedChat) return;
    e.target.value = "";
    setUploadErr(null);
    setUploading(true);
    try {
      const url = await uploadChatFile(file);
      const isImg = isImageUrl(url);
      const tag   = isImg ? `[img:${url}]` : `[file:${file.name}:${url}]`;
      await sendMessage(tag);
    } catch {
      setUploadErr("Не удалось загрузить файл. Попробуйте снова.");
      setTimeout(() => setUploadErr(null), 4000);
    } finally { setUploading(false); }
  }, [selectedChat, sendMessage]);

  // ── Filter ──

  const activeChats  = allChats.filter((c) => ACTIVE_STATUSES.includes(c.status));
  const archiveChats = allChats.filter((c) => DONE_STATUSES.includes(c.status));
  const bySearch = (list: ChatItem[]) => !searchQ ? list : list.filter((c) => {
    const q = searchQ.toLowerCase();
    return c.buyerName.toLowerCase().includes(q) || c.zid.toLowerCase().includes(q);
  });

  const visibleActive  = bySearch(activeChats);
  const visibleArchive = bySearch(archiveChats);

  if (profileLoading) return (
    <div className="min-h-screen flex items-center justify-center">
      <Loader2 className="w-7 h-7 animate-spin text-muted" />
    </div>
  );

  // ── Render ────────────────────────────────────────────────────────────────

  const inChat = !!selectedChat;

  return (
    <div className="h-screen overflow-hidden flex flex-col bg-background">
      <VerificationBanner status={profile?.status ?? null} rejectionReason={profile?.rejectionReason} />

      {!isApproved ? (
        <div className="flex-1 flex flex-col items-center justify-center gap-4 px-6 text-center pb-20">
          <div className="w-16 h-16 rounded-2xl bg-card flex items-center justify-center">
            <MessageCircle className="w-8 h-8 text-muted/40" />
          </div>
          <p className="font-semibold text-foreground">Раздел недоступен</p>
          <p className="text-sm text-muted">Чаты появятся после одобрения вашей заявки.</p>
        </div>
      ) : (
        <div className="flex flex-1 overflow-hidden">

          {/* ══════════════════ LEFT: Chat list ══════════════════ */}
          <div
            className={`flex flex-col shrink-0 w-full md:w-75 md:min-w-70 md:max-w-90 bg-background ${inChat ? "hidden md:flex" : "flex"}`}
            style={{ borderRight: "1px solid var(--color-border)" }}
          >
            {/* Header */}
            <div className="flex items-center gap-3 px-4 h-14 bg-card" style={{ borderBottom: "1px solid var(--color-border)" }}>
              <h1 className="text-lg font-bold flex-1 text-foreground">Чаты</h1>
              <button
                type="button" onClick={() => loadChats(true)} disabled={refreshing}
                className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-accent transition text-muted"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? "animate-spin" : ""}`} />
              </button>
            </div>

            {/* Tabs */}
            <div className="flex px-3 pt-2.5 pb-0 gap-1" style={{ borderBottom: "1px solid var(--color-border)" }}>
              {([
                { key: "active",  label: "Активные",  count: activeChats.length },
                { key: "archive", label: "Архив",     count: archiveChats.length },
              ] as const).map((t) => (
                <button
                  key={t.key}
                  type="button"
                  onClick={() => setActiveTab(t.key)}
                  className="flex items-center gap-1.5 px-3 py-2 text-[13px] font-semibold transition-all relative"
                  style={{
                    color: activeTab === t.key ? "#6366f1" : "var(--color-muted)",
                    borderBottom: activeTab === t.key ? "2px solid #6366f1" : "2px solid transparent",
                    marginBottom: "-1px",
                  }}
                >
                  {t.label}
                  {t.count > 0 && (
                    <span
                      className="text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-4.5 text-center leading-none"
                      style={{
                        background: activeTab === t.key ? "#eef2ff" : "var(--color-accent)",
                        color: activeTab === t.key ? "#6366f1" : "var(--color-muted)",
                      }}
                    >
                      {t.count}
                    </span>
                  )}
                </button>
              ))}
            </div>

            {/* Search */}
            <div className="px-3 py-2.5" style={{ borderBottom: "1px solid var(--color-border)" }}>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted pointer-events-none" />
                <input
                  type="search" value={searchQ} onChange={(e) => setSearchQ(e.target.value)}
                  placeholder="Поиск по имени или заказу..."
                  className="w-full rounded-xl pl-9 pr-3 py-2 text-[13px] outline-none bg-card placeholder:text-muted"
                  style={{ border: "1px solid var(--color-border)" }}
                />
              </div>
            </div>

            {/* List */}
            <div className="flex-1 overflow-y-auto flex flex-col pb-14">
              {loadingChats ? (
                <div className="flex justify-center pt-12">
                  <Loader2 className="w-5 h-5 animate-spin text-muted" />
                </div>
              ) : (() => {
                const list = activeTab === "active" ? visibleActive : visibleArchive;
                const emptyText = searchQ
                  ? "Ничего не найдено"
                  : activeTab === "active" ? "Нет активных чатов" : "Архив пуст";
                if (list.length === 0) return (
                  <div className="flex flex-col items-center justify-center py-16 gap-2 text-center px-6">
                    <MessageCircle className="w-9 h-9 text-muted/25" />
                    <p className="text-[13px] text-muted">{emptyText}</p>
                  </div>
                );
                return list.map((c) => (
                  <ChatRow key={c.chatId} c={c} isSelected={inChat && selectedChat?.chatId === c.chatId} onOpen={openChat} />
                ));
              })()}
            </div>
          </div>

          {/* ══════════════════ RIGHT: Chat view ══════════════════ */}
          <div className={`flex-1 flex flex-col overflow-hidden pb-14 ${inChat ? "flex" : "hidden md:flex"}`}>

            {!selectedChat ? (
              <div className="flex-1 flex flex-col items-center justify-center gap-4 text-center px-6 bg-card">
                <div className="w-20 h-20 rounded-2xl bg-indigo-50 flex items-center justify-center">
                  <MessageCircle className="w-10 h-10 text-indigo-300" />
                </div>
                <div>
                  <p className="font-semibold text-[15px] mb-1">Выберите чат</p>
                  <p className="text-[13px] text-muted">Нажмите на диалог слева</p>
                </div>
              </div>
            ) : (
              <>
                {/* ── Header ── */}
                <div
                  className="shrink-0 flex items-center gap-3 px-4 h-14 bg-background"
                  style={{ borderBottom: "1px solid var(--color-border)", boxShadow: "0 1px 3px rgba(0,0,0,0.06)" }}
                >
                  <button
                    type="button"
                    onClick={() => { setSelectedChat(null); setMessages([]); }}
                    className="md:hidden w-8 h-8 rounded-lg flex items-center justify-center hover:bg-accent transition shrink-0"
                  >
                    <ArrowLeft className="w-4 h-4 text-foreground" />
                  </button>

                  <div className="relative shrink-0">
                    <div
                      className="w-9 h-9 rounded-full flex items-center justify-center text-white font-bold text-sm select-none"
                      style={{ background: avatarGradient(selectedChat.buyerName) }}
                    >
                      {selectedChat.buyerName[0]?.toUpperCase()}
                    </div>
                    {ACTIVE_STATUSES.includes(selectedChat.status) && (
                      <span
                        className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full border-2 border-background"
                        style={{ background: STATUS_CFG[selectedChat.status]?.color ?? "#6b7280" }}
                      />
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <p className="text-[14px] font-semibold truncate text-foreground leading-tight">
                      {selectedChat.buyerName}
                    </p>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      {STATUS_CFG[selectedChat.status] && (
                        <>
                          <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: STATUS_CFG[selectedChat.status].color }} />
                          <span className="text-[11px] font-medium" style={{ color: STATUS_CFG[selectedChat.status].color }}>
                            {STATUS_CFG[selectedChat.status].label}
                          </span>
                          <span className="text-[10px] text-muted/50 ml-1 font-mono">{selectedChat.zid}</span>
                        </>
                      )}
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => router.push(`/orders/${selectedChat.orderId}`)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-semibold transition shrink-0 hover:opacity-80 active:scale-95 bg-emerald-50 text-emerald-700"
                    style={{ border: "1px solid #bbf7d0" }}
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    <span>К заказу</span>
                  </button>
                </div>

                {/* Safety banner */}
                {showSafety && (
                  <div className="shrink-0 flex items-center gap-2.5 px-4 py-2 bg-blue-50" style={{ borderBottom: "1px solid #bfdbfe" }}>
                    <Shield className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                    <p className="text-[11px] text-blue-600 flex-1">Общайтесь только здесь — это защищает вас и клиента.</p>
                    <button type="button" onClick={() => setShowSafety(false)} className="text-blue-400 hover:text-blue-600 transition p-0.5 shrink-0">
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                )}

                {/* ── Messages ── */}
                <div
                  className="flex-1 overflow-y-auto px-4 py-4"
                  style={{
                    background: "#f4f5f8",
                    backgroundImage: "url(\"data:image/svg+xml,%3Csvg width='40' height='40' viewBox='0 0 40 40' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23c7c7cc' fill-opacity='0.12'%3E%3Cpath d='M0 0h1v1H0V0zm20 0h1v1h-1V0zM0 20h1v1H0v-1zm20 20h1v1h-1v-1zM20 20h1v1h-1v-1z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E\")",
                  }}
                >
                  {messages.length === 0 && (
                    <div className="flex flex-col items-center justify-center h-full gap-3 text-center">
                      <div className="w-14 h-14 rounded-2xl bg-white flex items-center justify-center shadow-sm">
                        <MessageCircle className="w-7 h-7 text-muted/40" />
                      </div>
                      <p className="text-[13px] text-muted">Начните диалог</p>
                    </div>
                  )}

                  <div className="space-y-1 max-w-3xl mx-auto">
                    {messages.map((m) => {
                      const isMe = m.from === "me";

                      const dateSep = m.dateLabel ? (
                        <div key={`date-${m.id}`} className="flex items-center gap-3 my-4">
                          <div className="flex-1 h-px bg-black/8" />
                          <span className="text-[11px] text-muted bg-white/70 px-2.5 py-0.5 rounded-full font-medium shadow-sm">
                            {m.dateLabel}
                          </span>
                          <div className="flex-1 h-px bg-black/8" />
                        </div>
                      ) : null;

                      if (m.from === "system") return (
                        <div key={m.id}>
                          {dateSep}
                          <div className="flex justify-center my-3">
                            <div className="px-4 py-1.5 rounded-full text-[11px] text-muted font-medium max-w-[80%] text-center bg-white/80 shadow-sm">
                              {m.text}
                            </div>
                          </div>
                        </div>
                      );

                      if (m.from === "danger") return (
                        <div key={m.id} className="flex justify-center my-2">
                          <div className="flex items-start gap-2 px-4 py-2.5 rounded-xl max-w-[85%] bg-red-50" style={{ border: "1px solid #fecaca" }}>
                            <AlertCircle className="w-3.5 h-3.5 text-red-500 shrink-0 mt-0.5" />
                            <p className="text-[11px] text-red-600 leading-snug">{m.text}</p>
                          </div>
                        </div>
                      );

                      return (
                        <div key={m.id}>
                          {dateSep}
                          <div className={`flex items-end gap-2 my-1 ${isMe ? "justify-end" : "justify-start"}`}>
                            {!isMe && (
                              <div
                                className="w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-bold text-white shrink-0 mb-0.5"
                                style={{ background: avatarGradient(selectedChat.buyerName) }}
                              >
                                {selectedChat.buyerName[0]}
                              </div>
                            )}
                            <div
                              className={`max-w-[68%] px-4 py-2.5 text-[13.5px] leading-relaxed ${
                                isMe
                                  ? "rounded-2xl rounded-br-md text-white"
                                  : "rounded-2xl rounded-bl-md text-foreground"
                              }`}
                              style={
                                isMe
                                  ? {
                                      background: "linear-gradient(135deg,#6366f1,#7c3aed)",
                                      boxShadow: "0 2px 8px rgba(99,102,241,0.35)",
                                    }
                                  : {
                                      background: "#ffffff",
                                      boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
                                      border: "1px solid rgba(0,0,0,0.06)",
                                    }
                              }
                            >
                              <MsgContent text={m.text} isMe={isMe} />
                              <div className={`flex items-center gap-1 mt-1.5 justify-end ${isMe ? "text-white/50" : "text-muted/60"}`}>
                                <span className="text-[10px] tabular-nums">{m.time}</span>
                                {isMe && <CheckCheck className="w-3 h-3" />}
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                    <div ref={bottomRef} />
                  </div>
                </div>

                {/* ── Input ── */}
                <div
                  className="shrink-0 px-4 py-3 bg-background"
                  style={{ borderTop: "1px solid var(--color-border)", boxShadow: "0 -1px 4px rgba(0,0,0,0.04)" }}
                >
                  {uploadErr && (
                    <div className="flex items-center gap-2 mb-2 px-3 py-2 rounded-xl bg-red-50 text-red-600 text-[11px]" style={{ border: "1px solid #fecaca" }}>
                      <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                      {uploadErr}
                    </div>
                  )}
                  <div className="flex items-end gap-2.5 max-w-3xl mx-auto">
                    {/* Hidden file input */}
                    <input
                      ref={fileRef} type="file" className="hidden"
                      accept="*/*"
                      onChange={handleFileSelect}
                    />
                    <button
                      type="button"
                      onClick={() => fileRef.current?.click()}
                      disabled={uploading || sending}
                      title="Прикрепить фото или файл"
                      className="w-9 h-9 rounded-full flex items-center justify-center text-muted hover:text-foreground hover:bg-accent transition shrink-0 disabled:opacity-40"
                    >
                      {uploading
                        ? <Loader2 className="w-4 h-4 animate-spin text-indigo-500" />
                        : <Paperclip className="w-4.5 h-4.5" />
                      }
                    </button>

                    <div className="flex-1 relative">
                      <textarea
                        ref={inputRef}
                        value={input}
                        onChange={(e) => {
                          setInput(e.target.value);
                          e.target.style.height = "auto";
                          e.target.style.height = Math.min(e.target.scrollHeight, 120) + "px";
                        }}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(input); }
                        }}
                        placeholder="Написать сообщение..."
                        rows={1}
                        className="w-full rounded-2xl px-4 py-2.5 text-[13.5px] outline-none placeholder:text-muted resize-none leading-5 min-h-10 bg-card transition"
                        style={{
                          border: "1px solid var(--color-border)",
                          maxHeight: "120px",
                          height: "40px",
                        }}
                        onFocus={(e) => (e.currentTarget.style.border = "1.5px solid #6366f1")}
                        onBlur={(e)  => (e.currentTarget.style.border = "1px solid var(--color-border)")}
                      />
                    </div>

                    <button
                      type="button" onClick={() => sendMessage(input)}
                      disabled={!input.trim() || sending || uploading}
                      className="w-10 h-10 rounded-full flex items-center justify-center text-white shrink-0 transition disabled:opacity-35 active:scale-95"
                      style={
                        input.trim() && !sending && !uploading
                          ? { background: "linear-gradient(135deg,#6366f1,#7c3aed)", boxShadow: "0 2px 8px rgba(99,102,241,0.4)" }
                          : { background: "var(--color-accent)" }
                      }
                    >
                      {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" style={{ color: input.trim() && !sending ? "#fff" : "var(--color-muted)" }} />}
                    </button>
                  </div>
                  <p className="text-center text-[10px] text-muted/40 mt-1.5 select-none">
                    Enter — отправить · Shift+Enter — новая строка · 📎 — фото/файл до 15 МБ
                  </p>
                </div>
              </>
            )}
          </div>

        </div>
      )}

      <BottomNav />
    </div>
  );
}
