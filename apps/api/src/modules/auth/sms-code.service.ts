import { Injectable } from "@nestjs/common";
import * as argon2 from "argon2";
import * as crypto from "node:crypto";
import { PrismaService } from "../prisma/prisma.service";
import { SmsSenderService } from "../sms/sms-sender.service";
import type { SmsCodePurpose } from "@prisma/client";

const CODE_TTL_MS = 5 * 60 * 1000; // 5 минут
const MAX_ATTEMPTS = 3;

export type SmsCheckReason =
  | "OK"
  | "NOT_FOUND"
  | "EXPIRED"
  | "WRONG_CODE"
  | "TOO_MANY_ATTEMPTS"
  | "ALREADY_USED";

export interface SmsCheckResult {
  ok: boolean;
  reason: SmsCheckReason;
  attemptsLeft?: number;
}

@Injectable()
export class SmsCodeService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly smsSender: SmsSenderService,
  ) {}

  /** Генерирует 6-значный код и сохраняет его хэш. */
  async issue(
    phone: string,
    purpose: SmsCodePurpose,
    userId?: string,
  ): Promise<string> {
    const code = this.generate6DigitCode();
    const codeHash = await argon2.hash(code, { type: argon2.argon2id });

    // Инвалидируем предыдущие
    await this.prisma.smsCode.updateMany({
      where: {
        phone,
        purpose,
        consumedAt: null,
        expiresAt: { gt: new Date() },
      },
      data: { consumedAt: new Date() },
    });

    await this.prisma.smsCode.create({
      data: {
        phone,
        purpose,
        codeHash,
        userId: userId ?? null,
        expiresAt: new Date(Date.now() + CODE_TTL_MS),
      },
    });

    // Отправляем SMS
    await this.smsSender.send(phone, `Ваш код подтверждения: ${code}`);

    return code;
  }

  /** Проверяет код. Если consume=true — помечает использованным. */
  async check(
    phone: string,
    purpose: SmsCodePurpose,
    code: string,
    opts: { consume: boolean },
  ): Promise<SmsCheckResult> {
    const record = await this.prisma.smsCode.findFirst({
      where: { phone, purpose, consumedAt: null },
      orderBy: { createdAt: "desc" },
    });

    if (!record) return { ok: false, reason: "NOT_FOUND" };
    if (record.expiresAt < new Date()) return { ok: false, reason: "EXPIRED" };
    if (record.attempts >= MAX_ATTEMPTS) {
      return { ok: false, reason: "TOO_MANY_ATTEMPTS" };
    }

    const matches = await argon2.verify(record.codeHash, code);
    if (!matches) {
      const updated = await this.prisma.smsCode.update({
        where: { id: record.id },
        data: { attempts: { increment: 1 } },
      });
      return {
        ok: false,
        reason: "WRONG_CODE",
        attemptsLeft: Math.max(0, MAX_ATTEMPTS - updated.attempts),
      };
    }

    if (opts.consume) {
      await this.prisma.smsCode.update({
        where: { id: record.id },
        data: { consumedAt: new Date() },
      });
    }

    return { ok: true, reason: "OK" };
  }

  private generate6DigitCode(): string {
    const n = crypto.randomInt(0, 1_000_000);
    return n.toString().padStart(6, "0");
  }
}
