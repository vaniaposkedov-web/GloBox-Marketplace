import { Injectable } from "@nestjs/common";
import * as argon2 from "argon2";
import * as crypto from "node:crypto";
import { PrismaService } from "../prisma/prisma.service";
import type { EmailCodePurpose } from "@prisma/client";

const CODE_TTL_MS = 15 * 60 * 1000; // 1.2.2: 15 минут
const MAX_ATTEMPTS = 3; // 1.2.2: 3 попытки

export type CheckReason =
  | "OK"
  | "NOT_FOUND"
  | "EXPIRED"
  | "WRONG_CODE"
  | "TOO_MANY_ATTEMPTS"
  | "ALREADY_USED";

export interface CheckResult {
  ok: boolean;
  reason: CheckReason;
  attemptsLeft?: number;
}

@Injectable()
export class EmailCodeService {
  constructor(private readonly prisma: PrismaService) {}

  /** Генерирует 6-значный код и сохраняет его хэш. Старые активные коды инвалидируются. */
  async issue(email: string, purpose: EmailCodePurpose): Promise<string> {
    const code = this.generate6DigitCode();
    const codeHash = await argon2.hash(code, { type: argon2.argon2id });

    // Инвалидируем все предыдущие неиспользованные коды для этого email+purpose
    await this.prisma.emailCode.updateMany({
      where: {
        email,
        purpose,
        consumedAt: null,
        expiresAt: { gt: new Date() },
      },
      data: { consumedAt: new Date() },
    });

    await this.prisma.emailCode.create({
      data: {
        email,
        purpose,
        codeHash,
        expiresAt: new Date(Date.now() + CODE_TTL_MS),
      },
    });

    return code;
  }

  /** Проверяет код. Если consume=true — помечает использованным. */
  async check(
    email: string,
    purpose: EmailCodePurpose,
    code: string,
    opts: { consume: boolean },
  ): Promise<CheckResult> {
    const record = await this.prisma.emailCode.findFirst({
      where: { email, purpose, consumedAt: null },
      orderBy: { createdAt: "desc" },
    });

    if (!record) return { ok: false, reason: "NOT_FOUND" };
    if (record.expiresAt < new Date()) {
      return { ok: false, reason: "EXPIRED" };
    }
    if (record.attempts >= MAX_ATTEMPTS) {
      return { ok: false, reason: "TOO_MANY_ATTEMPTS" };
    }

    const matches = await argon2.verify(record.codeHash, code);
    if (!matches) {
      const updated = await this.prisma.emailCode.update({
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
      await this.prisma.emailCode.update({
        where: { id: record.id },
        data: { consumedAt: new Date() },
      });
    }

    return { ok: true, reason: "OK" };
  }

  private generate6DigitCode(): string {
    // равномерное распределение 000000–999999
    const n = crypto.randomInt(0, 1_000_000);
    return n.toString().padStart(6, "0");
  }
}
