"use client";

import { useState } from "react";
import { Header } from "@/components/Header";
import { useMediator } from "@/hooks/useMediator";
import { VerificationBanner } from "@/components/VerificationBanner";
import { Wifi, Clock, WifiOff, CheckCircle2 } from "lucide-react";

type WorkStatus = "ONLINE" | "BUSY" | "OFFLINE";

const STATUSES: {
  value: WorkStatus;
  label: string;
  description: string;
  icon: React.ElementType;
  color: string;
  bg: string;
  border: string;
}[] = [
  {
    value: "ONLINE",
    label: "Онлайн",
    description: "Вы доступны для новых заказов. Покупатели могут выбрать вас.",
    icon: Wifi,
    color: "text-success",
    bg: "bg-success/10",
    border: "border-success/40",
  },
  {
    value: "BUSY",
    label: "Занят",
    description: "Вы временно недоступны. Текущие заказы продолжаются, новые не поступают.",
    icon: Clock,
    color: "text-warning",
    bg: "bg-warning/10",
    border: "border-warning/40",
  },
  {
    value: "OFFLINE",
    label: "Оффлайн",
    description: "Вы не принимаете заказы. Отображаетесь как недоступный.",
    icon: WifiOff,
    color: "text-muted",
    bg: "bg-accent",
    border: "border-border",
  },
];

export default function StatusPage() {
  const { profile, loading } = useMediator();
  const [status, setStatus] = useState<WorkStatus>("OFFLINE");
  const [saved, setSaved] = useState(false);

  const handleSelect = (value: WorkStatus) => {
    setStatus(value);
    setSaved(false);
  };

  const handleSave = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const current = STATUSES.find((s) => s.value === status)!;

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header status={profile?.status ?? null} />
      <VerificationBanner status={profile?.status ?? null} rejectionReason={profile?.rejectionReason} />

      <main className="flex-1 max-w-xl mx-auto w-full px-4 py-10 space-y-8">
        <div>
          <h1 className="text-2xl font-bold">Статус доступности</h1>
          <p className="text-sm text-muted mt-1">
            Управляйте тем, видят ли вас покупатели как доступного посредника.
          </p>
        </div>

        {/* Current status indicator */}
        <div className={`rounded-2xl border-2 p-5 flex items-center gap-4 ${current.bg} ${current.border}`}>
          <div className={`w-14 h-14 rounded-full ${current.bg} border-2 ${current.border} flex items-center justify-center`}>
            <current.icon className={`w-7 h-7 ${current.color}`} />
          </div>
          <div>
            <p className="text-xs text-muted uppercase tracking-wider mb-0.5">Текущий статус</p>
            <p className={`text-xl font-bold ${current.color}`}>{current.label}</p>
            <p className="text-xs text-muted mt-0.5">{current.description}</p>
          </div>
        </div>

        {/* Status selector */}
        <div className="space-y-3">
          <p className="text-xs text-muted uppercase tracking-wider">Выбрать статус</p>
          {STATUSES.map((s) => {
            const Icon = s.icon;
            const isActive = s.value === status;
            return (
              <button
                key={s.value}
                onClick={() => handleSelect(s.value)}
                className={`w-full flex items-center gap-4 p-4 rounded-2xl border-2 text-left transition-all active:scale-[0.99] ${
                  isActive
                    ? `${s.bg} ${s.border}`
                    : "bg-card border-border hover:bg-card-hover"
                }`}
              >
                <div className={`w-11 h-11 rounded-full flex items-center justify-center shrink-0 ${
                  isActive ? `${s.bg} border-2 ${s.border}` : "bg-accent"
                }`}>
                  <Icon className={`w-5 h-5 ${isActive ? s.color : "text-muted"}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className={`font-semibold ${isActive ? s.color : ""}`}>{s.label}</p>
                  <p className="text-xs text-muted mt-0.5">{s.description}</p>
                </div>
                {isActive && (
                  <CheckCircle2 className={`w-5 h-5 shrink-0 ${s.color}`} />
                )}
              </button>
            );
          })}
        </div>

        {/* Save button */}
        <button
          onClick={handleSave}
          className="w-full py-3.5 rounded-xl bg-primary text-white font-semibold hover:bg-primary-hover transition active:scale-[0.98] flex items-center justify-center gap-2"
        >
          {saved ? (
            <>
              <CheckCircle2 className="w-4 h-4" />
              Сохранено
            </>
          ) : (
            "Применить статус"
          )}
        </button>

        <p className="text-xs text-muted text-center">
          Статус применяется сразу после сохранения и виден покупателям на сайте.
        </p>
      </main>
    </div>
  );
}
