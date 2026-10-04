import { Injectable, Logger, BadRequestException } from "@nestjs/common";
import { randomBytes } from "crypto";
import { PrismaService } from "../prisma/prisma.service";
import { TelegramNotifyService } from "./telegram-notify.service";
import { VkNotifyService } from "./vk-notify.service";
import { MaxNotifyService } from "./max-notify.service";
import { NotifChannel } from "@prisma/client";

interface PendingLink {
  userId: string;
  channel: NotifChannel;
  createdAt: number;
}

@Injectable()
export class NotificationService {
  private readonly logger = new Logger(NotificationService.name);
  /** In-memory pending link tokens: token → { userId, channel } */
  private readonly pending = new Map<string, PendingLink>();
  private readonly PENDING_TTL = 10 * 60 * 1000; // 10 min

  constructor(
    private readonly prisma: PrismaService,
    private readonly telegram: TelegramNotifyService,
    private readonly vk: VkNotifyService,
    private readonly max: MaxNotifyService,
  ) {
    setInterval(() => this.cleanupPending(), 5 * 60_000);
  }

  /** Получить подписки пользователя */
  async getSubscriptions(userId: string) {
    return this.prisma.notificationSubscription.findMany({
      where: { userId },
      select: { channel: true, active: true, createdAt: true },
    });
  }

  /** Начать привязку канала: вернуть ссылку на бота */
  startLink(
    userId: string,
    channel: NotifChannel,
  ): { link: string; token: string } {
    const token = randomBytes(16).toString("hex");
    this.pending.set(token, { userId, channel, createdAt: Date.now() });

    let link = "";
    switch (channel) {
      case "TELEGRAM":
        if (!this.telegram.configured) {
          throw new BadRequestException("Telegram бот не настроен");
        }
        link = `https://t.me/${this.telegram.botUsername}?start=${token}`;
        break;
      case "VK":
        if (!this.vk.configured) {
          throw new BadRequestException("VK бот не настроен");
        }
        link = `https://vk.com/im?sel=-${process.env.VK_GROUP_ID ?? ""}&ref=${token}`;
        break;
      case "MAX":
        if (!this.max.configured) {
          throw new BadRequestException("Max бот не настроен");
        }
        link = `https://max.ru/${this.max.botUsername}?start=link_${token}`;
        break;
    }

    return { link, token };
  }

  /** Telegram webhook: /start <token> */
  async handleTelegramWebhook(update: any): Promise<void> {
    const data = this.telegram.extractStartPayload(update);
    if (!data) return;

    const pending = this.pending.get(data.payload);
    if (!pending || pending.channel !== "TELEGRAM") {
      // Может быть просто /start без токена
      if (data.payload && !data.payload.startsWith(" ")) {
        await this.telegram.sendMessage(
          data.chatId,
          "❌ Ссылка устарела или недействительна. Попробуйте снова на сайте.",
        );
      }
      return;
    }

    this.pending.delete(data.payload);

    await this.prisma.notificationSubscription.upsert({
      where: {
        userId_channel: { userId: pending.userId, channel: "TELEGRAM" },
      },
      create: {
        userId: pending.userId,
        channel: "TELEGRAM",
        chatId: data.chatId,
      },
      update: { chatId: data.chatId, active: true },
    });

    await this.telegram.sendMessage(
      data.chatId,
      "✅ Уведомления Globox подключены!\n\nВы будете получать уведомления о заказах и важных событиях.",
    );
    this.logger.log(
      `Telegram linked: user=${pending.userId}, chatId=${data.chatId}`,
    );
  }

  /** VK Callback API */
  async handleVkCallback(
    body: any,
  ): Promise<string> {
    // Подтверждение сервера
    if (body.type === "confirmation") {
      return this.vk.confirmationString;
    }

    if (!this.vk.verifySecret(body.secret)) {
      this.logger.warn("VK: invalid secret");
      return "ok";
    }

    if (body.type === "message_new") {
      const msg = this.vk.extractMessageNew(body);
      if (msg) {
        await this.handleVkMessage(msg.vkUserId, msg.text);
      }
    }

    return "ok";
  }

