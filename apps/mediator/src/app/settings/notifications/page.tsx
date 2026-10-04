"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft, Check, X, Loader2 } from "lucide-react";
import { getToken } from "@/lib/auth";
import { api } from "@/lib/api";

/* ─── SVG Icons ─── */
function VkIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M25.54 34.58c-10.94 0-17.18-7.5-17.44-19.98h5.48c.18 9.14 4.2 13.02 7.4 13.82V14.6h5.16v7.88c3.16-.34 6.48-3.94 7.6-7.88h5.16c-.86 4.86-4.46 8.46-7.02 9.94 2.56 1.2 6.64 4.36 8.2 10.04h-5.68c-1.22-3.82-4.28-6.78-8.26-7.18v7.18h-.6z" fill="currentColor"/>
    </svg>
  );
}

function TelegramIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M38.8 10.4L34.2 36.8c-.3 1.6-1.2 2-2.5 1.2l-6.8-5-3.3 3.2c-.4.4-.7.7-1.4.7l.5-7L33.5 18c.5-.5-.1-.7-.8-.3L16.9 27.8l-6.6-2.1c-1.4-.4-1.5-1.4.3-2.1l25.8-10c1.2-.4 2.2.3 1.8 2.1l.6-5.3z" fill="currentColor"/>
    </svg>
  );
}

function MaxIcon({ className }: { className?: string }) {
  return (
    <img src="/icons/max-icon.png" alt="Max" className={`${className} object-contain`} />
  );
}

type ChannelKey = "TELEGRAM" | "VK" | "MAX";

interface Network {
  id: ChannelKey;
  name: string;
  icon: React.ElementType;
  color: string;
  bgColor: string;
  borderColor: string;
  shadowColor: string;
  description: string;
}

const NETWORKS: Network[] = [
  {
    id: "TELEGRAM",
    name: "Telegram",
    icon: TelegramIcon,
    color: "#26A5E4",
    bgColor: "bg-[#26A5E4]",
    borderColor: "border-[#26A5E4]/25",
    shadowColor: "shadow-[#26A5E4]/25",
    description: "Уведомления через Telegram-бот",
  },
  {
    id: "VK",
    name: "ВКонтакте",
    icon: VkIcon,
    color: "#0077FF",
    bgColor: "bg-[#0077FF]",
    borderColor: "border-[#0077FF]/25",
    shadowColor: "shadow-[#0077FF]/25",
    description: "Уведомления через сообщения сообщества ВК",
  },
  {
    id: "MAX",
    name: "Max",
    icon: MaxIcon,
    color: "#8B5CF6",
    bgColor: "",
    borderColor: "border-purple-400/25",
    shadowColor: "shadow-purple-500/25",
    description: "Уведомления через бот в Max",
  },
];

interface Sub {
  channel: ChannelKey;
  active: boolean;
  createdAt: string;
}

