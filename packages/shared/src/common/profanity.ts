/**
 * Базовый фильтр нецензурных слов для RU+EN.
 * Не претендует на полноту — базовый список очевидных корней, расширим по мере необходимости.
 * Работает по нормализованной строке (lowercase, убраны пробелы/цифры/спецсимволы),
 * ловит leet-варианты (3 → e, 0 → o, 1 → i и т.п.).
 */

/** Корни запрещённых слов (lowercase). Регистрозависимости нет. */
const PROFANITY_ROOTS: readonly string[] = [
  // RU (base forms; matches derivatives via substring)
  "хуй",
  "хуе",
  "хуя",
  "пизд",
  "ебат",
  "ебал",
  "ебан",
  "ёбан",
  "ёбат",
  "еби",
  "ебл",
  "бляд",
  "сука",
  "сучк",
  "мудак",
  "мудил",
  "долбоё",
  "долбое",
  "гондон",
  "пидор",
  "пидар",
  "пидр",
  "залуп",
  "хер",
  "мраз",
  "бляха",
  "охуе",
  "охуи",
  "охуя",
  "чмо",
  "уебан",
  "уебищ",
  "уёбан",
  // EN
  "fuck",
  "shit",
  "bitch",
  "cunt",
  "asshole",
  "dick",
  "pussy",
  "bastard",
  "nigger",
  "faggot",
  "whore",
  "slut",
  "motherfucker",
  "cock",
  "twat",
];

/** Leet-подстановки: превращаем цифры и латиницу, похожую на кириллицу, в буквы. */
function normalize(s: string): string {
  return s
    .toLowerCase()
    .replace(/[\s._\-+=!@#$%^&*()\[\]{}:;"'<>?/\\|~`,0-9]+/g, "")
    // leet → letters
    .replace(/[3зz]/g, "е")
    .replace(/[0о]/g, "о")
    .replace(/[@аa]/g, "а")
    .replace(/[иi1l]/g, "и")
    .replace(/[уy]/g, "у")
    .replace(/[хx]/g, "х")
    .replace(/[еe]/g, "е")
    .replace(/[pр]/g, "р")
    .replace(/[cсk]/g, "с")
    .replace(/[tт]/g, "т");
}

/** Содержит ли строка нецензурное слово. */
export function containsProfanity(input: string): boolean {
  if (!input) return false;
  const norm = normalize(input);
  for (const root of PROFANITY_ROOTS) {
    if (norm.includes(root)) return true;
    // Проверяем и оригинал — на случай, если нормализация что-то сломала
    if (input.toLowerCase().includes(root)) return true;
  }
  return false;
}

export const PROFANITY_USER_MESSAGE =
  "Содержит недопустимые слова. Пожалуйста, используйте уважительный язык";
