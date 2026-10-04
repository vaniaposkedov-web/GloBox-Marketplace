/**
 * Локальная копия supplier-схем/констант (источник истины — packages/shared/src/supplier).
 * Дублируется здесь, чтобы фронт собирался на Vercel без shared-build шага.
 * Любые изменения нужно повторять в обоих местах.
 */
import { z } from "zod";
import { phoneSchema } from "./schemas";

// ——— Константы ———

export const SUPPLIER_LOCATIONS = [
  { id: "sadovod-a", label: "Садовод — Корпус А (крытый)", pavilionFormat: "2А-35" },
  { id: "sadovod-b", label: "Садовод — Корпус Б (крытый)", pavilionFormat: "1Б-12" },
  {
    id: "sadovod-open",
    label: "Садовод — Некрытый рынок",
    pavilionFormat: "свободный формат",
  },
] as const;

export type SupplierLocationId = (typeof SUPPLIER_LOCATIONS)[number]["id"];

export const SUPPLIER_LOCATION_IDS: readonly SupplierLocationId[] =
  SUPPLIER_LOCATIONS.map((l) => l.id) as ReadonlyArray<SupplierLocationId>;

export const SUPPLIER_ENTITY_TYPES = [
  { id: "individual", label: "Физическое лицо" },
  { id: "self_employed", label: "Самозанятый (НПД)" },
  { id: "ip", label: "Индивидуальный предприниматель (ИП)" },
  { id: "ooo", label: "ООО" },
] as const;

export type SupplierEntityType = (typeof SUPPLIER_ENTITY_TYPES)[number]["id"];

export const SUPPLIER_ENTITY_TYPE_IDS: readonly SupplierEntityType[] =
  SUPPLIER_ENTITY_TYPES.map((e) => e.id) as ReadonlyArray<SupplierEntityType>;

export const SUPPLIER_TOP_CATEGORIES = [
  { id: "women-clothing", label: "Женская одежда" },
  { id: "men-clothing", label: "Мужская одежда" },
  { id: "kids-clothing", label: "Детская одежда" },
  { id: "women-shoes", label: "Женская обувь" },
  { id: "men-shoes", label: "Мужская обувь" },
  { id: "kids-shoes", label: "Детская обувь" },
  { id: "bags-accessories", label: "Сумки и аксессуары" },
  { id: "beauty", label: "Косметика и парфюмерия" },
  { id: "jewelry", label: "Ювелирные изделия и бижутерия" },
  { id: "home-textile", label: "Текстиль для дома" },
  { id: "kids-toys", label: "Детские игрушки" },
  { id: "sport", label: "Спорт и активный отдых" },
] as const;

export type SupplierCategoryId = (typeof SUPPLIER_TOP_CATEGORIES)[number]["id"];

export const SUPPLIER_CATEGORY_IDS: readonly SupplierCategoryId[] =
  SUPPLIER_TOP_CATEGORIES.map((c) => c.id) as ReadonlyArray<SupplierCategoryId>;

export const SUPPLIER_CATEGORIES_MAX = 3;
export const SUPPLIER_CATEGORIES_MIN = 1;

export const SUPPLIER_APPLICATION_STATUSES = [
  "pending",
  "needs_revision",
  "approved",
  "rejected",
] as const;

export type SupplierApplicationStatus =
  (typeof SUPPLIER_APPLICATION_STATUSES)[number];

export const SUPPLIER_REVIEW_SLA_HOURS = 24;

// ——— Валидаторы ———

export function isValidInn(raw: string): boolean {
  const digits = raw.replace(/\D/g, "");
  return digits.length === 10 || digits.length === 12;
}

export function isValidOgrn(raw: string): boolean {
  const digits = raw.replace(/\D/g, "");
  return digits.length === 13 || digits.length === 15;
}

export function isValidPavilionNumber(raw: string): boolean {
  const v = raw.trim();
  if (v.length < 1 || v.length > 20) return false;
  return /^[A-Za-zА-Яа-яЁё0-9\s-]+$/u.test(v);
}

export function isValidPersonName(raw: string): boolean {
  const v = raw.trim();
  if (v.length < 1 || v.length > 50) return false;
  return /^[A-Za-zА-Яа-яЁё][A-Za-zА-Яа-яЁё\s-]*$/u.test(v);
}

// ——— Схемы ———

const supplierPersonName = z
  .string()
  .trim()
  .min(1, "Обязательное поле")
  .max(50, "Максимум 50 символов")
  .refine(isValidPersonName, {
    message: "Только буквы, пробелы и дефисы",
  });

export const supplierMaxRequestSchema = z.object({
  phone: phoneSchema,
});
export type SupplierMaxRequest = z.infer<typeof supplierMaxRequestSchema>;

export const supplierMaxVerifySchema = z.object({
  sessionToken: z.string().min(8),
  code: z.string().regex(/^\d{6}$/, "Код должен состоять из 6 цифр"),
});
export type SupplierMaxVerify = z.infer<typeof supplierMaxVerifySchema>;

export const supplierApplicationSchema = z.object({
  sessionToken: z.string().min(8),

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

  locationId: z.enum(
    SUPPLIER_LOCATION_IDS as unknown as [SupplierLocationId, ...SupplierLocationId[]],
  ),

  pavilionNumber: z
    .string()
    .trim()
    .min(1, "Укажите номер павильона")
    .max(20, "Максимум 20 символов")
    .refine(isValidPavilionNumber, {
      message: "Допустимы буквы, цифры, дефис и пробелы",
    }),

  entityType: z.enum(
    SUPPLIER_ENTITY_TYPE_IDS as unknown as [SupplierEntityType, ...SupplierEntityType[]],
  ),

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

  inn: z
    .string()
    .trim()
    .optional()
    .refine((v) => !v || isValidInn(v), {
      message: "ИНН должен содержать 10 или 12 цифр",
    }),

  ogrnip: z
    .string()
    .trim()
    .optional()
    .refine((v) => !v || isValidOgrn(v), {
      message: "ОГРН/ОГРНИП должен содержать 13 или 15 цифр",
    }),

  passPhotoUrl: z.string().url("Загрузите фото пропуска"),
  passSelfieUrl: z.string().url("Загрузите селфи с пропуском"),

  acceptTerms: z.literal(true, {
    errorMap: () => ({ message: "Необходимо принять условия" }),
  }),
});

export type SupplierApplication = z.infer<typeof supplierApplicationSchema>;
