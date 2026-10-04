"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

/* ─── SVG icons ─── */
function VkIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M25.54 34.58c-10.94 0-17.18-7.5-17.44-19.98h5.48c.18 9.14 4.2 13.02 7.4 13.82V14.6h5.16v7.88c3.16-.34 6.48-3.94 7.6-7.88h5.16c-.86 4.86-4.46 8.46-7.02 9.94 2.56 1.2 6.64 4.36 8.2 10.04h-5.68c-1.22-3.82-4.28-6.78-8.26-7.18v7.18h-.6z" fill="currentColor"/>
    </svg>
  );
}

function MaxIcon({ className }: { className?: string }) {
  return (
    <img src="/icons/max-icon.png" alt="Max" className={`${className} object-contain`} />
  );
}

export function NotifModal({ onClose }: { onClose: () => void }) {
  const router = useRouter();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    requestAnimationFrame(() => setVisible(true));
  }, []);

  const close = () => {
    setVisible(false);
    setTimeout(onClose, 250);
  };

  const goToNotifs = () => {
    setVisible(false);
    setTimeout(() => {
      onClose();
      router.push("/settings/notifications");
    }, 250);
  };

  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center p-5 transition-all duration-300 ${visible ? "bg-black/60 backdrop-blur-sm" : "bg-transparent"}`}
      onClick={close}
    >
      <div
        onClick={e => e.stopPropagation()}
        className={`w-full max-w-sm bg-card rounded-3xl border border-border p-6 space-y-5 shadow-2xl transition-all duration-300 ${visible ? "opacity-100 scale-100 translate-y-0" : "opacity-0 scale-95 translate-y-4"}`}
      >
        {/* Header */}
        <div className="flex flex-col items-center gap-2 text-center">
          <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center">
            <svg className="w-7 h-7 text-primary" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
              <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
            </svg>
          </div>
          <h2 className="text-lg font-bold">Подключите уведомления</h2>
          <p className="text-xs text-muted leading-relaxed max-w-[280px]">
            Узнайте первым о результате проверки и новых заказах
          </p>
        </div>

        {/* Two compact cards */}
        <div className="flex gap-3">
          {/* VK */}
          <button
            onClick={goToNotifs}
            className="flex-1 flex items-center gap-3 py-3.5 px-4 rounded-2xl border-2 border-[#0077FF]/25 bg-[#0077FF]/5 hover:bg-[#0077FF]/10 active:scale-[0.97] transition"
          >
            <div className="w-10 h-10 rounded-xl bg-[#0077FF] flex items-center justify-center shrink-0 shadow-md shadow-[#0077FF]/25">
              <VkIcon className="w-6 h-6 text-white" />
            </div>
            <div className="text-left min-w-0">
              <p className="font-bold text-sm">VK</p>
              <p className="text-[10px] text-muted">Подключить</p>
            </div>
          </button>

          {/* Max */}
          <button
            onClick={goToNotifs}
            className="flex-1 flex items-center gap-3 py-3.5 px-4 rounded-2xl border-2 border-purple-400/25 bg-purple-500/5 hover:bg-purple-500/10 active:scale-[0.97] transition"
          >
            <div className="w-10 h-10 rounded-xl overflow-hidden flex items-center justify-center shrink-0 shadow-md shadow-purple-500/25">
              <MaxIcon className="w-10 h-10" />
            </div>
            <div className="text-left min-w-0">
              <p className="font-bold text-sm">Max</p>
              <p className="text-[10px] text-muted">Подключить</p>
            </div>
          </button>
        </div>

        {/* Benefits */}
        <div className="bg-accent/60 rounded-xl px-4 py-3 space-y-1.5">
          <p className="text-[10px] font-semibold text-muted uppercase tracking-wider">Что вы получите</p>
          <div className="space-y-1 text-xs text-foreground">
            <div className="flex items-center gap-2"><span className="text-green-500">✓</span><span>Результат проверки заявки</span></div>
            <div className="flex items-center gap-2"><span className="text-green-500">✓</span><span>Уведомления о новых заказах</span></div>
            <div className="flex items-center gap-2"><span className="text-green-500">✓</span><span>Важные обновления сервиса</span></div>
          </div>
        </div>

        <button
          onClick={close}
          className="w-full py-2.5 text-sm text-muted hover:text-foreground transition font-medium rounded-xl hover:bg-accent"
        >
          Не сейчас
        </button>
      </div>
    </div>
  );
}
