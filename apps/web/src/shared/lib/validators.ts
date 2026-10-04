import { z } from "zod";
import { containsProfanity, PROFANITY_USER_MESSAGE } from "./profanity";

/** 2–50 букв, без мусора типа "asdf"/"фыв" и без мата */
export const nameSchema = z
  .string()
  .trim()
  .min(2, "Минимум 2 символа")
  .max(50, "Максимум 50 символов")
  .regex(
    /^\p{L}[\p{L}\s'-]+$/u,
    "Только буквы, пробелы, дефис и апостроф",
  )
  .refine((v) => !/^([а-яa-z])\1+$/i.test(v.replace(/[\s'-]/g, "")), {
    message: "Укажите настоящее имя",
  })
  .refine((v) => !containsProfanity(v), {
    message: PROFANITY_USER_MESSAGE,
  });

export const citySchema = z
  .string()
  .trim()
  .min(2, "Минимум 2 символа")
  .max(80, "Максимум 80 символов")
  .regex(
    /^\p{L}[\p{L}\s.'-]+$/u,
    "Только буквы, пробелы, точка, дефис и апостроф",
  );

export const addressSchema = z
  .string()
  .trim()
  .min(10, "Укажите полный адрес: город, улица, дом")
  .max(500, "Максимум 500 символов")
  .refine((v) => /\p{L}{3,}/u.test(v), {
    message: "Адрес должен содержать название улицы или города",
  })
  .refine((v) => /\d/.test(v), {
    message: "Укажите номер дома или квартиры",
  })
  .refine(
    (v) => {
      const words = v
        .split(/\s+/)
        .filter((w) => /\p{L}/u.test(w) && w.length >= 2);
      return words.length >= 2;
    },
    { message: "Адрес должен содержать город и улицу" },
  );

export function makeTitleSchema(min = 4, max = 120) {
  return z
    .string()
    .trim()
    .min(min, `Минимум ${min} символов`)
    .max(max, `Максимум ${max} символов`)
    .refine((v) => /\p{L}{3,}/u.test(v), {
      message: "Название должно содержать буквы",
    });
}

export function makeLongTextSchema(min = 10, max = 5000) {
  return z
    .string()
    .trim()
    .min(min, `Минимум ${min} символов`)
    .max(max, `Максимум ${max} символов`);
}
