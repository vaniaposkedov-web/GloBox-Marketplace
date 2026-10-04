"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button, Typography } from "antd";
import { CheckOutlined, ManOutlined, WomanOutlined } from "@ant-design/icons";

type Gender = "male" | "female" | null;

interface Props {
  accessToken: string;
  userId: string;
}

const OPTIONS = [
  {
    value: "male" as const,
    label: "Мужчина",
    Icon: ManOutlined,
    accent: "#d97706",
    background: "linear-gradient(145deg, #fffbeb, #fef3c7)",
    shadow: "0 16px 48px -8px rgba(217,119,6,0.35), 0 0 0 1px rgba(217,119,6,0.25)",
  },
  {
    value: "female" as const,
    label: "Женщина",
    Icon: WomanOutlined,
    accent: "#ea580c",
    background: "linear-gradient(145deg, #fff7ed, #ffedd5)",
    shadow: "0 16px 48px -8px rgba(234,88,12,0.35), 0 0 0 1px rgba(234,88,12,0.25)",
  },
];

export function GenderSelect({ accessToken: _accessToken, userId: _userId }: Props) {
  const router = useRouter();
  const [selected, setSelected] = useState<Gender>(null);
  const [loading, setLoading] = useState(false);

  function proceed() {
    setLoading(true);
    setTimeout(() => router.push("/"), 300);
  }

  function handleSelect(gender: Exclude<Gender, null>) {
    if (selected === gender) {
      proceed();
      return;
    }

    setSelected(gender);
  }

  return (
    <main className="relative min-h-screen flex items-center justify-center px-4 py-16 overflow-hidden bg-gradient-to-br from-stone-50 via-amber-50/40 to-orange-50/30">
      <div className="relative z-10 flex w-full max-w-xl flex-col items-center gap-8">
        <div className="text-center fade-in-up">
          <Typography.Title level={2} className="!mb-1 !text-2xl word-drop" style={{ animationDelay: "0.1s" }}>
            Укажите пол
          </Typography.Title>
          <p className="fade-in-up text-muted text-sm" style={{ animationDelay: "0.22s" }}>
            Выберите вариант, затем нажмите его ещё раз для подтверждения
          </p>
        </div>

        <div className="grid w-full grid-cols-2 gap-5 lg:gap-8 fade-in-up" style={{ animationDelay: "0.15s" }}>
          {OPTIONS.map(({ value, label, Icon, accent, background, shadow }) => {
            const isSelected = selected === value;
            const isDimmed = selected !== null && !isSelected;

            return (
              <button
                key={value}
                type="button"
                aria-pressed={isSelected}
                onClick={() => handleSelect(value)}
                disabled={loading}
                className="relative min-h-44 rounded-3xl border-2 p-5 text-center transition-all duration-300"
                style={{
                  opacity: isDimmed ? 0.48 : 1,
                  transform: isSelected ? "scale(1.04)" : isDimmed ? "scale(0.96)" : "scale(1)",
                  borderColor: isSelected ? accent : "var(--color-border, #f0dcc5)",
                  background: isSelected ? background : "#fff",
                  boxShadow: isSelected ? shadow : "0 4px 16px -4px rgba(0,0,0,0.12)",
                }}
              >
                {isSelected && (
                  <span
                    className="absolute right-3 top-3 flex h-7 w-7 items-center justify-center rounded-full shadow-lg pop-in"
                    style={{ background: accent }}
                  >
                    <CheckOutlined className="text-white" style={{ fontSize: 12 }} />
                  </span>
                )}

                <span
                  className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full"
                  style={{
                    color: accent,
                    background: isSelected ? "rgba(255,255,255,0.75)" : "rgba(251,146,60,0.12)",
                  }}
                >
                  <Icon style={{ fontSize: 42 }} />
                </span>

                <span
                  className="block text-base font-bold transition-colors duration-200"
                  style={{ color: isSelected ? accent : "var(--color-foreground, #3b2415)" }}
                >
                  {label}
                </span>

                <span className="mt-2 block text-xs text-muted">
                  {isSelected ? "Нажмите ещё раз, чтобы подтвердить" : "Нажмите, чтобы выбрать"}
                </span>
              </button>
            );
          })}
        </div>

        <div className="flex w-full max-w-xs flex-col items-center gap-3 fade-in-up" style={{ animationDelay: "0.3s" }}>
          <Button
            type="text"
            size="large"
            block
            loading={loading}
            onClick={proceed}
            className="!h-12 !rounded-2xl !font-semibold !text-[var(--color-muted)] hover:!text-[var(--color-foreground)]"
          >
            Пропустить
          </Button>
        </div>
      </div>
    </main>
  );
}
