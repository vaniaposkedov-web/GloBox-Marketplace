"use client";

import { useState, useEffect, useCallback } from "react";
import { X, Bell, Check, Loader2 } from "lucide-react";
import { api } from "@/shared/api/client";

// ── SVG Icons ──────────────────────────────────────────────────────────────────

function TelegramIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 48 48" fill="none">
      <path d="M38.8 10.4L34.2 36.8c-.3 1.6-1.2 2-2.5 1.2l-6.8-5-3.3 3.2c-.4.4-.7.7-1.4.7l.5-7L33.5 18c.5-.5-.1-.7-.8-.3L16.9 27.8l-6.6-2.1c-1.4-.4-1.5-1.4.3-2.1l25.8-10c1.2-.4 2.2.3 1.8 2.1l.6-5.3z" fill="currentColor" />
    </svg>
  );
}

function VkIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 48 48" fill="none">
      <path d="M25.54 34.58c-10.94 0-17.18-7.5-17.44-19.98h5.48c.18 9.14 4.2 13.02 7.4 13.82V14.6h5.16v7.88c3.16-.34 6.48-3.94 7.6-7.88h5.16c-.86 4.86-4.46 8.46-7.02 9.94 2.56 1.2 6.64 4.36 8.2 10.04h-5.68c-1.22-3.82-4.28-6.78-8.26-7.18v7.18h-.6z" fill="currentColor" />
    </svg>
  );
}

// ── Types ──────────────────────────────────────────────────────────────────────

type ChannelKey = "TELEGRAM" | "VK" | "MAX";

interface Sub { channel: ChannelKey; active: boolean }

interface ChannelCfg {
  id: ChannelKey;
  name: string;
  desc: string;
  color: string;
  hoverBg: string;
  borderColor: string;
  icon: React.ReactNode;
}

const CHANNELS: ChannelCfg[] = [
  {
    id: "TELEGRAM",
    name: "Telegram",
    desc: "Самый удобный",
    color: "bg-[#26A5E4]",
    hoverBg: "hover:bg-[#26A5E4]/5",
    borderColor: "border-[#26A5E4]/30",
    icon: <TelegramIcon className="w-5 h-5 text-white" />,
  },
  {
    id: "VK",
    name: "ВКонтакте",
    desc: "Через сообщество",
    color: "bg-[#0077FF]",
    hoverBg: "hover:bg-[#0077FF]/5",
    borderColor: "border-[#0077FF]/30",
    icon: <VkIcon className="w-5 h-5 text-white" />,
  },
  {
    id: "MAX",
    name: "Max",
    desc: "Мессенджер от VK",
    color: "bg-white",
    hoverBg: "hover:bg-purple-50",
    borderColor: "border-purple-300/40",
    icon: (
      // eslint-disable-next-line @next/next/no-img-element
      <img src="/max-icon.png" alt="Max" className="w-5 h-5 object-contain" />
    ),
  },
];

const LS_KEY = "mp.notif_modal_seen";

// ── Component ──────────────────────────────────────────────────────────────────

