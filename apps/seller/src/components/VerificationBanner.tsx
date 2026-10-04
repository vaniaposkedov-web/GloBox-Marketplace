"use client";

import Link from "next/link";
import { AlertTriangle, Clock, XCircle, RefreshCw } from "lucide-react";

export type SellerStatus = "PENDING" | "NEEDS_REVISION" | "APPROVED" | "REJECTED" | null;

interface Props {
  status: SellerStatus;
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
            <Link href="/dashboard" className="underline">Обновите данные в профиле</Link>
          </span>
        </div>
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
            {rejectionReason && <span className="font-normal">Причина: {rejectionReason}. </span>}
            <Link href="/support" className="underline">Обратитесь в поддержку</Link>
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-warning/10 border-b border-warning/20 px-4 py-2.5 flex items-center justify-between gap-2 text-sm">
      <div className="flex items-center gap-2">
        <AlertTriangle className="w-4 h-4 text-warning shrink-0" />
        <span className="text-warning font-medium">Верификация не пройдена — заполните профиль</span>
      </div>
      <Link
        href="/verify"
        className="shrink-0 text-xs font-semibold px-3 py-1 rounded-full bg-warning text-white"
      >
        Заполнить
      </Link>
    </div>
  );
}
