import { api } from "@/shared/api/client";

function delay<T>(ms: number, value: T): Promise<T> {
  return new Promise((resolve) => setTimeout(() => resolve(value), ms));
}

export interface PhoneRequestResult {
  ok: true;
  devCode?: string;
  maskedPhone: string;
}

export interface PhoneVerifyResult {
  ok: true;
  tempToken: string;
}

export interface PhoneCompleteResult {
  accessToken: string;
  userId: string;
}

export interface VkAuthResult {
  accessToken: string;
  userId: string;
  profile: {
    firstName: string;
    lastName: string;
    avatarUrl: string | null;
  };
}

export async function requestPhoneCode(e164: string): Promise<PhoneRequestResult> {
  return api.post("/auth/register/phone/request-code", { phone: e164 });
}

export async function requestLoginPhoneCode(e164: string): Promise<PhoneRequestResult> {
  return api.post("/auth/login/phone/request-code", { phone: e164 });
}

export async function verifyPhoneCode(_e164: string, code: string): Promise<PhoneVerifyResult> {
  if (!/^\d{6}$/.test(code)) throw new Error("Код должен содержать 6 цифр");
  return delay(300, { ok: true, tempToken: "phone-token" });
}

export async function completePhoneRegistration(payload: {
  phoneE164: string;
  firstName: string;
  lastName: string;
  email?: string;
}): Promise<PhoneCompleteResult> {
  void payload;
  throw new Error("Phone registration requires OTP. Use registerWithPhone.");
}

export interface PhoneRegistrationResult {
  accessToken: string;
  userId: string;
}

export async function registerWithPhone(payload: {
  phoneE164: string;
  code: string;
  password: string;
}): Promise<PhoneRegistrationResult> {
  return api.post("/auth/register/phone/complete", {
    phone: payload.phoneE164,
    code: payload.code,
    password: payload.password,
  });
}

export async function loginWithPhoneCode(payload: {
  phoneE164: string;
  code: string;
  password: string;
}): Promise<PhoneCompleteResult> {
  return api.post("/auth/login/phone/verify", {
    phone: payload.phoneE164,
    code: payload.code,
    password: payload.password,
  });
}

export async function requestLoginEmailCode(email: string): Promise<{ ok: true; devCode?: string }> {
  return api.post("/auth/login/email/request-code", { email });
}

export async function loginWithEmailCode(payload: {
  email: string;
  code: string;
  password: string;
}): Promise<PhoneCompleteResult> {
  return api.post("/auth/login/email/verify", payload);
}

/** Получить URL для редиректа на VK OAuth */
export async function getVkAuthUrl(): Promise<{ url: string }> {
  return api.get("/auth/vk/auth-url");
}

/** Обменять VK authorization code на JWT */
export async function vkExchangeCode(code: string, state: string, deviceId: string): Promise<{ accessToken: string; userId: string }> {
  return api.post("/auth/vk/callback", { code, state, device_id: deviceId });
}

// ——— MAX (max.ru) ———

/** Начать сессию авторизации через MAX — получить ссылку на бота */
export async function maxStartSession(): Promise<{ sessionId: string; botLink: string }> {
  return api.post("/auth/max/start");
}

/** Проверить статус MAX авторизации (polling) */
export async function maxCheckStatus(
  sessionId: string,
): Promise<{ ready: false } | { ready: true; accessToken: string; userId: string }> {
  return api.get(`/auth/max/status/${sessionId}`);
}
