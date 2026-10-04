import { BadRequestException, Injectable, Logger, OnModuleInit } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";

// ── Промт (единый для категорий и подкатегорий) ───────────────────────────────

const buildPrompt = (parentName: string | null, catList: string, threshold: number) => `
Ты подбираешь ${parentName ? `под-категорию в разделе "${parentName}"` : "родительскую категорию"} для товара на российском маркетплейсе.

Существующие ${parentName ? "под-категории" : "категории"}: ${catList || "(пусто)"}

Форматы ответа (ТОЛЬКО одна строка, без кавычек, без markdown):
  REJECT                — неприемлемый контент (18+, наркотики, оружие, бессмыслица)
  MATCH:Точное название — если запрос совпадает с существующим из списка
  CREATE:Название       — создать новую (нормализованное из запроса)

Порог совпадения: ${threshold}%

Примеры${parentName ? ` (раздел "${parentName}")` : ""}:
  "стол"            → CREATE:Столы
  "платье вечернее" → CREATE:Вечернее платьё
  "iPhone"          → ${parentName ? "MATCH:iPhone" : "MATCH:Электроника и гаджеты"}
  "ааааа"           → REJECT
  "пенис"           → REJECT
`.trim();

// ── Оффлайн блоклист ──────────────────────────────────────────────────────────
// Примечание: \b не работает с кириллицей в JS (кириллица — \W), поэтому
// для русских слов используем lookahead/lookbehind на кириллические символы.
const _CYR = "а-яёa-z0-9";
const _wb = (w: string) => new RegExp(`(?<![${_CYR}])${w}(?![${_CYR}])`, "i");

const BLOCKED: RegExp[] = [
  /хуй|хуе|хуя|пизд|ёбл|ебл|ебан|блядь|блять|пиздос|залупа|мудак|шлюх|трахн|ёбаны/i,
  // Анатомические термины (без \b — кириллица не поддерживает \b в JS)
  /пенис|вагина|клитор|анус|задниц|сиськ|дрочи|член|похот/i,
  // 18+ / эскорт
  /порно|эротик|стриптиз|проститут|эскорт|интим.?услуг|секс.?шоп|онлайн.?секс/i,
  // Отдельно слово "секс" (не часть другого слова)
  _wb("секс"),
  // Наркотики — убран \b, добавлены варианты
  /наркот|наркота|кокаин|героин|мефедрон|амфетамин|гашиш|марихуан|спайс|экстази|фентанил|метамфетам/i,
  // Оружие
  /взрывч|граната|патрон/i,
];
const GIBBERISH = /^(.)\1{3,}$|^[^а-яёa-z\d]+$/i;

// ── Типы ─────────────────────────────────────────────────────────────────────

export interface CategoryMatchResult {
  id: string;
  name: string;
  parentId: string | null;
  parentName: string | null;
  isNew: boolean;
  noMatch?: boolean;
  hint?: string;
}

type DbCat = {
  id: string; name: string; slug: string;
  icon: string | null; order: number; parentId: string | null;
};

// ── Service ───────────────────────────────────────────────────────────────────

@Injectable()
export class CategoryAiService implements OnModuleInit {
  private readonly logger = new Logger(CategoryAiService.name);

  constructor(private readonly prisma: PrismaService) {}

  async onModuleInit() {
    try {
      await this.prisma.categoryAiSettings.updateMany({
        where: { id: "default", model: "google/gemini-flash-1.5" },
        data: { model: "google/gemini-3-flash-preview" },
      });
    } catch { /* ignore */ }
  }

  async getSettings() {
    return this.prisma.categoryAiSettings.upsert({
      where: { id: "default" },
      create: { id: "default", model: "google/gemini-3-flash-preview" },
      update: {},
    });
  }

  async updateSettings(data: {
    apiKey?: string | null; apiBaseUrl?: string; model?: string;
    threshold?: number; enabled?: boolean; systemPrompt?: string | null;
  }) {
    return this.prisma.categoryAiSettings.upsert({
      where: { id: "default" },
      create: { id: "default", ...data },
      update: data,
    });
  }

  // ── Утилиты ───────────────────────────────────────────────────────────────

  private validateContent(query: string): void {
    if (query.length < 3) throw new BadRequestException("Слишком короткое название (минимум 3 символа)");
    if (query.split(/\s+/).length > 6) throw new BadRequestException("Слишком длинное название (макс. 6 слов)");
    if (GIBBERISH.test(query)) throw new BadRequestException("Введите корректное название");
    if (!/[а-яёa-z]/i.test(query)) throw new BadRequestException("Название должно содержать буквы");
    for (const re of BLOCKED) {
      if (re.test(query)) throw new BadRequestException("Данная категория не подходит для маркетплейса");
    }
  }

