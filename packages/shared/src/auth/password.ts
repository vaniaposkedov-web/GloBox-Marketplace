/**
 * Требования к паролю:
 *   - минимум 6 символов
 *   - только латиница (английские буквы, цифры, спецсимволы)
 *   - буквы и цифры (минимум по одному)
 */

export const PASSWORD_MIN_LENGTH = 6;

const HAS_LETTER = /[A-Za-z]/;
const HAS_DIGIT = /\d/;
const HAS_SPECIAL = /[^A-Za-z0-9]/;
const HAS_CYRILLIC = /[А-Яа-яЁё]/;

export type PasswordStrength = "weak" | "medium" | "strong";

export interface PasswordValidation {
  ok: boolean;
  strength: PasswordStrength;
  errors: string[];
}

export function validatePassword(password: string): PasswordValidation {
  const errors: string[] = [];

  if (password.length < PASSWORD_MIN_LENGTH) {
    errors.push(`Минимум ${PASSWORD_MIN_LENGTH} символов`);
  }
  if (HAS_CYRILLIC.test(password)) {
    errors.push("Пароль должен содержать только английские символы");
  }
  if (!HAS_LETTER.test(password)) {
    errors.push("Должна быть хотя бы одна буква (a-z)");
  }
  if (!HAS_DIGIT.test(password)) {
    errors.push("Должна быть хотя бы одна цифра");
  }

  const ok = errors.length === 0;

  // Оценка силы — учитываем длину и наличие спецсимволов/разных регистров
  let score = 0;
  if (password.length >= 6) score++;
  if (password.length >= 12) score++;
  if (HAS_LETTER.test(password) && HAS_DIGIT.test(password)) score++;
  if (HAS_SPECIAL.test(password)) score++;
  if (/[a-z]/.test(password) && /[A-Z]/.test(password)) score++;

  const strength: PasswordStrength =
    score <= 2 ? "weak" : score <= 3 ? "medium" : "strong";

  return { ok, strength, errors };
}
