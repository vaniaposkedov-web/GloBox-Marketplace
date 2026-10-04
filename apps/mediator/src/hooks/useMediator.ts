"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { clearSession, getToken } from "@/lib/auth";

export type MediatorStatus = "PENDING" | "NEEDS_REVISION" | "APPROVED" | "REJECTED" | "FROZEN";

export interface MediatorProfile {
  id: string;
  status: MediatorStatus;
  firstName: string;
  lastName: string;
  middleName?: string | null;
  phone?: string | null;
  commissionRate: number;
  minOrderAmount: number;
  avatarUrl?: string | null;
  passportPhotoUrl?: string | null;
  passSelfiePhotoUrl?: string | null;
  passPhotoUrl?: string | null;
  rating?: number | null;
  completedOrdersCount: number;
  rejectionReason?: string | null;
  accountExpiresAt?: string | null;
  submittedAt?: string | null;
  description?: string | null;
  cardConfig?: any;
  isCardConfigured?: boolean;
}

export interface MediatorUser {
  id: string;
  email?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  phone?: string | null;
}

export interface UseMediatorResult {
  profile: MediatorProfile | null;
  user: MediatorUser | null;
  loading: boolean;
  isApproved: boolean;
  isPending: boolean;
  isNeedsRevision: boolean;
  isRejected: boolean;
  isFrozen: boolean;
  hasNoProfile: boolean;
  isCardConfigured: boolean;
  displayName: string;
  refetch: () => void;
}

export function useMediator(redirectToLogin = true): UseMediatorResult {
  const router = useRouter();
  const [profile, setProfile] = useState<MediatorProfile | null>(null);
  const [user, setUser] = useState<MediatorUser | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(() => {
    if (!getToken()) {
      if (redirectToLogin) router.replace("/login");
      setLoading(false);
      return;
    }
    setLoading(true);
    api
      .get<{ profile: MediatorProfile | null; user: MediatorUser }>("/mediator/me")
      .then((d) => {
        setProfile(d.profile);
        setUser(d.user);
      })
      .catch(() => {
        clearSession();
        if (redirectToLogin) router.replace("/login");
      })
      .finally(() => setLoading(false));
  }, [router, redirectToLogin]);

  useEffect(() => {
    load();
  }, [load]);

  const status = profile?.status ?? null;
  const firstName = profile?.firstName ?? user?.firstName ?? "";
  const lastName = profile?.lastName ?? user?.lastName ?? "";
  const displayName = `${firstName} ${lastName}`.trim() || "Посредник";

  return {
    profile,
    user,
    loading,
    isApproved: status === "APPROVED",
    isPending: status === "PENDING",
    isNeedsRevision: status === "NEEDS_REVISION",
    isRejected: status === "REJECTED",
    isFrozen: status === "FROZEN",
    hasNoProfile: !loading && !profile,
    isCardConfigured: profile?.isCardConfigured ?? false,
    displayName,
    refetch: load,
  };
}
