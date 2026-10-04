import { api } from "@/shared/api/client";
import type {
  PasswordResetComplete,
  PasswordResetRequest,
  PasswordResetVerify,
} from "@/shared/lib";

export function requestPasswordReset(
  payload: PasswordResetRequest,
): Promise<{ ok: true; devCode?: string }> {
  return api.post("/auth/password-reset/request", payload);
}

export function verifyPasswordReset(
  payload: PasswordResetVerify,
): Promise<{ ok: true; attemptsLeft?: number }> {
  return api.post("/auth/password-reset/verify", payload);
}

export function completePasswordReset(
  payload: PasswordResetComplete,
): Promise<{ accessToken: string; userId: string }> {
  return api.post("/auth/password-reset/complete", payload);
}
