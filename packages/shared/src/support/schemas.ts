import { z } from "zod";
import {
  SUPPORT_MAX_ATTACHMENTS,
  SUPPORT_MESSAGE_MAX_LENGTH,
  SUPPORT_MESSAGE_MIN_LENGTH,
  SUPPORT_SUBJECT_MAX_LENGTH,
  SUPPORT_SUBJECT_MIN_LENGTH,
  SUPPORT_TICKET_STATUSES,
} from "./constants";

/** Создание тикета: тема + первое сообщение */
export const supportCreateTicketSchema = z.object({
  subject: z
    .string()
    .trim()
    .min(SUPPORT_SUBJECT_MIN_LENGTH, `Минимум ${SUPPORT_SUBJECT_MIN_LENGTH} символа`)
    .max(SUPPORT_SUBJECT_MAX_LENGTH, `Максимум ${SUPPORT_SUBJECT_MAX_LENGTH} символов`),
  message: z
    .string()
    .trim()
    .min(SUPPORT_MESSAGE_MIN_LENGTH, "Напишите сообщение")
    .max(SUPPORT_MESSAGE_MAX_LENGTH, `Максимум ${SUPPORT_MESSAGE_MAX_LENGTH} символов`),
  attachments: z
    .array(z.string().url())
    .max(SUPPORT_MAX_ATTACHMENTS, `Максимум ${SUPPORT_MAX_ATTACHMENTS} файлов`)
    .optional(),
});
export type SupportCreateTicketDto = z.infer<typeof supportCreateTicketSchema>;

/** Отправка сообщения в существующий тикет */
export const supportPostMessageSchema = z.object({
  text: z
    .string()
    .trim()
    .min(SUPPORT_MESSAGE_MIN_LENGTH, "Напишите сообщение")
    .max(SUPPORT_MESSAGE_MAX_LENGTH, `Максимум ${SUPPORT_MESSAGE_MAX_LENGTH} символов`),
  attachments: z
    .array(z.string().url())
    .max(SUPPORT_MAX_ATTACHMENTS, `Максимум ${SUPPORT_MAX_ATTACHMENTS} файлов`)
    .optional(),
});
export type SupportPostMessageDto = z.infer<typeof supportPostMessageSchema>;

/** Фильтр списка тикетов (для админки) */
export const supportListFilterSchema = z.object({
  status: z.enum(SUPPORT_TICKET_STATUSES).optional(),
  role: z.enum(["SUPPLIER", "MEDIATOR"]).optional(),
  page: z.number().int().min(1).default(1),
  limit: z.number().int().min(1).max(100).default(20),
});
export type SupportListFilterDto = z.infer<typeof supportListFilterSchema>;
