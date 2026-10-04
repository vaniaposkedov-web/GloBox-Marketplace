/**
 * Mock-клиент для демо-регистрации посредника (Блок 3).
 */

function delay<T>(ms: number, value: T): Promise<T> {
  return new Promise((resolve) => setTimeout(() => resolve(value), ms));
}
function genCode(): string {
  return String(100000 + Math.floor(Math.random() * 900000));
}
function genMaxToken(): string {
  return Array.from({ length: 24 }, () =>
    "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789".charAt(
      Math.floor(Math.random() * 62),
    ),
  ).join("");
}
function maskPhone(e164: string): string {
  if (e164.length < 8) return e164;
  return e164.slice(0, 3) + " " + "*".repeat(e164.length - 6) + " " + e164.slice(-4);
}

export interface MediatorRequestCodeResult {
  ok: true;
  devCode: string;
  maskedPhone: string;
  /** Одноразовый токен для deep-link MAX-бота:
   *  `max://bot/GloBoxMediatorBot?start=<maxStartToken>` */
  maxStartToken: string;
}
export interface MediatorVerifyResult {
  ok: true;
  sessionToken: string;
}
export interface MediatorApplyResult {
  accessToken: string;
  userId: string;
  mediatorId: string;
}

export async function requestMediatorCode(
  e164: string,
): Promise<MediatorRequestCodeResult> {
  return delay(900, {
    ok: true,
    devCode: genCode(),
    maskedPhone: maskPhone(e164),
    maxStartToken: genMaxToken(),
  });
}

export async function verifyMediatorCode(
  _e164: string,
  code: string,
): Promise<MediatorVerifyResult> {
  if (!/^\d{6}$/.test(code)) throw new Error("Код должен содержать 6 цифр");
  return delay(700, {
    ok: true,
    sessionToken: "demo-mediator-session-" + Date.now(),
  });
}

export async function submitMediatorApplication(_payload: {
  sessionToken: string;
  lastName: string;
  firstName: string;
  middleName?: string;
  commissionRate: number;
  minOrderAmount: number;
  avatarUrl: string;
  passportPhotoUrl: string;
  passSelfieUrl: string;
}): Promise<MediatorApplyResult> {
  return delay(900, {
    accessToken: "demo-mediator-access-" + Date.now(),
    userId: "demo-mediator-user",
    mediatorId: "demo-mediator-id",
  });
}

export async function uploadMediatorPhoto(
  file: File,
  kind: "avatar" | "passport" | "selfie",
): Promise<{ url: string }> {
  return delay(600, {
    url: `https://demo-storage.local/mediator/${kind}/${encodeURIComponent(file.name)}-${Date.now()}.jpg`,
  });
}
