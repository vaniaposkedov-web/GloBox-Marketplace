"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Alert, Button, Spin } from "antd";
import { LoadingOutlined } from "@ant-design/icons";
import { setSession } from "@/shared/auth";
import { fetchMe } from "@/features/auth-session";
import { maxStartSession, maxCheckStatus } from "../api";
import Link from "next/link";
import { SuccessScreen } from "./success-screen";

interface Props {
  context?: "register" | "login";
  onDone?: (result: { accessToken: string; userId: string }) => void;
}

type Stage = "idle" | "waiting" | "done" | "error";

function MaxIcon({ size = 52 }: { size?: number }) {
  return (
    <img
      src="/max-icon.png"
      alt="MAX"
      width={size}
      height={size}
      style={{ borderRadius: 12, display: "block" }}
    />
  );
}

export function MaxFlow({ context = "register", onDone }: Props) {
  const router = useRouter();
  const [stage, setStage] = useState<Stage>("idle");
  const [error, setError] = useState<string | null>(null);
  const [botLink, setBotLink] = useState<string | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const stopPolling = useCallback(() => {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
  }, []);

  useEffect(() => () => stopPolling(), [stopPolling]);

  async function startAuth() {
    setError(null);
    setStage("waiting");
    try {
      const { sessionId, botLink: link } = await maxStartSession();
      setBotLink(link);

      // Открываем бота в новой вкладке
      window.open(link, "_blank");

      // Начинаем polling каждые 2 секунды
      pollRef.current = setInterval(async () => {
        try {
          const res = await maxCheckStatus(sessionId);
          if (res.ready) {
            stopPolling();
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
            setStage("done");
          }
        } catch {
          // Сессия истекла
          stopPolling();
          setStage("error");
          setError("Время ожидания истекло. Попробуйте снова.");
        }
      }, 2000);

      // Таймаут 5 минут
      setTimeout(() => {
        if (pollRef.current) {
          stopPolling();
          setStage("error");
          setError("Время ожидания истекло. Попробуйте снова.");
        }
      }, 5 * 60 * 1000);
    } catch (e) {
      setStage("error");
      setError(e instanceof Error ? e.message : "Не удалось начать авторизацию через MAX");
    }
  }

  if (stage === "done") {
    return (
      <SuccessScreen
        title={context === "login" ? "С возвращением!" : "Аккаунт создан!"}
        subtitle="Переходим на главную..."
        onRedirect={() => {
          if (onDone) onDone({ accessToken: "", userId: "" });
          else router.push("/");
        }}
      />
    );
  }

  return (
    <div className="w-full space-y-4">
      <div className="rounded-2xl border border-violet-200 bg-gradient-to-br from-violet-50 to-purple-50 p-5 text-center">
        <div className="inline-flex items-center justify-center mb-3">
          <MaxIcon size={52} />
        </div>
        <div className="text-base font-semibold">
          {context === "login" ? "Вход через MAX" : "Войти через MAX"}
        </div>
        <div className="text-xs text-muted mt-1">
          Откроется бот в MAX — нажмите «Поделиться контактом»
        </div>

        {error && (
          <Alert type="error" message={error} className="!mt-3 !rounded-xl text-left" showIcon />
        )}

        {stage === "idle" || stage === "error" ? (
          <Button
            size="large"
            block
            onClick={startAuth}
            className="!mt-4 !rounded-xl !font-semibold !h-11 !bg-[#7C3AED] !text-white !border-[#7C3AED] hover:!bg-[#6D28D9] hover:!border-[#6D28D9]"
          >
            Продолжить через MAX
          </Button>
        ) : (
          <div className="mt-4 flex flex-col items-center gap-3">
            <Spin indicator={<LoadingOutlined style={{ fontSize: 26, color: "#7C3AED" }} spin />} />
            <div className="text-xs text-muted">
              Ожидаем подтверждения в MAX...
            </div>
            {botLink && (
              <a
                href={botLink}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-violet-600 underline hover:text-violet-800"
              >
                Открыть бота заново
              </a>
            )}
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
