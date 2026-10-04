import { Injectable, Logger } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";

interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

interface AiResponse {
  text: string;
  escalate: boolean;
}

const DEFAULT_SYSTEM_PROMPT = `Ты — виртуальный ассистент службы поддержки GloBox.
Ты помогаешь посредникам (медиаторам) на маркетплейсе.
Отвечай вежливо, по-русски, кратко и по делу.
Если не знаешь ответа или пользователь просит живого оператора — ответь что переводишь на оператора и добавь в конец сообщения тег [ESCALATE].
Не выдумывай информацию, которой у тебя нет.`;

const ESCALATION_TAG = "[ESCALATE]";

@Injectable()
export class AiBotService {
  private readonly logger = new Logger(AiBotService.name);

  constructor(private readonly prisma: PrismaService) {}

  private validRoles = ["mediator", "supplier", "buyer"];

  private resolveSettingsId(role?: string): string {
    if (role && this.validRoles.includes(role.toLowerCase())) return role.toLowerCase();
    return "default";
  }

  /** Получить настройки бота по роли */
  async getSettings(role?: string) {
    const id = this.resolveSettingsId(role);
    let settings = await this.prisma.botSettings.findUnique({ where: { id } });
    if (!settings) {
      settings = await this.prisma.botSettings.create({ data: { id } });
    }
    return settings;
  }

  /** Обновить настройки бота по роли */
  async updateSettings(role: string | undefined, data: {
    apiKey?: string;
    apiBaseUrl?: string;
    model?: string;
    systemPrompt?: string;
    temperature?: number;
    maxTokens?: number;
    enabled?: boolean;
  }) {
    const id = this.resolveSettingsId(role);
    return this.prisma.botSettings.upsert({
      where: { id },
      update: data,
      create: { id, ...data },
    });
  }

  /**
   * Генерация ответа бота.
   * Если AI включён и API-ключ задан — вызывает нейросеть через ZvenoAI.
   * Иначе — fallback на regex-базу знаний.
   */
  async generateReply(
    userText: string,
    conversationHistory: { sender: string; text: string }[],
    userMsgCount: number,
    role?: string,
  ): Promise<AiResponse> {
    const settings = await this.getSettings(role);

    if (settings.enabled && settings.apiKey) {
      try {
        return await this.callAi(settings, userText, conversationHistory);
      } catch (err) {
        this.logger.error("AI call failed, falling back to regex", err);
        return this.regexFallback(userText, userMsgCount);
      }
    }

    return this.regexFallback(userText, userMsgCount);
  }

