/**
 * Константы блока 3 (регистрация посредника).
 */

/** Диапазон процентной ставки посредника (Блок 3, шаг 3). */
export const MEDIATOR_COMMISSION_MIN = 3; // %
export const MEDIATOR_COMMISSION_MAX = 20; // %
export const MEDIATOR_COMMISSION_STEP = 0.5; // %

/**
 * Минимальная сумма выкупа: 0 ₽ — без ограничения, шаг 100 ₽.
 * Максимум сверху не задан (по решению заказчика).
 */
export const MEDIATOR_MIN_ORDER_FLOOR = 0;
export const MEDIATOR_MIN_ORDER_STEP = 100;

/**
 * Зона работы посредника — пока единственная (Блок 3, раздел 3.6).
 */
export const MEDIATOR_WORK_AREA_LABEL = "Работает по всему ТК «Садовод»";

/**
 * Статусы заявки посредника. Те же, что у поставщика (Блок 3, 3.8).
 */
export const MEDIATOR_APPLICATION_STATUSES = [
  "pending",
  "needs_revision",
  "approved",
  "rejected",
] as const;

export type MediatorApplicationStatus =
  (typeof MEDIATOR_APPLICATION_STATUSES)[number];

/** SLA рассмотрения заявки посредника, часов. */
export const MEDIATOR_REVIEW_SLA_HOURS = 24;