  private fuzzyScore(query: string, catName: string): number {
    const lower = query.toLowerCase();
    const catLower = catName.toLowerCase();
    const qWords = lower.split(/[\s,]+/).filter((w) => w.length >= 3);
    const cWords = catLower.split(/[\s,]+/).filter((w) => w.length >= 3);
    let score = 0;
    if (catLower === lower) score += 20;
    if (catLower.includes(lower)) score += 12;
    if (lower.includes(catLower)) score += 10;
    for (const qw of qWords) {
      for (const cw of cWords) {
        if (qw === cw) score += 8;
        else if (cw.startsWith(qw) || qw.startsWith(cw)) score += 5;
        else if (qw.length >= 4 && cw.length >= 4 && qw.slice(0, 4) === cw.slice(0, 4)) score += 3;
      }
    }
    return score;
  }

  private fuzzyFind(query: string, cats: DbCat[]): DbCat | null {
    let best: { cat: DbCat; score: number } | null = null;
    for (const cat of cats) {
      const score = this.fuzzyScore(query, cat.name);
      if (score > 0 && (!best || score > best.score)) best = { cat, score };
    }
    return best && best.score >= 3 ? best.cat : null;
  }

  private makeSlug(name: string) {
    return name.toLowerCase().replace(/\s+/g, "-").replace(/[^a-zа-яё0-9-]/gi, "").slice(0, 50) + "-" + Date.now().toString(36);
  }

  private capitalize(s: string): string {
    return s ? s.charAt(0).toUpperCase() + s.slice(1) : s;
  }

  // ── Вызов AI ──────────────────────────────────────────────────────────────

