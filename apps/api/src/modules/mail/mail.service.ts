import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import * as nodemailer from "nodemailer";
import type { Transporter } from "nodemailer";

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private transporter: Transporter | null = null;
  private from: string;
  private readonly smtpConfigured: boolean;

  constructor(private readonly config: ConfigService) {
    this.from =
      this.config.get<string>("SMTP_FROM") ??
      "Globox <noreply@glo-box.ru>";
    // Считаем SMTP настроенным только если явно задан HOST (не localhost)
    const host = this.config.get<string>("SMTP_HOST");
    this.smtpConfigured = Boolean(host && host !== "localhost");
  }

  private getTransporter(): Transporter {
    if (this.transporter) return this.transporter;
    const host = this.config.get<string>("SMTP_HOST") ?? "localhost";
    const port = Number(this.config.get<string>("SMTP_PORT") ?? 1025);
    const user = this.config.get<string>("SMTP_USER");
    const pass = this.config.get<string>("SMTP_PASS");

    this.transporter = nodemailer.createTransport({
      host,
      port,
      secure: port === 465,
      auth: user ? { user, pass } : undefined,
    });
    return this.transporter;
  }

  /** 1.2.2 — письмо с 6-значным кодом для регистрации */
  async sendRegistrationCode(email: string, code: string): Promise<void> {
    const subject = "Код подтверждения регистрации на Globox";
    const text = `Ваш код подтверждения: ${code}\n\nКод действует 15 минут. Если вы не запрашивали регистрацию — проигнорируйте это письмо.`;
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto;">
        <h2 style="color: #111;">Подтверждение регистрации</h2>
        <p>Ваш код:</p>
        <p style="font-size: 32px; font-weight: 700; letter-spacing: 8px; color: #2563eb;">${code}</p>
        <p style="color: #555;">Код действует 15 минут. Если вы не запрашивали регистрацию — проигнорируйте это письмо.</p>
      </div>`;

    await this.send(email, subject, text, html);
  }

  /** Код подтверждения для входа по email */
  async sendLoginCode(email: string, code: string): Promise<void> {
    const subject = "Код для входа на Globox";
    const text = `Ваш код для входа: ${code}\n\nКод действует 15 минут. Если вы не запрашивали вход — проигнорируйте это письмо.`;
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto;">
        <h2 style="color: #111;">Вход в аккаунт</h2>
        <p>Код подтверждения:</p>
        <p style="font-size: 32px; font-weight: 700; letter-spacing: 8px; color: #2563eb;">${code}</p>
        <p style="color: #555;">Код действует 15 минут. Если вы не запрашивали вход — проигнорируйте.</p>
      </div>`;
    await this.send(email, subject, text, html);
  }

  /** 1.5.2 — код для восстановления пароля */
  async sendPasswordResetCode(email: string, code: string): Promise<void> {
    const subject = "Восстановление пароля на Globox";
    const text = `Ваш код для восстановления пароля: ${code}\n\nКод действует 15 минут.`;
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto;">
        <h2 style="color: #111;">Восстановление пароля</h2>
        <p>Код подтверждения:</p>
        <p style="font-size: 32px; font-weight: 700; letter-spacing: 8px; color: #2563eb;">${code}</p>
        <p style="color: #555;">Код действует 15 минут.</p>
      </div>`;
    await this.send(email, subject, text, html);
  }

  /** Код для смены email */
  async sendEmailChangeCode(email: string, code: string): Promise<void> {
    const subject = "Смена email на Globox";
    const text = `Код подтверждения смены email: ${code}\n\nКод действует 15 минут.`;
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto;">
        <h2 style="color: #111;">Смена email</h2>
        <p>Код подтверждения:</p>
        <p style="font-size: 32px; font-weight: 700; letter-spacing: 8px; color: #2563eb;">${code}</p>
        <p style="color: #555;">Код действует 15 минут. Если вы не запрашивали смену — проигнорируйте.</p>
      </div>`;
    await this.send(email, subject, text, html);
  }

  private async send(
    to: string,
    subject: string,
    text: string,
    html: string,
  ): Promise<void> {
    // Fail-safe: если SMTP не настроен, просто логируем и не падаем.
    // Коды передаются через DEV_EXPOSE_CODES=true в API-ответах.
    if (!this.smtpConfigured) {
      this.logger.warn(
        `[mail stub] SMTP_HOST не задан. Письмо для ${to} не отправлено. Тема: "${subject}"`,
      );
      this.logger.log(`[mail stub content]\n${text}`);
      return;
    }
    try {
      const info = await this.getTransporter().sendMail({
        from: this.from,
        to,
        subject,
        text,
        html,
      });
      this.logger.log(`mail sent to ${to}: ${info.messageId}`);
    } catch (err) {
      this.logger.error(`failed to send mail to ${to}`, err as Error);
      throw err;
    }
  }
}
