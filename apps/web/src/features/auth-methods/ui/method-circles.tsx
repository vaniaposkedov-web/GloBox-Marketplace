"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

export type BuyerAuthMethod = "vk" | "max" | "phone" | "email";

function MaxIcon({ size = 20 }: { size?: number; active: boolean }) {
  return (
    <img
      src="/max-icon.png"
      alt="MAX"
      width={size}
      height={size}
      style={{ borderRadius: 5, display: "block" }}
    />
  );
}

interface MethodOption {
  id: BuyerAuthMethod;
  label: string;
  icon: (active: boolean) => ReactNode;
  activeColor: string;
  activeBg: string;
}

const OPTIONS: MethodOption[] = [
  {
    id: "vk",
    label: "ВКонтакте",
    icon: () => <img src="/vk-app-icon.svg" alt="VK" width={22} height={22} style={{ borderRadius: 5 }} />,
    activeColor: "#0077FF",
    activeBg: "rgba(0,119,255,0.12)",
  },
  {
    id: "max",
    label: "MAX",
    icon: () => <MaxIcon size={22} active={false} />,
    activeColor: "#7C3AED",
    activeBg: "rgba(124,58,237,0.12)",
  },
  {
    id: "phone",
    label: "Телефон",
    icon: () => <img src="/phone-app-icon.svg" alt="Телефон" width={22} height={22} style={{ borderRadius: 5 }} />,
    activeColor: "#22C55E",
    activeBg: "rgba(34,197,94,0.12)",
  },
  {
    id: "email",
    label: "Email",
    icon: () => <img src="/email-app-icon.svg" alt="Email" width={22} height={22} style={{ borderRadius: 5 }} />,
    activeColor: "#F59E0B",
    activeBg: "rgba(245,158,11,0.12)",
  },
];

interface Props {
  selected: BuyerAuthMethod;
  onChange: (method: BuyerAuthMethod) => void;
  context?: "register" | "login";
}

const HINTS: Record<"register" | "login", Record<BuyerAuthMethod, string>> = {
  register: {
    vk: "Профиль заполнится из VK автоматически",
    max: "Имя и аватар из MAX автоматически",
    phone: "SMS-код и пароль для безопасного входа",
    email: "Код на почту → пароль → профиль",
  },
  login: {
    vk: "Быстрый вход через VK",
    max: "Быстрый вход через MAX",
    phone: "Код придёт по SMS",
    email: "Войдите по email и паролю",
  },
};

export function MethodCircles({ selected, onChange, context = "register" }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const btnRefs = useRef<(HTMLDivElement | null)[]>([]);
  const [pill, setPill] = useState({ left: 0, width: 0, ready: false });
  const [ripple, setRipple] = useState<{ x: number; y: number; key: number; idx: number } | null>(null);

  const activeIdx = OPTIONS.findIndex((o) => o.id === selected);
  const activeOpt = OPTIONS[activeIdx];

  /* Measure pill position after mount and on selection change */
  useEffect(() => {
    const container = containerRef.current;
    const btn = btnRefs.current[activeIdx];
    if (!container || !btn) return;
    const cr = container.getBoundingClientRect();
    const br = btn.getBoundingClientRect();
    setPill({ left: br.left - cr.left, width: br.width, ready: true });
  }, [activeIdx]);

  function handleSelect(idx: number, e: React.MouseEvent<HTMLDivElement>) {
    const rect = e.currentTarget.getBoundingClientRect();
    setRipple({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
      key: Date.now(),
      idx,
    });
    setTimeout(() => setRipple(null), 600);
    onChange(OPTIONS[idx].id);
  }

  return (
    <div className="mb-5">
      {/* Track */}
      <div
        ref={containerRef}
        className="relative flex items-stretch gap-0 p-1.5 rounded-2xl"
        style={{ background: "#fff3e6", transform: "translateZ(0)" }}
      >
        {/* Sliding pill — uses transform (GPU only, no repaint flash) */}
        {pill.ready && (
          <div
            className="absolute top-1.5 bottom-1.5 rounded-xl pointer-events-none"
            style={{
              left: 0,
              width: pill.width,
              transform: `translateX(${pill.left}px)`,
              backgroundColor: activeOpt.activeColor,
              willChange: "transform, width, background-color",
              backfaceVisibility: "hidden",
              WebkitBackfaceVisibility: "hidden",
              transition: "transform 0.32s cubic-bezier(0.34,1.56,0.64,1), width 0.32s cubic-bezier(0.34,1.56,0.64,1), background-color 0.25s ease",
            }}
          />
        )}

        {OPTIONS.map((opt, i) => {
          const active = opt.id === selected;
          return (
            <div
              key={opt.id}
              ref={(el) => { btnRefs.current[i] = el; }}
              role="button"
              tabIndex={0}
              data-method-item
              onClick={(e) => handleSelect(i, e)}
              onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") onChange(opt.id); }}
              className="relative flex-1 flex flex-col items-center gap-1.5 py-3 px-1 rounded-xl z-10 overflow-hidden cursor-pointer transition-transform duration-150 active:scale-95 select-none"
            >
              {/* Per-button ripple */}
              {ripple && ripple.idx === i && (
                <span
                  key={ripple.key}
                  className="ripple-click"
                  style={{
                    left: ripple.x,
                    top: ripple.y,
                    background: active ? "rgba(255,255,255,0.3)" : `${opt.activeColor}22`,
                  }}
                />
              )}

              {/* Icon with scale transition */}
              <span
                className="transition-all duration-200"
                style={{ transform: active ? "scale(1.15)" : "scale(1)" }}
              >
                {opt.icon(active)}
              </span>

              {/* Label */}
              <span
                className="text-[10px] font-bold leading-none transition-all duration-200"
                style={{ color: active ? "#fff" : "#8a6f5a" }}
              >
                {opt.label}
              </span>
            </div>
          );
        })}
      </div>

      {/* Active method hint line */}
      <div
        className="mt-2 text-xs text-center font-medium transition-all duration-300"
        style={{ color: activeOpt.activeColor }}
      >
        {HINTS[context][selected]}
      </div>
    </div>
  );
}
