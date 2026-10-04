"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Spin } from "antd";
import { LoadingOutlined } from "@ant-design/icons";
import { setSession } from "@/shared/auth";
import { fetchMe } from "@/features/auth-session";
import { vkExchangeCode } from "@/features/auth-methods/api";
import { VkIcon } from "@/features/auth-methods/ui/vk-icon";

type Stage = "exchanging" | "success" | "error";

function VkCallbackInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [stage, setStage] = useState<Stage>("exchanging");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const code = searchParams.get("code");
    const state = searchParams.get("state") ?? "";
    const deviceId = searchParams.get("device_id") ?? "";
    if (!code) {
      setStage("error");
      setError("VK не вернул код авторизации");
      return;
    }

    async function exchange() {
      try {
        const res = await vkExchangeCode(code!, state, deviceId);
        setSession(res.accessToken, null);
        const me = await fetchMe();
        setSession(res.accessToken, {
          id: me.id,
          email: me.email,
          firstName: me.firstName,
          lastName: me.lastName,
          role: me.role,
          roles: me.roles,
          avatarUrl: me.avatarUrl,
        });
        setStage("success");
        setTimeout(() => router.push("/"), 1200);
      } catch (e) {
        setStage("error");
        setError(
          e instanceof Error ? e.message : "Не удалось авторизоваться через VK",
        );
      }
    }

    exchange();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <main className="min-h-screen flex items-center justify-center bg-gradient-to-br from-stone-50 via-amber-50/40 to-orange-50/30">
      <div className="w-full max-w-sm mx-auto text-center p-8">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-[#0077FF] text-white shadow-lg shadow-sky-500/30 mb-5">
          <VkIcon size={36} color="#fff" />
        </div>

        {stage === "exchanging" && (
          <>
            <Spin
              indicator={
                <LoadingOutlined
                  style={{ fontSize: 32, color: "#0077FF" }}
                  spin
                />
              }
            />
            <div className="text-base font-semibold mt-4">
              Авторизация через VK...
            </div>
            <div className="text-sm text-muted mt-1">
              Подтверждаем данные, подождите
            </div>
          </>
        )}

        {stage === "success" && (
          <>
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-green-100 mb-3">
              <svg width="24" height="24" viewBox="0 0 20 20" fill="none">
                <path
                  d="M4 10l4 4 8-8"
                  stroke="#22c55e"
                  strokeWidth="2.2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </div>
            <div className="text-lg font-bold text-foreground">
              Успешный вход!
            </div>
            <div className="text-sm text-muted mt-1">
              Переходим на главную...
            </div>
          </>
        )}

        {stage === "error" && (
          <>
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-red-100 mb-3">
              <svg width="24" height="24" viewBox="0 0 20 20" fill="none">
                <path
                  d="M6 6l8 8M14 6l-8 8"
                  stroke="#ef4444"
                  strokeWidth="2.2"
                  strokeLinecap="round"
                />
              </svg>
            </div>
            <div className="text-lg font-bold text-foreground">Ошибка</div>
            <div className="text-sm text-muted mt-1 mb-4">
              {error ?? "Что-то пошло не так"}
            </div>
            <button
              type="button"
              onClick={() => router.push("/login")}
              className="px-6 py-2.5 rounded-xl bg-amber-500 text-white font-semibold hover:bg-amber-600 transition shadow-md"
            >
              Вернуться к входу
            </button>
          </>
        )}
      </div>
    </main>
  );
}

export default function VkCallbackPage() {
  return (
    <Suspense
      fallback={
        <main className="min-h-screen flex items-center justify-center">
          <Spin indicator={<LoadingOutlined style={{ fontSize: 32 }} spin />} />
        </main>
      }
    >
      <VkCallbackInner />
    </Suspense>
  );
}
