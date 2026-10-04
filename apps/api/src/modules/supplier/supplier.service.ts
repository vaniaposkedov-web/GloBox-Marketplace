import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import * as argon2 from "argon2";
import { PrismaService } from "../prisma/prisma.service";
import { TokensService } from "../auth/tokens.service";
import { Prisma } from "@prisma/client";
import * as crypto from "crypto";

export interface SupplierRegisterDto {
  email: string;
  password: string;
  phone: string;
  firstName: string;
  lastName: string;
  middleName?: string;
}

export interface SupplierProfileSubmitDto {
  firstName: string;
  lastName: string;
  middleName?: string;
  phone?: string;
  locationId: string;
  pavilionNumber: string;
  entityType: "INDIVIDUAL" | "SELF_EMPLOYED" | "IP" | "OOO";
  categoryIds: string[];
  inn?: string;
  ogrnip?: string;
  passPhotoUrl?: string;
  passSelfiePhotoUrl?: string;
  avatarUrl?: string;
}

// --- Validation helpers ---
const ALLOWED_PHONE_PREFIXES = [
  "+7", "+375", "+77", "+996", "+998", "+992", "+374", "+994", "+373",
];

function validatePhone(phone: string): string | null {
  const digits = phone.replace(/\D/g, "");
  if (digits.length < 10 || digits.length > 15) return "Некорректный номер телефона";
  if (phone.startsWith("+380")) return "Данный регион не поддерживается";
  if (!ALLOWED_PHONE_PREFIXES.some((p) => phone.startsWith(p))) {
    return "Неподдерживаемый код страны";
  }
  if (/(\d)\1{6,}/.test(digits)) return "Номер содержит слишком много одинаковых цифр";
  for (let i = 0; i <= digits.length - 7; i++) {
    let asc = true, desc = true;
    for (let j = 1; j < 7; j++) {
      if (Number(digits[i + j]) !== Number(digits[i + j - 1]) + 1) asc = false;
      if (Number(digits[i + j]) !== Number(digits[i + j - 1]) - 1) desc = false;
    }
    if (asc || desc) return "Номер содержит последовательность цифр";
  }
  return null;
}

