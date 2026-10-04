import {
  BadRequestException,
  Injectable,
  NotFoundException,
  ForbiddenException,
} from "@nestjs/common";
import * as argon2 from "argon2";
import { PrismaService } from "../prisma/prisma.service";
import { TokensService } from "../auth/tokens.service";
import { NotificationService } from "../notifications/notification.service";

@Injectable()
export class AdminService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly tokens: TokensService,
    private readonly notifications: NotificationService,
  ) {}

  /** Логин администратора */
  async login(email: string, password: string) {
    const user = await this.prisma.user.findFirst({
      where: { email, role: "ADMIN" },
    });
    if (!user || !user.passwordHash) {
      throw new BadRequestException("Неверный email или пароль");
    }
    const valid = await argon2.verify(user.passwordHash, password);
    if (!valid) {
      throw new BadRequestException("Неверный email или пароль");
    }
    const accessToken = await this.tokens.signAccessToken(user.id, user.role);
    return { accessToken, userId: user.id };
  }

  /** Удалить все операционные данные (заказы, заявки, корзины, чаты) */
  async resetOperations() {
    await this.prisma.$transaction([
      this.prisma.mediatorOrderMessage.deleteMany({}),
      this.prisma.mediatorOrderChat.deleteMany({}),
      this.prisma.mediatorOrderResponse.deleteMany({}),
      this.prisma.mediatorOrderItem.deleteMany({}),
      this.prisma.mediatorOrder.deleteMany({}),
      this.prisma.orderRequestMessage.deleteMany({}),
      this.prisma.orderRequestChat.deleteMany({}),
      this.prisma.orderRequestItem.deleteMany({}),
      this.prisma.orderRequest.deleteMany({}),
      this.prisma.orderItem.deleteMany({}),
      this.prisma.order.deleteMany({}),
      this.prisma.cartItem.deleteMany({}),
      this.prisma.mediatorProfile.updateMany({
        data: { completedOrdersCount: 0 },
      }),
    ]);
    return { ok: true, message: "Все операционные данные удалены" };
  }

  /** Список поставщиков с фильтрацией по статусу */
  async listSuppliers(status?: string, page = 1, limit = 20) {
    const where: Record<string, unknown> = {};
    if (status) where.status = status;

    const [items, total] = await Promise.all([
      this.prisma.supplierProfile.findMany({
        where,
        include: {
          user: {
            select: { id: true, email: true, firstName: true, lastName: true, phone: true, createdAt: true },
          },
          location: { select: { id: true, name: true } },
          categories: {
            include: { category: { select: { id: true, name: true } } },
          },
        },
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.supplierProfile.count({ where }),
    ]);

    return {
      items: items.map((s) => ({
        id: s.id,
        userId: s.userId,
        email: s.user.email,
        phone: s.phone,
        firstName: s.firstName,
        lastName: s.lastName,
        middleName: s.middleName,
        location: s.location,
        pavilionNumber: s.pavilionNumber,
        entityType: s.entityType,
        categories: s.categories.map((c) => c.category),
        inn: s.inn,
        ogrnip: s.ogrnip,
        passPhotoUrl: s.passPhotoUrl,
        passSelfiePhotoUrl: s.passSelfiePhotoUrl,
        avatarUrl: s.avatarUrl,
        status: s.status,
        rejectionReason: s.rejectionReason,
        submittedAt: s.submittedAt,
        reviewedAt: s.reviewedAt,
        approvedAt: s.approvedAt,
        createdAt: s.createdAt,
      })),
      total,
      page,
      limit,
      pages: Math.ceil(total / limit),
    };
  }

  /** Все зарегистрированные пользователи-поставщики (с профилем или без) */
  async listSupplierUsers(page = 1, limit = 50, search?: string) {
    const where: Record<string, unknown> = { role: "SUPPLIER" };
    if (search?.trim()) {
      where.OR = [
        { email: { contains: search.trim(), mode: "insensitive" } },
        { firstName: { contains: search.trim(), mode: "insensitive" } },
        { lastName: { contains: search.trim(), mode: "insensitive" } },
        { phone: { contains: search.trim() } },
      ];
    }
    const skip = (page - 1) * limit;
    const [items, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
        include: {
          supplierProfile: {
            select: {
              id: true, status: true, submittedAt: true,
              approvedAt: true, pavilionNumber: true,
              location: { select: { name: true } },
            },
          },
        },
      }),
      this.prisma.user.count({ where }),
    ]);
    return {
      items: items.map((u) => ({
        id: u.id,
        email: u.email,
        firstName: u.firstName,
        lastName: u.lastName,
        phone: u.phone,
        createdAt: u.createdAt,
        blockedAt: (u as any).blockedAt ?? null,
        profileStatus: u.supplierProfile?.status ?? "NO_PROFILE",
        profileId: u.supplierProfile?.id ?? null,
        pavilionNumber: u.supplierProfile?.pavilionNumber ?? null,
        locationName: u.supplierProfile?.location?.name ?? null,
        submittedAt: u.supplierProfile?.submittedAt ?? null,
        approvedAt: u.supplierProfile?.approvedAt ?? null,
      })),
      total,
      page,
      pages: Math.ceil(total / limit),
    };
  }

  /** Детальная информация */
  async getSupplier(supplierId: string) {
    const s = await this.prisma.supplierProfile.findUnique({
      where: { id: supplierId },
      include: {
        user: {
          select: { id: true, email: true, firstName: true, lastName: true, phone: true, createdAt: true },
        },
        location: { select: { id: true, name: true, code: true } },
        categories: {
          include: { category: { select: { id: true, name: true, slug: true } } },
        },
        changeRequests: { orderBy: { createdAt: "desc" } },
      },
    });
    if (!s) throw new NotFoundException("Поставщик не найден");
    return s;
  }

  /** Одобрить заявку */
  async approve(supplierId: string) {
    const s = await this.prisma.supplierProfile.findUnique({ where: { id: supplierId } });
    if (!s) throw new NotFoundException("Поставщик не найден");
    if (s.status === "APPROVED") return s;

    const updated = await this.prisma.supplierProfile.update({
      where: { id: supplierId },
      data: { status: "APPROVED", rejectionReason: null, reviewedAt: new Date(), approvedAt: new Date() },
    });
    this.notifications.notify(
      s.userId,
      "✅ Ваша заявка поставщика одобрена!\n\nДобро пожаловать на платформу GloBox! Теперь вы можете размещать товары в каталоге и принимать заказы от покупателей.",
    ).catch(() => {});
    return updated;
  }

  /** Отклонить */
  async reject(supplierId: string, reason: string) {
    const s = await this.prisma.supplierProfile.findUnique({ where: { id: supplierId } });
    if (!s) throw new NotFoundException("Поставщик не найден");

    const updated = await this.prisma.supplierProfile.update({
      where: { id: supplierId },
      data: { status: "REJECTED", rejectionReason: reason, reviewedAt: new Date() },
    });
    this.notifications.notify(
      s.userId,
      `❌ Ваша заявка поставщика отклонена.\n\nПричина: ${reason}\n\nВы можете исправить данные в личном кабинете и подать заявку повторно.`,
    ).catch(() => {});
    return updated;
  }

  /** Запросить доработку */
  async requestRevision(supplierId: string, reason: string) {
    const s = await this.prisma.supplierProfile.findUnique({ where: { id: supplierId } });
    if (!s) throw new NotFoundException("Поставщик не найден");

    const updated = await this.prisma.supplierProfile.update({
      where: { id: supplierId },
      data: { status: "NEEDS_REVISION", rejectionReason: reason, reviewedAt: new Date() },
    });
    this.notifications.notify(
      s.userId,
      `🔄 По вашей заявке поставщика требуются правки.\n\nКомментарий администратора: ${reason}\n\nИсправьте данные в личном кабинете и отправьте заявку повторно.`,
    ).catch(() => {});
    return updated;
  }

  /** Список покупателей */
  async listBuyers(page = 1, limit = 20) {
    const [items, total] = await Promise.all([
      this.prisma.user.findMany({
        where: { role: "BUYER" },
        select: {
          id: true, email: true, firstName: true, lastName: true,
          phone: true, emailVerified: true, createdAt: true,
        },
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.user.count({ where: { role: "BUYER" } }),
    ]);
    return { items, total, page, limit, pages: Math.ceil(total / limit) };
  }

  /** Статистика для дашборда */
  async getStats() {
    const [
      buyers,
      suppliers,
      supplierPending,
      supplierApproved,
      supplierRejected,
      mediators,
      mediatorPending,
      mediatorApproved,
      mediatorRejected,
    ] = await Promise.all([
      this.prisma.user.count({ where: { role: "BUYER" } }),
      this.prisma.supplierProfile.count(),
      this.prisma.supplierProfile.count({ where: { status: "PENDING" } }),
      this.prisma.supplierProfile.count({ where: { status: "APPROVED" } }),
      this.prisma.supplierProfile.count({ where: { status: "REJECTED" } }),
      this.prisma.mediatorProfile.count(),
      this.prisma.mediatorProfile.count({ where: { status: "PENDING" } }),
      this.prisma.mediatorProfile.count({ where: { status: "APPROVED" } }),
      this.prisma.mediatorProfile.count({ where: { status: "REJECTED" } }),
    ]);
    return {
      buyers,
      suppliers,
      pending: supplierPending,
      approved: supplierApproved,
      rejected: supplierRejected,
      mediators,
      mediatorPending,
      mediatorApproved,
      mediatorRejected,
    };
  }

  // ——— Блок 3: посредники ———

  /** Все MEDIATOR пользователи (включая без профиля) для раздела «База данных». */
  async listMediatorUsers(status?: string, search?: string, page = 1, limit = 20) {
    const whereUser: Record<string, unknown> = {
      roles: { has: "MEDIATOR" as const },
    };

    if (search) {
      whereUser.OR = [
        { email: { contains: search, mode: "insensitive" } },
        { firstName: { contains: search, mode: "insensitive" } },
        { lastName: { contains: search, mode: "insensitive" } },
        { phone: { contains: search, mode: "insensitive" } },
      ];
    }

    if (status === "NO_PROFILE") {
      whereUser.mediatorProfile = null;
    } else if (status) {
      whereUser.mediatorProfile = { status };
    }

    const [items, total] = await Promise.all([
      this.prisma.user.findMany({
        where: whereUser,
        include: {
          mediatorProfile: {
            include: {
              changeRequests: {
                where: { status: "pending" },
                orderBy: { createdAt: "desc" },
              },
            },
          },
        },
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.user.count({ where: whereUser }),
    ]);

    return {
      items: items.map((u) => {
        const m = u.mediatorProfile;
        return {
          // User fields (always present)
          id: m?.id ?? null,
          userId: u.id,
          email: u.email,
          userFirstName: u.firstName,
          userLastName: u.lastName,
          userPhone: u.phone,
          userAvatarUrl: u.avatarUrl,
          userCreatedAt: u.createdAt,
          // Profile fields (may be null)
          firstName: m?.firstName ?? u.firstName,
          lastName: m?.lastName ?? u.lastName,
          middleName: m?.middleName ?? null,
          phone: m?.phone ?? u.phone,
          commissionRate: m ? Number(m.commissionRate) : null,
          minOrderAmount: m?.minOrderAmount ?? null,
          avatarUrl: m?.avatarUrl ?? u.avatarUrl,
          passportPhotoUrl: m?.passportPhotoUrl ?? null,
          passSelfiePhotoUrl: m?.passSelfiePhotoUrl ?? null,
          passPhotoUrl: m?.passPhotoUrl ?? null,
          status: m?.status ?? "NO_PROFILE",
          rejectionReason: m?.rejectionReason ?? null,
          submittedAt: m?.submittedAt ?? null,
          rating: m?.rating ? Number(m.rating) : null,
          completedOrdersCount: m?.completedOrdersCount ?? 0,
          reviewedAt: m?.reviewedAt ?? null,
          approvedAt: m?.approvedAt ?? null,
          accountExpiresAt: m?.accountExpiresAt ?? null,
          changeRequests: m?.changeRequests ?? [],
          createdAt: m?.createdAt ?? u.createdAt,
          blockedAt: (u as any).blockedAt ?? null,
        };
      }),
      total,
      page,
      limit,
      pages: Math.ceil(total / limit),
    };
  }

  /** Список посредников с фильтрацией по статусу (раздел 3.8). */
  async listMediators(status?: string, page = 1, limit = 20) {
    const where: Record<string, unknown> = {};
    if (status) where.status = status;

    const [items, total] = await Promise.all([
      this.prisma.mediatorProfile.findMany({
        where,
        include: {
          user: {
            select: {
              id: true,
              email: true,
              firstName: true,
              lastName: true,
              phone: true,
              createdAt: true,
            },
          },
          changeRequests: {
            where: { status: "pending" },
            orderBy: { createdAt: "desc" },
          },
        },
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.mediatorProfile.count({ where }),
    ]);

    return {
      items: items.map((m) => ({
        id: m.id,
        userId: m.userId,
        email: m.user.email,
        phone: m.phone,
        firstName: m.firstName,
        lastName: m.lastName,
        middleName: m.middleName,
        commissionRate: Number(m.commissionRate),
        minOrderAmount: m.minOrderAmount,
        avatarUrl: m.avatarUrl,
        passportPhotoUrl: m.passportPhotoUrl,
        passSelfiePhotoUrl: m.passSelfiePhotoUrl,
        passPhotoUrl: m.passPhotoUrl,
        status: m.status,
        rejectionReason: m.rejectionReason,
        submittedAt: m.submittedAt,
        rating: m.rating ? Number(m.rating) : null,
        completedOrdersCount: m.completedOrdersCount,
        reviewedAt: m.reviewedAt,
        approvedAt: m.approvedAt,
        accountExpiresAt: m.accountExpiresAt,
        changeRequests: m.changeRequests,
        createdAt: m.createdAt,
      })),
      total,
      page,
      limit,
      pages: Math.ceil(total / limit),
    };
  }

  /** Детали одного посредника (с историей изменений). */
  async getMediator(mediatorId: string) {
    const m = await this.prisma.mediatorProfile.findUnique({
      where: { id: mediatorId },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            phone: true,
            createdAt: true,
          },
        },
        changeRequests: { orderBy: { createdAt: "desc" } },
      },
    });
    if (!m) throw new NotFoundException("Посредник не найден");
    return {
      ...m,
      commissionRate: Number(m.commissionRate),
      rating: m.rating ? Number(m.rating) : null,
    };
  }

  /** Одобрить посредника. */
  async approveMediator(mediatorId: string) {
    const m = await this.prisma.mediatorProfile.findUnique({
      where: { id: mediatorId },
    });
    if (!m) throw new NotFoundException("Посредник не найден");
    if (m.status === "APPROVED") return m;

    const approvedAt = new Date();
    const accountExpiresAt = new Date(approvedAt);
    accountExpiresAt.setFullYear(accountExpiresAt.getFullYear() + 1);

    const updated = await this.prisma.mediatorProfile.update({
      where: { id: mediatorId },
      data: {
        status: "APPROVED",
        rejectionReason: null,
        reviewedAt: approvedAt,
        approvedAt,
        accountExpiresAt,
      },
    });

    this.notifications.notify(
      m.userId,
      "✅ Ваша заявка посредника одобрена!\n\nТеперь вам доступен полный функционал платформы. Добро пожаловать!",
    ).catch(() => {});

    return updated;
  }

  /** Отклонить посредника. */
  async rejectMediator(mediatorId: string, reason: string) {
    if (!reason || reason.trim().length < 3)
      throw new BadRequestException("Укажите причину отклонения");

    const m = await this.prisma.mediatorProfile.findUnique({
      where: { id: mediatorId },
    });
    if (!m) throw new NotFoundException("Посредник не найден");

    const updated = await this.prisma.mediatorProfile.update({
      where: { id: mediatorId },
      data: {
        status: "REJECTED",
        rejectionReason: reason,
        reviewedAt: new Date(),
      },
    });

    this.notifications.notify(
      m.userId,
      `❌ Ваша заявка посредника отклонена.\n\nПричина: ${reason}\n\nОбратитесь в поддержку для уточнений.`,
    ).catch(() => {});

    return updated;
  }

  /** Запросить доработку у посредника. */
  async requestMediatorRevision(mediatorId: string, reason: string) {
    if (!reason || reason.trim().length < 3)
      throw new BadRequestException("Укажите, что нужно исправить");

    const m = await this.prisma.mediatorProfile.findUnique({
      where: { id: mediatorId },
    });
    if (!m) throw new NotFoundException("Посредник не найден");

    const updated = await this.prisma.mediatorProfile.update({
      where: { id: mediatorId },
      data: {
        status: "NEEDS_REVISION",
        rejectionReason: reason,
        reviewedAt: new Date(),
      },
    });

    this.notifications.notify(
      m.userId,
      `🔄 Требуются правки по вашей заявке посредника.\n\nКомментарий: ${reason}\n\nОбновите документы в личном кабинете и отправьте заявку повторно.`,
    ).catch(() => {});

    return updated;
  }

  /** Обновить данные посредника (ставка, мин. заказ, срок действия). */
  async updateMediator(
    mediatorId: string,
    data: { commissionRate?: number; minOrderAmount?: number; accountExpiresAt?: string | null },
  ) {
    const m = await this.prisma.mediatorProfile.findUnique({
      where: { id: mediatorId },
    });
    if (!m) throw new NotFoundException("Посредник не найден");

    const update: Record<string, unknown> = {};
    if (data.commissionRate !== undefined) update.commissionRate = data.commissionRate;
    if (data.minOrderAmount !== undefined) update.minOrderAmount = data.minOrderAmount;
    if (data.accountExpiresAt !== undefined) {
      update.accountExpiresAt = data.accountExpiresAt ? new Date(data.accountExpiresAt) : null;
      update.expiryNotified7d = false;
      update.expiryNotified3d = false;
      update.expiryNotified1d = false;
    }

    return this.prisma.mediatorProfile.update({
      where: { id: mediatorId },
      data: update,
    });
  }

  /** Обработать запрос на изменение данных посредника. */
  async processChangeRequest(requestId: string, decision: "approved" | "rejected") {
    const cr = await this.prisma.mediatorChangeRequest.findUnique({
      where: { id: requestId },
      include: { mediator: true },
    });
    if (!cr) throw new NotFoundException("Запрос не найден");
    if (cr.status !== "pending")
      throw new BadRequestException("Запрос уже обработан");

    if (decision === "approved") {
      // Apply the change to mediator profile
      const fieldMap: Record<string, string> = {
        lastName: "lastName",
        firstName: "firstName",
        middleName: "middleName",
        phone: "phone",
        passportPhotoUrl: "passportPhotoUrl",
        passSelfiePhotoUrl: "passSelfiePhotoUrl",
        avatarUrl: "avatarUrl",
      };
      const dbField = fieldMap[cr.fieldName];
      if (dbField) {
        await this.prisma.mediatorProfile.update({
          where: { id: cr.mediatorId },
          data: { [dbField]: cr.newValue },
        });
      }
    }

    const result = await this.prisma.mediatorChangeRequest.update({
      where: { id: requestId },
      data: { status: decision, processedAt: new Date() },
    });

    const fieldNames: Record<string, string> = {
      lastName: "Фамилия", firstName: "Имя", middleName: "Отчество",
      phone: "Телефон", passportPhotoUrl: "Фото паспорта",
      passSelfiePhotoUrl: "Селфи с паспортом", avatarUrl: "Аватар",
    };
    const fieldLabel = fieldNames[cr.fieldName] ?? cr.fieldName;
    if (decision === "approved") {
      this.notifications.notify(
        cr.mediator.userId,
        `✅ Ваш запрос на изменение данных одобрен.\n\nПоле «${fieldLabel}» обновлено.`,
      ).catch(() => {});
    } else {
      this.notifications.notify(
        cr.mediator.userId,
        `❌ Ваш запрос на изменение поля «${fieldLabel}» отклонён.\n\nОбратитесь в поддержку для уточнений.`,
      ).catch(() => {});
    }
    return result;
  }

  // ——— Справочники ———

  async listLocations() {
    return this.prisma.dictLocation.findMany({ orderBy: { order: "asc" } });
  }

  async createLocation(name: string, code: string) {
    const maxOrder = await this.prisma.dictLocation.aggregate({ _max: { order: true } });
    return this.prisma.dictLocation.create({
      data: { name, code, order: (maxOrder._max.order ?? 0) + 1 },
    });
  }

  async listTopCategories() {
    return this.prisma.supplierTopCategory.findMany({ orderBy: { order: "asc" } });
  }

  /** Seed test users — вызывается через POST /admin/seed */
  async seedTestUsers() {
    const results: string[] = [];

    // Admin
    const adminExists = await this.prisma.user.findFirst({ where: { email: "admin@globox.local", role: "ADMIN" } });
    if (!adminExists) {
      const hash = await argon2.hash((process.env.SEED_ADMIN_PASSWORD || "change-me"), { type: 2 });
      await this.prisma.user.create({ data: { email: "admin@globox.local", emailVerified: true, passwordHash: hash, firstName: "Admin", lastName: "GloBox", role: "ADMIN" } });
      results.push("admin created");
    } else {
      results.push("admin exists");
    }

    // Buyer
    const buyerExists = await this.prisma.user.findFirst({ where: { email: "buyer@test.local", role: "BUYER" } });
    if (!buyerExists) {
      const hash = await argon2.hash((process.env.SEED_BUYER_PASSWORD || "change-me"), { type: 2 });
      await this.prisma.user.create({ data: { email: "buyer@test.local", emailVerified: true, passwordHash: hash, phone: "+79001234567", phoneVerified: false, firstName: "Test", lastName: "Buyer", role: "BUYER" } });
      results.push("buyer created");
    } else {
      results.push("buyer exists");
    }

    // Seller
    const sellerExists = await this.prisma.user.findFirst({ where: { email: "seller@test.local", role: "SUPPLIER" } });
    if (!sellerExists) {
      const hash = await argon2.hash((process.env.SEED_SELLER_PASSWORD || "change-me"), { type: 2 });
      const locations = await this.prisma.dictLocation.findMany({ take: 1 });
      const categories = await this.prisma.supplierTopCategory.findMany({ take: 2 });
      if (locations.length && categories.length) {
        const user = await this.prisma.user.create({ data: { email: "seller@test.local", emailVerified: true, passwordHash: hash, phone: "+79001112233", phoneVerified: false, firstName: "Test", lastName: "Seller", role: "SUPPLIER" } });
        const profile = await this.prisma.supplierProfile.create({ data: { userId: user.id, phone: "+79001112233", phoneVerifiedViaMax: false, firstName: "Test", lastName: "Seller", middleName: null, locationId: locations[0].id, pavilionNumber: "A-101", entityType: "SELF_EMPLOYED", inn: "123456789012", ogrnip: null, status: "APPROVED", submittedAt: new Date(), reviewedAt: new Date(), approvedAt: new Date() } });
        for (const cat of categories) {
          await this.prisma.supplierCategoryLink.create({ data: { supplierId: profile.id, categoryId: cat.id } });
        }
        results.push("seller created (APPROVED)");
      } else {
        results.push("seller skipped — no locations/categories in DB");
      }
    } else {
      results.push("seller exists");
    }

    // Mediator
    const mediatorExists = await this.prisma.user.findFirst({ where: { email: "mediator@test.local", role: "MEDIATOR" } });
    if (!mediatorExists) {
      const hash = await argon2.hash((process.env.SEED_MEDIATOR_PASSWORD || "change-me"), { type: 2 });
      const user = await this.prisma.user.create({ data: { email: "mediator@test.local", emailVerified: true, passwordHash: hash, phone: "+79002345678", phoneVerified: false, firstName: "Test", lastName: "Mediator", role: "MEDIATOR" } });
      await this.prisma.mediatorProfile.create({ data: { userId: user.id, lastName: "Mediator", firstName: "Test", middleName: null, phone: "+79002345678", phoneVerifiedViaMax: false, commissionRate: 10, minOrderAmount: 1000, avatarUrl: null, passportPhotoUrl: null, passSelfiePhotoUrl: null, status: "APPROVED", submittedAt: new Date(), reviewedAt: new Date(), approvedAt: new Date() } });
      results.push("mediator created (APPROVED)");
    } else {
      results.push("mediator exists");
    }

    return { ok: true, results };
  }

  /** Получить профиль посредника по userId (для чата). */
  async getMediatorByUserId(userId: string) {
    const m = await this.prisma.mediatorProfile.findUnique({
      where: { userId },
      include: {
        user: {
          select: {
            id: true, email: true, firstName: true, lastName: true,
            phone: true, createdAt: true,
          },
        },
      },
    });
    if (!m) throw new NotFoundException("Профиль посредника не найден");
    return {
      ...m,
      commissionRate: Number(m.commissionRate),
      rating: m.rating ? Number(m.rating) : null,
    };
  }

  /** Заблокировать пользователя. */
  async blockUser(userId: string) {
    const u = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!u) throw new NotFoundException("Пользователь не найден");
    return this.prisma.user.update({
      where: { id: userId },
      data: { blockedAt: new Date() } as any,
    });
  }

  /** Обновить данные пользователя (имя, телефон, email). */
  async updateUserData(userId: string, data: {
    firstName?: string;
    lastName?: string;
    middleName?: string | null;
    phone?: string | null;
    email?: string;
  }) {
    const u = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!u) throw new NotFoundException("Пользователь не найден");
    const update: Record<string, unknown> = {};
    if (data.firstName  !== undefined) update.firstName  = data.firstName  || null;
    if (data.lastName   !== undefined) update.lastName   = data.lastName   || null;
    if (data.middleName !== undefined) update.middleName = data.middleName || null;
    if (data.phone      !== undefined) update.phone      = data.phone      || null;
    if (data.email      !== undefined) update.email      = data.email      || u.email;
    return this.prisma.user.update({ where: { id: userId }, data: update as any });
  }

  /** Обновить данные профиля поставщика (павильон, форма, ИНН и т.д.). */
  async updateSupplierProfile(profileId: string, data: {
    firstName?: string;
    lastName?: string;
    middleName?: string | null;
    pavilionNumber?: string;
    locationId?: string;
    entityType?: string;
    inn?: string | null;
    ogrnip?: string | null;
    categoryIds?: string[];
  }) {
    const profile = await this.prisma.supplierProfile.findUnique({ where: { id: profileId } });
    if (!profile) throw new NotFoundException("Профиль не найден");

    const update: Record<string, unknown> = {};
    if (data.firstName      !== undefined) update.firstName      = data.firstName      || profile.firstName;
    if (data.lastName       !== undefined) update.lastName       = data.lastName       || profile.lastName;
    if (data.middleName     !== undefined) update.middleName     = data.middleName     || null;
    if (data.pavilionNumber !== undefined) update.pavilionNumber = data.pavilionNumber || profile.pavilionNumber;
    if (data.locationId     !== undefined) update.locationId     = data.locationId;
    if (data.entityType     !== undefined) update.entityType     = data.entityType     as any;
    if (data.inn            !== undefined) update.inn            = data.inn            || null;
    if (data.ogrnip         !== undefined) update.ogrnip         = data.ogrnip         || null;

    await this.prisma.$transaction(async (tx) => {
      await tx.supplierProfile.update({ where: { id: profileId }, data: update as any });
      if (data.firstName !== undefined || data.lastName !== undefined || data.middleName !== undefined) {
        const userUpdate: Record<string, unknown> = {};
        if (data.firstName  !== undefined) userUpdate.firstName  = data.firstName  || null;
        if (data.lastName   !== undefined) userUpdate.lastName   = data.lastName   || null;
        if (data.middleName !== undefined) userUpdate.middleName = data.middleName || null;
        await tx.user.update({ where: { id: profile.userId }, data: userUpdate as any });
      }
      if (data.categoryIds !== undefined) {
        await tx.supplierCategoryLink.deleteMany({ where: { supplierId: profileId } });
        for (const catId of data.categoryIds) {
          await tx.supplierCategoryLink.create({ data: { supplierId: profileId, categoryId: catId } });
        }
      }
    });

    return { ok: true };
  }

  /** Разблокировать пользователя. */
  async unblockUser(userId: string) {
    const u = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!u) throw new NotFoundException("Пользователь не найден");
    return this.prisma.user.update({
      where: { id: userId },
      data: { blockedAt: null } as any,
    });
  }

  /** Удалить пользователя (cascade). */
  async deleteUser(userId: string) {
    const u = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!u) throw new NotFoundException("Пользователь не найден");
    await this.prisma.user.delete({ where: { id: userId } });
    return { ok: true };
  }
}
