"use client";

import { useEffect, useRef, useState } from "react";

interface Props {
  title?: string;
  subtitle?: string;
  /** Duration in ms before onRedirect fires (default 2800) */
  duration?: number;
  onRedirect?: () => void;
}

export function SuccessScreen({
  title = "Аккаунт создан!",
  subtitle = "Добро пожаловать в Globox",
  duration = 2800,
  onRedirect,
}: Props) {
  const [secs, setSecs] = useState(Math.ceil(duration / 1000));
  const called = useRef(false);

  useEffect(() => {
    const iv = setInterval(() => setSecs((s) => Math.max(0, s - 1)), 1000);
    const t = setTimeout(() => {
      if (!called.current) {
        called.current = true;
        onRedirect?.();
      }
    }, duration);
    return () => { clearInterval(iv); clearTimeout(t); };
  }, []);

  return (
    <div className="flex flex-col items-center justify-center py-8 gap-5 text-center fade-in-up">
      {/* Animated checkmark */}
      <div className="relative success-svg-wrap" style={{ width: 100, height: 100 }}>
        {/* Outer glow ring */}
        <div
          className="absolute inset-0 rounded-full success-glow"
          style={{ background: "radial-gradient(circle, rgba(34,197,94,0.2) 0%, transparent 70%)" }}
        />
        <svg viewBox="0 0 100 100" width="100" height="100" fill="none">
          {/* Soft background circle */}
          <circle cx="50" cy="50" r="46" fill="rgba(34,197,94,0.08)" />
          {/* Animated stroke circle */}
          <circle
            cx="50" cy="50" r="40"
            stroke="#22c55e"
            strokeWidth="3.5"
            strokeLinecap="round"
            className="success-circle-draw"
          />
          {/* Animated checkmark */}
          <path
            d="M 30 51 L 44 65 L 72 36"
            stroke="#22c55e"
            strokeWidth="5"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="success-check-draw"
          />
        </svg>
      </div>

      {/* Text */}
      <div className="fade-in-up" style={{ animationDelay: "0.5s" }}>
        <p className="text-[11px] font-semibold uppercase tracking-widest text-green-500 mb-1">
          Успешно
        </p>
        <h3 className="text-xl font-extrabold text-foreground">{title}</h3>
        <p className="text-sm text-muted mt-1">{subtitle}</p>
      </div>

      {/* Countdown bar */}
      <div className="w-full max-w-[200px] fade-in-up" style={{ animationDelay: "0.7s" }}>
        <div className="h-1 rounded-full bg-green-100 overflow-hidden">
          <div
            className="h-full bg-green-400 rounded-full success-bar"
            style={{ animationDuration: `${duration}ms` }}
          />
        </div>
        <p className="text-[11px] text-muted mt-2">
          Переход через{" "}
          <span className="font-semibold text-green-600">{secs}</span>с
        </p>
      </div>

      {/* Bouncing dots */}
      <div className="flex gap-1.5 fade-in-up" style={{ animationDelay: "0.9s" }}>
        {[0, 0.2, 0.4].map((d, i) => (
          <span
            key={i}
            className="inline-block w-1.5 h-1.5 rounded-full bg-green-400 success-dot"
            style={{ animationDelay: `${d}s` }}
          />
        ))}
      </div>
    </div>
  );
}
