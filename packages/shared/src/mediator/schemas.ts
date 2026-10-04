import { z } from "zod";
import { phoneSchema } from "../auth/schemas";
import { isValidPersonName } from "../supplier/validators";
import {
  MEDIATOR_COMMISSION_MAX,
  MEDIATOR_COMMISSION_MIN,
  MEDIATOR_MIN_ORDER_FLOOR,
} from "./constants";

const mediatorPersonName = z
  .string()
  .trim()
  .min(1, "Обязательное поле")
  .max(50, "Максимум 50 символов")
  .refine(isValidPersonName, {
    message: "Только буквы, пробелы и дефисы",
  });

/** Шаг 1: запрос верификации телефона через MAX. */
export const mediatorMaxRequestSchema = z.object({
  phone: phoneSchema,
});
export type MediatorMaxRequest = z.infer<typeof mediatorMaxRequestSchema>;

/** Шаг 2: подтверждение 6-значного кода. */
export const mediatorMaxVerifySchema = z.object({
  sessionToken: z.string().min(8),
  code: z.string().regex(/^\d{6}$/, "Код должен состоять из 6 цифр"),
});
export type MediatorMaxVerify = z.infer<typeof mediatorMaxVerifySchema>;

/**
 * Финальная заявка посредника (Блок 3, 3.5).
 */
export const mediatorApplicationSchema = z.object({
  /** session_token MAX-верификации, выданный после verify */
  sessionToken: z.string().min(8),

  /** ФИО (Блок 3, шаг 1). Отчество опционально. */
  lastName: mediatorPersonName,
  firstName: mediatorPersonName,
  middleName: z
    .string()
    .trim()
    .max(50, "Максимум 50 символов")
    .refine((v) => v === "" || isValidPersonName(v), {
      message: "Только буквы, пробелы и дефисы",
    })
    .optional()
    .default(""),

  /** Процентная ставка (Блок 3, шаг 3). */
  commissionRate: z
    .number({ invalid_type_error: "Укажите ставку" })
    .min(MEDIATOR_COMMISSION_MIN, `Минимум ${MEDIATOR_COMMISSION_MIN}%`)
    .max(MEDIATOR_COMMISSION_MAX, `Максимум ${MEDIATOR_COMMISSION_MAX}%`),

  /** Минимальная сумма выкупа в рублях (Блок 3, шаг 4). */
  minOrderAmount: z
    .number({ invalid_type_error: "Укажите минимальную сумму" })
    .int("Сумма должна быть целым числом рублей")
    .min(MEDIATOR_MIN_ORDER_FLOOR, "Сумма не может быть отрицательной"),

  /** Аватарка (публичный URL после загрузки в S3 — Блок 3, шаг 5, фото 1). */
  avatarUrl: z.string().url("Загрузите аватарку"),

  /** Разворот паспорта (приватный URL — Блок 3, шаг 5, фото 2). */
  passportPhotoUrl: z.string().url("Загрузите фото паспорта"),

  /** Селфи с пропуском (приватный URL — Блок 3, шаг 5, фото 3). */
  passSelfieUrl: z.string().url("Загрузите селфи с пропуском"),

  /** Согласие с условиями (важно: платформа не участвует в денежных расчётах). */
  acceptTerms: z.literal(true, {
    errorMap: () => ({ message: "Необходимо принять условия" }),
  }),
});

export type MediatorApplication = z.infer<typeof mediatorApplicationSchema>;

/**
 * Самостоятельное обновление настроек посредника (Блок 3, 3.10):
 * ставка и минимальная сумма меняются без техподдержки.
 */
export const mediatorSettingsUpdateSchema = z.object({
  commissionRate: z
    .number()
    .min(MEDIATOR_COMMISSION_MIN)
    .max(MEDIATOR_COMMISSION_MAX)
    .optional(),
  minOrderAmount: z
    .number()
    .int()
    .min(MEDIATOR_MIN_ORDER_FLOOR)
    .optional(),
  avatarUrl: z.string().optional(),
});

export type MediatorSettingsUpdate = z.infer<typeof mediatorSettingsUpdateSchema>;

/**
 * Запрос изменения «защищённых» полей посредника
 * (ФИО / паспорт / пропуск / телефон) — только через техподдержку.
 */
export const mediatorChangeRequestSchema = z.object({
  fieldName: z.enum([
    "lastName",
    "firstName",
    "middleName",
    "phone",
    "passportPhotoUrl",
    "passSelfieUrl",
  ]),
  newValue: z.string().min(1, "Укажите новое значение"),
  reason: z.string().min(10, "Опишите причину (минимум 10 символов)").max(1000),
});

export type MediatorChangeRequest = z.infer<typeof mediatorChangeRequestSchema>;