export default function NotificationSettingsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [subs, setSubs] = useState<Sub[]>([]);
  const [connecting, setConnecting] = useState<ChannelKey | null>(null);
  const [disconnecting, setDisconnecting] = useState<ChannelKey | null>(null);
  const [vkToken, setVkToken] = useState<string | null>(null);
  const [vkModalOpen, setVkModalOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchSubs = useCallback(async () => {
    try {
      const data = await api.get<Sub[]>("/notifications/my");
      setSubs(data);
    } catch { /* ignore */ }
  }, []);

  useEffect(() => {
    if (!getToken()) { router.replace("/login"); return; }
    fetchSubs().finally(() => setLoading(false));
  }, [router, fetchSubs]);

  const handleConnect = async (channel: ChannelKey) => {
    setConnecting(channel);
    setError(null);
    try {
      const res = await api.post<{ link: string; token: string }>(`/notifications/link/${channel}`, {});
      if (channel === "VK") {
        setVkToken(res.token);
        setVkModalOpen(true);
        // VK: пользователь должен отправить токен боту в ЛС
        // Откроем ссылку на сообщество
        window.open(res.link, "_blank", "noopener");
      } else {
        // Telegram/Max: просто открыть ссылку на бота
        window.open(res.link, "_blank", "noopener");
      }
      // Поллинг статуса подписки
      let attempts = 0;
      const poll = setInterval(async () => {
        attempts++;
        try {
          const fresh = await api.get<Sub[]>("/notifications/my");
          setSubs(fresh);
          const found = fresh.find(s => s.channel === channel && s.active);
          if (found || attempts > 30) {
            clearInterval(poll);
            setConnecting(null);
            setVkModalOpen(false);
          }
        } catch { /* ignore */ }
      }, 3000);
      // Через 90 секунд остановим поллинг
      setTimeout(() => {
        clearInterval(poll);
        fetchSubs();
        setConnecting(null);
        setVkModalOpen(false);
      }, 90_000);
    } catch (e: any) {
      setError(e?.message ?? "Ошибка подключения");
      setConnecting(null);
    }
  };

  const handleDisconnect = async (channel: ChannelKey) => {
    setDisconnecting(channel);
    try {
      await api.delete(`/notifications/${channel}`);
      setSubs(prev => prev.filter(s => s.channel !== channel));
    } catch { /* ignore */ }
    setDisconnecting(null);
  };

  const isConnected = (ch: ChannelKey) => subs.some(s => s.channel === ch && s.active);
  const connectedCount = subs.filter(s => s.active).length;

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="w-9 h-9 rounded-full border-4 border-primary border-t-transparent animate-spin" />
    </div>
  );

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <div className="sticky top-0 z-30 bg-card/95 backdrop-blur border-b border-border h-14 flex items-center px-4 gap-3">
        <button onClick={() => router.back()} className="text-muted hover:text-foreground transition">
          <ChevronLeft className="w-5 h-5" />
        </button>
        <h1 className="font-bold flex-1">Уведомления</h1>
        {connectedCount > 0 && (
          <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-green-500/10 text-green-600">
            {connectedCount} подкл.
          </span>
        )}
      </div>

      <main className="flex-1 max-w-lg mx-auto w-full px-4 py-6 space-y-5">

        {/* Info */}
        <div className="bg-primary/5 rounded-2xl border border-primary/15 p-4 flex gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
            <svg className="w-5 h-5 text-primary" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
              <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
            </svg>
          </div>
          <div>
            <p className="font-semibold text-sm">Будьте в курсе</p>
            <p className="text-xs text-muted mt-0.5 leading-relaxed">
              Подключите хотя бы один канал, чтобы не пропустить новые заказы и результат проверки.
            </p>
          </div>
        </div>

        {/* Network cards */}
        <div className="space-y-3">
          <p className="text-[10px] font-semibold text-muted uppercase tracking-wider px-1">Каналы уведомлений</p>

          {NETWORKS.map((net) => {
            const active = isConnected(net.id);
            const isConnecting = connecting === net.id;
            const isRemoving = disconnecting === net.id;
            const Icon = net.icon;
            return (
              <div
                key={net.id}
                className={`bg-card rounded-2xl border overflow-hidden transition-all duration-300 ${
                  isRemoving ? "opacity-50 scale-[0.98]" :
                  active ? `${net.borderColor} border-2` : "border-border"
                }`}
              >
                <div className="flex items-center gap-4 p-4">
                  <div className={`w-12 h-12 rounded-xl overflow-hidden ${net.bgColor} flex items-center justify-center shrink-0 shadow-md ${net.shadowColor}`}>
                    <Icon className={`${net.id === "MAX" ? "w-12 h-12" : "w-7 h-7"} text-white`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-bold text-sm">{net.name}</p>
                      {active && (
                        <span className="flex items-center gap-0.5 text-[10px] px-1.5 py-0.5 rounded-full bg-green-500/10 text-green-600 font-medium">
                          <Check className="w-2.5 h-2.5" /> Подключено
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-muted mt-0.5">{net.description}</p>
                  </div>
                </div>

                <div className="border-t border-border px-4 py-3 flex gap-2">
                  {active ? (
                    <button
                      onClick={() => handleDisconnect(net.id)}
                      disabled={!!disconnecting}
                      className="flex-1 py-2.5 rounded-xl border border-danger/20 bg-danger/5 text-danger text-xs font-semibold hover:bg-danger/10 transition flex items-center justify-center gap-1.5 disabled:opacity-50"
                    >
                      <X className="w-3.5 h-3.5" /> Отключить
                    </button>
                  ) : (
                    <button
                      onClick={() => handleConnect(net.id)}
                      disabled={!!connecting}
                      className="flex-1 py-2.5 rounded-xl text-white text-xs font-semibold transition flex items-center justify-center gap-1.5 active:scale-[0.97] disabled:opacity-60"
                      style={{ backgroundColor: net.color }}
                    >
                      {isConnecting ? (
                        <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Ожидание...</>
                      ) : (
                        <><Check className="w-3.5 h-3.5" /> Подключить</>
                      )}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* VK token modal */}
        {vkModalOpen && vkToken && (
          <div className="bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-2xl p-4 space-y-2">
            <p className="text-sm font-semibold text-blue-700 dark:text-blue-300">Отправьте код боту ВК</p>
            <p className="text-xs text-muted">Скопируйте код ниже и отправьте его в сообщения нашему сообществу ВКонтакте:</p>
            <div className="flex items-center gap-2">
              <code className="flex-1 bg-white dark:bg-card rounded-lg px-3 py-2 text-xs font-mono border border-border select-all break-all">{vkToken}</code>
              <button
                onClick={() => navigator.clipboard.writeText(vkToken)}
                className="px-3 py-2 rounded-lg bg-blue-500 text-white text-xs font-medium shrink-0"
              >
                Копировать
              </button>
            </div>
          </div>
        )}

        {/* What you get */}
        <div className="bg-accent/60 rounded-2xl px-5 py-4 space-y-3">
          <p className="text-xs font-semibold text-muted uppercase tracking-wider">Какие уведомления вы получите</p>
          <div className="space-y-2 text-xs text-foreground">
            <div className="flex items-start gap-2.5">
              <span className="text-green-500 mt-0.5 shrink-0">✓</span>
              <span>Результат проверки заявки администратором</span>
            </div>
            <div className="flex items-start gap-2.5">
              <span className="text-green-500 mt-0.5 shrink-0">✓</span>
              <span>Новые заказы — мгновенное оповещение</span>
            </div>
            <div className="flex items-start gap-2.5">
              <span className="text-green-500 mt-0.5 shrink-0">✓</span>
              <span>Сообщения от покупателей</span>
            </div>
            <div className="flex items-start gap-2.5">
              <span className="text-green-500 mt-0.5 shrink-0">✓</span>
              <span>Важные обновления и напоминания</span>
            </div>
          </div>
        </div>

        {error && (
          <div className="bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded-2xl px-4 py-3 flex gap-3">
            <span className="text-red-500 text-lg">❌</span>
            <p className="text-xs text-red-700 dark:text-red-300 leading-relaxed">{error}</p>
          </div>
        )}

        {connectedCount === 0 && (
          <div className="bg-warning/5 border border-warning/20 rounded-2xl px-4 py-3 flex gap-3">
            <span className="text-warning text-lg">⚠️</span>
            <p className="text-xs text-muted leading-relaxed">
              Ни один канал не подключён. Вы можете пропустить важные уведомления о заказах.
            </p>
          </div>
        )}

      </main>
    </div>
  );
}
