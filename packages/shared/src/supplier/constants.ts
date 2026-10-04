/**
 * Константы блока 2 (регистрация поставщика).
 * Источник истины — packages/shared/src/supplier.
 */

/** Локации торговых точек (Блок 2, шаг 3). Расширяемо через админ-панель. */
export const SUPPLIER_LOCATIONS = [
  { id: "sadovod-a", label: "Садовод — Корпус А (крытый)", pavilionFormat: "2А-35" },
  { id: "sadovod-b", label: "Садовод — Корпус Б (крытый)", pavilionFormat: "1Б-12" },
  { id: "sadovod-open", label: "Садовод — Некрытый рынок", pavilionFormat: "свободный формат" },
] as const;

export type SupplierLocationId = (typeof SUPPLIER_LOCATIONS)[number]["id"];

export const SUPPLIER_LOCATION_IDS: readonly SupplierLocationId[] =
  SUPPLIER_LOCATIONS.map((l) => l.id) as ReadonlyArray<SupplierLocationId>;

/** Тип субъекта (правовая форма) — Блок 2, шаг 4. */
export const SUPPLIER_ENTITY_TYPES = [
  { id: "individual", label: "Физическое лицо" },
  { id: "self_employed", label: "Самозанятый (НПД)" },
  { id: "ip", label: "Индивидуальный предприниматель (ИП)" },
  { id: "ooo", label: "ООО" },
] as const;

export type SupplierEntityType = (typeof SUPPLIER_ENTITY_TYPES)[number]["id"];

export const SUPPLIER_ENTITY_TYPE_IDS: readonly SupplierEntityType[] =
  SUPPLIER_ENTITY_TYPES.map((e) => e.id) as ReadonlyArray<SupplierEntityType>;

/**
 * Категории верхнего уровня для поставщиков (Блок 2, шаг 5).
 * Финальный список согласовывается при проработке каталога — заменяемо через БД.
 */
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

/** Максимум категорий, которые поставщик может выбрать на регистрации. */
export const SUPPLIER_CATEGORIES_MAX = 3;
export const SUPPLIER_CATEGORIES_MIN = 1;

/** Статусы заявки поставщика (Блок 2, раздел 2.6). */
export const SUPPLIER_APPLICATION_STATUSES = [
  "pending",
  "needs_revision",
  "approved",
  "rejected",
] as const;

export type SupplierApplicationStatus =
  (typeof SUPPLIER_APPLICATION_STATUSES)[number];

/** SLA рассмотрения заявки в часах (Блок 2, 2.9). */
export const SUPPLIER_REVIEW_SLA_HOURS = 24;
