"use client";

import { useRouter } from "next/navigation";
import { ArrowLeft, BarChart2 } from "lucide-react";

export default function AnalyticsPage() {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-background flex flex-col">

      {/* Header */}
      <div
        className="sticky top-0 z-40 px-4 py-3"
        style={{ background: "rgba(255,255,255,0.92)", backdropFilter: "blur(16px)", borderBottom: "1px solid var(--border)" }}
      >
        <div className="max-w-lg mx-auto flex items-center gap-3">
          <button
            onClick={() => router.back()}
            className="w-9 h-9 rounded-xl flex items-center justify-center hover:bg-accent transition"
          >
            <ArrowLeft className="w-5 h-5 text-foreground" />
          </button>
          <h1 className="text-lg font-bold text-foreground">Аналитика</h1>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 flex items-center justify-center px-4">
        <div className="text-center max-w-xs">
          <div className="w-20 h-20 mx-auto mb-5 rounded-2xl bg-card border border-border flex items-center justify-center">
            <BarChart2 className="w-10 h-10 text-muted" strokeWidth={1.5} />
          </div>
          <h2 className="text-xl font-bold text-foreground mb-2">Аналитика</h2>
          <p className="text-sm text-muted leading-relaxed">
            Раздел находится в разработке. Скоро здесь появятся данные о просмотрах, кликах и заказах.
          </p>
        </div>
      </div>
    </div>
  );
}