export function NotifModal({ onClose, markSeen = false }: { onClose: () => void; markSeen?: boolean }) {
  const [visible, setVisible] = useState(false);
  const [connecting, setConnecting] = useState<ChannelKey | null>(null);
  const [connected, setConnected] = useState<ChannelKey | null>(null);
  const [vkToken, setVkToken] = useState<string | null>(null);

  useEffect(() => {
    requestAnimationFrame(() => setVisible(true));
  }, []);

  const close = useCallback(() => {
    setVisible(false);
    if (markSeen) { try { localStorage.setItem(LS_KEY, "1"); } catch {} }
    setTimeout(onClose, 280);
  }, [onClose, markSeen]);

  const handleConnect = async (ch: ChannelCfg) => {
    if (connecting || connected) return;
    setConnecting(ch.id);
    setVkToken(null);
    try {
      const res = await api.post<{ link: string; token: string }>(`/notifications/link/${ch.id}`, {});
      if (ch.id === "VK" && res.token) setVkToken(res.token);
      window.open(res.link, "_blank", "noopener");

      // Poll until subscription is active (max 90s)
      let attempts = 0;
      const poll = setInterval(async () => {
        attempts++;
        try {
          const subs = await api.get<Sub[]>("/notifications/my");
          const found = subs.find((s) => s.channel === ch.id && s.active);
          if (found || attempts > 30) {
            clearInterval(poll);
            if (found) {
              setConnected(ch.id);
              setConnecting(null);
              setTimeout(close, 1800);
            } else {
              setConnecting(null);
            }
          }
        } catch {
          clearInterval(poll);
          setConnecting(null);
        }
      }, 3000);

      setTimeout(() => {
        clearInterval(poll);
        setConnecting(null);
      }, 90_000);
    } catch {
      setConnecting(null);
    }
  };

  return (
    <div
      className={`fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 transition-all duration-300 ${
        visible ? "bg-black/50 backdrop-blur-sm" : "bg-transparent backdrop-blur-none"
      }`}
      onClick={close}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className={`w-full max-w-sm bg-white rounded-3xl shadow-2xl overflow-hidden transition-all duration-300 ${
          visible ? "opacity-100 translate-y-0 scale-100" : "opacity-0 translate-y-6 scale-95"
        }`}
      >
        {/* Header */}
        <div className="relative bg-gradient-to-br from-amber-400 to-orange-500 px-6 pt-6 pb-5 text-white">
          <button
            onClick={close}
            className="absolute top-4 right-4 w-7 h-7 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center transition"
          >
            <X className="w-4 h-4" />
          </button>
          <div className="w-12 h-12 rounded-2xl bg-white/20 flex items-center justify-center mb-3">
            <Bell className="w-6 h-6" />
          </div>
          <h2 className="text-lg font-bold leading-tight">Получайте уведомления о заказе</h2>
          <p className="text-[13px] text-white/80 mt-1 leading-snug">
            Узнайте первым, когда посредник напишет или изменится статус
          </p>
        </div>

        {/* Success state */}
        {connected && (
          <div className="px-6 py-5 flex flex-col items-center gap-2 text-center">
            <div className="w-14 h-14 rounded-full bg-emerald-100 flex items-center justify-center">
              <Check className="w-7 h-7 text-emerald-600" />
            </div>
            <p className="font-bold text-emerald-700">Уведомления подключены!</p>
            <p className="text-xs text-stone-500">Теперь вы будете получать сообщения в мессенджере</p>
          </div>
        )}

        {/* Channel list */}
        {!connected && (
          <div className="px-4 py-4 space-y-2">
            {CHANNELS.map((ch) => {
              const isThis = connecting === ch.id;
              return (
                <button
                  key={ch.id}
                  onClick={() => handleConnect(ch)}
                  disabled={!!connecting}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl border transition active:scale-[0.97] disabled:opacity-60 ${ch.hoverBg} ${ch.borderColor}`}
                >
                  <div className={`w-10 h-10 rounded-xl ${ch.color} flex items-center justify-center shrink-0 shadow-sm border border-black/5`}>
                    {ch.icon}
                  </div>
                  <div className="flex-1 text-left">
                    <p className="font-semibold text-sm text-stone-800">{ch.name}</p>
                    <p className="text-[11px] text-stone-400">{ch.desc}</p>
                  </div>
                  {isThis ? (
                    <Loader2 className="w-4 h-4 text-stone-400 animate-spin shrink-0" />
                  ) : (
                    <span className="text-xs font-semibold text-amber-600 shrink-0">Подключить →</span>
                  )}
                </button>
              );
            })}

            {/* VK token hint */}
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

        {/* Benefits strip */}
        {!connected && (
          <div className="mx-4 mb-4 bg-amber-50 rounded-xl px-4 py-3 border border-amber-100/80">
            <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-[11px] text-stone-600">
              <div className="flex items-center gap-1.5"><span className="text-amber-500">✓</span> Новые сообщения</div>
              <div className="flex items-center gap-1.5"><span className="text-amber-500">✓</span> Смена статуса</div>
              <div className="flex items-center gap-1.5"><span className="text-amber-500">✓</span> Готовность заказа</div>
              <div className="flex items-center gap-1.5"><span className="text-amber-500">✓</span> Изменение цен</div>
            </div>
          </div>
        )}

        <button
          onClick={close}
          className="w-full py-3.5 text-sm text-stone-400 hover:text-stone-600 transition font-medium border-t border-stone-100"
        >
          Не сейчас
        </button>
      </div>
    </div>
  );
}

/** Returns true if the modal has never been shown to this browser. */
export function shouldShowNotifModal(): boolean {
  try { return !localStorage.getItem(LS_KEY); } catch { return false; }
}
