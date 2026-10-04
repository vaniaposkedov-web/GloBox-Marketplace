/**
 * Белый список почтовых доменов (ТЗ 1.2.1).
 * Источник истины — packages/shared (monorepo). Здесь локальная копия
 * для standalone-деплоя фронта на Netlify без монорепо.
 */
export const DEFAULT_EMAIL_WHITELIST: readonly string[] = [
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
] as const;

export const EMAIL_WHITELIST_ERROR_MESSAGE =
  "Используйте почту: Gmail, Mail.ru, Yandex, iCloud, Outlook или Hotmail";

export function extractEmailDomain(email: string): string | null {
  const at = email.lastIndexOf("@");
  if (at <= 0 || at === email.length - 1) return null;
  return email.slice(at + 1).trim().toLowerCase();
}

export function isEmailDomainAllowed(
  email: string,
  whitelist: readonly string[] = DEFAULT_EMAIL_WHITELIST,
): boolean {
  const domain = extractEmailDomain(email);
  if (!domain) return false;
  return whitelist.includes(domain);
}
