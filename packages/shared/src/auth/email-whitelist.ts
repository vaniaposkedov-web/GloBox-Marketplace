/**
 * Белый список почтовых доменов (1.2.1).
 * Хранится в коде как дефолт. В проде — перекрывается значением из БД / админки.
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
  "test.local",
  "globox.local",
] as const;

/**
 * Пользовательское сообщение об ошибке при недопустимом домене.
 * Список сервисов — «Gmail, Mail.ru, Yandex, iCloud, Outlook, Hotmail».
 */
export const EMAIL_WHITELIST_ERROR_MESSAGE =
  "Используйте почту: Gmail, Mail.ru, Yandex, iCloud, Outlook или Hotmail";

/**
 * Извлекает домен из email (нечувствительно к регистру).
 * Возвращает null, если строка не похожа на email.
 */
export function extractEmailDomain(email: string): string | null {
  const at = email.lastIndexOf("@");
  if (at <= 0 || at === email.length - 1) return null;
  return email.slice(at + 1).trim().toLowerCase();
}

/**
 * Проверка email по белому списку доменов.
 * @param email  пользовательский ввод (регистр не важен)
 * @param whitelist  список разрешённых доменов (в lowercase)
 */
export function isEmailDomainAllowed(
  email: string,
  whitelist: readonly string[] = DEFAULT_EMAIL_WHITELIST,
): boolean {
  const domain = extractEmailDomain(email);
  if (!domain) return false;
  return whitelist.includes(domain);
}