  private async callAI(
    query: string,
    candidates: DbCat[],
    parentContext: { id: string; name: string } | null,
    settings: Awaited<ReturnType<CategoryAiService["getSettings"]>>,
  ): Promise<{ action: "match" | "create" | "reject"; name: string }> {
    const catList = candidates.map((c) => c.name).join(", ");
    const prompt = settings.systemPrompt ||
      buildPrompt(parentContext?.name ?? null, catList, Math.round(settings.threshold * 100));

    const res = await fetch(`${settings.apiBaseUrl}/chat/completions`, {
      method: "POST",
      headers: { Authorization: `Bearer ${settings.apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: settings.model,
        temperature: 0.1,
        max_tokens: 60,
        messages: [
          { role: "system", content: prompt },
          { role: "user", content: `Запрос: "${query}"` },
        ],
      }),
    });

    if (!res.ok) {
      const txt = await res.text().catch(() => "");
      throw new Error(`AI ${res.status}: ${txt.slice(0, 200)}`);
    }

    const data = await res.json();
    const raw = (data.choices?.[0]?.message?.content ?? "").trim().replace(/^["'`]|["'`]$/g, "");
    this.logger.log(`AI [${parentContext?.name ?? "root"}] "${query}": ${raw}`);

    if (/^REJECT$/i.test(raw)) return { action: "reject", name: "" };
    if (/^MATCH:/i.test(raw)) return { action: "match", name: raw.replace(/^MATCH:/i, "").trim() };
    if (/^CREATE:/i.test(raw)) return { action: "create", name: raw.replace(/^CREATE:/i, "").trim() };

    // Нераспознанный формат — пробуем как имя
    return { action: candidates.some(c => c.name.toLowerCase() === raw.toLowerCase()) ? "match" : "create", name: raw };
  }

  // ── Основной метод — единая логика для категорий и подкатегорий ──────────

  /**
   * @param query - текст пользователя
   * @param parentId - если задан → ищем/создаём ПОДКАТЕГОРИЮ под этим родителем
   *                   если null → ищем/создаём КОРНЕВУЮ категорию
   */
  async matchOrCreate(query: string, parentId?: string | null): Promise<CategoryMatchResult> {
    const trimmed = query.trim();
    if (!trimmed) throw new BadRequestException("Пустой запрос");

    // Оффлайн-цензура (всегда)
    this.validateContent(trimmed);

    const settings = await this.getSettings();

    // ── Загружаем кандидатов ─────────────────────────────────────────────
    let candidates: DbCat[];
    let parentContext: { id: string; name: string } | null = null;

    if (parentId) {
      // Режим подкатегории: ищем среди детей родителя
      const parent = await this.prisma.category.findUnique({ where: { id: parentId } });
      if (!parent) throw new BadRequestException("Родительская категория не найдена");
      parentContext = { id: parent.id, name: parent.name };
      candidates = await this.prisma.category.findMany({
        where: { parentId },
        orderBy: { order: "asc" },
      });
    } else {
      // Режим корневой: только корневые категории
      candidates = await this.prisma.category.findMany({
        where: { parentId: null },
        orderBy: { order: "asc" },
      });
    }

    // ── Точное совпадение ─────────────────────────────────────────────────
    const exact = candidates.find((c) => c.name.toLowerCase() === trimmed.toLowerCase());
    if (exact) {
      return { id: exact.id, name: exact.name, parentId: parentContext?.id ?? null, parentName: parentContext?.name ?? null, isNew: false };
    }

    // ── Нечёткий поиск ────────────────────────────────────────────────────
    const fuzzy = this.fuzzyFind(trimmed, candidates);
    // Высокое совпадение (включение строки) — возвращаем сразу
    if (fuzzy) {
      const fLower = fuzzy.name.toLowerCase();
      const qLower = trimmed.toLowerCase();
      if (fLower.includes(qLower) || qLower.includes(fLower)) {
        this.logger.log(`Fuzzy: "${trimmed}" → "${fuzzy.name}"`);
        return { id: fuzzy.id, name: fuzzy.name, parentId: parentContext?.id ?? null, parentName: parentContext?.name ?? null, isNew: false };
      }
    }

    // ── Без AI — нечёткий или noMatch ─────────────────────────────────────
    if (!settings.enabled || !settings.apiKey) {
      if (fuzzy) {
        return { id: fuzzy.id, name: fuzzy.name, parentId: parentContext?.id ?? null, parentName: parentContext?.name ?? null, isNew: false };
      }
      return {
        id: "", name: "", parentId: null, parentName: null, isNew: false,
        noMatch: true,
        hint: "Настройте ИИ в админке (Категории → API ключ) или выберите из списка.",
      };
    }

    // ── AI ────────────────────────────────────────────────────────────────
    try {
      const ai = await this.callAI(trimmed, candidates, parentContext, settings);

      if (ai.action === "reject") {
        throw new BadRequestException("Данная категория не подходит для маркетплейса");
      }

      if (ai.action === "match" && ai.name) {
        const matched = candidates.find((c) => c.name.toLowerCase() === ai.name.toLowerCase());
        if (matched) {
          return { id: matched.id, name: matched.name, parentId: parentContext?.id ?? null, parentName: parentContext?.name ?? null, isNew: false };
        }
        // AI назвал несуществующее — нечёткий по ответу AI
        const fzAi = this.fuzzyFind(ai.name, candidates);
        if (fzAi) {
          return { id: fzAi.id, name: fzAi.name, parentId: parentContext?.id ?? null, parentName: parentContext?.name ?? null, isNew: false };
        }
      }

      // CREATE или непонятный match → создаём
      const newName = this.capitalize(ai.name || trimmed);
      const newSlug = parentContext
        ? this.makeSlug(`${parentContext.name}-${newName}`)
        : this.makeSlug(newName);

      const created = await this.prisma.category.create({
        data: { name: newName, slug: newSlug, parentId: parentContext?.id ?? null, order: 9999 },
      });
      this.logger.log(`Created [${parentContext?.name ?? "root"}]: "${newName}"`);
      return { id: created.id, name: created.name, parentId: parentContext?.id ?? null, parentName: parentContext?.name ?? null, isNew: true };

    } catch (err) {
      if (err instanceof BadRequestException) throw err;
      this.logger.error(`AI failed for "${trimmed}": ${err}`);

      // Фолбэк — нечёткий поиск
      if (fuzzy) {
        return { id: fuzzy.id, name: fuzzy.name, parentId: parentContext?.id ?? null, parentName: parentContext?.name ?? null, isNew: false };
      }

      // Само-расширение: создаём при ошибке AI (контент уже прошёл валидацию)
      const newName = this.capitalize(trimmed);
      const newSlug = parentContext ? this.makeSlug(`${parentContext.name}-${newName}`) : this.makeSlug(newName);
      const created = await this.prisma.category.create({
        data: { name: newName, slug: newSlug, parentId: parentContext?.id ?? null, order: 9999 },
      });
      this.logger.log(`Fallback created [${parentContext?.name ?? "root"}]: "${newName}"`);
      return { id: created.id, name: created.name, parentId: parentContext?.id ?? null, parentName: parentContext?.name ?? null, isNew: true };
    }
  }
}
