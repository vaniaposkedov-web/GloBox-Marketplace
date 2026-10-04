"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Send, RotateCcw, Headphones, ArrowLeft } from "lucide-react";
import { api } from "@/lib/api";
import { getToken } from "@/lib/auth";

interface Message {
  id: string;
  sender: "USER" | "ADMIN" | "SYSTEM";
  text: string;
  createdAt: string;
}

interface Chat {
  id: string;
  status: "OPEN" | "WAITING_USER" | "WAITING_ADMIN" | "CLOSED";
  mode: "bot" | "waiting" | "admin";
  messages: Message[];
  createdAt: string;
}

const MODE_INFO: Record<string, { label: string; color: string; dotColor: string }> = {
  bot:     { label: "AI-ассистент",          color: "text-blue-600",  dotColor: "bg-blue-500" },
  waiting: { label: "Ожидание оператора...", color: "text-amber-600", dotColor: "bg-amber-500 animate-pulse" },
  admin:   { label: "Оператор подключён",    color: "text-green-600", dotColor: "bg-green-500" },
};

export default function SupportPage() {
  const router = useRouter();
  const [chat, setChat]       = useState<Chat | null>(null);
  const [loading, setLoading] = useState(true);
  const [msgText, setMsgText] = useState("");
  const [sending, setSending] = useState(false);
  const [botTyping, setBotTyping]     = useState(false);
  const [adminTyping, setAdminTyping] = useState(false);
  const bottomRef  = useRef<HTMLDivElement>(null);
  const prevMsgCountRef = useRef(0);
  const chatRef    = useRef<Chat | null>(null);
  const typingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const loadChat = useCallback(async (showTyping = false) => {
    try {
      const data = await api.get<Chat>("/support/chat");
      const prev = chatRef.current;
      if (showTyping && data && prev) {
        const newMsgs = data.messages.length - prev.messages.length;
        if (newMsgs > 0) {
          const lastNew = data.messages[data.messages.length - 1];
          if (lastNew.sender === "ADMIN") {
            setAdminTyping(true);
            setTimeout(() => { chatRef.current = data; setChat(data); setAdminTyping(false); }, 800);
            return data;
          }
          if (lastNew.sender === "SYSTEM") {
            setBotTyping(true);
            setTimeout(() => { chatRef.current = data; setChat(data); setBotTyping(false); }, 800);
            return data;
          }
        }
      }
      chatRef.current = data;
      setChat(data);
      return data;
    } catch { return null; }
  }, []);

  useEffect(() => {
    if (!getToken()) { router.replace("/login"); return; }
    loadChat().finally(() => setLoading(false));
  }, [router, loadChat]);

  // Polling every 3s
  useEffect(() => {
    if (!chat || chat.status === "CLOSED") return;
    const iv = setInterval(() => loadChat(true), 3000);
    return () => clearInterval(iv);
  }, [chat?.id, chat?.status, loadChat]);

  // Auto-scroll on new messages
  useEffect(() => {
    const count = chat?.messages.length ?? 0;
    if (count > prevMsgCountRef.current) {
      setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: "smooth" }), 50);
    }
    prevMsgCountRef.current = count;
  }, [chat?.messages.length]);

  const sendMessage = async () => {
    if (!msgText.trim() || sending || !chat) return;
    const text = msgText.trim();
    setMsgText("");
    setSending(true);

    // Optimistic
    setChat(prev => prev ? {
      ...prev,
      messages: [...prev.messages, { id: `t-${Date.now()}`, sender: "USER", text, createdAt: new Date().toISOString() }],
    } : prev);

    try {
      await api.post("/support/chat/send", { text });
      if (chat.mode === "bot") {
        setBotTyping(true);
        const delay = 1000 + Math.random() * 1500;
        if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
        typingTimerRef.current = setTimeout(async () => { await loadChat(); setBotTyping(false); }, delay);
      } else if (chat.mode === "admin") {
        setAdminTyping(true);
        if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
        typingTimerRef.current = setTimeout(async () => { await loadChat(); setAdminTyping(false); }, 1200);
      } else {
        await loadChat();
      }
    } catch { /* ignore */ }
    finally { setSending(false); }
  };

  const closeChat    = async () => { try { await api.post("/support/chat/close"); await loadChat(); } catch {} };
  const startNewChat = async () => { setLoading(true); try { await api.post("/support/chat/new"); await loadChat(); } catch {} finally { setLoading(false); } };

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col">
        <div className="flex-1 flex items-center justify-center text-muted">
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            Загрузка чата...
          </div>
        </div>
      </div>
    );
  }

  const mode    = MODE_INFO[chat?.mode ?? "bot"];
  const isClosed = chat?.status === "CLOSED";

  return (
    <div className="h-screen flex flex-col bg-background">
      {/* ── Chat header ── */}
      <div className="shrink-0 border-b border-border bg-card">
        <div className="max-w-3xl mx-auto w-full px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={() => router.push("/profile")} className="text-muted hover:text-foreground transition shrink-0">
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div className="relative">
              <div className="w-11 h-11 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 text-white flex items-center justify-center text-lg font-bold shadow-sm">
                G
              </div>
              <span className={`absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full border-2 border-white ${mode.dotColor}`} />
            </div>
            <div>
              <p className="font-semibold text-[15px]">GloBox Поддержка</p>
              <p className={`text-xs ${mode.color} font-medium`}>{mode.label}</p>
            </div>
          </div>
          {!isClosed && (
            <button onClick={closeChat}
              className="text-xs text-muted hover:text-red-500 px-2.5 py-1.5 rounded-lg hover:bg-red-50 transition">
              Завершить
            </button>
          )}
        </div>
      </div>

      {/* ── Closed state ── */}
      {isClosed ? (
        <div className="flex-1 flex flex-col items-center justify-center gap-4 text-muted px-4 max-w-3xl mx-auto w-full">
          <div className="w-16 h-16 rounded-full bg-accent flex items-center justify-center">
            <svg className="w-8 h-8 opacity-30" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div className="text-center">
            <p className="font-medium text-foreground">Чат завершён</p>
            <p className="text-sm mt-1">Спасибо за обращение! Если нужна помощь — начните новый чат.</p>
          </div>
          <button onClick={startNewChat}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-primary text-white rounded-xl hover:bg-primary/90 transition font-medium text-sm shadow-sm">
            <RotateCcw className="w-4 h-4" /> Новый чат
          </button>
        </div>
      ) : (
        <>
          {/* ── Messages ── */}
          <div className="flex-1 overflow-y-auto">
            <div className="max-w-3xl mx-auto w-full px-4 py-4 space-y-3">
              {chat && (
                <div className="text-center mb-2">
                  <span className="text-[11px] text-muted bg-accent/70 px-3 py-1 rounded-full">
                    {new Date(chat.createdAt).toLocaleDateString("ru-RU", { day: "numeric", month: "long" })}
                  </span>
                </div>
              )}

              {chat?.messages.map(m => {
                const isUser  = m.sender === "USER";
                const isAdmin = m.sender === "ADMIN";
                return (
                  <div key={m.id} className={`flex ${isUser ? "justify-end" : "justify-start"} items-end gap-2`}>
                    {!isUser && (
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 text-white text-xs font-bold shadow-sm ${
                        isAdmin ? "bg-gradient-to-br from-green-500 to-emerald-600" : "bg-gradient-to-br from-blue-500 to-indigo-600"
                      }`}>
                        {isAdmin ? <Headphones className="w-4 h-4" /> : "G"}
                      </div>
                    )}
                    <div className={`max-w-[78%] text-sm ${
                      isUser
                        ? "bg-primary text-white rounded-2xl rounded-br-sm px-4 py-2.5 shadow-sm"
                        : isAdmin
                        ? "bg-green-50 border border-green-100 text-foreground rounded-2xl rounded-bl-sm px-4 py-2.5"
                        : "bg-card border border-border text-foreground rounded-2xl rounded-bl-sm px-4 py-2.5 shadow-sm"
                    }`}>
                      {isAdmin && <p className="text-[10px] font-semibold text-green-600 mb-0.5">Оператор поддержки</p>}
                      {!isUser && !isAdmin && <p className="text-[10px] font-semibold text-blue-500 mb-0.5">GloBox Помощник</p>}
                      <p className="whitespace-pre-wrap leading-relaxed">{m.text}</p>
                      <p className={`text-[10px] mt-1.5 text-right ${isUser ? "text-white/50" : "text-muted"}`}>
                        {new Date(m.createdAt).toLocaleString("ru-RU", { hour: "2-digit", minute: "2-digit" })}
                      </p>
                    </div>
                  </div>
                );
              })}

              {/* Typing indicator */}
              {(botTyping || adminTyping) && (
                <div className="flex items-end gap-2">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold shadow-sm ${
                    adminTyping ? "bg-gradient-to-br from-green-500 to-emerald-600" : "bg-gradient-to-br from-blue-500 to-indigo-600"
                  }`}>
                    {adminTyping ? <Headphones className="w-4 h-4" /> : "G"}
                  </div>
                  <div className="bg-card border border-border rounded-2xl rounded-bl-sm px-4 py-3 shadow-sm">
                    <p className={`text-[10px] font-semibold mb-1 ${adminTyping ? "text-green-600" : "text-blue-500"}`}>
                      {adminTyping ? "Оператор печатает" : "GloBox Помощник печатает"}
                    </p>
                    <div className="flex gap-1.5">
                      <span className="w-2 h-2 bg-muted rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                      <span className="w-2 h-2 bg-muted rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                      <span className="w-2 h-2 bg-muted rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                    </div>
                  </div>
                </div>
              )}

              {chat?.mode === "waiting" && !botTyping && (
                <div className="text-center py-2">
                  <span className="text-xs text-amber-600 bg-amber-50 border border-amber-100 px-3 py-1.5 rounded-full inline-flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                    Оператор скоро подключится
                  </span>
                </div>
              )}

              {chat?.mode === "admin" && chat.messages.length > 0 &&
               chat.messages[chat.messages.length - 1].sender === "ADMIN" && (
                <div className="text-center py-1">
                  <span className="text-[11px] text-green-600 bg-green-50 border border-green-100 px-3 py-1 rounded-full">
                    Оператор на связи
                  </span>
                </div>
              )}

              <div ref={bottomRef} />
            </div>
          </div>

          {/* ── Input ── */}
          <div className="shrink-0 border-t border-border bg-card">
            <div className="max-w-3xl mx-auto w-full p-3">
              <div className="flex gap-2">
                <input
                  value={msgText}
                  onChange={e => setMsgText(e.target.value)}
                  onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
                  placeholder="Напишите сообщение..."
                  maxLength={5000}
                  disabled={sending}
                  className="flex-1 px-4 py-2.5 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 disabled:opacity-50"
                />
                <button
                  onClick={sendMessage}
                  disabled={sending || !msgText.trim()}
                  className="px-4 py-2.5 rounded-xl bg-primary text-white hover:bg-primary/90 transition disabled:opacity-50 shadow-sm"
                >
                  <Send className="w-4 h-4" />
                </button>
              </div>
              <p className="text-[10px] text-muted text-center mt-2">
                Напишите «оператор» чтобы подключить специалиста
              </p>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
