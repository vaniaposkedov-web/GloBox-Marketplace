"use client";

import { useState } from "react";
import { Alert, Button, Spin } from "antd";
import Link from "next/link";
import { LoadingOutlined } from "@ant-design/icons";
import { getVkAuthUrl } from "../api";
import { VkIcon } from "./vk-icon";

interface Props {
  context?: "register" | "login";
  onDone?: (result: { accessToken: string; userId: string }) => void;
}

type Stage = "idle" | "redirecting" | "error";

export function VkFlow({ context = "register" }: Props) {
  const [stage, setStage] = useState<Stage>("idle");
  const [error, setError] = useState<string | null>(null);

  async function startOAuth() {
    setError(null);
    setStage("redirecting");
    try {
      const { url } = await getVkAuthUrl();
      // Сохраняем context чтобы callback знал — login или register
      sessionStorage.setItem("vk_auth_context", context);
      // Редирект на VK
      window.location.href = url;
    } catch (e) {
      setStage("error");
      setError(e instanceof Error ? e.message : "Не удалось открыть VK авторизацию");
    }
  }

  return (
    <div className="w-full space-y-4">
      <div className="rounded-2xl border border-sky-200 bg-gradient-to-br from-sky-50 to-blue-50 p-6 text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-[#0077FF] text-white shadow-lg shadow-sky-500/30 mb-3">
            <VkIcon size={36} color="#fff" />
          </div>
          <div className="text-lg font-semibold">
            {context === "login" ? "Вход через ВКонтакте" : "Регистрация через ВКонтакте"}
          </div>
          <div className="text-xs text-muted mt-1">
            Имя и фото заполнятся автоматически
          </div>

          {error && (
            <Alert
              type="error"
              message={error}
              className="!mt-4 !rounded-xl text-left"
              showIcon
            />
          )}

          {stage === "idle" || stage === "error" ? (
            <Button
              size="large"
              block
              onClick={startOAuth}
              className="!mt-4 !rounded-xl !font-semibold !h-11 !bg-[#0077FF] !text-white !border-[#0077FF] hover:!bg-[#0066DD] hover:!border-[#0066DD]"
              icon={<VkIcon size={18} color="#fff" />}
            >
              Продолжить через ВКонтакте
            </Button>
          ) : (
            <div className="mt-5 flex flex-col items-center gap-3">
              <Spin indicator={<LoadingOutlined style={{ fontSize: 28, color: "#0077FF" }} spin />} />
              <div className="text-sm text-muted">Открываем VK...</div>
            </div>
          )}
      </div>

      <p className="text-[11px] text-muted text-center">
        Нажимая «Продолжить», вы принимаете{" "}
        <Link href="/privacy" className="underline hover:text-foreground">политику конфиденциальности</Link>
      </p>
    </div>
  );
}
