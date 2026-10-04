const PROFANITY_ROOTS: readonly string[] = [
  "хуй", "хуе", "хуя", "пизд", "ебат", "ебал", "ебан", "ёбан", "ёбат", "еби",
  "ебл", "бляд", "сука", "сучк", "мудак", "мудил", "долбоё", "долбое",
  "гондон", "пидор", "пидар", "пидр", "залуп", "хер", "мраз", "бляха",
  "охуе", "охуи", "охуя", "чмо", "уебан", "уебищ", "уёбан",
  "fuck", "shit", "bitch", "cunt", "asshole", "dick", "pussy", "bastard",
  "nigger", "faggot", "whore", "slut", "motherfucker", "cock", "twat",
];

function normalize(s: string): string {
  return s
    .toLowerCase()
    .replace(/[\s._\-+=!@#$%^&*()\[\]{}:;"'<>?/\\|~`,0-9]+/g, "")
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

export function containsProfanity(input: string): boolean {
  if (!input) return false;
  const norm = normalize(input);
  for (const root of PROFANITY_ROOTS) {
    if (norm.includes(root)) return true;
    if (input.toLowerCase().includes(root)) return true;
  }
  return false;
}

export const PROFANITY_USER_MESSAGE =
  "Содержит недопустимые слова. Пожалуйста, используйте уважительный язык";