  private async handleVkMessage(
    vkUserId: string,
    text: string,
  ): Promise<void> {
    // Ищем токен в тексте сообщения (пользователь переходит по ссылке, VK добавляет ref)
    // Или пользователь может просто написать токен
    const token = text.trim();

    // Ищем pending link
    let pending: PendingLink | undefined;
    let foundToken: string | undefined;

    for (const [t, p] of this.pending) {
      if (p.channel === "VK" && t === token) {
        pending = p;
        foundToken = t;
        break;
      }
    }

    if (!pending || !foundToken) {
      // Проверяем, может пользователь уже подписан
      const existing = await this.prisma.notificationSubscription.findFirst({
        where: { channel: "VK", chatId: vkUserId },
      });
      if (existing) {
        await this.vk.sendMessage(
          vkUserId,
          "Уведомления уже подключены! ✅",
        );
      } else {
        await this.vk.sendMessage(
          vkUserId,
          "Для подключения уведомлений перейдите по ссылке из настроек на сайте Globox.",
        );
      }
      return;
    }

    this.pending.delete(foundToken);

    await this.prisma.notificationSubscription.upsert({
      where: {
        userId_channel: { userId: pending.userId, channel: "VK" },
      },
      create: {
        userId: pending.userId,
        channel: "VK",
        chatId: vkUserId,
      },
      update: { chatId: vkUserId, active: true },
    });

    await this.vk.sendMessage(
      vkUserId,
      "✅ Уведомления Globox подключены!\n\nВы будете получать уведомления о заказах и важных событиях.",
    );
    this.logger.log(
      `VK linked: user=${pending.userId}, chatId=${vkUserId}`,
    );
  }

  /** Max webhook: bot_started с payload link_<token> */
  async handleMaxWebhook(update: any): Promise<void> {
    const data = this.max.extractBotStarted(update);
    if (!data) return;

    const payload = data.payload;
    if (!payload.startsWith("link_")) return;
    const token = payload.replace("link_", "");

    const pending = this.pending.get(token);
    if (!pending || pending.channel !== "MAX") {
      await this.max.sendMessage(
        data.chatId,
        "❌ Ссылка устарела или недействительна. Попробуйте снова на сайте.",
      );
      return;
    }

    this.pending.delete(token);

    await this.prisma.notificationSubscription.upsert({
      where: {
        userId_channel: { userId: pending.userId, channel: "MAX" },
      },
      create: {
        userId: pending.userId,
        channel: "MAX",
        chatId: data.chatId,
      },
      update: { chatId: data.chatId, active: true },
    });

    await this.max.sendMessage(
      data.chatId,
      "✅ Уведомления Globox подключены!\n\nВы будете получать уведомления о заказах и важных событиях.",
    );
    this.logger.log(
      `Max linked: user=${pending.userId}, chatId=${data.chatId}`,
    );
  }

  /** Отключить канал */
  async unsubscribe(userId: string, channel: NotifChannel): Promise<void> {
    await this.prisma.notificationSubscription.deleteMany({
      where: { userId, channel },
    });
  }

  /** Отправить уведомление пользователю во все подписанные каналы */
  async notify(userId: string, text: string): Promise<void> {
    const subs = await this.prisma.notificationSubscription.findMany({
      where: { userId, active: true },
    });

    for (const sub of subs) {
      switch (sub.channel) {
        case "TELEGRAM":
          await this.telegram.sendMessage(sub.chatId, text);
          break;
        case "VK":
          await this.vk.sendMessage(sub.chatId, text);
          break;
        case "MAX":
          await this.max.sendMessage(sub.chatId, text);
          break;
      }
    }
  }

  private cleanupPending(): void {
    const now = Date.now();
    for (const [token, p] of this.pending) {
      if (now - p.createdAt > this.PENDING_TTL) {
        this.pending.delete(token);
      }
    }
  }
}
