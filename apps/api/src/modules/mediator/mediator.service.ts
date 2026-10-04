import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from "@nestjs/common";
import * as argon2 from "argon2";
import type {
  MediatorApplication,
  MediatorMaxRequest,
  MediatorMaxVerify,
  MediatorSettingsUpdate,
} from "@marketplace/shared";
import { PrismaService } from "../prisma/prisma.service";
import { MaxVerificationService } from "../verification/max-verification.service";
import { TokensService } from "../auth/tokens.service";
import { EmailCodeService } from "../auth/email-code.service";
import { SmsCodeService } from "../auth/sms-code.service";
import { MailService } from "../mail/mail.service";
import { NotificationService } from "../notifications/notification.service";

/**
 * Сервис регистрации посредника (Блок 3).
 *
 * Конфликт ролей (Блок 3.3):
 *  - BUYER + MEDIATOR в одном аккаунте — запрещено (буфер ролей у покупателя
 *    очищается, либо требуется отдельный аккаунт)
 *  - SUPPLIER + MEDIATOR — допускается
 */
@Injectable()
export class MediatorService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly maxVerification: MaxVerificationService,
    private readonly tokens: TokensService,
    private readonly emailCodes: EmailCodeService,
    private readonly smsCodes: SmsCodeService,
    private readonly mail: MailService,
    private readonly notifications: NotificationService,
  ) {}

  // ——— Публичные методы для покупателей ———

  async listApprovedMediators(filters: {
    minRating?: number;
    maxCommission?: number;
    minOrder?: number;
    q?: string;
    limit?: number;
  }) {
    const profiles = await this.prisma.mediatorProfile.findMany({
      where: {
        status: "APPROVED",
        ...(filters.maxCommission
          ? { commissionRate: { lte: filters.maxCommission } }
          : {}),
        ...(filters.minOrder !== undefined
          ? { minOrderAmount: { lte: filters.minOrder } }
          : {}),
        ...(filters.q ? {
          OR: [
            { firstName: { contains: filters.q, mode: "insensitive" as const } },
            { lastName: { contains: filters.q, mode: "insensitive" as const } },
          ],
        } : {}),
      },
      take: filters.limit,
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            avatarUrl: true,
            lastLoginAt: true,
          },
        },
      },
      orderBy: { submittedAt: "desc" },
    });

    // Real review stats per mediator profile (batch query)
    const profileIds = profiles.map((p) => p.id);
    const reviewStats = await (this.prisma as any).mediatorReview.groupBy({
      by: ["mediatorId"],
      where: { mediatorId: { in: profileIds } },
      _avg: { rating: true },
      _count: { id: true },
    });
    const reviewMap = new Map<string, { avg: number | null; count: number }>(
      reviewStats.map((r: any) => [r.mediatorId, { avg: r._avg.rating, count: r._count.id }]),
    );

    return profiles.map((p) => {
      const isOnline =
        p.user.lastLoginAt &&
        Date.now() - new Date(p.user.lastLoginAt).getTime() < 15 * 60 * 1000;
      const pp = p as any;
      const cardCfg = pp.cardConfig as any ?? {};
      const rv = reviewMap.get(p.id);
      const reviewRating = rv?.avg != null ? Math.round(rv.avg * 10) / 10 : null;
      const reviewCount = rv?.count ?? 0;
      return {
        id: p.id,
        userId: p.userId,
        firstName: p.firstName,
        lastName: p.lastName,
        middleName: p.middleName,
        avatarUrl: pp.avatarUrl ?? p.user.avatarUrl ?? null,
        commissionRate: Number(p.commissionRate),
        minOrderAmount: p.minOrderAmount,
        completedOrders: pp.completedOrdersCount ?? 0,
        reviewRating,
        reviewCount,
        isOnline: !!isOnline,
        description: pp.description ?? null,
        negotiableRate: cardCfg.negotiableRate ?? false,
        tags: cardCfg.tags ?? [],
        highlights: cardCfg.highlights ?? [],
        compactBadges: cardCfg.compactBadges ?? [],
      };
    });
  }

  async getPublicProfile(mediatorProfileId: string) {
    const profile = await this.prisma.mediatorProfile.findUnique({
      where: { id: mediatorProfileId },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            avatarUrl: true,
            lastLoginAt: true,
            createdAt: true,
          },
        },
      },
    });
    if (!profile || profile.status !== "APPROVED") {
      throw new NotFoundException("Посредник не найден");
    }

    const isOnline =
      profile.user.lastLoginAt &&
      Date.now() - new Date(profile.user.lastLoginAt).getTime() <
        15 * 60 * 1000;

    const reviewAgg = await (this.prisma as any).mediatorReview.aggregate({
      where: { mediatorId: profile.id },
      _avg: { rating: true },
      _count: { id: true },
    });
    const reviewRating = reviewAgg._avg.rating != null ? Math.round(reviewAgg._avg.rating * 10) / 10 : null;
    const reviewCount = reviewAgg._count.id ?? 0;

    const pp = profile as any;
    return {
      id: profile.id,
      userId: profile.userId,
      firstName: profile.firstName,
      lastName: profile.lastName,
      middleName: profile.middleName,
      avatarUrl: pp.avatarUrl ?? profile.user.avatarUrl ?? null,
      commissionRate: Number(profile.commissionRate),
      minOrderAmount: profile.minOrderAmount,
      completedOrders: pp.completedOrdersCount ?? 0,
      reviewRating,
      reviewCount,
      isOnline: !!isOnline,
      memberSince: profile.user.createdAt,
      description: pp.description ?? null,
      cardConfig: pp.cardConfig ?? null,
    };
  }

  // ——— Простая регистрация/логин посредника ———

  async simpleRegister(dto: {
    firstName: string;
    lastName: string;
    phone: string;
    email: string;
    password: string;
  }): Promise<{ accessToken: string; userId: string }> {
    const [byEmail, byPhone] = await Promise.all([
      this.prisma.user.findUnique({ where: { email: dto.email } }),
      this.prisma.user.findUnique({ where: { phone: dto.phone } }),
    ]);
    if (byEmail) throw new ConflictException("Аккаунт с таким email уже существует");
    if (byPhone) throw new ConflictException("Этот номер уже используется");

    const passwordHash = await argon2.hash(dto.password, { type: argon2.argon2id });

    try {
      const user = await this.prisma.user.create({
        data: {
          email: dto.email,
          emailVerified: false,
          phone: dto.phone,
          phoneVerified: false,
          passwordHash,
          firstName: dto.firstName,
          lastName: dto.lastName,
          role: "MEDIATOR",
          roles: ["MEDIATOR"],
          lastLoginAt: new Date(),
        },
      });

      // Профиль НЕ создаётся при регистрации — посредник заполняет данные через wizard /verify

      const accessToken = await this.tokens.signAccessToken(user.id, user.role);
      return { accessToken, userId: user.id };
    } catch (err: any) {
      if (err.code === "P2002") {
        const field = err.meta?.target?.[0] ?? "данные";
        throw new ConflictException(`Такой ${field} уже используется`);
      }
      throw err;
    }
  }

  async loginWithEmail(
    dto: { email: string; password: string },
    meta?: { ip?: string; userAgent?: string },
  ): Promise<{ accessToken: string; userId: string }> {
    const user = await this.prisma.user.findFirst({
      where: { email: dto.email, role: "MEDIATOR" },
    });
    const invalid = new UnauthorizedException("Неверный email или пароль");
    if (!user || !user.passwordHash) throw invalid;

    const ok = await argon2.verify(user.passwordHash, dto.password);
    if (!ok) throw invalid;

    if ((user as any).blockedAt) {
      throw new ForbiddenException("Аккаунт заблокирован. Обратитесь в поддержку.");
    }

    await this.prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    await (this.prisma as any).loginEvent.create({
      data: { userId: user.id, ip: meta?.ip ?? null, userAgent: meta?.userAgent ?? null },
    }).catch(() => {});

    const accessToken = await this.tokens.signAccessToken(user.id, user.role);
    return { accessToken, userId: user.id };
  }

  async getLoginEvents(userId: string, limit = 15) {
    const events = await (this.prisma as any).loginEvent.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: limit,
      select: { id: true, ip: true, userAgent: true, createdAt: true },
    });
    return events;
  }

  async getMe(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        phone: true,
        avatarUrl: true,
        role: true,
        createdAt: true,
      },
    });
    if (!user) throw new NotFoundException("Пользователь не найден");

    const profile = await this.prisma.mediatorProfile.findUnique({
      where: { userId },
    });

    const p = profile as any;
    return {
      user,
      profile: p
        ? {
            id: p.id,
            firstName: p.firstName,
            lastName: p.lastName,
            middleName: p.middleName,
            phone: p.phone ?? user.phone,
            commissionRate: Number(p.commissionRate),
            minOrderAmount: p.minOrderAmount,
            status: p.status,
            rating: p.rating ? Number(p.rating) : null,
            completedOrdersCount: p.completedOrdersCount ?? 0,
            avatarUrl: p.avatarUrl ?? user.avatarUrl,
            passportPhotoUrl: p.passportPhotoUrl ?? null,
            passSelfiePhotoUrl: p.passSelfiePhotoUrl ?? null,
            passPhotoUrl: p.passPhotoUrl ?? null,
            rejectionReason: p.rejectionReason ?? null,
            accountExpiresAt: p.accountExpiresAt ?? null,
            description: p.description ?? null,
            cardConfig: p.cardConfig ?? null,
            isCardConfigured: !!(
              p.description && p.description.length >= 20 &&
              (Number(p.commissionRate) > 0 || (p.cardConfig as any)?.negotiableRate)
            ),
            createdAt: p.createdAt,
          }
        : null,
    };
  }

  async requestMaxCode(
    dto: MediatorMaxRequest,
  ): Promise<{ ok: true; devCode?: string }> {
    return this.maxVerification.issueCode("MEDIATOR_REGISTRATION", dto.phone);
  }

  async verifyMaxCode(
    dto: MediatorMaxVerify & { phone: string },
  ): Promise<{ ok: true; sessionToken: string }> {
    const res = await this.maxVerification.verifyCode(
      "MEDIATOR_REGISTRATION",
      dto.phone,
      dto.code,
    );
    return { ok: true, sessionToken: res.sessionToken };
  }

  async submitApplication(
    dto: MediatorApplication,
  ): Promise<{ accessToken: string; userId: string; mediatorId: string }> {
    const { phone } = await this.maxVerification.consumeSession(
      "MEDIATOR_REGISTRATION",
      dto.sessionToken,
    );

    // Ищем пользователя по телефону (phone не уникален сам по себе — compound unique с role)
    const existing = await this.prisma.user.findFirst({
      where: { phone },
      include: { mediatorProfile: true },
    });

    if (existing?.mediatorProfile) {
      throw new ConflictException(
        "Заявка посредника уже подана. Дождитесь решения модерации",
      );
    }

    if (existing?.role === "BUYER") {
      throw new ForbiddenException(
        "Этот номер используется для аккаунта покупателя. Для посредника создайте отдельный аккаунт",
      );
    }

    const user = existing
      ? await this.prisma.user.update({
          where: { id: existing.id },
          data: {
            firstName: dto.firstName,
            lastName: dto.lastName,
            avatarUrl: dto.avatarUrl,
            phoneVerified: true,
          },
        })
      : await this.prisma.user.create({
          data: {
            phone,
            phoneVerified: true,
            firstName: dto.firstName,
            lastName: dto.lastName,
            avatarUrl: dto.avatarUrl,
            role: "MEDIATOR",
          },
        });

    const mediatorProfile = await this.prisma.mediatorProfile.create({
      data: {
        userId: user.id,
        phone,
        lastName: dto.lastName,
        firstName: dto.firstName,
        middleName: dto.middleName ?? null,
        commissionRate: dto.commissionRate,
        minOrderAmount: dto.minOrderAmount,
        avatarUrl: dto.avatarUrl,
        passportPhotoUrl: dto.passportPhotoUrl,
        passSelfiePhotoUrl: dto.passSelfieUrl,
        status: "PENDING",
      },
    });

    const accessToken = await this.tokens.signAccessToken(user.id, user.role);
    return {
      accessToken,
      userId: user.id,
      mediatorId: mediatorProfile.id,
    };
  }

  async getMyApplication(userId: string) {
    const profile = await this.prisma.mediatorProfile.findUnique({
      where: { userId },
    });
    if (!profile) {
      throw new NotFoundException("Заявка не найдена");
    }
    return {
      id: profile.id,
      status: profile.status,
      rejectionReason: profile.rejectionReason,
      submittedAt: profile.submittedAt,
      reviewedAt: profile.reviewedAt,
      lastName: profile.lastName,
      firstName: profile.firstName,
      middleName: profile.middleName,
      commissionRate: Number(profile.commissionRate),
      minOrderAmount: profile.minOrderAmount,
    };
  }

  /**
   * Самостоятельное обновление настроек (ставка/мин.сумма) — Блок 3.10.
   * Без модерации, доступно после статуса APPROVED.
   */
  async updateSettings(userId: string, dto: MediatorSettingsUpdate) {
    const profile = await this.prisma.mediatorProfile.findUnique({
      where: { userId },
    });

    const isAvatarOnly =
      dto.avatarUrl !== undefined &&
      dto.commissionRate === undefined &&
      dto.minOrderAmount === undefined;

    // No profile yet — allow avatar change on User model
    if (!profile) {
      if (dto.avatarUrl !== undefined) {
        await this.prisma.user.update({
          where: { id: userId },
          data: { avatarUrl: dto.avatarUrl },
        });
        return { ok: true };
      }
      throw new NotFoundException("Профиль не найден");
    }

    // Block rate/amount changes for non-APPROVED, but always allow avatar
    if (profile.status !== "APPROVED" && !isAvatarOnly) {
      throw new BadRequestException(
        "Изменения доступны только после одобрения заявки",
      );
    }

    const data: Record<string, unknown> = {};
    if (dto.avatarUrl !== undefined) data.avatarUrl = dto.avatarUrl;
    if (profile.status === "APPROVED") {
      if (dto.commissionRate !== undefined) data.commissionRate = dto.commissionRate;
      if (dto.minOrderAmount !== undefined) data.minOrderAmount = dto.minOrderAmount;
    }

    if (Object.keys(data).length > 0) {
      await this.prisma.mediatorProfile.update({
        where: { id: profile.id },
        data,
      });
    }
    return { ok: true };
  }

  /**
   * Создание/обновление профиля посредника через wizard (переход в PENDING).
   * Вызывается когда пользователь нажимает «Отправить заявку».
   */
  async submitProfile(
    userId: string,
    dto: {
      firstName?: string;
      lastName?: string;
      middleName?: string;
      phone?: string;
      commissionRate: number;
      minOrderAmount: number;
      passportPhotoUrl: string;
      passSelfiePhotoUrl: string;
      passPhotoUrl?: string;
      avatarUrl?: string;
    },
  ) {
    const existing = await this.prisma.mediatorProfile.findUnique({ where: { userId } });
    if (existing && existing.status === "APPROVED") {
      throw new BadRequestException("Профиль уже одобрен");
    }

    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException("Пользователь не найден");

    const profileData = {
      firstName: dto.firstName ?? user.firstName ?? "",
      lastName: dto.lastName ?? user.lastName ?? "",
      middleName: dto.middleName ?? null,
      commissionRate: dto.commissionRate,
      minOrderAmount: dto.minOrderAmount,
      passportPhotoUrl: dto.passportPhotoUrl,
      passSelfiePhotoUrl: dto.passSelfiePhotoUrl,
      passPhotoUrl: dto.passPhotoUrl ?? null,
      avatarUrl: dto.avatarUrl ?? null,
      status: "PENDING" as const,
      submittedAt: new Date(),
    };

    const isResubmit = !!existing;
    if (existing) {
      await this.prisma.mediatorProfile.update({
        where: { userId },
        data: { ...profileData, rejectionReason: null, expiryNotified7d: false, expiryNotified3d: false, expiryNotified1d: false },
      });
    } else {
      await this.prisma.mediatorProfile.create({
        data: {
          userId,
          phone: dto.phone ?? user.phone ?? null,
          ...profileData,
        },
      });
    }
    this.notifications.notify(
      userId,
      isResubmit
        ? "🔄 Ваша заявка посредника отправлена на повторную проверку.\n\nМы уведомим вас о результате в ближайшее время."
        : "📋 Ваша заявка посредника принята!\n\nМы проверим ваши документы и уведомим о результате в течение 24 часов.",
    ).catch(() => {});
    return { ok: true };
  }

  /**
   * Загрузка документов для верификации (PENDING / NEEDS_REVISION статусы).
   */
  async updateDocuments(
    userId: string,
    dto: { passportPhotoUrl?: string; passSelfiePhotoUrl?: string; avatarUrl?: string },
  ) {
    const profile = await this.prisma.mediatorProfile.findUnique({
      where: { userId },
    });
    if (!profile) throw new NotFoundException("Профиль не найден");
    if (profile.status === "APPROVED") {
      throw new BadRequestException(
        "Документы уже приняты. Для изменений обратитесь в поддержку.",
      );
    }

    await this.prisma.mediatorProfile.update({
      where: { id: profile.id },
      data: {
        ...(dto.passportPhotoUrl !== undefined && { passportPhotoUrl: dto.passportPhotoUrl }),
        ...(dto.passSelfiePhotoUrl !== undefined && { passSelfiePhotoUrl: dto.passSelfiePhotoUrl }),
        ...(dto.avatarUrl !== undefined && { avatarUrl: dto.avatarUrl }),
      },
    });
    return { ok: true };
  }

  // ——— Change email ———

  async requestEmailChange(userId: string, newEmail: string) {
    if (!newEmail || !newEmail.includes("@")) throw new BadRequestException("Некорректный email");
    const existing = await this.prisma.user.findFirst({ where: { email: newEmail } });
    if (existing && existing.id !== userId) throw new ConflictException("Этот email уже используется");
    const code = await this.emailCodes.issue(newEmail, "EMAIL_BINDING");
    await this.mail.sendEmailChangeCode(newEmail, code);
    return { ok: true };
  }

  async confirmEmailChange(userId: string, newEmail: string, code: string) {
    const result = await this.emailCodes.check(newEmail, "EMAIL_BINDING", code, { consume: true });
    if (result.reason === "EXPIRED") throw new BadRequestException("Код истёк, запросите новый");
    if (result.reason === "WRONG_CODE") throw new BadRequestException(`Неверный код. Осталось попыток: ${result.attemptsLeft ?? 0}`);
    if (!result.ok) throw new BadRequestException("Ошибка проверки кода");
    await this.prisma.user.update({ where: { id: userId }, data: { email: newEmail } });
    return { ok: true };
  }

  // ——— Change phone ———

  async requestPhoneChange(userId: string, newPhone: string) {
    if (!newPhone || newPhone.length < 10) throw new BadRequestException("Некорректный номер телефона");
    const existing = await this.prisma.user.findFirst({ where: { phone: newPhone } });
    if (existing && existing.id !== userId) throw new ConflictException("Этот номер уже используется");
    const code = await this.smsCodes.issue(newPhone, "PHONE_VERIFICATION", userId);
    return { ok: true };
  }

  async confirmPhoneChange(userId: string, newPhone: string, code: string) {
    const result = await this.smsCodes.check(newPhone, "PHONE_VERIFICATION", code, { consume: true });
    if (result.reason === "EXPIRED") throw new BadRequestException("Код истёк, запросите новый");
    if (result.reason === "WRONG_CODE") throw new BadRequestException(`Неверный код. Осталось попыток: ${result.attemptsLeft ?? 0}`);
    if (!result.ok) throw new BadRequestException("Ошибка проверки кода");
    await this.prisma.user.update({ where: { id: userId }, data: { phone: newPhone } });
    // Also update mediator profile phone if exists
    const profile = await this.prisma.mediatorProfile.findUnique({ where: { userId } });
    if (profile) {
      await this.prisma.mediatorProfile.update({ where: { id: profile.id }, data: { phone: newPhone } });
    }
    return { ok: true };
  }

  async changePassword(userId: string, currentPassword: string, newPassword: string) {
    if (!currentPassword || !newPassword) throw new BadRequestException("Заполните оба поля");
    if (newPassword.length < 6) throw new BadRequestException("Минимальная длина пароля — 6 символов");

    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user || !user.passwordHash) throw new NotFoundException("Пользователь не найден");

    const valid = await argon2.verify(user.passwordHash, currentPassword);
    if (!valid) throw new BadRequestException("Неверный текущий пароль");

    const hash = await argon2.hash(newPassword, { type: 2 });
    await this.prisma.user.update({ where: { id: userId }, data: { passwordHash: hash } });

    return { ok: true };
  }

  // ——— Card config ———

  async updateCardConfig(
    userId: string,
    dto: { description?: string; cardConfig?: Record<string, unknown> },
  ) {
    const profile = await this.prisma.mediatorProfile.findUnique({ where: { userId } });
    if (!profile) throw new NotFoundException("Профиль не найден");

    await this.prisma.mediatorProfile.update({
      where: { id: profile.id },
      data: {
        ...(dto.description !== undefined && { description: dto.description } as any),
        ...(dto.cardConfig !== undefined && { cardConfig: dto.cardConfig } as any),
      },
    });
    return { ok: true };
  }

  // ——— Reviews ———

  async getMyReviews(userId: string) {
    const profile = await this.prisma.mediatorProfile.findUnique({ where: { userId } });
    if (!profile) throw new NotFoundException("Профиль не найден");

    const reviews = await (this.prisma as any).mediatorReview.findMany({
      where: { mediatorId: profile.id },
      orderBy: { createdAt: "desc" },
    });

    const avgRating =
      reviews.length > 0
        ? reviews.reduce((s: number, r: any) => s + r.rating, 0) / reviews.length
        : null;

    return { reviews, avgRating, total: reviews.length };
  }

  async getLeaderboard(userId: string) {
    const profiles = await this.prisma.mediatorProfile.findMany({
      where: { status: "APPROVED" },
      select: {
        id: true,
        userId: true,
        firstName: true,
        lastName: true,
        avatarUrl: true,
        completedOrdersCount: true,
        rating: true,
      },
    });

    // Score = completed orders × avg rating (neutral 3.0 if no rating yet)
    // This rewards both quantity of work and quality of service
    const scored = profiles
      .map((p) => ({
        id: p.id,
        userId: p.userId,
        displayName: `${p.firstName} ${p.lastName[0]}.`,
        avatarUrl: p.avatarUrl ?? null,
        completedOrders: p.completedOrdersCount,
        rating: p.rating ? Number(p.rating) : null,
        score: p.completedOrdersCount * (p.rating ? Number(p.rating) : 3.0),
      }))
      .sort((a, b) => b.score - a.score || b.completedOrders - a.completedOrders || (b.rating ?? 0) - (a.rating ?? 0));

    const ranked = scored.map((p, i) => ({ ...p, rank: i + 1 }));
    const top10 = ranked.slice(0, 10);

    const myProfile = await this.prisma.mediatorProfile.findUnique({ where: { userId } });
    const myEntry = myProfile ? ranked.find((p) => p.id === myProfile.id) : null;

    return {
      leaderboard: top10,
      myRank: myEntry?.rank ?? null,
      myEntry: myEntry && myEntry.rank > 10 ? myEntry : null,
      total: ranked.length,
    };
  }

  async pingOnline(userId: string) {
    await this.prisma.user.update({
      where: { id: userId },
      data: { lastLoginAt: new Date() },
    });
    return { ok: true };
  }

  async submitReview(
    profileId: string,
    dto: { buyerName: string; rating: number; text: string; buyerAvatarUrl?: string },
  ) {
    const profile = await this.prisma.mediatorProfile.findUnique({ where: { id: profileId } });
    if (!profile || profile.status !== "APPROVED") throw new NotFoundException("Посредник не найден");
    if (dto.rating < 1 || dto.rating > 5) throw new BadRequestException("Рейтинг от 1 до 5");

    const review = await (this.prisma as any).mediatorReview.create({
      data: {
        mediatorId: profileId,
        buyerName: dto.buyerName,
        rating: dto.rating,
        text: dto.text,
        buyerAvatarUrl: dto.buyerAvatarUrl ?? null,
      },
    });

    // Recalculate and persist avg rating on profile
    const agg = await (this.prisma as any).mediatorReview.aggregate({
      where: { mediatorId: profileId },
      _avg: { rating: true },
    });
    if (agg._avg.rating != null) {
      await this.prisma.mediatorProfile.update({
        where: { id: profileId },
        data: { rating: agg._avg.rating } as any,
      });
    }

    return { ok: true, id: review.id };
  }
}
