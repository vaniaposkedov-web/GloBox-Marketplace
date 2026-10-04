import {
  BadRequestException,
  ConflictException,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import * as argon2 from "argon2";
import type {
  CompleteEmailRegistration,
  LoginEmailRequestCode,
  LoginPhoneRequestCode,
  LoginWithEmail,
  LoginWithEmailCode,
  LoginWithPhoneCode,
  PasswordResetComplete,
  PasswordResetRequest,
  PasswordResetVerify,
  RegisterEmailRequest,
  RegisterPhoneRequestCode,
  RegisterWithPhone,
  UpdateProfile,
  VerifyEmailCode,
} from "@marketplace/shared";
import { PrismaService } from "../prisma/prisma.service";
import { EmailCodeService } from "./email-code.service";
import { SmsCodeService } from "./sms-code.service";
import { MailService } from "../mail/mail.service";
import { TokensService } from "./tokens.service";

export interface RequestEmailCodeResult {
  ok: true;
  /** Только в dev: при DEV_EXPOSE_CODES=true возвращаем код, чтобы тестировать без SMTP */
  devCode?: string;
}

@Injectable()
export class AuthService {
  private readonly exposeDevCodes: boolean;

  constructor(
    private readonly prisma: PrismaService,
    private readonly emailCodes: EmailCodeService,
    private readonly smsCodes: SmsCodeService,
    private readonly mail: MailService,
    private readonly tokens: TokensService,
    private readonly config: ConfigService,
  ) {
    this.exposeDevCodes =
      this.config.get<string>("DEV_EXPOSE_CODES") === "true";
  }

  /** 1.2.2 шаг 1: проверить уникальность email и выслать 6-значный код */
  async requestEmailRegistrationCode(
    dto: RegisterEmailRequest,
  ): Promise<RequestEmailCodeResult> {
    // email уже прошёл проверку whitelist через zod-схему
    const existing = await this.prisma.user.findFirst({
      where: { email: dto.email, role: "BUYER" },
    });
    if (existing) {
      throw new ConflictException(
        "Аккаунт с такой почтой уже существует. Войти?",
      );
    }

    const code = await this.emailCodes.issue(dto.email, "REGISTRATION");
    await this.mail.sendRegistrationCode(dto.email, code);
    return this.exposeDevCodes ? { ok: true, devCode: code } : { ok: true };
  }

  /** 1.2.2 шаг 2: проверить код, не расходуя его (consume на шаге 3) */
  async verifyEmailRegistrationCode(
    dto: VerifyEmailCode,
  ): Promise<{ ok: true; attemptsLeft?: number }> {
    const result = await this.emailCodes.check(
      dto.email,
      "REGISTRATION",
      dto.code,
      { consume: false },
    );
    if (!result.ok) {
      if (result.reason === "EXPIRED") {
        throw new BadRequestException("Код устарел. Запросить новый?");
      }
      if (result.reason === "TOO_MANY_ATTEMPTS") {
        throw new BadRequestException(
          "Превышено число попыток. Запросите новый код",
        );
      }
      throw new BadRequestException({
        message: `Неверный код. Осталось попыток: ${result.attemptsLeft ?? 0}`,
        attemptsLeft: result.attemptsLeft,
      });
    }
    return { ok: true };
  }

  /** Профиль текущего пользователя (по JWT). */
  async getProfile(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        phone: true,
        phoneVerified: true,
        emailVerified: true,
        avatarUrl: true,
        role: true,
        createdAt: true,
      },
    });
    if (!user) {
      throw new UnauthorizedException("Пользователь не найден");
    }
    return user;
  }

  /** Редактирование профиля. Nullable-очистка avatarUrl через пустую строку. */
  async updateProfile(userId: string, dto: UpdateProfile) {
    const data: {
      firstName?: string;
      lastName?: string;
      avatarUrl?: string | null;
    } = {};
    if (dto.firstName !== undefined) data.firstName = dto.firstName;
    if (dto.lastName !== undefined) data.lastName = dto.lastName;
    if (dto.avatarUrl !== undefined) {
      data.avatarUrl = dto.avatarUrl === "" ? null : dto.avatarUrl;
    }
    await this.prisma.user.update({ where: { id: userId }, data });
    return this.getProfile(userId);
  }

  /** 1.2.2 шаг 3: окончательно расходуем код, создаём пользователя */
  async completeEmailRegistration(
    dto: CompleteEmailRegistration,
  ): Promise<{ accessToken: string; userId: string }> {
    // Проверим и израсходуем код
    const result = await this.emailCodes.check(
      dto.email,
      "REGISTRATION",
      dto.code,
      { consume: true },
    );
    if (!result.ok) {
      throw new BadRequestException("Код устарел или неверный");
    }

    // Уникальность email и телефона
    const [byEmail, byPhone] = await Promise.all([
      this.prisma.user.findFirst({ where: { email: dto.email, role: "BUYER" } }),
      this.prisma.user.findFirst({ where: { phone: dto.phone, role: "BUYER" } }),
    ]);
    if (byEmail) {
      throw new ConflictException("Аккаунт с такой почтой уже существует");
    }
    if (byPhone) {
      throw new ConflictException("Этот номер уже используется");
    }

    const passwordHash = await argon2.hash(dto.password, {
      type: argon2.argon2id,
    });

    const user = await this.prisma.user.create({
      data: {
        email: dto.email,
        emailVerified: true,
        passwordHash,
        phone: dto.phone,
        phoneVerified: false, // 1.4.3 — SMS только при чувствительных действиях
        firstName: dto.firstName,
        lastName: dto.lastName,
        role: "BUYER",
        lastLoginAt: new Date(),
      },
    });

    const accessToken = await this.tokens.signAccessToken(user.id, user.role);
    return { accessToken, userId: user.id };
  }

  // ——— 1.5.2 Восстановление пароля ———

  /**
   * Шаг 1: запросить код восстановления пароля.
   * Важно: не раскрываем, существует ли аккаунт (security through obscurity).
   * Если email есть — реально шлём код; если нет — делаем вид, что всё ок.
   */
  async requestPasswordReset(
    dto: PasswordResetRequest,
  ): Promise<RequestEmailCodeResult> {
    const user = await this.prisma.user.findFirst({
      where: { email: dto.email, role: "BUYER" },
    });
    if (!user) {
      // имитируем задержку, чтобы по тайминг-атаке не определить наличие аккаунта
      await new Promise((r) => setTimeout(r, 80));
      return { ok: true };
    }
    const code = await this.emailCodes.issue(dto.email, "PASSWORD_RESET");
    await this.mail.sendPasswordResetCode(dto.email, code);
    return this.exposeDevCodes ? { ok: true, devCode: code } : { ok: true };
  }

  /** Шаг 2: проверить код (не расходуем). */
  async verifyPasswordResetCode(
    dto: PasswordResetVerify,
  ): Promise<{ ok: true; attemptsLeft?: number }> {
    const res = await this.emailCodes.check(
      dto.email,
      "PASSWORD_RESET",
      dto.code,
      { consume: false },
    );
    if (!res.ok) {
      if (res.reason === "EXPIRED") {
        throw new BadRequestException("Код устарел. Запросить новый?");
      }
      if (res.reason === "TOO_MANY_ATTEMPTS") {
        throw new BadRequestException(
          "Превышено число попыток. Запросите новый код",
        );
      }
      throw new BadRequestException({
        message: `Неверный код. Осталось попыток: ${res.attemptsLeft ?? 0}`,
        attemptsLeft: res.attemptsLeft,
      });
    }
    return { ok: true };
  }

  /**
   * Шаг 3: расходуем код и ставим новый пароль. Возвращаем токен, чтобы
   * пользователь не логинился повторно.
   */
  async completePasswordReset(
    dto: PasswordResetComplete,
  ): Promise<{ accessToken: string; userId: string }> {
    const res = await this.emailCodes.check(
      dto.email,
      "PASSWORD_RESET",
      dto.code,
      { consume: true },
    );
    if (!res.ok) {
      throw new BadRequestException("Код устарел или неверный");
    }
    const user = await this.prisma.user.findFirst({
      where: { email: dto.email, role: "BUYER" },
    });
    if (!user) {
      // сюда не должны попасть — код был выдан только для существующего email
      throw new BadRequestException("Аккаунт не найден");
    }
    const passwordHash = await argon2.hash(dto.newPassword, {
      type: argon2.argon2id,
    });
    const updated = await this.prisma.user.update({
      where: { id: user.id },
      data: { passwordHash, lastLoginAt: new Date() },
    });
    const accessToken = await this.tokens.signAccessToken(
      updated.id,
      updated.role,
    );
    return { accessToken, userId: updated.id };
  }

  private maskPhone(e164: string): string {
    if (e164.length < 8) return e164;
    return `${e164.slice(0, 3)} ${"*".repeat(e164.length - 6)} ${e164.slice(-4)}`;
  }

  async requestPhoneRegistrationCode(
    dto: RegisterPhoneRequestCode,
  ): Promise<RequestEmailCodeResult & { maskedPhone: string }> {
    const existing = await this.prisma.user.findUnique({ where: { phone: dto.phone } });
    if (existing) throw new ConflictException("Этот номер уже используется");
    const code = await this.smsCodes.issue(dto.phone, "PHONE_VERIFICATION");
    return this.exposeDevCodes
      ? { ok: true, devCode: code, maskedPhone: this.maskPhone(dto.phone) }
      : { ok: true, maskedPhone: this.maskPhone(dto.phone) };
  }

  async registerWithPhone(
    dto: RegisterWithPhone,
  ): Promise<{ accessToken: string; userId: string }> {
    const result = await this.smsCodes.check(dto.phone, "PHONE_VERIFICATION", dto.code, { consume: true });
    if (!result.ok) {
      if (result.reason === "EXPIRED") throw new BadRequestException("Код устарел. Запросите новый");
      if (result.reason === "TOO_MANY_ATTEMPTS") throw new BadRequestException("Превышено число попыток");
      throw new BadRequestException({ message: `Неверный код. Осталось попыток: ${result.attemptsLeft ?? 0}`, attemptsLeft: result.attemptsLeft });
    }
    const existing = await this.prisma.user.findUnique({ where: { phone: dto.phone } });
    if (existing) throw new ConflictException("Этот номер уже используется");
    const passwordHash = await argon2.hash(dto.password, { type: argon2.argon2id });
    const user = await this.prisma.user.create({
      data: {
        phone: dto.phone,
        phoneVerified: true,
        passwordHash,
        firstName: dto.firstName ?? "Покупатель",
        lastName: dto.lastName ?? dto.phone.slice(-4),
        role: "BUYER",
        roles: ["BUYER"],
        lastLoginAt: new Date(),
      },
    });
    const accessToken = await this.tokens.signAccessToken(user.id, user.role);
    return { accessToken, userId: user.id };
  }

  async requestLoginPhoneCode(
    dto: LoginPhoneRequestCode,
  ): Promise<RequestEmailCodeResult & { maskedPhone: string }> {
    const user = await this.prisma.user.findUnique({ where: { phone: dto.phone } });
    if (!user) {
      await new Promise((r) => setTimeout(r, 80));
      return { ok: true, maskedPhone: this.maskPhone(dto.phone) };
    }
    const code = await this.smsCodes.issue(dto.phone, "LOGIN_VERIFICATION", user.id);
    return this.exposeDevCodes
      ? { ok: true, devCode: code, maskedPhone: this.maskPhone(dto.phone) }
      : { ok: true, maskedPhone: this.maskPhone(dto.phone) };
  }

  async loginWithPhoneCode(
    dto: LoginWithPhoneCode,
  ): Promise<{ accessToken: string; userId: string }> {
    const result = await this.smsCodes.check(dto.phone, "LOGIN_VERIFICATION", dto.code, { consume: true });
    if (!result.ok) {
      if (result.reason === "EXPIRED") throw new BadRequestException("Код устарел. Запросите новый");
      if (result.reason === "TOO_MANY_ATTEMPTS") throw new BadRequestException("Превышено число попыток");
      throw new BadRequestException({ message: `Неверный код. Осталось попыток: ${result.attemptsLeft ?? 0}`, attemptsLeft: result.attemptsLeft });
    }
    const user = await this.prisma.user.findUnique({ where: { phone: dto.phone } });
    if (!user) throw new UnauthorizedException("Пользователь не найден");
    if (user.passwordHash) {
      const ok = await argon2.verify(user.passwordHash, dto.password);
      if (!ok) throw new UnauthorizedException("Неверный пароль");
    }
    await this.prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });
    const accessToken = await this.tokens.signAccessToken(user.id, user.role);
    return { accessToken, userId: user.id };
  }

  async requestLoginEmailCode(
    dto: LoginEmailRequestCode,
  ): Promise<RequestEmailCodeResult> {
    const user = await this.prisma.user.findFirst({ where: { email: dto.email, role: "BUYER" } });
    if (!user) {
      await new Promise((r) => setTimeout(r, 80));
      return { ok: true };
    }
    const code = await this.emailCodes.issue(dto.email, "LOGIN");
    await this.mail.sendLoginCode(dto.email, code);
    return this.exposeDevCodes ? { ok: true, devCode: code } : { ok: true };
  }

  async loginWithEmailCode(
    dto: LoginWithEmailCode,
  ): Promise<{ accessToken: string; userId: string }> {
    const res = await this.emailCodes.check(dto.email, "LOGIN", dto.code, { consume: true });
    if (!res.ok) throw new BadRequestException("Код устарел или неверный");
    const user = await this.prisma.user.findFirst({ where: { email: dto.email, role: "BUYER" } });
    if (!user) throw new BadRequestException("Аккаунт не найден");
    if (dto.password && user.passwordHash) {
      const ok = await argon2.verify(user.passwordHash, dto.password);
      if (!ok) throw new UnauthorizedException("Неверный пароль");
    }
    await this.prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });
    const accessToken = await this.tokens.signAccessToken(user.id, user.role);
    return { accessToken, userId: user.id };
  }

  /** Вход по email и паролю */
  async loginWithEmail(
    dto: LoginWithEmail,
  ): Promise<{ accessToken: string; userId: string }> {
    const user = await this.prisma.user.findFirst({
      where: { email: dto.email, role: "BUYER" },
    });
    // единое сообщение об ошибке, чтобы не палить существование email
    const invalid = new UnauthorizedException(
      "Неверный email или пароль",
    );
    if (!user || !user.passwordHash) throw invalid;

    const ok = await argon2.verify(user.passwordHash, dto.password);
    if (!ok) throw invalid;

    await this.prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    const accessToken = await this.tokens.signAccessToken(user.id, user.role);
    return { accessToken, userId: user.id };
  }
}
