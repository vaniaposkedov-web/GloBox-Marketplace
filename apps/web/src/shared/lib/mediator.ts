/**
 * Локальная копия mediator-схем/констант (источник истины — packages/shared/src/mediator).
 */
import { z } from "zod";
import { phoneSchema } from "./schemas";
import { isValidPersonName } from "./supplier";

// ——— Константы ———

export const MEDIATOR_COMMISSION_MIN = 3; // %
export const MEDIATOR_COMMISSION_MAX = 20; // %
export const MEDIATOR_COMMISSION_STEP = 0.5; // %

export const MEDIATOR_MIN_ORDER_FLOOR = 0;
export const MEDIATOR_MIN_ORDER_STEP = 100;

export const MEDIATOR_WORK_AREA_LABEL = "Работает по всему ТК «Садовод»";

export const MEDIATOR_APPLICATION_STATUSES = [
  "pending",
  "needs_revision",
  "approved",
  "rejected",
] as const;

export type MediatorApplicationStatus =
  (typeof MEDIATOR_APPLICATION_STATUSES)[number];

export const MEDIATOR_REVIEW_SLA_HOURS = 24;

// ——— Схемы ———

const mediatorPersonName = z
  .string()
  .trim()
  .min(1, "Обязательное поле")
  .max(50, "Максимум 50 символов")
  .refine(isValidPersonName, {
    message: "Только буквы, пробелы и дефисы",
  });

export const mediatorMaxRequestSchema = z.object({
  phone: phoneSchema,
});
export type MediatorMaxRequest = z.infer<typeof mediatorMaxRequestSchema>;

export const mediatorMaxVerifySchema = z.object({
  sessionToken: z.string().min(8),
  code: z.string().regex(/^\d{6}$/, "Код должен состоять из 6 цифр"),
});
export type MediatorMaxVerify = z.infer<typeof mediatorMaxVerifySchema>;

export const mediatorApplicationSchema = z.object({
  sessionToken: z.string().min(8),

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

  commissionRate: z
    .number({ invalid_type_error: "Укажите ставку" })
    .min(MEDIATOR_COMMISSION_MIN, `Минимум ${MEDIATOR_COMMISSION_MIN}%`)
    .max(MEDIATOR_COMMISSION_MAX, `Максимум ${MEDIATOR_COMMISSION_MAX}%`),

  minOrderAmount: z
    .number({ invalid_type_error: "Укажите минимальную сумму" })
    .int("Сумма должна быть целым числом рублей")
    .min(MEDIATOR_MIN_ORDER_FLOOR, "Сумма не может быть отрицательной"),

  avatarUrl: z.string().url("Загрузите аватарку"),
  passportPhotoUrl: z.string().url("Загрузите фото паспорта"),
  passSelfieUrl: z.string().url("Загрузите селфи с пропуском"),

  acceptTerms: z.literal(true, {
    errorMap: () => ({ message: "Необходимо принять условия" }),
  }),
});

export type MediatorApplication = z.infer<typeof mediatorApplicationSchema>;
