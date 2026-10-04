"use client";

import { Wallet } from "lucide-react";
import { BottomNav } from "@/components/BottomNav";
import { VerificationBanner } from "@/components/VerificationBanner";
import { useMediator } from "@/hooks/useMediator";

export default function FinancePage() {
  const { profile, loading, isApproved } = useMediator();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-20 bg-background">
      <VerificationBanner
        status={profile?.status ?? null}
        rejectionReason={profile?.rejectionReason}
      />

      <div className="sticky top-0 z-40 bg-card/95 backdrop-blur-lg border-b border-border px-4 h-14 flex items-center">
        <h1 className="text-lg font-bold">Финансы</h1>
      </div>

      <div className="px-4 pt-16 text-center space-y-4 max-w-lg mx-auto">
        <div className="w-16 h-16 rounded-full bg-accent flex items-center justify-center mx-auto">
          <Wallet className="w-7 h-7 text-muted" />
        </div>

        {!isApproved ? (
          <>
            <p className="font-semibold">Раздел недоступен</p>
            <p className="text-sm text-muted">
              Финансы появятся после одобрения вашей заявки.
            </p>
          </>
        ) : (
          <>
            <p className="font-semibold">Финансы</p>
            <p className="text-sm text-muted">
              История выплат и аналитика доходов появятся здесь после первых заказов.
            </p>
          </>
        )}
      </div>

      <BottomNav />
    </div>
  );
}
