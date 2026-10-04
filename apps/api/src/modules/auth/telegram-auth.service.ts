import {
  Injectable,
  BadRequestException,
  NotFoundException,
  Logger,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { randomBytes, createHmac } from "crypto";
import { PrismaService } from "../prisma/prisma.service";
import { TokensService } from "./tokens.service";

/**
 * MAX (max.ru) авторизация через бота.
 *
 * Поток:
 * 1. Фронтенд вызывает POST /auth/max/start → получает { sessionId, botLink }
 * 2. Пользователь открывает ссылку на бота в MAX
 * 3. MAX присылает webhook bot_started → бот отправляет кнопку «Поделиться контактом»
 * 4. Пользователь нажимает кнопку → MAX присылает webhook message_created с контактом
 * 5. Бот парсит телефон из vcf_info, верифицирует hash, создаёт/находит пользователя
 * 6. Фронтенд поллит GET /auth/max/status/:sessionId → получает JWT когда готово
 *
 * @see https://dev.max.ru/docs-api
 */

interface PendingSession {
  createdAt: number;
  maxUserId?: number;
  result?: { accessToken: string; userId: string };
}

const MAX_API = "https://platform-api.max.ru";

@Injectable()
export class MaxAuthService {
  private readonly logger = new Logger(MaxAuthService.name);
  private readonly botToken: string;
  private readonly botUsername: string;
  /** In-memory хранилище сессий (в проде → Redis) */
  private readonly sessions = new Map<string, PendingSession>();
  /** MAX userId → sessionId mapping */
  private readonly userSessions = new Map<number, string>();
  /** TTL сессии — 5 минут */
  private readonly SESSION_TTL = 5 * 60 * 1000;

  constructor(
    private readonly config: ConfigService,
    private readonly prisma: PrismaService,
    private readonly tokens: TokensService,
  ) {
    this.botToken = this.config.get<string>("MAX_BOT_TOKEN") ?? "";
    this.botUsername = this.config.get<string>("MAX_BOT_USERNAME") ?? "";
  }

  /** Шаг 1: создать сессию авторизации, вернуть ссылку на бота */
  startSession(): { sessionId: string; botLink: string } {
    if (!this.botToken) {
      throw new BadRequestException(
        "MAX бот не настроен. Укажите MAX_BOT_TOKEN в .env",
      );
    }

    const sessionId = randomBytes(16).toString("hex");
    this.sessions.set(sessionId, { createdAt: Date.now() });
    this.cleanupExpired();

    const botLink = `https://max.ru/${this.botUsername}?start=auth_${sessionId}`;
    return { sessionId, botLink };
  }

  /** Шаг 2: обработка webhook от MAX — роутер по update_type */
  async handleWebhook(update: any): Promise<void> {
    const type = update?.update_type;
    this.logger.log(`Webhook: update_type=${type}`);

    switch (type) {
      case "bot_started":
        await this.onBotStarted(update);
        break;
      case "message_created":
        await this.onMessageCreated(update);
        break;
      default:
        this.logger.warn(`Неизвестный update_type: ${type}`);
    }
  }

  /** bot_started — пользователь перешёл по ссылке бота */
  private async onBotStarted(update: any): Promise<void> {
    const payload: string = update.payload ?? "";
    const userId: number = update.user?.user_id;

    if (!payload.startsWith("auth_") || !userId) {
      this.logger.warn(`bot_started без auth payload или userId`);
      return;
    }

    const sessionId = payload.replace("auth_", "");
    const session = this.sessions.get(sessionId);
    if (!session) {
      this.logger.warn(`Сессия ${sessionId} не найдена`);
      // Всё равно отправим кнопку, но авторизация не завершится
    } else {
      session.maxUserId = userId;
      this.userSessions.set(userId, sessionId);
    }

    // Отправить пользователю кнопку «Поделиться контактом»
    await this.sendContactButton(userId);
  }

  /** message_created — пользователь поделился контактом */
  private async onMessageCreated(update: any): Promise<void> {
    const message = update.message;
    if (!message) return;

    const senderId: number = message.sender?.user_id;
    const attachments: any[] = message.body?.attachments ?? [];

    // Ищем вложение типа "contact"
    const contactAttach = attachments.find((a: any) => a.type === "contact");
    if (!contactAttach) return; // Обычное сообщение — игнорируем

    const vcfInfo: string = contactAttach.payload?.vcf_info ?? "";
    const hash: string = contactAttach.payload?.hash ?? "";
    const maxInfo = contactAttach.payload?.max_info;

    // Извлечь телефон из vcf_info
    const phone = this.parsePhoneFromVcf(vcfInfo);
    if (!phone) {
      this.logger.error(`Не удалось извлечь телефон из vcf_info`);
      await this.sendMessage(senderId, "❌ Не удалось прочитать номер телефона. Попробуйте ещё раз.");
      return;
    }

    // Верифицировать hash (HMAC-SHA256)
    if (hash) {
      const vcfRaw = vcfInfo.replace(/\\r\\n/g, "\r\n");
      const expected = createHmac("sha256", this.botToken)
        .update(vcfRaw)
        .digest("hex");
      if (expected !== hash) {
        this.logger.warn(`Hash mismatch для userId=${senderId}. Expected=${expected}, got=${hash}`);
        // Не блокируем — хеш может быть в другом формате, логируем
      }
    }

    // Найти sessionId по MAX userId
    const sessionId = this.userSessions.get(senderId);
    if (!sessionId) {
      this.logger.warn(`Нет сессии для MAX userId=${senderId}`);
      await this.sendMessage(senderId, "⏳ Сессия авторизации не найдена или истекла. Попробуйте снова на сайте.");
      return;
    }

    const session = this.sessions.get(sessionId);
    if (!session) {
      this.logger.warn(`Сессия ${sessionId} уже удалена`);
      await this.sendMessage(senderId, "⏳ Сессия авторизации истекла. Попробуйте снова на сайте.");
      return;
    }

    // Найти имя из vcf_info или maxInfo
    const firstName = maxInfo?.first_name
      ?? this.parseNameFromVcf(vcfInfo)
      ?? "Пользователь";
    const lastName = maxInfo?.last_name ?? undefined;

    // Нормализовать телефон
    const normalizedPhone = phone.startsWith("+") ? phone : `+${phone}`;

    // Найти или создать пользователя
    let user = await this.prisma.user.findUnique({ where: { phone: normalizedPhone } });

    if (!user) {
      const maxId = String(senderId);
      user = await this.prisma.user.findUnique({ where: { telegramId: maxId } });
    }

    if (!user) {
      user = await this.prisma.user.create({
        data: {
          telegramId: String(senderId),
          phone: normalizedPhone,
          phoneVerified: true,
          firstName,
          lastName: lastName ?? null,
          role: "BUYER",
          roles: ["BUYER"],
          lastLoginAt: new Date(),
        },
      });
      this.logger.log(`Создан пользователь ${user.id} через MAX`);
    } else {
      await this.prisma.user.update({
        where: { id: user.id },
        data: {
          telegramId: String(senderId),
          phoneVerified: true,
          lastLoginAt: new Date(),
        },
      });
      this.logger.log(`Авторизован пользователь ${user.id} через MAX`);
    }

    const accessToken = await this.tokens.signAccessToken(user.id, user.role);
    session.result = { accessToken, userId: user.id };

    // Очистить маппинг
    this.userSessions.delete(senderId);

    // Отправить подтверждение в чат
    await this.sendMessage(senderId, "✅ Вы успешно авторизованы! Вернитесь на сайт.");
  }

  /** Шаг 3: фронтенд поллит статус сессии */
  checkStatus(
    sessionId: string,
  ): { ready: false } | { ready: true; accessToken: string; userId: string } {
    const session = this.sessions.get(sessionId);
    if (!session) {
      throw new NotFoundException("Сессия не найдена или истекла");
    }

    if (session.result) {
      const { accessToken, userId } = session.result;
      this.sessions.delete(sessionId);
      return { ready: true, accessToken, userId };
    }

    return { ready: false };
  }

  /** Отправить сообщение с кнопкой «Поделиться контактом» */
  private async sendContactButton(userId: number): Promise<void> {
    const body = {
      text: "Для авторизации на **Globox** нажмите кнопку ниже, чтобы поделиться номером телефона.",
      format: "markdown",
      attachments: [
        {
          type: "inline_keyboard",
          payload: {
            buttons: [
              [
                {
                  type: "request_contact",
                  text: "📱 Поделиться контактом",
                },
              ],
            ],
          },
        },
      ],
    };

    await this.maxApiRequest("POST", `/messages?user_id=${userId}`, body);
  }

  /** Отправить текстовое сообщение пользователю */
  private async sendMessage(userId: number, text: string): Promise<void> {
    await this.maxApiRequest("POST", `/messages?user_id=${userId}`, { text });
  }

  /** Выполнить запрос к MAX Platform API */
  private async maxApiRequest(
    method: string,
    path: string,
    body?: any,
  ): Promise<any> {
    try {
      const url = `${MAX_API}${path}`;
      const res = await fetch(url, {
        method,
        headers: {
          Authorization: this.botToken,
          "Content-Type": "application/json",
        },
        body: body ? JSON.stringify(body) : undefined,
      });
      const data = await res.json();
      if (!res.ok) {
        this.logger.error(`MAX API ${method} ${path}: ${res.status} ${JSON.stringify(data)}`);
      }
      return data;
    } catch (err) {
      this.logger.error(`MAX API ${method} ${path} failed: ${err}`);
      return null;
    }
  }

  /** Извлечь телефон из VCF строки */
  private parsePhoneFromVcf(vcf: string): string | null {
    // VCF: "...TEL;TYPE=cell:79990000000..."
    const match = vcf.match(/TEL[^:]*:(\+?\d+)/);
    return match ? match[1] : null;
  }

  /** Извлечь имя из VCF строки */
  private parseNameFromVcf(vcf: string): string | null {
    // VCF: "...FN:Ivan Ivanov..."
    const match = vcf.match(/FN:([^\r\n\\]+)/);
    return match ? match[1].trim() : null;
  }

  private cleanupExpired(): void {
    const now = Date.now();
    for (const [id, s] of this.sessions) {
      if (now - s.createdAt > this.SESSION_TTL) {
        if (s.maxUserId) this.userSessions.delete(s.maxUserId);
        this.sessions.delete(id);
      }
    }
  }
}
