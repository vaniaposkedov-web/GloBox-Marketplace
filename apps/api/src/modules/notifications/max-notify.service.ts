import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";

const MAX_API = "https://platform-api.max.ru";

@Injectable()
export class MaxNotifyService {
  private readonly logger = new Logger(MaxNotifyService.name);
  private readonly botToken: string;
  readonly botUsername: string;

  constructor(private readonly config: ConfigService) {
    this.botToken =
      this.config.get<string>("MAX_NOTIFY_BOT_TOKEN") ?? "";
    this.botUsername =
      this.config.get<string>("MAX_NOTIFY_BOT_USERNAME") ?? "";
  }

  get configured(): boolean {
    return !!this.botToken;
  }

  /** Отправить текстовое сообщение */
  async sendMessage(chatId: string, text: string): Promise<boolean> {
    if (!this.botToken) return false;
    try {
      const res = await fetch(`${MAX_API}/messages?user_id=${chatId}`, {
        method: "POST",
        headers: {
          Authorization: this.botToken,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ text }),
      });
      const data = await res.json();
      if (!res.ok) {
        this.logger.error(`MAX sendMessage failed: ${JSON.stringify(data)}`);
        return false;
      }
      return true;
    } catch (err) {
      this.logger.error(`MAX sendMessage error: ${err}`);
      return false;
    }
  }

  /** Установить webhook */
  async setWebhook(url: string): Promise<boolean> {
    if (!this.botToken) return false;
    try {
      const res = await fetch(`${MAX_API}/subscriptions`, {
        method: "POST",
        headers: {
          Authorization: this.botToken,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ url }),
      });
      const data = await res.json();
      this.logger.log(`MAX setWebhook: ${JSON.stringify(data)}`);
      return res.ok;
    } catch (err) {
      this.logger.error(`MAX setWebhook error: ${err}`);
      return false;
    }
  }

  /** Извлечь chatId и payload из bot_started */
  extractBotStarted(update: any): { chatId: string; payload: string } | null {
    if (update?.update_type !== "bot_started") return null;
    const userId = update.user?.user_id;
    const payload: string = update.payload ?? "";
    if (!userId) return null;
    return { chatId: String(userId), payload };
  }
}
