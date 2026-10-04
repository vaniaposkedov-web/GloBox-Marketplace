"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Send,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Package,
  MessageSquare,
  Clock,
  Users,
  ShoppingBag,
  Search,
  Truck,
  ChevronLeft,
  BadgeCheck,
  CalendarDays,
  MapPin,
  Phone,
} from "lucide-react";
import { SiteHeader } from "@/widgets/header";
import { Button, NotifModal, shouldShowNotifModal } from "@/shared/ui";
import { ApiError, api } from "@/shared/api/client";
import { useSession } from "@/shared/auth";
import {
  getMediatorOrder,
  selectExecutor,
  cancelMediatorOrder,
  completeMediatorOrder,
  respondToPriceChange,
  respondToReplacement,
  getOrderChats,
  getChatMessages,
  sendChatMessage,
} from "@/features/commerce";
import { formatPrice } from "@/shared/lib";

// ─── Constants ─────────────────────────────────────────────────────────────

const STATUS_MAP: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  SEARCHING: { label: "Ищем посредника", color: "bg-blue-100 text-blue-700", icon: <Search className="w-3.5 h-3.5" /> },
  SELECTING: { label: "Выбор посредника", color: "bg-indigo-100 text-indigo-700", icon: <Users className="w-3.5 h-3.5" /> },
  ASSIGNED: { label: "Исполнитель выбран", color: "bg-purple-100 text-purple-700", icon: <CheckCircle2 className="w-3.5 h-3.5" /> },
  AWAITING_PURCHASE_DATE: { label: "Ожидание даты", color: "bg-amber-100 text-amber-700", icon: <Clock className="w-3.5 h-3.5" /> },
  PURCHASING: { label: "Идёт закупка", color: "bg-orange-100 text-orange-700", icon: <ShoppingBag className="w-3.5 h-3.5" /> },
  DELIVERING: { label: "Передача заказа", color: "bg-cyan-100 text-cyan-700", icon: <Truck className="w-3.5 h-3.5" /> },
  COMPLETED: { label: "Завершён", color: "bg-emerald-100 text-emerald-700", icon: <CheckCircle2 className="w-3.5 h-3.5" /> },
  CANCELLED: { label: "Отменён", color: "bg-red-100 text-red-700", icon: <XCircle className="w-3.5 h-3.5" /> },
  DISPUTE: { label: "Спор", color: "bg-rose-100 text-rose-700", icon: <XCircle className="w-3.5 h-3.5" /> },
  NOT_FOUND: { label: "Не нашли", color: "bg-gray-100 text-gray-700", icon: <XCircle className="w-3.5 h-3.5" /> },
};

const ITEM_STATUS_MAP: Record<string, { label: string; color: string }> = {
  PENDING: { label: "Ожидание", color: "text-gray-600 bg-gray-100" },
  BOUGHT: { label: "Куплен", color: "text-emerald-700 bg-emerald-100" },
  NOT_AVAILABLE: { label: "Нет в наличии", color: "text-red-700 bg-red-100" },
  REPLACEMENT_OFFERED: { label: "Предложена замена", color: "text-amber-700 bg-amber-100" },
  PRICE_CHANGE_OFFERED: { label: "Изменение цены", color: "text-orange-700 bg-orange-100" },
};

// ─── Types ──────────────────────────────────────────────────────────────────

type MobileTab = "details" | "chats";
type ChatView = "list" | "chat"; // mobile sub-view inside "chats" tab

// ─── Main Page ──────────────────────────────────────────────────────────────