const NAME_RE = /^[\p{L}\s\-']{1,50}$/u;

function validateName(value: string, field: string): string | null {
  if (!value || value.trim().length === 0) return `${field} обязательно`;
  if (value.length > 50) return `${field}: максимум 50 символов`;
  if (!NAME_RE.test(value)) return `${field}: допустимы только буквы, пробелы и дефисы`;
  return null;
}

function validateInn(inn?: string): string | null {
  if (!inn) return null;
  if (!/^\d{10}$|^\d{12}$/.test(inn)) return "ИНН: 10 или 12 цифр";
  return null;
}

function validateOgrnip(ogrnip?: string): string | null {
  if (!ogrnip) return null;
  if (!/^\d{13}$|^\d{15}$/.test(ogrnip)) return "ОГРНИП/ОГРН: 13 или 15 цифр";
  return null;
}

function validatePavilion(v: string): string | null {
  if (!v || !v.trim()) return "Номер павильона обязателен";
  if (v.length > 500) return "Номер павильона: слишком длинное значение";
  // Validate only the first line (pavilion number); rest is optional sign text
  const firstLine = v.split("\n")[0].trim();
  if (!firstLine) return "Номер павильона обязателен";
  if (firstLine.length > 100) return "Номер павильона: максимум 100 символов";
  return null;
}

@Injectable()
export class SupplierService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly tokens: TokensService,
  ) {}

  /** Справочники для формы регистрации */
  async getDicts() {
    const [locations, categories] = await Promise.all([
      this.prisma.dictLocation.findMany({
        where: { isActive: true },
        orderBy: { order: "asc" },
        select: { id: true, name: true, code: true },
      }),
      this.prisma.supplierTopCategory.findMany({
        where: { isActive: true },
        orderBy: { order: "asc" },
        select: { id: true, name: true, slug: true },
      }),
    ]);
    return { locations, categories };
  }

  /** Базовая регистрация — только аккаунт, без профиля */
  async register(dto: SupplierRegisterDto) {
    const phoneErr = validatePhone(dto.phone);
    if (phoneErr) throw new BadRequestException(phoneErr);

    const lastNameErr = validateName(dto.lastName, "Фамилия");
    if (lastNameErr) throw new BadRequestException(lastNameErr);
    const firstNameErr = validateName(dto.firstName, "Имя");
    if (firstNameErr) throw new BadRequestException(firstNameErr);
    if (dto.middleName) {
      const midErr = validateName(dto.middleName, "Отчество");
      if (midErr) throw new BadRequestException(midErr);
    }

    // Глобальная проверка email (уникален по всем ролям)
    const existingEmail = await this.prisma.user.findFirst({
      where: { email: dto.email },
    });
    if (existingEmail) {
      throw new ConflictException(
        existingEmail.role === "SUPPLIER"
          ? "Этот email уже зарегистрирован. Войдите в аккаунт."
          : "Этот email уже используется в другом аккаунте GloBox.",
      );
    }

    // Проверка телефона среди поставщиков
    const existingPhone = await this.prisma.user.findFirst({
      where: { phone: dto.phone, role: "SUPPLIER" },
    });
    if (existingPhone) throw new ConflictException("Этот номер телефона уже зарегистрирован.");

    const passwordHash = await argon2.hash(dto.password, { type: argon2.argon2id });

    let user: Awaited<ReturnType<typeof this.prisma.user.create>>;
    try {
      user = await this.prisma.user.create({
        data: {
          email: dto.email,
          emailVerified: false,
          phone: dto.phone,
          phoneVerified: false,
          passwordHash,
          firstName: dto.firstName,
          lastName: dto.lastName,
          role: "SUPPLIER",
        },
      });
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
        const field = (e.meta?.target as string[] | undefined)?.[0] ?? "";
        if (field.includes("email")) throw new ConflictException("Этот email уже зарегистрирован.");
        if (field.includes("phone")) throw new ConflictException("Этот номер телефона уже зарегистрирован.");
        throw new ConflictException("Пользователь с такими данными уже существует.");
      }
      throw e;
    }

    const accessToken = await this.tokens.signAccessToken(user.id, user.role);
    return { accessToken, userId: user.id };
  }

  /** Подача заявки на верификацию (создаёт/обновляет профиль поставщика) */
  async submitProfile(userId: string, dto: SupplierProfileSubmitDto) {
    const lastNameErr = validateName(dto.lastName, "Фамилия");
    if (lastNameErr) throw new BadRequestException(lastNameErr);
    const firstNameErr = validateName(dto.firstName, "Имя");
    if (firstNameErr) throw new BadRequestException(firstNameErr);

    const pavErr = validatePavilion(dto.pavilionNumber);
    if (pavErr) throw new BadRequestException(pavErr);

    const innErr = validateInn(dto.inn);
    if (innErr) throw new BadRequestException(innErr);
    const ogrnErr = validateOgrnip(dto.ogrnip);
    if (ogrnErr) throw new BadRequestException(ogrnErr);

    if (!dto.categoryIds || !dto.categoryIds.length || dto.categoryIds.length > 5) {
      throw new BadRequestException("Выберите от 1 до 5 категорий");
    }

    const location = await this.prisma.dictLocation.findUnique({ where: { id: dto.locationId } });
    if (!location || !location.isActive) throw new BadRequestException("Неверная локация");

    const cats = await this.prisma.supplierTopCategory.findMany({
      where: { id: { in: dto.categoryIds }, isActive: true },
    });
    if (cats.length !== dto.categoryIds.length) {
      throw new BadRequestException("Одна или несколько категорий не найдены");
    }

    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException("Пользователь не найден");

    const existing = await this.prisma.supplierProfile.findUnique({ where: { userId } });

    if (existing && (existing.status === "APPROVED" || existing.status === "PENDING")) {
      // Allow resubmit only for NEEDS_REVISION / REJECTED
      if (existing.status === "PENDING") {
        throw new BadRequestException("Заявка уже на рассмотрении");
      }
    }

    const profile = await this.prisma.$transaction(async (tx) => {
      // Delete existing category links if updating
      if (existing) {
        await tx.supplierCategoryLink.deleteMany({ where: { supplierId: existing.id } });
      }

      const p = await tx.supplierProfile.upsert({
        where: { userId },
        update: {
          firstName: dto.firstName,
          lastName: dto.lastName,
          middleName: dto.middleName || null,
          phone: dto.phone || user.phone || null,
          locationId: dto.locationId,
          pavilionNumber: dto.pavilionNumber,
          entityType: dto.entityType,
          inn: dto.inn || null,
          ogrnip: dto.ogrnip || null,
          passPhotoUrl: dto.passPhotoUrl || null,
          passSelfiePhotoUrl: dto.passSelfiePhotoUrl || null,
          avatarUrl: dto.avatarUrl || null,
          status: "PENDING",
          submittedAt: new Date(),
        },
        create: {
          userId,
          firstName: dto.firstName,
          lastName: dto.lastName,
          middleName: dto.middleName || null,
          phone: dto.phone || user.phone || null,
          phoneVerifiedViaMax: false,
          locationId: dto.locationId,
          pavilionNumber: dto.pavilionNumber,
          entityType: dto.entityType,
          inn: dto.inn || null,
          ogrnip: dto.ogrnip || null,
          passPhotoUrl: dto.passPhotoUrl || null,
          passSelfiePhotoUrl: dto.passSelfiePhotoUrl || null,
          avatarUrl: dto.avatarUrl || null,
          status: "PENDING",
          submittedAt: new Date(),
        },
      });

      for (const catId of dto.categoryIds) {
        await tx.supplierCategoryLink.create({ data: { supplierId: p.id, categoryId: catId } });
      }

      return p;
    });

    return { status: profile.status, supplierId: profile.id };
  }

  /** Логин поставщика */
  async login(email: string, password: string, ip?: string, userAgent?: string) {
    const user = await this.prisma.user.findFirst({
      where: { email, role: "SUPPLIER" },
    });
    if (!user || !user.passwordHash) {
      throw new BadRequestException("Неверный email или пароль");
    }
    const valid = await argon2.verify(user.passwordHash, password);
    if (!valid) {
      throw new BadRequestException("Неверный email или пароль");
    }

    await this.prisma.loginEvent.create({
      data: { userId: user.id, ip: ip ?? null, userAgent: userAgent ?? null },
    }).catch(() => {});

    const accessToken = await this.tokens.signAccessToken(user.id, user.role);
    return { accessToken, userId: user.id };
  }

  /** История входов пользователя (последние 20) */
  async getLoginEvents(userId: string) {
    const events = await this.prisma.loginEvent.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: 20,
      select: { id: true, ip: true, userAgent: true, createdAt: true },
    });
    return events;
  }

  /** Обновить аватар пользователя */
  async updateAvatar(userId: string, avatarUrl: string) {
    await this.prisma.user.update({ where: { id: userId }, data: { avatarUrl } });
    return { ok: true, avatarUrl };
  }

  /** Профиль с заявкой */
  async getProfile(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        phone: true,
        avatarUrl: true,
        createdAt: true,
      },
    });
    if (!user) throw new NotFoundException("Пользователь не найден");

    const profile = await this.prisma.supplierProfile.findUnique({
      where: { userId },
      include: {
        location: { select: { id: true, name: true, code: true } },
        categories: {
          include: { category: { select: { id: true, name: true, slug: true } } },
        },
      },
    });

    return { user, profile };
  }

  /** Товары поставщика */
  async getMyListings(userId: string) {
    const items = await this.prisma.listing.findMany({
      where: { sellerId: userId },
      include: {
        category: { select: { id: true, name: true } },
        images: { orderBy: { order: "asc" } },
        variantGroup: {
          include: {
            listings: {
              select: { id: true, title: true, images: { take: 1, orderBy: { order: "asc" } } },
            },
          },
        },
        _count: { select: { cartItems: true, favorites: true } },
      },
      orderBy: { createdAt: "desc" },
    });
    return {
      items: items.map((l) => ({
        ...l,
        cartCount: l._count.cartItems,
        favoritesCount: l._count.favorites,
        _count: undefined,
      })),
      total: items.length,
    };
  }

  /** Создать товар */
  async createListing(
    userId: string,
    dto: {
      title: string;
      shortDescription?: string;
      description: string;
      price: number;
      stock?: number;
      categoryId: string;
      imageUrls?: string[];
      characteristics?: { key: string; value: string }[];
      variantGroupId?: string | null;
    },
  ) {
    const profile = await this.prisma.supplierProfile.findUnique({ where: { userId } });
    if (!profile || profile.status !== "APPROVED") {
      throw new BadRequestException("Создавать товары могут только одобренные поставщики");
    }
    const category = await this.prisma.category.findUnique({ where: { id: dto.categoryId } });
    if (!category) throw new BadRequestException("Категория не найдена");

    const listing = await this.prisma.listing.create({
      data: {
        title: dto.title,
        shortDescription: dto.shortDescription || null,
        description: dto.description,
        price: dto.price,
        stock: dto.stock ?? 1,
        status: "PUBLISHED",
        categoryId: dto.categoryId,
        sellerId: userId,
        characteristics: dto.characteristics ?? undefined,
        variantGroupId: dto.variantGroupId || null,
        images: dto.imageUrls?.length
          ? { create: dto.imageUrls.map((url, i) => ({ url, order: i })) }
          : undefined,
      },
      include: {
        category: { select: { id: true, name: true } },
        images: { orderBy: { order: "asc" } },
        _count: { select: { cartItems: true, favorites: true } },
      },
    });
    return { ...listing, cartCount: listing._count.cartItems, favoritesCount: listing._count.favorites };
  }

  /** Обновить товар */
  async updateListing(
    userId: string,
    listingId: string,
    dto: {
      title?: string;
      shortDescription?: string;
      description?: string;
      price?: number;
      stock?: number;
      status?: string;
      categoryId?: string;
      imageUrls?: string[];
      characteristics?: { key: string; value: string }[];
      variantGroupId?: string | null;
    },
  ) {
    const listing = await this.prisma.listing.findFirst({ where: { id: listingId, sellerId: userId } });
    if (!listing) throw new NotFoundException("Товар не найден");

    const updatedListing = await this.prisma.$transaction(async (tx) => {
      if (dto.imageUrls !== undefined) {
        await tx.listingImage.deleteMany({ where: { listingId } });
        if (dto.imageUrls.length > 0) {
          await tx.listingImage.createMany({
            data: dto.imageUrls.map((url, i) => ({ url, order: i, listingId })),
          });
        }
      }
      return tx.listing.update({
        where: { id: listingId },
        data: {
          ...(dto.title !== undefined && { title: dto.title }),
          ...(dto.shortDescription !== undefined && { shortDescription: dto.shortDescription || null }),
          ...(dto.description !== undefined && { description: dto.description }),
          ...(dto.price !== undefined && { price: dto.price }),
          ...(dto.stock !== undefined && { stock: dto.stock }),
          ...(dto.status !== undefined && { status: dto.status as any }),
          ...(dto.categoryId !== undefined && { categoryId: dto.categoryId }),
          ...(dto.characteristics !== undefined && { characteristics: dto.characteristics as any }),
          ...(dto.variantGroupId !== undefined && { variantGroupId: dto.variantGroupId || null }),
        },
        include: {
          category: { select: { id: true, name: true } },
          images: { orderBy: { order: "asc" } },
          variantGroup: {
            include: {
              listings: {
                select: { id: true, title: true, images: { take: 1, orderBy: { order: "asc" } } },
              },
            },
          },
          _count: { select: { cartItems: true, favorites: true } },
        },
      });
    });
    return { ...updatedListing, cartCount: updatedListing._count.cartItems, favoritesCount: updatedListing._count.favorites };
  }

  /** Создать группу вариантов */
  async createVariantGroup(userId: string) {
    return this.prisma.listingVariantGroup.create({
      data: { sellerId: userId },
      include: { listings: { select: { id: true, title: true, images: { take: 1, orderBy: { order: "asc" } } } } },
    });
  }

  /** Удалить группу вариантов (если пустая или принадлежит seller) */
  async deleteVariantGroup(userId: string, groupId: string) {
    const group = await this.prisma.listingVariantGroup.findFirst({ where: { id: groupId, sellerId: userId } });
    if (!group) throw new NotFoundException("Группа не найдена");
    // Remove listings from group
    await this.prisma.listing.updateMany({ where: { variantGroupId: groupId, sellerId: userId }, data: { variantGroupId: null } });
    await this.prisma.listingVariantGroup.delete({ where: { id: groupId } });
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

  async requestEmailChange(userId: string, newEmail: string) {
    if (!newEmail || !newEmail.includes("@")) throw new BadRequestException("Введите корректный email");
    const exists = await this.prisma.user.findFirst({ where: { email: newEmail } });
    if (exists && exists.id !== userId) throw new BadRequestException("Email уже занят");
    const code = crypto.randomInt(100000, 999999).toString();
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000);
    await this.prisma.emailCode.create({
      data: { userId, email: newEmail, codeHash: await argon2.hash(code, { type: 2 }), purpose: "CHANGE_EMAIL", expiresAt } as any,
    });
    return { ok: true, code };
  }

  async confirmEmailChange(userId: string, newEmail: string, code: string) {
    const record = await (this.prisma.emailCode as any).findFirst({
      where: { userId, email: newEmail, purpose: "CHANGE_EMAIL" },
      orderBy: { createdAt: "desc" },
    });
    if (!record) throw new BadRequestException("Код не найден. Запросите повторно.");
    if (new Date() > new Date(record.expiresAt)) throw new BadRequestException("Код истёк");
    const valid = await argon2.verify(record.codeHash, code);
    if (!valid) throw new BadRequestException("Неверный код");
    await this.prisma.user.update({ where: { id: userId }, data: { email: newEmail } });
    return { ok: true };
  }

  async requestPhoneChange(userId: string, newPhone: string) {
    if (!newPhone || newPhone.length < 10) throw new BadRequestException("Введите корректный номер");
    const code = crypto.randomInt(100000, 999999).toString();
    return { ok: true, code };
  }

  async confirmPhoneChange(userId: string, newPhone: string, code: string) {
    await this.prisma.user.update({ where: { id: userId }, data: { phone: newPhone } });
    return { ok: true };
  }
}
