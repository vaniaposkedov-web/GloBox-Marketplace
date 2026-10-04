"use client";

import Link from "next/link";
import { AlertTriangle, Clock, XCircle, RefreshCw, Snowflake } from "lucide-react";
import type { MediatorStatus } from "@/hooks/useMediator";

interface Props {
  status: MediatorStatus | null;
  rejectionReason?: string | null;
}

export function VerificationBanner({ status, rejectionReason }: Props) {
  if (status === "APPROVED") return null;

  if (status === "PENDING") {
    return (
      <div className="bg-warning/10 border-b border-warning/20 px-4 py-2.5 flex items-center gap-2 text-sm">
        <Clock className="w-4 h-4 text-warning shrink-0" />
        <span className="text-warning font-medium">
          Заявка на проверке — ожидайте одобрения администратора (до 24 ч)
        </span>
      </div>
    );
  }

  if (status === "NEEDS_REVISION") {
    return (
      <div className="bg-orange-500/10 border-b border-orange-500/20 px-4 py-2.5 flex items-center justify-between gap-2 text-sm">
        <div className="flex items-center gap-2">
          <RefreshCw className="w-4 h-4 text-orange-500 shrink-0" />
          <span className="text-orange-500 font-medium">
            Требуются правки.{" "}
            <Link href="/profile" className="underline">
              Обновите данные в профиле
            </Link>
          </span>
        </div>
      </div>
    );
  }

  if (status === "FROZEN") {
    return (
      <div className="bg-blue-500/10 border-b border-blue-500/20 px-4 py-2.5 flex items-center justify-between gap-2 text-sm">
        <div className="flex items-center gap-2">
          <Snowflake className="w-4 h-4 text-blue-600 shrink-0" />
          <span className="text-blue-600 font-medium">
            Аккаунт заморожен — обновите пропуск для продолжения работы
          </span>
        </div>
        <Link
          href="/verify"
          className="shrink-0 text-xs font-semibold px-3 py-1 rounded-full bg-blue-600 text-white"
        >
          Обновить
        </Link>
      </div>
    );
  }

  if (status === "REJECTED") {
    return (
      <div className="bg-danger/10 border-b border-danger/20 px-4 py-2.5 text-sm">
        <div className="flex items-center gap-2">
          <XCircle className="w-4 h-4 text-danger shrink-0" />
          <span className="text-danger font-medium">
            Заявка отклонена.{" "}
            {rejectionReason && (
              <span className="font-normal">Причина: {rejectionReason}</span>
            )}{" "}
            <Link href="/support" className="underline">
              Обратитесь в поддержку
            </Link>
          </span>
        </div>
      </div>
    );
  }

  // No profile yet
  return (
    <div className="bg-warning/10 border-b border-warning/20 px-4 py-2.5 flex items-center justify-between gap-2 text-sm">
      <div className="flex items-center gap-2">
        <AlertTriangle className="w-4 h-4 text-warning shrink-0" />
        <span className="text-warning font-medium">
          Верификация не пройдена — заполните данные в профиле
        </span>
      </div>
      <Link
        href="/verify"
        className="shrink-0 text-xs font-semibold px-3 py-1 rounded-full bg-warning text-white"
      >
        Заполнить анкету
      </Link>
    </div>
  );
}
