import { z } from "zod";
import { phoneSchema } from "../auth/schemas";
import {
  SUPPLIER_CATEGORY_IDS,
  SUPPLIER_CATEGORIES_MAX,
  SUPPLIER_CATEGORIES_MIN,
  SUPPLIER_ENTITY_TYPE_IDS,
  SUPPLIER_LOCATION_IDS,
  type SupplierCategoryId,
  type SupplierEntityType,
  type SupplierLocationId,
} from "./constants";
import {
  isValidInn,
  isValidOgrn,
  isValidPavilionNumber,
  isValidPersonName,
} from "./validators";

/** ФИО поставщика — допускается отчество (для иностранцев — пустое). */
const supplierPersonName = z
  .string()
  .trim()
  .min(1, "Обязательное поле")
  .max(50, "Максимум 50 символов")
  .refine(isValidPersonName, {
    message: "Только буквы, пробелы и дефисы",
  });

/** Шаг 1: запрос верификации телефона через MAX-бот. */
export const supplierMaxRequestSchema = z.object({
  phone: phoneSchema,
});
export type SupplierMaxRequest = z.infer<typeof supplierMaxRequestSchema>;

/** Шаг 2: подтверждение 6-значного кода из MAX-бота. */
export const supplierMaxVerifySchema = z.object({
  sessionToken: z.string().min(8, "Не передан session_token"),
  code: z.string().regex(/^\d{6}$/, "Код должен состоять из 6 цифр"),
});
export type SupplierMaxVerify = z.infer<typeof supplierMaxVerifySchema>;

/** Шаг 3: финальное создание заявки поставщика (Блок 2, 2.4). */
export const supplierApplicationSchema = z.object({
  /** session_token MAX-верификации, выданный после verify */
  sessionToken: z.string().min(8),

  /** ФИО */
  lastName: supplierPersonName,
  firstName: supplierPersonName,
  middleName: z
    .string()
    .trim()
    .max(50, "Максимум 50 символов")
    .refine((v) => v === "" || isValidPersonName(v), {
      message: "Только буквы, пробелы и дефисы",
    })
    .optional()
    .default(""),

  /** Локация торговой точки */
  locationId: z.enum(SUPPLIER_LOCATION_IDS as unknown as [SupplierLocationId, ...SupplierLocationId[]]),

  /** Номер павильона (формат зависит от локации) */
  pavilionNumber: z
    .string()
    .trim()
    .min(1, "Укажите номер павильона")
    .max(20, "Максимум 20 символов")
    .refine(isValidPavilionNumber, {
      message: "Допустимы буквы, цифры, дефис и пробелы",
    }),

  /** Тип субъекта */
  entityType: z.enum(
    SUPPLIER_ENTITY_TYPE_IDS as unknown as [SupplierEntityType, ...SupplierEntityType[]],
  ),

  /** Категории — от 1 до 3 верхних уровней */
  categories: z
    .array(
      z.enum(
        SUPPLIER_CATEGORY_IDS as unknown as [SupplierCategoryId, ...SupplierCategoryId[]],
      ),
    )
    .min(SUPPLIER_CATEGORIES_MIN, "Выберите хотя бы одну категорию")
    .max(SUPPLIER_CATEGORIES_MAX, `Максимум ${SUPPLIER_CATEGORIES_MAX} категории`)
    .refine((arr) => new Set(arr).size === arr.length, {
      message: "Категории не должны повторяться",
    }),

  /** ИНН — необязательно, формат 10/12 цифр */
  inn: z
    .string()
    .trim()
    .optional()
    .refine((v) => !v || isValidInn(v), {
      message: "ИНН должен содержать 10 или 12 цифр",
    }),

  /** ОГРН/ОГРНИП — необязательно, формат 13/15 цифр */
  ogrnip: z
    .string()
    .trim()
    .optional()
    .refine((v) => !v || isValidOgrn(v), {
      message: "ОГРН/ОГРНИП должен содержать 13 или 15 цифр",
    }),

  /** Подписанная ссылка на фото пропуска (приватный S3) */
  passPhotoUrl: z.string().url("Загрузите фото пропуска"),

  /** Подписанная ссылка на селфи с пропуском (приватный S3) */
  passSelfieUrl: z.string().url("Загрузите селфи с пропуском"),

  /** Согласие с пользовательским соглашением и обработкой ПДн */
  acceptTerms: z.literal(true, {
    errorMap: () => ({ message: "Необходимо принять условия" }),
  }),
});

export type SupplierApplication = z.infer<typeof supplierApplicationSchema>;

/** Запрос изменения критичных данных после одобрения (Блок 2, 2.8). */
export const supplierChangeRequestSchema = z.object({
  fieldName: z.enum([
    "lastName",
    "firstName",
    "middleName",
    "locationId",
    "pavilionNumber",
    "entityType",
    "categories",
  ]),
  newValue: z.string().min(1, "Укажите новое значение"),
  reason: z.string().min(10, "Опишите причину (минимум 10 символов)").max(1000),
});

export type SupplierChangeRequest = z.infer<typeof supplierChangeRequestSchema>;
