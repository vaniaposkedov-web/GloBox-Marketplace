/**
 * Mock-клиент для демо-регистрации поставщика (Блок 2).
 * Реальные эндпоинты живут на бэке (`/api/supplier/registration/*`),
 * но Vercel-деплой не имеет доступа к API; флоу демонстрируется на клиенте.
 *
 * При появлении живого API заменить delay-обёртки на api.post(...).
 */

function delay<T>(ms: number, value: T): Promise<T> {
  return new Promise((resolve) => setTimeout(() => resolve(value), ms));
}

function genCode(): string {
  return String(100000 + Math.floor(Math.random() * 900000));
}

function genMaxToken(): string {
  // Безопасный url-safe alphanumeric token для deep-link `?start=...`
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

export interface SupplierRequestCodeResult {
  ok: true;
  devCode: string;
  maskedPhone: string;
  /** Одноразовый токен для deep-link MAX-бота:
   *  `max://bot/GloBoxSellerBot?start=<maxStartToken>` */
  maxStartToken: string;
}

export interface SupplierVerifyResult {
  ok: true;
  sessionToken: string;
}

export interface SupplierApplyResult {
  accessToken: string;
  userId: string;
  supplierId: string;
}

export async function requestSupplierCode(
  e164: string,
): Promise<SupplierRequestCodeResult> {
  return delay(900, {
    ok: true,
    devCode: genCode(),
    maskedPhone: maskPhone(e164),
    maxStartToken: genMaxToken(),
  });
}

export async function verifySupplierCode(
  _e164: string,
  code: string,
): Promise<SupplierVerifyResult> {
  if (!/^\d{6}$/.test(code)) throw new Error("Код должен содержать 6 цифр");
  return delay(700, {
    ok: true,
    sessionToken: "demo-supplier-session-" + Date.now(),
  });
}

/** Имитация подачи заявки. Возвращает «approved-after-review» статус. */
export async function submitSupplierApplication(_payload: {
  sessionToken: string;
  lastName: string;
  firstName: string;
  middleName?: string;
  locationId: string;
  pavilionNumber: string;
  entityType: string;
  categories: string[];
  inn?: string;
  ogrnip?: string;
  passPhotoUrl: string;
  passSelfieUrl: string;
}): Promise<SupplierApplyResult> {
  return delay(900, {
    accessToken: "demo-supplier-access-" + Date.now(),
    userId: "demo-supplier-user",
    supplierId: "demo-supplier-id",
  });
}

/**
 * Имитация загрузки файла (фото пропуска / селфи) → возвращает signed URL.
 * В реальности — загрузка в приватный S3 через подписанный URL.
 */
export async function uploadSupplierPhoto(
  file: File,
): Promise<{ url: string }> {
  return delay(600, {
    url: `https://demo-storage.local/supplier/${encodeURIComponent(file.name)}-${Date.now()}.jpg`,
  });
}
