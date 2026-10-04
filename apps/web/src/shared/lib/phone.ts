/** Валидация и анти-фрод для номеров телефонов (ТЗ 1.4.1 + 1.4.2) */

export interface PhoneCountryRule {
  code: string;
  label: string;
  nationalLength: number;
  mobilePrefixes?: string[];
}

export const ALLOWED_PHONE_COUNTRIES: readonly PhoneCountryRule[] = [
  { code: "7", label: "Россия", nationalLength: 10, mobilePrefixes: ["9"] },
  { code: "7", label: "Казахстан", nationalLength: 10, mobilePrefixes: ["7"] },
  { code: "375", label: "Беларусь", nationalLength: 9 },
  { code: "996", label: "Кыргызстан", nationalLength: 9 },
  { code: "998", label: "Узбекистан", nationalLength: 9 },
  { code: "992", label: "Таджикистан", nationalLength: 9 },
  { code: "374", label: "Армения", nationalLength: 8 },
  { code: "994", label: "Азербайджан", nationalLength: 9 },
  { code: "373", label: "Молдова", nationalLength: 8 },
] as const;

/** Явно запрещённые коды стран — Украина (+380) */
export const BLOCKED_COUNTRY_CODES: readonly string[] = ["380"] as const;

export function normalizePhoneToE164(raw: string): string | null {
  if (!raw) return null;
  const cleaned = raw.replace(/[\s()-]/g, "");
  if (/^8\d{10}$/.test(cleaned)) return "+7" + cleaned.slice(1);
  if (!cleaned.startsWith("+")) return null;
  if (!/^\+\d{7,15}$/.test(cleaned)) return null;
  return cleaned;
}

export function matchCountryRule(e164: string): PhoneCountryRule | null {
  const digits = e164.startsWith("+") ? e164.slice(1) : e164;
  if (BLOCKED_COUNTRY_CODES.some((c) => digits.startsWith(c))) return null;

  const rules = [...ALLOWED_PHONE_COUNTRIES].sort(
    (a, b) => b.code.length - a.code.length,
  );
  for (const rule of rules) {
    if (!digits.startsWith(rule.code)) continue;
    const national = digits.slice(rule.code.length);
    if (national.length !== rule.nationalLength) continue;
    if (rule.mobilePrefixes && rule.mobilePrefixes.length > 0) {
      if (!rule.mobilePrefixes.includes(national[0])) continue;
    }
    return rule;
  }
  return null;
}

/** Анти-фрод: 7+ одинаковых цифр подряд (например +79111111111) */
export function hasSameDigitRun(e164: string, runLength = 7): boolean {
  const digits = e164.replace(/\D/g, "");
  const re = new RegExp(`(\\d)\\1{${runLength - 1},}`);
  return re.test(digits);
}

/** Анти-фрод: 8+ последовательных цифр (12345678 или 98765432). Порог 8 — чтобы не ловить реальные номера */
export function hasSequentialRun(e164: string, runLength = 8): boolean {
  const digits = e164.replace(/\D/g, "");
  if (digits.length < runLength) return false;
  let asc = 1;
  let desc = 1;
  for (let i = 1; i < digits.length; i++) {
    const prev = Number(digits[i - 1]);
    const curr = Number(digits[i]);
    asc = curr - prev === 1 ? asc + 1 : 1;
    desc = prev - curr === 1 ? desc + 1 : 1;
    if (asc >= runLength || desc >= runLength) return true;
  }
  return false;
}

export type PhoneValidationError =
  | "INVALID_FORMAT"
  | "COUNTRY_NOT_ALLOWED"
  | "ANTIFRAUD_REPEATED_DIGITS"
  | "ANTIFRAUD_SEQUENTIAL_DIGITS";

export interface PhoneValidationResult {
  ok: boolean;
  e164: string | null;
  country: PhoneCountryRule | null;
  error: PhoneValidationError | null;
}

export function validatePhone(raw: string): PhoneValidationResult {
  const e164 = normalizePhoneToE164(raw);
  if (!e164) {
    return { ok: false, e164: null, country: null, error: "INVALID_FORMAT" };
  }
  const country = matchCountryRule(e164);
  if (!country) {
    return { ok: false, e164, country: null, error: "COUNTRY_NOT_ALLOWED" };
  }
  if (hasSameDigitRun(e164)) {
    return { ok: false, e164, country, error: "ANTIFRAUD_REPEATED_DIGITS" };
  }
  if (hasSequentialRun(e164)) {
    return { ok: false, e164, country, error: "ANTIFRAUD_SEQUENTIAL_DIGITS" };
  }
  return { ok: true, e164, country, error: null };
}

export const PHONE_INVALID_USER_MESSAGE =
  "Номер недействителен. Проверьте правильность ввода";
