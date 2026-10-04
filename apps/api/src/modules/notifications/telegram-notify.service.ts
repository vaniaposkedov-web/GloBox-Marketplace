import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";

const TG_API = "https://api.telegram.org";

@Injectable()
export class TelegramNotifyService {
  private readonly logger = new Logger(TelegramNotifyService.name);
  private readonly botToken: string;
  readonly botUsername: string;

  constructor(private readonly config: ConfigService) {
    this.botToken = this.config.get<string>("TG_NOTIFY_BOT_TOKEN") ?? "";
    this.botUsername = this.config.get<string>("TG_NOTIFY_BOT_USERNAME") ?? "";
  }

  get configured(): boolean {
    return !!this.botToken;
  }

  /** Отправить текстовое сообщение */
  async sendMessage(chatId: string, text: string): Promise<boolean> {
    if (!this.botToken) return false;
    try {
      const res = await fetch(`${TG_API}/bot${this.botToken}/sendMessage`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: chatId,
          text,
          parse_mode: "HTML",
        }),
      });
      const data = await res.json();
      if (!data.ok) {
        this.logger.error(`TG sendMessage failed: ${JSON.stringify(data)}`);
        return false;
      }
      return true;
    } catch (err) {
      this.logger.error(`TG sendMessage error: ${err}`);
      return false;
    }
  }

  /** Установить webhook */
  async setWebhook(url: string): Promise<boolean> {
    if (!this.botToken) return false;
    try {
      const res = await fetch(`${TG_API}/bot${this.botToken}/setWebhook`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url }),
      });
      const data = await res.json();
      this.logger.log(`TG setWebhook: ${JSON.stringify(data)}`);
      return data.ok;
    } catch (err) {
      this.logger.error(`TG setWebhook error: ${err}`);
      return false;
    }
  }

  /** Обработка update от Telegram */
  extractStartPayload(update: any): { chatId: string; payload: string } | null {
    const message = update?.message;
    if (!message?.text?.startsWith("/start ")) return null;
    const payload = message.text.replace("/start ", "").trim();
    const chatId = String(message.chat.id);
    return { chatId, payload };
  }
}
