/**
 * Клиентская валидация форм посредника.
 * Бэкенд делает полную проверку через shared/zod — это просто UX-подсказки.
 */

export const NAME_RE = /^[\p{L}\s\-']{1,50}$/u;

export function validateName(v: string): boolean {
  return v.trim().length >= 2 && v.length <= 50 && NAME_RE.test(v);
}

export function validatePhone(v: string): boolean {
  const digits = v.replace(/\D/g, "");
  if (digits.length < 10 || digits.length > 15) return false;
  if (v.startsWith("+380")) return false; // Украина запрещена
  if (/(\d)\1{6,}/.test(digits)) return false;
  // Проверяем последовательности 7+
  for (let i = 0; i <= digits.length - 7; i++) {
    let asc = true,
      desc = true;
    for (let j = 1; j < 7; j++) {
      if (Number(digits[i + j]) !== Number(digits[i + j - 1]) + 1) asc = false;
      if (Number(digits[i + j]) !== Number(digits[i + j - 1]) - 1) desc = false;
    }
    if (asc || desc) return false;
  }
  return true;
}

export function validatePassword(v: string): boolean {
  return v.length >= 8 && /[A-Za-zА-Яа-яЁё]/.test(v) && /\d/.test(v);
}

export function passwordStrength(v: string): "weak" | "medium" | "strong" {
  let score = 0;
  if (v.length >= 8) score++;
  if (v.length >= 12) score++;
  if (/[A-Za-z]/.test(v) && /\d/.test(v)) score++;
  if (/[^A-Za-z0-9]/.test(v)) score++;
  if (/[a-z]/.test(v) && /[A-Z]/.test(v)) score++;
  return score <= 2 ? "weak" : score <= 3 ? "medium" : "strong";
}

export const EMAIL_WHITELIST = [
  "gmail.com",
  "mail.ru",
  "bk.ru",
  "list.ru",
  "inbox.ru",
  "yandex.ru",
  "ya.ru",
  "icloud.com",
  "outlook.com",
  "hotmail.com",
];

export function validateEmail(v: string): boolean {
  const trimmed = v.trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) return false;
  const domain = trimmed.split("@")[1];
  return EMAIL_WHITELIST.includes(domain);
}
