import type {
  CompleteEmailRegistration,
  RegisterEmailRequest,
  VerifyEmailCode,
} from "@/shared/lib";
import { api } from "@/shared/api/client";

export function requestEmailCode(
  payload: RegisterEmailRequest,
): Promise<{ ok: true; devCode?: string }> {
  return api.post("/auth/register/email", payload);
}

export function verifyEmailCode(
  payload: VerifyEmailCode,
): Promise<{ ok: true; attemptsLeft?: number }> {
  return api.post("/auth/register/verify", payload);
}

export function completeRegistration(
  payload: CompleteEmailRegistration,
): Promise<{ accessToken: string; userId: string }> {
  return api.post("/auth/register/complete", payload);
}
