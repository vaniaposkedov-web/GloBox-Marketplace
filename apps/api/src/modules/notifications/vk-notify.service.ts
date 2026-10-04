import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";

const VK_API = "https://api.vk.com/method";
const VK_API_VERSION = "5.199";

@Injectable()
export class VkNotifyService {
  private readonly logger = new Logger(VkNotifyService.name);
  private readonly groupToken: string;
  private readonly groupId: string;
  readonly confirmationString: string;
  private readonly secretKey: string;

  constructor(private readonly config: ConfigService) {
    this.groupToken = this.config.get<string>("VK_BOT_TOKEN") ?? "";
    this.groupId = this.config.get<string>("VK_GROUP_ID") ?? "";
    this.confirmationString =
      this.config.get<string>("VK_BOT_CONFIRMATION") ?? "";
    this.secretKey = this.config.get<string>("VK_BOT_SECRET") ?? "";
  }

  get configured(): boolean {
    return !!this.groupToken && !!this.groupId;
  }

  /** Проверить secret_key из Callback API */
  verifySecret(secret: string | undefined): boolean {
    if (!this.secretKey) return true;
    return secret === this.secretKey;
  }

  /** Отправить сообщение пользователю VK */
  async sendMessage(vkUserId: string, text: string): Promise<boolean> {
    if (!this.groupToken) return false;
    try {
      const params = new URLSearchParams({
        user_id: vkUserId,
        message: text,
        random_id: String(Date.now()),
        access_token: this.groupToken,
        v: VK_API_VERSION,
      });
      const res = await fetch(`${VK_API}/messages.send?${params.toString()}`);
      const data = await res.json();
      if (data.error) {
        this.logger.error(`VK sendMessage error: ${JSON.stringify(data.error)}`);
        return false;
      }
      return true;
    } catch (err) {
      this.logger.error(`VK sendMessage error: ${err}`);
      return false;
    }
  }

  /** Извлечь данные из Callback API update (message_new) */
  extractMessageNew(body: any): { vkUserId: string; text: string } | null {
    if (body?.type !== "message_new") return null;
    const msg = body.object?.message ?? body.object;
    if (!msg?.from_id) return null;
    return {
      vkUserId: String(msg.from_id),
      text: (msg.text ?? "").trim(),
    };
  }
}
