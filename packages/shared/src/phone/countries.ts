/**
 * Разрешённые коды стран для привязки телефона (1.4.1).
 * ❌ Украина (+380) — запрещена.
 */
export interface PhoneCountryRule {
  /** Код страны без плюса, например "7", "375" */
  code: string;
  /** Человекочитаемое название */
  label: string;
  /** Длина национального номера (без кода) */
  nationalLength: number;
  /**
   * Первые цифры национального номера, допустимые для мобильных.
   * Если не указано — допустимы любые.
   */
  mobilePrefixes?: string[];
}

export const ALLOWED_PHONE_COUNTRIES: readonly PhoneCountryRule[] = [
  // +7: Россия и Казахстан делят код, различаемся по первой цифре
  {
    code: "7",
    label: "Россия",
    nationalLength: 10,
    mobilePrefixes: ["9"], // +7 9XX XXX XX XX
  },
  {
    code: "7",
    label: "Казахстан",
    nationalLength: 10,
    mobilePrefixes: ["7"], // +7 7XX XXX XX XX
  },
  { code: "375", label: "Беларусь", nationalLength: 9 },
  { code: "996", label: "Кыргызстан", nationalLength: 9 },
  { code: "998", label: "Узбекистан", nationalLength: 9 },
  { code: "992", label: "Таджикистан", nationalLength: 9 },
  { code: "374", label: "Армения", nationalLength: 8 },
  { code: "994", label: "Азербайджан", nationalLength: 9 },
  { code: "373", label: "Молдова", nationalLength: 8 },
] as const;

/** Коды, которые явно запрещены (для прозрачности — Украина) */
export const BLOCKED_COUNTRY_CODES: readonly string[] = ["380"] as const;
