/**
 * Валидаторы для полей регистрации поставщика (Блок 2).
 * Используются и на фронте, и на бэке.
 */

/**
 * ИНН: 10 цифр (юрлицо) или 12 цифр (ИП/физлицо).
 * По решению заказчика контрольную сумму НЕ проверяем (Блок 2, шаг 6).
 */
export function isValidInn(raw: string): boolean {
  const digits = raw.replace(/\D/g, "");
  return digits.length === 10 || digits.length === 12;
}

/**
 * ОГРН/ОГРНИП: 13 (ОГРН для ЮЛ) или 15 (ОГРНИП для ИП) цифр.
 * Контрольную сумму НЕ проверяем (Блок 2, шаг 6).
 */
export function isValidOgrn(raw: string): boolean {
  const digits = raw.replace(/\D/g, "");
  return digits.length === 13 || digits.length === 15;
}

/**
 * Номер павильона (Блок 2, шаг 3).
 * Длина 1–20, разрешены буквы (рус/лат), цифры, дефисы, пробелы.
 */
export function isValidPavilionNumber(raw: string): boolean {
  const v = raw.trim();
  if (v.length < 1 || v.length > 20) return false;
  return /^[A-Za-zА-Яа-яЁё0-9\s-]+$/u.test(v);
}

/**
 * Имя/фамилия поставщика — кириллица/латиница, пробелы, дефисы.
 * Длина 1–50 (Блок 2, шаг 2).
 */
export function isValidPersonName(raw: string): boolean {
  const v = raw.trim();
  if (v.length < 1 || v.length > 50) return false;
  return /^[A-Za-zА-Яа-яЁё][A-Za-zА-Яа-яЁё\s-]*$/u.test(v);
}
