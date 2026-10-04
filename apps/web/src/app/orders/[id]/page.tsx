"use client";

import { useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { SiteHeader } from "@/widgets/header";

export default function OrderDetailRedirectPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();

  useEffect(() => {
    router.replace(`/mediator-orders/${params.id}`);
  }, [params.id, router]);

  return (
    <div className="min-h-screen flex flex-col">
      <SiteHeader />
      <main className="flex-1 flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
      </main>
    </div>
  );
}
