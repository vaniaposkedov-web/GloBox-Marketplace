import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";

/**
 * Сервис отправки SMS.
 *
 * Поддерживает три режима (SMS_PROVIDER):
 * - `stub`  — не отправляет SMS, только логирует (для разработки)
 * - `smsru` — реальная отправка через SMS.RU API
 * - `smsc`  — реальная отправка через SMSC.ru API
 *
 * @see https://smsc.ru/api/http/send/
 */
@Injectable()
export class SmsSenderService {
  private readonly logger = new Logger(SmsSenderService.name);
  private readonly provider: string;
  private readonly apiId: string;
  private readonly testMode: boolean;
  // SMSC.ru credentials
  private readonly smscLogin: string;
  private readonly smscPassword: string;
  private readonly smscSender: string;

  constructor(private readonly config: ConfigService) {
    this.provider = this.config.get<string>("SMS_PROVIDER") ?? "stub";
    this.apiId = this.config.get<string>("SMS_API_KEY") ?? "";
    this.testMode =
      this.config.get<string>("SMS_TEST_MODE") === "true" ||
      this.config.get<string>("NODE_ENV") === "development";
    // SMSC.ru
    this.smscLogin = this.config.get<string>("SMSC_LOGIN") ?? "";
    this.smscPassword = this.config.get<string>("SMSC_PASSWORD") ?? "";
    this.smscSender = this.config.get<string>("SMSC_SENDER") ?? "";
  }

  /**
   * Отправить SMS на номер телефона.
   * @param phone — номер в формате E.164 (например +79261234567)
   * @param message — текст сообщения
   */
  async send(phone: string, message: string): Promise<void> {
    if (this.provider === "stub") {
      this.logger.warn(
        `[sms stub] SMS_PROVIDER=stub. SMS для ${phone} не отправлено.`,
      );
      this.logger.log(`[sms stub] ${phone}: ${message}`);
      return;
    }

    if (this.provider === "smsru") {
      await this.sendViaSmsRu(phone, message);
      return;
    }

    if (this.provider === "smsc") {
      await this.sendViaSmsc(phone, message);
      return;
    }

    this.logger.error(`Неизвестный SMS-провайдер: ${this.provider}`);
  }

  // ——— SMS.RU ———

  private async sendViaSmsRu(phone: string, message: string): Promise<void> {
    if (!this.apiId) {
      this.logger.error("SMS_API_KEY (api_id от sms.ru) не указан в .env");
      return;
    }

    const cleanPhone = phone.replace(/^\+/, "");

    const params = new URLSearchParams({
      api_id: this.apiId,
      to: cleanPhone,
      msg: message,
      json: "1",
    });

    if (this.testMode) {
      params.set("test", "1");
    }

    try {
      const res = await fetch(`https://sms.ru/sms/send?${params.toString()}`);
      const data = (await res.json()) as SmsRuResponse;

      if (data.status === "OK") {
        const smsStatus = data.sms?.[cleanPhone];
        if (smsStatus?.status === "OK") {
          this.logger.log(
            `SMS отправлено на ${phone}${this.testMode ? " (тест)" : ""}, sms_id=${smsStatus.sms_id}`,
          );
        } else {
          this.logger.error(
            `SMS.RU ошибка для ${phone}: ${smsStatus?.status_text ?? "unknown"}`,
          );
        }
      } else {
        this.logger.error(
          `SMS.RU ошибка запроса: status_code=${data.status_code}`,
        );
      }
    } catch (err) {
      this.logger.error(`Ошибка отправки SMS через SMS.RU`, err as Error);
    }
  }

  // ——— SMSC.ru ———

  private async sendViaSmsc(phone: string, message: string): Promise<void> {
    if (!this.smscLogin || !this.smscPassword) {
      this.logger.error("SMSC_LOGIN / SMSC_PASSWORD не указаны в .env");
      return;
    }

    const cleanPhone = phone.replace(/^\+/, "");

    const params = new URLSearchParams({
      login: this.smscLogin,
      psw: this.smscPassword,
      phones: cleanPhone,
      mes: message,
      charset: "utf-8",
      fmt: "3", // JSON-ответ
    });

    if (this.smscSender) {
      params.set("sender", this.smscSender);
    }

    try {
      const res = await fetch(
        `https://smsc.ru/sys/send.php?${params.toString()}`,
      );
      const data = (await res.json()) as SmscResponse;

      if (data.error) {
        this.logger.error(
          `SMSC.ru ошибка для ${phone}: [${data.error_code}] ${data.error}`,
        );
      } else {
        this.logger.log(
          `SMS отправлено на ${phone} через SMSC.ru, id=${data.id}, cnt=${data.cnt}, cost=${data.cost}`,
        );
      }
    } catch (err) {
      this.logger.error(`Ошибка отправки SMS через SMSC.ru`, err as Error);
    }
  }
}

// ——— Типы ———

interface SmsRuSmsStatus {
  status: string;
  status_code: number;
  sms_id?: string;
  status_text?: string;
}

interface SmsRuResponse {
  status: string;
  status_code: number;
  sms?: Record<string, SmsRuSmsStatus>;
  balance?: number;
}

interface SmscResponse {
  id?: number;
  cnt?: number;
  cost?: string;
  balance?: string;
  error?: string;
  error_code?: number;
}