export default function MediatorOrderDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { user, hydrated } = useSession();
  const id = params.id;

  const [order, setOrder] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  // Chat data
  const [chats, setChats] = useState<any[]>([]);
  const [activeChat, setActiveChat] = useState<any>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [msgInput, setMsgInput] = useState("");
  const [sendingMsg, setSendingMsg] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Layout state
  const [mobileTab, setMobileTab] = useState<MobileTab>("details");
  const [chatView, setChatView] = useState<ChatView>("list"); // mobile only

  // Notification modal
  const [showNotifModal, setShowNotifModal] = useState(false);
  const notifShownRef = useRef(false);

  // ── Load ──

  const loadChats = useCallback(async () => {
    const c = await getOrderChats(id);
    setChats(c);
    return c;
  }, [id]);

  const loadMessages = useCallback(async (chatId: string) => {
    try {
      const msgs = await getChatMessages(chatId);
      setMessages(msgs);
      setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }), 80);
    } catch {}
  }, []);

  // Called exactly once when buyer first opens ANY chat in this order
  const tryShowNotifModal = useCallback(async () => {
    if (notifShownRef.current || !shouldShowNotifModal()) return;
    notifShownRef.current = true;
    const subs = await api.get<{ channel: string; active: boolean }[]>("/notifications/my").catch(() => []);
    if (!subs.some((s: any) => s.active)) {
      setTimeout(() => setShowNotifModal(true), 700);
    }
  }, []);

  const openChat = useCallback((chat: any) => {
    setActiveChat(chat);
    setChatView("chat");
    loadMessages(chat.id);
    tryShowNotifModal();
    setTimeout(() => inputRef.current?.focus(), 200);
  }, [loadMessages, tryShowNotifModal]);

  useEffect(() => {
    if (!hydrated || !user) return;
    (async () => {
      setLoading(true);
      try {
        const [o, c] = await Promise.all([getMediatorOrder(id), loadChats()]);
        setOrder(o);
        // Auto-open the single active chat (if exactly one)
        if (c.length === 1) {
          const chat = c[0];
          setActiveChat(chat);
          loadMessages(chat.id);
          tryShowNotifModal();
        }
      } catch (err) {
        setError(err instanceof ApiError ? err.payload.message : "Ошибка загрузки");
      } finally {
        setLoading(false);
      }
    })();
  }, [hydrated, user, id]); // eslint-disable-line

  // ── Actions ──

  const handleSendMessage = async () => {
    if (!msgInput.trim() || !activeChat) return;
    setSendingMsg(true);
    const text = msgInput.trim();
    setMsgInput("");
    try {
      const msg = await sendChatMessage(activeChat.id, text);
      setMessages((prev) => [...prev, msg]);
      // Update last message in chat list
      setChats((prev) => prev.map((c) => c.id === activeChat.id ? { ...c, lastMessage: msg } : c));
      setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }), 50);
    } catch {}
    setSendingMsg(false);
  };

  const handleSelectExecutor = async (mediatorId: string) => {
    setActionLoading(true);
    try {
      await selectExecutor(id, mediatorId);
      const [o, c] = await Promise.all([getMediatorOrder(id), loadChats()]);
      setOrder(o);
      // Open that mediator's chat
      const chat = c.find((ch: any) => ch.mediator?.id === mediatorId) || c[0];
      if (chat) openChat(chat);
    } catch (err) {
      setError(err instanceof ApiError ? err.payload.message : "Ошибка");
    }
    setActionLoading(false);
  };

  const handleCancel = async () => {
    if (!confirm("Вы уверены, что хотите отменить заказ?")) return;
    setActionLoading(true);
    try {
      await cancelMediatorOrder(id);
      const o = await getMediatorOrder(id);
      setOrder(o);
    } catch (err) {
      setError(err instanceof ApiError ? err.payload.message : "Ошибка");
    }
    setActionLoading(false);
  };

  const handleComplete = async () => {
    setActionLoading(true);
    try {
      await completeMediatorOrder(id);
      const o = await getMediatorOrder(id);
      setOrder(o);
    } catch (err) {
      setError(err instanceof ApiError ? err.payload.message : "Ошибка");
    }
    setActionLoading(false);
  };

  const handleRespondPrice = async (itemId: string, accept: boolean) => {
    try {
      await respondToPriceChange(id, itemId, accept);
      const o = await getMediatorOrder(id);
      setOrder(o);
    } catch {}
  };

  const handleRespondReplacement = async (itemId: string, accept: boolean) => {
    try {
      await respondToReplacement(id, itemId, accept);
      const o = await getMediatorOrder(id);
      setOrder(o);
    } catch {}
  };

  // ── Guards ──

  if (!hydrated || !user) {
    return <div className="min-h-screen flex flex-col"><SiteHeader /></div>;
  }

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col">
        <SiteHeader />
        <main className="flex-1 max-w-6xl mx-auto px-4 py-6 w-full">
          <div className="grid lg:grid-cols-[420px_1fr] gap-5">
            <div className="space-y-3">{[0,1,2].map((i) => <div key={i} className="h-28 rounded-2xl bg-white border border-border/40 animate-pulse" />)}</div>
            <div className="h-[600px] rounded-2xl bg-white border border-border/40 animate-pulse" />
          </div>
        </main>
      </div>
    );
  }

  if (error && !order) {
    return (
      <div className="min-h-screen flex flex-col">
        <SiteHeader />
        <main className="flex-1 flex items-center justify-center px-4">
          <div className="text-center">
            <AlertTriangle className="w-12 h-12 text-red-400 mx-auto mb-3" />
            <p className="text-red-600">{error}</p>
            <Link href="/mediator-orders" className="text-sm text-amber-600 mt-3 inline-block">← К списку заказов</Link>
          </div>
        </main>
      </div>
    );
  }

  if (!order) return null;

  const s = STATUS_MAP[order.status] || STATUS_MAP.SEARCHING;
  const isBuyer = order.buyer?.id === user.id;
  const canCancel = isBuyer && !["COMPLETED", "CANCELLED"].includes(order.status);
  const canComplete = isBuyer && order.status === "DELIVERING";
  const showSelectButtons = isBuyer && ["SEARCHING", "SELECTING"].includes(order.status);
  const unreadTotal = chats.reduce((n: number, c: any) => n + (c.unreadCount || 0), 0);

  return (
    <div className="min-h-screen flex flex-col bg-stone-50/50">
      <SiteHeader />
      {showNotifModal && <NotifModal onClose={() => setShowNotifModal(false)} markSeen />}

      {/* ── Mobile tab bar ─────────────────────────────────────────── */}
      <div className="lg:hidden sticky top-0 z-20 bg-white border-b border-border/40 px-4 py-2">
        <div className="flex items-center gap-3 mb-2">
          <button
            type="button"
            onClick={() => chatView === "chat" && mobileTab === "chats" ? setChatView("list") : router.back()}
            className="w-8 h-8 rounded-lg bg-stone-100 flex items-center justify-center shrink-0"
          >
            {chatView === "chat" && mobileTab === "chats" ? (
              <ChevronLeft className="w-4 h-4" />
            ) : (
              <ArrowLeft className="w-4 h-4" />
            )}
          </button>
          <div className="flex-1 min-w-0">
            {chatView === "chat" && mobileTab === "chats" && activeChat ? (
              <div className="flex items-center gap-2">
                <Avatar name={activeChat.mediator?.firstName} size="sm" />
                <div>
                  <p className="text-sm font-bold leading-none">{activeChat.mediator?.firstName} {activeChat.mediator?.lastName}</p>
                  {activeChat.mediator?.commissionRate && (
                    <p className="text-[11px] text-muted">Комиссия {activeChat.mediator.commissionRate}%</p>
                  )}
                </div>
              </div>
            ) : (
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-extrabold">Заказ {order.zid}</span>
                  <span className={`inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full ${s.color}`}>
                    {s.icon} {s.label}
                  </span>
                </div>
              </div>
            )}
          </div>
          {showSelectButtons && activeChat && chatView === "chat" && mobileTab === "chats" && (
            <button
              type="button"
              onClick={() => handleSelectExecutor(activeChat.mediator?.id)}
              disabled={actionLoading}
              className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 text-white text-xs font-bold shadow-sm disabled:opacity-50"
            >
              Выбрать
            </button>
          )}
        </div>

        {/* Tabs - only show when not in a chat */}
        {!(chatView === "chat" && mobileTab === "chats") && (
          <div className="flex gap-1 p-1 rounded-xl bg-stone-100">
            <button
              type="button"
              onClick={() => setMobileTab("details")}
              className={`flex-1 py-1.5 rounded-lg text-xs font-semibold transition ${mobileTab === "details" ? "bg-white shadow-sm text-foreground" : "text-muted"}`}
            >
              Детали заказа
            </button>
            <button
              type="button"
              onClick={() => setMobileTab("chats")}
              className={`flex-1 py-1.5 rounded-lg text-xs font-semibold transition flex items-center justify-center gap-1.5 ${mobileTab === "chats" ? "bg-white shadow-sm text-foreground" : "text-muted"}`}
            >
              <MessageSquare className="w-3.5 h-3.5" />
              Чаты
              {chats.length > 0 && (
                <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ${unreadTotal > 0 ? "bg-amber-500 text-white" : "bg-stone-200 text-stone-600"}`}>
                  {chats.length}
                </span>
              )}
            </button>
          </div>
        )}
      </div>

      <main className="flex-1 max-w-6xl w-full mx-auto px-3 sm:px-4 py-3 lg:py-5 pb-20 lg:pb-6">
        {error && (
          <div className="mb-3 px-4 py-3 rounded-xl bg-red-50 border border-red-100 text-sm text-red-600 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0" /> {error}
          </div>
        )}

        {/* ── Desktop: page header ── */}
        <div className="hidden lg:flex items-center gap-3 mb-5">
          <button type="button" onClick={() => router.back()} className="w-9 h-9 rounded-xl bg-white border border-border/40 flex items-center justify-center hover:bg-stone-50 transition">
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div className="flex-1">
            <div className="flex items-center gap-3">
              <h1 className="text-xl font-extrabold">Заказ {order.zid}</h1>
              <span className={`inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full ${s.color}`}>
                {s.icon} {s.label}
              </span>
            </div>
            <p className="text-xs text-muted mt-0.5">Создан {new Date(order.createdAt).toLocaleDateString("ru-RU")}</p>
          </div>
        </div>

        {/* ── Layout grid ── */}
        <div className="lg:grid lg:grid-cols-[420px_1fr] lg:gap-5 lg:items-start">

          {/* ═══════════════════════════════════════════════════════════
              LEFT / DETAILS PANEL
          ══════════════════════════════════════════════════════════════ */}
          <div className={`space-y-3 ${mobileTab === "chats" ? "hidden lg:block" : "block"}`}>

            {/* Order items */}
            <div className="rounded-2xl bg-white border border-border/40 p-4">
              <h3 className="font-bold text-sm mb-3">Товары ({order.items?.length})</h3>
              <div className="space-y-2.5">
                {order.items?.map((item: any) => {
                  const is = ITEM_STATUS_MAP[item.status] || ITEM_STATUS_MAP.PENDING;
                  return (
                    <div key={item.id} className="flex gap-3 p-3 rounded-xl bg-stone-50 border border-border/30">
                      <div className="w-14 h-14 rounded-lg bg-white border border-border/40 overflow-hidden shrink-0">
                        {item.selectedPhotoUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={item.selectedPhotoUrl} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center"><Package className="w-5 h-5 text-stone-300" /></div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium line-clamp-1">{item.listing?.title || "Товар"}</p>
                        {item.clarification && <p className="text-xs text-muted mt-0.5 line-clamp-1 italic">{item.clarification}</p>}
                        <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                          <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full ${is.color}`}>{is.label}</span>
                          <span className="text-sm font-bold">{formatPrice(item.currentPrice, "RUB")}</span>
                          {item.originalPrice !== item.currentPrice && (
                            <span className="text-xs text-muted line-through">{formatPrice(item.originalPrice, "RUB")}</span>
                          )}
                        </div>

                        {/* Price change */}
                        {item.status === "PRICE_CHANGE_OFFERED" && isBuyer && (
                          <div className="mt-2 p-2.5 rounded-lg bg-orange-50 border border-orange-200/80">
                            <p className="text-xs text-orange-800 mb-2">
                              Новая цена: <strong>{formatPrice(item.priceChangeProposed, "RUB")}</strong>
                              {item.priceChangeComment && <span className="text-orange-700"> — {item.priceChangeComment}</span>}
                            </p>
                            <div className="flex gap-2">
                              <button onClick={() => handleRespondPrice(item.id, true)} className="text-xs px-3 py-1 rounded-lg bg-emerald-500 text-white font-medium hover:bg-emerald-600 transition">Принять</button>
                              <button onClick={() => handleRespondPrice(item.id, false)} className="text-xs px-3 py-1 rounded-lg bg-stone-200 text-stone-700 font-medium hover:bg-stone-300 transition">Отклонить</button>
                            </div>
                          </div>
                        )}

                        {/* Replacement */}
                        {item.status === "REPLACEMENT_OFFERED" && isBuyer && item.replacementData && (
                          <div className="mt-2 p-2.5 rounded-lg bg-amber-50 border border-amber-200/80">
                            <p className="text-xs font-medium text-amber-800 mb-1">Предложена замена</p>
                            <p className="text-xs text-amber-700">{(item.replacementData as any).description} — {formatPrice((item.replacementData as any).price, "RUB")}</p>
                            <div className="flex gap-2 mt-2">
                              <button onClick={() => handleRespondReplacement(item.id, true)} className="text-xs px-3 py-1 rounded-lg bg-emerald-500 text-white font-medium hover:bg-emerald-600 transition">Принять</button>
                              <button onClick={() => handleRespondReplacement(item.id, false)} className="text-xs px-3 py-1 rounded-lg bg-stone-200 text-stone-700 font-medium hover:bg-stone-300 transition">Отклонить</button>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="border-t border-border/40 mt-3 pt-3 space-y-1">
                <div className="flex justify-between">
                  <span className="text-sm font-semibold">Итого (оценка)</span>
                  <span className="text-base font-extrabold">{formatPrice(order.totalEstimatedAmount, order.currency)}</span>
                </div>
                {order.mediatorCommissionAmount && (
                  <div className="flex justify-between text-xs text-muted">
                    <span>+ Комиссия посредника ({order.mediatorCommissionRate}%)</span>
                    <span>{formatPrice(order.mediatorCommissionAmount, order.currency)}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Delivery & Recipient (TZ 5.4.2 - only buyer and assigned mediator see full address) */}
            {(order.recipientFirstName || order.deliveryMethod) && (
              <div className="rounded-2xl bg-white border border-border/40 p-4">
                <h3 className="font-bold text-sm mb-3">Доставка</h3>
                <div className="space-y-2 text-sm">
                  {order.recipientFirstName && (
                    <div className="flex items-start gap-2.5">
                      <Phone className="w-4 h-4 text-muted shrink-0 mt-0.5" />
                      <div>
                        <span className="text-muted text-xs block">Получатель</span>
                        {order.recipientLastName} {order.recipientFirstName} {order.recipientMiddleName}
                        {order.recipientPhone && <span className="block text-xs text-muted">{order.recipientPhone}</span>}
                      </div>
                    </div>
                  )}
                  {order.deliveryMethod && (
                    <div className="flex items-start gap-2.5">
                      <Truck className="w-4 h-4 text-muted shrink-0 mt-0.5" />
                      <div>
                        <span className="text-muted text-xs block">Способ доставки</span>
                        {order.deliveryMethod}
                        {order.deliveryAddress && <span className="block text-xs text-muted">{order.deliveryAddress}</span>}
                      </div>
                    </div>
                  )}
                  {order.desiredPurchaseDate && (
                    <div className="flex items-center gap-2.5">
                      <CalendarDays className="w-4 h-4 text-muted shrink-0" />
                      <div>
                        <span className="text-muted text-xs block">Желаемая дата</span>
                        {new Date(order.desiredPurchaseDate).toLocaleDateString("ru-RU")}
                      </div>
                    </div>
                  )}
                  {order.commentToMediator && (
                    <div className="flex items-start gap-2.5">
                      <MessageSquare className="w-4 h-4 text-muted shrink-0 mt-0.5" />
                      <div>
                        <span className="text-muted text-xs block">Комментарий</span>
                        {order.commentToMediator}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Action buttons */}
            {(canComplete || canCancel) && (
              <div className="flex gap-2.5">
                {canComplete && (
                  <Button type="button" onClick={handleComplete} loading={actionLoading} className="flex-1 py-2.5 rounded-xl text-sm">
                    <CheckCircle2 className="w-4 h-4 mr-1.5" /> Подтвердить получение
                  </Button>
                )}
                {canCancel && (
                  <button
                    type="button"
                    onClick={handleCancel}
                    disabled={actionLoading}
                    className="px-4 py-2.5 rounded-xl border border-red-200 text-red-600 text-sm font-medium hover:bg-red-50 transition disabled:opacity-50"
                  >
                    Отменить
                  </button>
                )}
              </div>
            )}
          </div>

          {/* ═══════════════════════════════════════════════════════════
              RIGHT / CHAT PANEL
          ══════════════════════════════════════════════════════════════ */}
          <div className={`flex-col ${mobileTab === "details" ? "hidden lg:flex" : "flex"}`}>

            {/* ── Mobile: chat list view ── */}
            {mobileTab === "chats" && chatView === "list" && (
              <MobileChatListView
                chats={chats}
                order={order}
                showSelectButtons={showSelectButtons}
                actionLoading={actionLoading}
                onOpenChat={(chat) => { setMobileTab("chats"); openChat(chat); }}
                onSelectExecutor={handleSelectExecutor}
              />
            )}

            {/* ── Desktop: full chat panel / Mobile: active chat view ── */}
            <DesktopChatPanel
              chats={chats}
              activeChat={activeChat}
              messages={messages}
              msgInput={msgInput}
              sendingMsg={sendingMsg}
              user={user}
              messagesEndRef={messagesEndRef}
              inputRef={inputRef}
              showSelectButtons={showSelectButtons}
              actionLoading={actionLoading}
              onSelectChat={(chat) => { setActiveChat(chat); loadMessages(chat.id); }}
              onSend={handleSendMessage}
              onInputChange={setMsgInput}
              onSelectExecutor={handleSelectExecutor}
              visible={mobileTab === "chats" ? chatView === "chat" : true}
            />
          </div>

        </div>
      </main>
    </div>
  );
}

// ─── Mobile Chat List View ──────────────────────────────────────────────────

function MobileChatListView({
  chats,
  order,
  showSelectButtons,
  actionLoading,
  onOpenChat,
  onSelectExecutor,
}: {
  chats: any[];
  order: any;
  showSelectButtons: boolean;
  actionLoading: boolean;
  onOpenChat: (c: any) => void;
  onSelectExecutor: (mediatorId: string) => void;
}) {
  if (chats.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
        <div className="w-16 h-16 rounded-2xl bg-stone-100 flex items-center justify-center mb-4">
          <MessageSquare className="w-8 h-8 text-stone-400" />
        </div>
        <h3 className="font-bold text-base">Откликов пока нет</h3>
        <p className="text-sm text-muted mt-1 max-w-xs">
          Как только посредник откликнется на ваш заказ, здесь появится чат с ним
        </p>
      </div>
    );
  }

  return (
    <div className="divide-y divide-border/40">
      {chats.map((chat) => (
        <button
          key={chat.id}
          type="button"
          onClick={() => onOpenChat(chat)}
          className="w-full flex items-center gap-3 px-4 py-3.5 hover:bg-stone-50 transition text-left"
        >
          <Avatar name={chat.mediator?.firstName} avatarUrl={chat.mediator?.avatarUrl} size="md" />
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-2">
              <p className="text-sm font-semibold">{chat.mediator?.firstName} {chat.mediator?.lastName}</p>
              {chat.lastMessage && (
                <span className="text-[11px] text-muted shrink-0">
                  {new Date(chat.lastMessage.createdAt).toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" })}
                </span>
              )}
            </div>
            {chat.mediator?.commissionRate && (
              <p className="text-[11px] text-muted flex items-center gap-1">
                <BadgeCheck className="w-3 h-3" /> Комиссия {chat.mediator.commissionRate}%
              </p>
            )}
            {chat.lastMessage ? (
              <p className="text-xs text-muted mt-0.5 line-clamp-1">{chat.lastMessage.content}</p>
            ) : (
              <p className="text-xs text-muted/60 mt-0.5 italic">Нет сообщений</p>
            )}
          </div>
          {showSelectButtons && (
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); onSelectExecutor(chat.mediator?.id); }}
              disabled={actionLoading}
              className="shrink-0 px-2.5 py-1.5 rounded-lg bg-gradient-to-r from-amber-500 to-orange-500 text-white text-[11px] font-bold shadow-sm disabled:opacity-50"
            >
              Выбрать
            </button>
          )}
        </button>
      ))}
    </div>
  );
}

// ─── Desktop Chat Panel ─────────────────────────────────────────────────────

function DesktopChatPanel({
  chats,
  activeChat,
  messages,
  msgInput,
  sendingMsg,
  user,
  messagesEndRef,
  inputRef,
  showSelectButtons,
  actionLoading,
  onSelectChat,
  onSend,
  onInputChange,
  onSelectExecutor,
  visible,
}: {
  chats: any[];
  activeChat: any;
  messages: any[];
  msgInput: string;
  sendingMsg: boolean;
  user: any;
  messagesEndRef: React.RefObject<HTMLDivElement | null>;
  inputRef: React.RefObject<HTMLInputElement | null>;
  showSelectButtons: boolean;
  actionLoading: boolean;
  onSelectChat: (c: any) => void;
  onSend: () => void;
  onInputChange: (v: string) => void;
  onSelectExecutor: (mediatorId: string) => void;
  visible: boolean;
}) {
  if (!visible) return null;

  return (
    <div className="rounded-2xl bg-white border border-border/40 overflow-hidden flex flex-col lg:sticky lg:top-5" style={{ height: "calc(100vh - 140px)", minHeight: 480 }}>
      
      {/* ── Mediator thread tabs (profi.ru style) ── */}
      {chats.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center text-center p-8">
          <div className="w-16 h-16 rounded-2xl bg-stone-100 flex items-center justify-center mb-4">
            <MessageSquare className="w-8 h-8 text-stone-400" />
          </div>
          <h3 className="font-bold">Ждём откликов</h3>
          <p className="text-sm text-muted mt-1 max-w-xs">
            Когда посредник откликнется, здесь появится чат с ним
          </p>
        </div>
      ) : (
        <>
          {/* Thread list header */}
          <div className="border-b border-border/40 overflow-x-auto">
            <div className="flex min-w-max">
              {chats.map((chat) => {
                const isActive = activeChat?.id === chat.id;
                return (
                  <button
                    key={chat.id}
                    type="button"
                    onClick={() => onSelectChat(chat)}
                    className={`flex items-center gap-2.5 px-4 py-3 border-b-2 transition shrink-0 ${
                      isActive
                        ? "border-amber-500 bg-amber-50/50"
                        : "border-transparent hover:bg-stone-50"
                    }`}
                  >
                    <Avatar name={chat.mediator?.firstName} avatarUrl={chat.mediator?.avatarUrl} size="sm" />
                    <div className="text-left">
                      <p className={`text-xs font-semibold leading-tight ${isActive ? "text-amber-900" : "text-foreground"}`}>
                        {chat.mediator?.firstName} {chat.mediator?.lastName?.[0]}.
                      </p>
                      {chat.mediator?.commissionRate && (
                        <p className="text-[10px] text-muted">{chat.mediator.commissionRate}%</p>
                      )}
                    </div>
                    {!chat.isActive && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-stone-100 text-stone-500">закрыт</span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* ── Active chat header ── */}
          {activeChat && (
            <div className="px-4 py-3 border-b border-border/40 bg-stone-50/30 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <Avatar name={activeChat.mediator?.firstName} avatarUrl={activeChat.mediator?.avatarUrl} size="sm" />
                <div>
                  <p className="text-sm font-bold leading-none">
                    {activeChat.mediator?.firstName} {activeChat.mediator?.lastName}
                  </p>
                  {activeChat.mediator?.commissionRate && (
                    <p className="text-xs text-muted flex items-center gap-1 mt-0.5">
                      <BadgeCheck className="w-3 h-3" /> Комиссия {activeChat.mediator.commissionRate}%
                    </p>
                  )}
                </div>
              </div>
              {showSelectButtons && (
                <button
                  type="button"
                  onClick={() => onSelectExecutor(activeChat.mediator?.id)}
                  disabled={actionLoading}
                  className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 text-white text-xs font-bold shadow-md shadow-amber-500/20 hover:shadow-lg hover:-translate-y-0.5 transition-all disabled:opacity-50 disabled:translate-y-0"
                >
                  Выбрать исполнителя
                </button>
              )}
            </div>
          )}

          {/* ── Messages ── */}
          <div className="flex-1 overflow-y-auto px-4 py-3 space-y-2">
            {!activeChat && (
              <div className="flex items-center justify-center h-full text-sm text-muted">
                Выберите посредника выше
              </div>
            )}
            {activeChat && messages.length === 0 && (
              <div className="flex flex-col items-center justify-center h-full text-center">
                <MessageSquare className="w-8 h-8 text-stone-300 mb-2" />
                <p className="text-sm text-muted">Нет сообщений. Начните диалог!</p>
              </div>
            )}
            {messages.map((msg: any) => {
              const isSystem = msg.type === "SYSTEM";
              const isMine = msg.senderId === user.id;
              return (
                <div key={msg.id} className={`flex ${isSystem ? "justify-center" : isMine ? "justify-end" : "justify-start"}`}>
                  {isSystem ? (
                    <div className="max-w-[85%] px-3 py-2 rounded-xl bg-amber-50 border border-amber-200/60 text-xs text-amber-800 text-center">
                      {msg.content}
                    </div>
                  ) : (
                    <div className={`max-w-[78%] flex flex-col ${isMine ? "items-end" : "items-start"}`}>
                      {!isMine && (
                        <div className="flex items-center gap-1.5 mb-1">
                          <Avatar name={msg.sender?.firstName} avatarUrl={msg.sender?.avatarUrl} size="xs" />
                          <span className="text-[11px] text-muted font-medium">{msg.sender?.firstName}</span>
                        </div>
                      )}
                      <div className={`px-3.5 py-2.5 rounded-2xl text-sm leading-relaxed ${
                        isMine
                          ? "bg-gradient-to-br from-amber-500 to-orange-500 text-white rounded-br-sm"
                          : "bg-stone-100 text-foreground rounded-bl-sm"
                      }`}>
                        {msg.content}
                      </div>
                      <span className={`text-[10px] mt-1 ${isMine ? "text-muted text-right" : "text-muted"}`}>
                        {new Date(msg.createdAt).toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" })}
                      </span>
                    </div>
                  )}
                </div>
              );
            })}
            <div ref={messagesEndRef} />
          </div>

          {/* ── Message input ── */}
          {activeChat?.isActive ? (
            <div className="px-3 py-2.5 border-t border-border/40 bg-white">
              <div className="flex items-end gap-2">
                <input
                  ref={inputRef}
                  type="text"
                  value={msgInput}
                  onChange={(e) => onInputChange(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      onSend();
                    }
                  }}
                  placeholder="Написать сообщение..."
                  className="flex-1 px-4 py-2.5 rounded-xl border border-border/60 bg-stone-50 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400/50 focus:border-amber-400 focus:bg-white transition"
                />
                <button
                  type="button"
                  onClick={onSend}
                  disabled={sendingMsg || !msgInput.trim()}
                  className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-orange-500 text-white flex items-center justify-center hover:opacity-90 transition shadow-sm disabled:opacity-40 shrink-0"
                >
                  <Send className="w-4 h-4" />
                </button>
              </div>
            </div>
          ) : activeChat && !activeChat.isActive ? (
            <div className="px-4 py-3 border-t border-border/40 text-center text-xs text-muted bg-stone-50">
              Этот чат закрыт
            </div>
          ) : null}
        </>
      )}
    </div>
  );
}

// ─── Avatar helper ──────────────────────────────────────────────────────────

function Avatar({ name, avatarUrl, size }: { name?: string; avatarUrl?: string | null; size: "xs" | "sm" | "md" }) {
  const sizes = { xs: "w-5 h-5 text-[9px]", sm: "w-8 h-8 text-xs", md: "w-10 h-10 text-sm" };
  const initial = name?.[0]?.toUpperCase() || "?";
  if (avatarUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={avatarUrl} alt={name} className={`${sizes[size]} rounded-full object-cover shrink-0`} />
    );
  }
  return (
    <div className={`${sizes[size]} rounded-full bg-gradient-to-br from-indigo-400 to-purple-500 text-white font-bold flex items-center justify-center shrink-0`}>
      {initial}
    </div>
  );
}
