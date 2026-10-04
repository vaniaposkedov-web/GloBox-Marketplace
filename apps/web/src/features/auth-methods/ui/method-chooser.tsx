"use client";

import { MailOutlined, MobileOutlined, RightOutlined } from "@ant-design/icons";
import { VkIcon } from "./vk-icon";

export type AuthMethod = "email" | "phone" | "vk";

interface Props {
  onSelect: (method: AuthMethod) => void;
  context?: "register" | "login";
}

export function MethodChooser({ onSelect, context = "register" }: Props) {
  const options: Array<{
    id: AuthMethod;
    title: string;
    steps: string[];
    icon: React.ReactNode;
    color: string;
    bg: string;
    recommended?: boolean;
  }> = [
    {
      id: "email",
      title: context === "login" ? "По email" : "Почта и пароль",
      steps:
        context === "login"
          ? ["Введите email и пароль", "Мгновенный вход"]
          : ["Код на email", "Придумайте пароль", "Заполните профиль"],
      icon: <MailOutlined style={{ fontSize: 22 }} />,
      color: "text-amber-700",
      bg: "bg-amber-50",
      recommended: context === "register",
    },
    {
      id: "phone",
      title: "По номеру телефона",
      steps:
        context === "login"
          ? ["Введите номер", "Код из SMS", "Готово"]
          : ["Код из SMS", "Имя и фамилия", "Готово за минуту"],
      icon: <MobileOutlined style={{ fontSize: 22 }} />,
      color: "text-emerald-700",
      bg: "bg-emerald-50",
    },
    {
      id: "vk",
      title: "Через ВКонтакте",
      steps:
        context === "login"
          ? ["Войдите в свой VK", "Подтвердите доступ", "Мгновенный вход"]
          : ["Откройте VK", "Разрешите доступ", "Профиль заполнится автоматически"],
      icon: <VkIcon size={22} />,
      color: "text-sky-700",
      bg: "bg-sky-50",
    },
  ];

  return (
    <div className="space-y-3">
      <div className="text-sm text-muted">
        {context === "login"
          ? "Выберите удобный способ входа"
          : "Выберите удобный способ регистрации"}
      </div>
      {options.map((opt, i) => (
        <button
          key={opt.id}
          type="button"
          onClick={() => onSelect(opt.id)}
          className={`group relative w-full text-left rounded-2xl border border-border bg-white hover:border-amber-300 hover:shadow-lg hover:shadow-amber-500/10 hover:-translate-y-0.5 transition-all p-4 flex items-start gap-4 fade-in-up`}
          style={{ animationDelay: `${i * 0.08}s` }}
        >
          <div
            className={`w-12 h-12 rounded-xl ${opt.bg} ${opt.color} flex items-center justify-center shrink-0`}
          >
            {opt.icon}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <div className="font-semibold text-base">{opt.title}</div>
              {opt.recommended && (
                <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-amber-100 text-amber-700">
                  рекомендуем
                </span>
              )}
            </div>
            <ol className="mt-1.5 flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted">
              {opt.steps.map((s, idx) => (
                <li key={idx} className="inline-flex items-center gap-1">
                  <span
                    className={`inline-flex w-4 h-4 rounded-full items-center justify-center text-[10px] font-bold ${opt.color} ${opt.bg}`}
                  >
                    {idx + 1}
                  </span>
                  {s}
                </li>
              ))}
            </ol>
          </div>
          <RightOutlined className="text-muted group-hover:text-amber-700 group-hover:translate-x-0.5 transition-all mt-3" />
        </button>
      ))}
    </div>
  );
}
