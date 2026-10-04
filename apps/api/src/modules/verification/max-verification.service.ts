import { BadRequestException, Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import * as argon2 from "argon2";
import * as crypto from "node:crypto";
import { PrismaService } from "../prisma/prisma.service";
import { SmsSenderService } from "../sms/sms-sender.service";
import type { MaxSessionPurpose } from "@prisma/client";

/**
 * MAX-верификация (Блоки 2 и 3).
 * MAX — мессенджер, через бот-аккаунт которого пользователь получает код.
 * Поскольку реальная интеграция с MAX появится позже, здесь — каркас:
 *   - issue: создаём 6-значный код, шлём (имитируем), сохраняем хэш с TTL 5 мин.
 *   - verify: проверяем код и выдаём session_token (TTL 60 мин).
 *   - consumeSession: одноразово «погашаем» session_token при подаче заявки.
 *
 * В dev-режиме (DEV_EXPOSE_CODES=true) код возвращается клиенту,
 * чтобы можно было пройти UX без подключения MAX-бота.
 */
@Injectable()
export class MaxVerificationService {
  /** TTL кода в MAX-сообщении — 5 минут (Блок 2.7, Блок 3.7). */
  private static readonly CODE_TTL_MS = 5 * 60 * 1000;
  /** Максимум попыток ввода кода. */
  private static readonly MAX_ATTEMPTS = 3;
  /** TTL session-token, выданного после verify, — 60 минут на оформление. */
  private static readonly SESSION_TTL_MS = 60 * 60 * 1000;

  private readonly exposeDevCodes: boolean;
  private readonly logger = new Logger(MaxVerificationService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
    private readonly smsSender: SmsSenderService,
  ) {
    this.exposeDevCodes =
      this.config.get<string>("DEV_EXPOSE_CODES") === "true";
  }

  /** Создать сессию + код. Возвращает devCode только в dev-режиме. */
  async issueCode(
    purpose: MaxSessionPurpose,
    phone: string,
  ): Promise<{ ok: true; devCode?: string }> {
    const code = this.generate6DigitCode();
    const codeHash = await argon2.hash(code, { type: argon2.argon2id });

    // Инвалидируем все активные сессии этого назначения для телефона
    await this.prisma.maxVerificationSession.updateMany({
      where: {
        phone,
        purpose,
        consumedAt: null,
        expiresAt: { gt: new Date() },
      },
      data: { consumedAt: new Date() },
    });

    await this.prisma.maxVerificationSession.create({
      data: {
        purpose,
        phone,
        codeHash,
        expiresAt: new Date(
          Date.now() + MaxVerificationService.CODE_TTL_MS,
        ),
      },
    });

    // Отправляем код через SMS
    try {
      await this.smsSender.send(phone, `Ваш код подтверждения Globox: ${code}`);
    } catch (err) {
      this.logger.error(`Ошибка отправки SMS-кода на ${phone}: ${err}`);
    }

    return this.exposeDevCodes ? { ok: true, devCode: code } : { ok: true };
  }

  /**
   * Проверить код. При успехе — выдаём session_token (raw) для подачи заявки.
   * Пользователь должен передать его на этапе создания SupplierProfile/MediatorProfile.
   */
  async verifyCode(
    purpose: MaxSessionPurpose,
    phone: string,
    code: string,
  ): Promise<{ ok: true; sessionToken: string; phone: string }> {
    const record = await this.prisma.maxVerificationSession.findFirst({
      where: { purpose, phone, consumedAt: null, verifiedAt: null },
      orderBy: { createdAt: "desc" },
    });
    if (!record) {
      throw new BadRequestException("Код не найден. Запросите новый");
    }
    if (record.expiresAt < new Date()) {
      throw new BadRequestException("Код устарел. Запросите новый");
    }
    if (record.attempts >= MaxVerificationService.MAX_ATTEMPTS) {
      throw new BadRequestException(
        "Превышено число попыток. Запросите новый код",
      );
    }

    const matches = await argon2.verify(record.codeHash, code);
    if (!matches) {
      const updated = await this.prisma.maxVerificationSession.update({
        where: { id: record.id },
        data: { attempts: { increment: 1 } },
      });
      const left = Math.max(
        0,
        MaxVerificationService.MAX_ATTEMPTS - updated.attempts,
      );
      throw new BadRequestException({
        message: `Неверный код. Осталось попыток: ${left}`,
        attemptsLeft: left,
      });
    }

    // OK: выдаём session_token (raw) и сохраняем его hash + продлеваем срок.
    const rawToken = crypto.randomBytes(32).toString("base64url");
    const sessionTokenHash = crypto
      .createHash("sha256")
      .update(rawToken)
      .digest("hex");

    await this.prisma.maxVerificationSession.update({
      where: { id: record.id },
      data: {
        sessionToken: sessionTokenHash,
        verifiedAt: new Date(),
        expiresAt: new Date(
          Date.now() + MaxVerificationService.SESSION_TTL_MS,
        ),
      },
    });

    return { ok: true, sessionToken: rawToken, phone };
  }

  /**
   * Одноразовое «погашение» session-token при создании заявки.
   * Возвращает phone из сессии — используется как доверенный источник.
   */
  async consumeSession(
    purpose: MaxSessionPurpose,
    rawToken: string,
  ): Promise<{ phone: string }> {
    const sessionTokenHash = crypto
      .createHash("sha256")
      .update(rawToken)
      .digest("hex");
    const record = await this.prisma.maxVerificationSession.findFirst({
      where: {
        purpose,
        sessionToken: sessionTokenHash,
        consumedAt: null,
      },
    });
    if (!record || !record.verifiedAt) {
      throw new BadRequestException(
        "Сессия верификации не найдена или уже использована",
      );
    }
    if (record.expiresAt < new Date()) {
      throw new BadRequestException(
        "Сессия верификации истекла. Подтвердите телефон ещё раз",
      );
    }
    await this.prisma.maxVerificationSession.update({
      where: { id: record.id },
      data: { consumedAt: new Date() },
    });
    return { phone: record.phone };
  }

  private generate6DigitCode(): string {
    return crypto.randomInt(0, 1_000_000).toString().padStart(6, "0");
  }
}