  /** Вызов ZvenoAI (OpenAI-совместимый API) */
  private async callAi(
    settings: {
      apiKey: string | null;
      apiBaseUrl: string;
      model: string;
      systemPrompt: string | null;
      temperature: number;
      maxTokens: number;
    },
    userText: string,
    conversationHistory: { sender: string; text: string }[],
  ): Promise<AiResponse> {
    const messages: ChatMessage[] = [
      {
        role: "system",
        content: settings.systemPrompt || DEFAULT_SYSTEM_PROMPT,
      },
    ];

    // Добавляем последние 20 сообщений из истории для контекста
    const recentHistory = conversationHistory.slice(-20);
    for (const msg of recentHistory) {
      if (msg.sender === "USER") {
        messages.push({ role: "user", content: msg.text });
      } else if (msg.sender === "ADMIN") {
        messages.push({ role: "assistant", content: `[Оператор]: ${msg.text}` });
      } else {
        messages.push({ role: "assistant", content: msg.text });
      }
    }

    // Текущее сообщение пользователя
    messages.push({ role: "user", content: userText });

    const baseUrl = settings.apiBaseUrl.replace(/\/+$/, "");
    const url = `${baseUrl}/chat/completions`;

    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${settings.apiKey}`,
      },
      body: JSON.stringify({
        model: settings.model,
        messages,
        temperature: settings.temperature,
        max_tokens: settings.maxTokens,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => "unknown");
      throw new Error(`ZvenoAI API error ${response.status}: ${errorText}`);
    }

    const data = await response.json();
    const content: string =
      data.choices?.[0]?.message?.content?.trim() ?? "Произошла ошибка. Попробуйте позже.";

    const escalate = content.includes(ESCALATION_TAG);
    const cleanText = content.replace(ESCALATION_TAG, "").trim();

    return { text: cleanText, escalate };
  }

  // ——— Regex fallback (старая логика) ———

  private readonly ESCALATION_PATTERNS = [
    /оператор/i, /человек/i, /менеджер/i, /живой/i, /реальн/i,
    /соедин.*поддержк/i, /переключ/i, /переведи/i, /хочу.*говорить/i,
    /позов/i, /вызов/i, /подключ.*специалист/i, /свяжите/i,
  ];

  private readonly BOT_KNOWLEDGE: { patterns: RegExp[]; response: string }[] = [
    {
      patterns: [/верификац/i, /статус.*заявк/i, /когда.*проверят/i, /сколько.*ждать/i, /рассмотрен/i, /модерац/i],
      response: "Верификация обычно занимает до 24 часов в рабочие дни.\n\nУбедитесь что:\n📸 Фото паспорта чёткое\n🤳 Селфи с паспортом — лицо и данные видны\n✅ Данные совпадают с документами\n\nЕсли прошло больше 24ч — напишите «оператор».",
    },
    {
      patterns: [/загрузк.*документ/i, /загрузить.*фото/i, /не загружается/i, /формат.*фото/i, /селфи/i],
      response: "Для загрузки документов:\n📋 Форматы: JPG, PNG\n📏 Макс. размер: 10 МБ\n📸 Фото должно быть чётким\n\nЕсли проблема сохраняется — напишите «оператор».",
    },
    {
      patterns: [/комисси/i, /ставк/i, /процент/i, /вознагражден/i],
      response: "Комиссионная ставка отображается в вашем профиле. Изменение возможно через администратора — напишите «оператор».",
    },
    {
      patterns: [/как.*работа/i, /как.*начать/i, /инструкц/i, /что делать/i],
      response: "1️⃣ Заполните профиль и загрузите документы\n2️⃣ Дождитесь верификации (до 24ч)\n3️⃣ Получите доступ к заказам\n4️⃣ Выполняйте заказы и получайте вознаграждение",
    },
    {
      patterns: [/привет/i, /здравствуйте/i, /добрый/i, /хай/i],
      response: "Здравствуйте! 😊 Чем могу помочь? Спросите о верификации, заказах, документах или напишите «оператор».",
    },
    {
      patterns: [/спасибо/i, /благодар/i],
      response: "Пожалуйста! 😊 Если возникнут ещё вопросы — пишите!",
    },
    {
      patterns: [/проблем/i, /ошибк/i, /не работает/i, /баг/i],
      response: "Опишите подробнее: что не работает, на какой странице, какую ошибку видите? Если сложная проблема — напишите «оператор».",
    },
    {
      patterns: [/заказ/i, /где.*заказ/i, /принять/i],
      response: "Заказы в разделе «Заказы». Для получения заказов профиль должен быть верифицирован.",
    },
    {
      patterns: [/выплат/i, /деньг/i, /оплат/i, /баланс/i, /вывод/i],
      response: "Информация о выплатах в разделе «Кабинет». Для деталей — напишите «оператор».",
    },
    {
      patterns: [/пароль/i, /не могу.*войти/i, /забыл/i, /восстанов/i],
      response: "Перейдите на страницу входа → «Забыли пароль?» → введите email. Если не приходит письмо — проверьте «Спам» или напишите «оператор».",
    },
  ];

  private regexFallback(text: string, userMsgCount: number): AiResponse {
    if (this.ESCALATION_PATTERNS.some((p) => p.test(text))) {
      return {
        text: "Конечно! Перевожу вас на оператора поддержки. Специалист подключится в ближайшее время. 🙋‍♂️",
        escalate: true,
      };
    }
    for (const rule of this.BOT_KNOWLEDGE) {
      if (rule.patterns.some((p) => p.test(text))) {
        return { text: rule.response, escalate: false };
      }
    }
    if (userMsgCount >= 3) {
      return {
        text: "Ваш вопрос лучше решит специалист. Перевожу на оператора! 🙋‍♂️",
        escalate: true,
      };
    }
    return {
      text: "Я не совсем понял вопрос 🤔 Опишите подробнее, или напишите «оператор» для связи со специалистом.",
      escalate: false,
    };
  }
}
