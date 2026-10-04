/**
 * Константы для чата с техподдержкой (разделы 2.7 и 3.9 ТЗ).
 */

/** Максимум файлов на одно сообщение */
export const SUPPORT_MAX_ATTACHMENTS = 10;

/** Максимальный размер файла вложения (10 МБ) */
export const SUPPORT_MAX_ATTACHMENT_SIZE_BYTES = 10 * 1024 * 1024;

/** Максимальная длина темы тикета */
export const SUPPORT_SUBJECT_MAX_LENGTH = 200;
export const SUPPORT_SUBJECT_MIN_LENGTH = 3;

/** Максимальная длина сообщения */
export const SUPPORT_MESSAGE_MAX_LENGTH = 5000;
export const SUPPORT_MESSAGE_MIN_LENGTH = 1;

export const SUPPORT_TICKET_STATUSES = [
  "OPEN",
  "WAITING_USER",
  "WAITING_ADMIN",
  "CLOSED",
] as const;
export type SupportTicketStatus = (typeof SUPPORT_TICKET_STATUSES)[number];

export const SUPPORT_TICKET_STATUS_LABELS: Record<SupportTicketStatus, string> = {
  OPEN: "Открыт",
  WAITING_USER: "Ждёт вашего ответа",
  WAITING_ADMIN: "Ждёт ответа ТП",
  CLOSED: "Закрыт",
};

export const SUPPORT_MESSAGE_SENDERS = ["USER", "ADMIN", "SYSTEM"] as const;
export type SupportMessageSender = (typeof SUPPORT_MESSAGE_SENDERS)[number];
