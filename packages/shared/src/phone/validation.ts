import {
  ALLOWED_PHONE_COUNTRIES,
  BLOCKED_COUNTRY_CODES,
  PhoneCountryRule,
} from "./countries";

/**
 * Нормализует пользовательский ввод телефона до E.164 (+XXXXXXXXXXX).
 * Принимает +, пробелы, скобки, дефисы.
 * Для номеров без «+», начинающихся с 8, считает это РФ и заменяет на +7.
 */
export function normalizePhoneToE164(raw: string): string | null {
  if (!raw) return null;
  const cleaned = raw.replace(/[\s()-]/g, "");

  // 8XXXXXXXXXX → +7XXXXXXXXXX (частый кейс для РФ)
  if (/^8\d{10}$/.test(cleaned)) return "+7" + cleaned.slice(1);

  if (!cleaned.startsWith("+")) return null;
  if (!/^\+\d{7,15}$/.test(cleaned)) return null;
  return cleaned;
}

/** Для E.164 номера определяет применимое правило страны (или null) */
export function matchCountryRule(
  e164: string,
): PhoneCountryRule | null {
  const digits = e164.startsWith("+") ? e164.slice(1) : e164;

  if (BLOCKED_COUNTRY_CODES.some((c) => digits.startsWith(c))) return null;

  // Перебираем в порядке убывания длины кода, чтобы не спутать +7/+77X
  const rules = [...ALLOWED_PHONE_COUNTRIES].sort(
    (a, b) => b.code.length - a.code.length,
  );

  for (const rule of rules) {
    if (!digits.startsWith(rule.code)) continue;
    const national = digits.slice(rule.code.length);
    if (national.length !== rule.nationalLength) continue;
    if (rule.mobilePrefixes && rule.mobilePrefixes.length > 0) {
      const firstDigit = national[0];
      if (!rule.mobilePrefixes.includes(firstDigit)) continue;
    }
    return rule;
  }

  return null;
}

/**
 * Антифрод-проверка: 7+ одинаковых цифр подряд.
 * Пример: +79111111111 → false.
 */
export function hasSameDigitRun(e164: string, runLength = 7): boolean {
  const digits = e164.replace(/\D/g, "");
  const re = new RegExp(`(\\d)\\1{${runLength - 1},}`);
  return re.test(digits);
}

/**
 * Антифрод-проверка: 8+ последовательных цифр (возрастание или убывание).
 * Пример: 12345678, 98765432. Порог 8 — чтобы не ловить реальные номера типа
 * +79261234567 (в нём есть "1234567", но сам номер валидный).
 */
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

/**
 * Полная валидация номера телефона (1.4.1 + 1.4.2).
 * НЕ проверяет уникальность в БД — это делает backend.
 */
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
    return {
      ok: false,
      e164,
      country,
      error: "ANTIFRAUD_REPEATED_DIGITS",
    };
  }
  if (hasSequentialRun(e164)) {
    return {
      ok: false,
      e164,
      country,
      error: "ANTIFRAUD_SEQUENTIAL_DIGITS",
    };
  }

  return { ok: true, e164, country, error: null };
}

/**
 * Единое пользовательское сообщение для любой ошибки валидации (1.4.2):
 * «Номер недействителен. Проверьте правильность ввода».
 * Не раскрываем причину, чтобы не помогать фрод-ботам.
 */
export const PHONE_INVALID_USER_MESSAGE =
  "Номер недействителен. Проверьте правильность ввода";
