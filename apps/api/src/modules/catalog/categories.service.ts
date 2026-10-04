import { Injectable, Logger, NotFoundException, OnModuleInit } from "@nestjs/common";
import type { CategoryDto } from "@marketplace/shared";
import { PrismaService } from "../prisma/prisma.service";

/** Расширенный список базовых категорий для маркетплейса (Садовод-стиль) */
export const DEFAULT_CATEGORIES = [
  // Одежда
  { slug: "women-clothing",  name: "Одежда женская",         icon: "👗", order: 10 },
  { slug: "men-clothing",    name: "Одежда мужская",          icon: "👕", order: 11 },
  { slug: "kids-clothing",   name: "Детская одежда",          icon: "🧒", order: 12 },
  { slug: "sportswear",      name: "Спортивная одежда",       icon: "🏃", order: 13 },
  // Обувь
  { slug: "women-shoes",     name: "Обувь женская",           icon: "👠", order: 20 },
  { slug: "men-shoes",       name: "Обувь мужская",           icon: "👞", order: 21 },
  { slug: "kids-shoes",      name: "Детская обувь",           icon: "👟", order: 22 },
  // Аксессуары
  { slug: "bags",            name: "Сумки и рюкзаки",         icon: "👜", order: 30 },
  { slug: "accessories",     name: "Аксессуары",              icon: "💍", order: 31 },
  { slug: "hats",            name: "Головные уборы",          icon: "🧢", order: 32 },
  { slug: "underwear",       name: "Нижнее бельё",            icon: "🩲", order: 33 },
  { slug: "jewelry",         name: "Украшения и бижутерия",   icon: "💎", order: 34 },
  { slug: "watches",         name: "Часы и оптика",           icon: "⌚", order: 35 },
  // Дом и быт
  { slug: "bedding",         name: "Постельное бельё",        icon: "🛏️", order: 40 },
  { slug: "textiles",        name: "Шторы и текстиль",        icon: "🪟", order: 41 },
  { slug: "dishes",          name: "Посуда и кухня",          icon: "🍳", order: 42 },
  { slug: "cleaning",        name: "Бытовая химия и уборка",  icon: "🧹", order: 43 },
  { slug: "home-decor",      name: "Декор и интерьер",        icon: "🖼️", order: 44 },
  { slug: "tools",           name: "Инструменты и хозтовары", icon: "🔧", order: 45 },
  // Красота
  { slug: "perfume",         name: "Парфюмерия",              icon: "🌸", order: 50 },
  { slug: "skincare",        name: "Уход за лицом и телом",   icon: "💆", order: 51 },
  { slug: "hair",            name: "Уход за волосами",        icon: "💇", order: 52 },
  // Детское
  { slug: "toys",            name: "Игрушки",                 icon: "🧸", order: 60 },
  { slug: "baby",            name: "Товары для малышей",      icon: "🍼", order: 61 },
  { slug: "school",          name: "Школьные товары",         icon: "🎒", order: 62 },
  // Электроника
  { slug: "electronics",     name: "Электроника и гаджеты",   icon: "📱", order: 70 },
  // Спорт
  { slug: "sports",          name: "Спорт и фитнес",          icon: "⚽", order: 80 },
  { slug: "tourism",         name: "Туризм и отдых",          icon: "⛺", order: 81 },
  // Продукты
  { slug: "food",            name: "Продукты питания",        icon: "🍎", order: 90 },
  { slug: "tea-coffee",      name: "Чай, кофе, сладости",     icon: "☕", order: 91 },
  // Прочее
  { slug: "stationery",      name: "Канцелярия и книги",      icon: "📚", order: 100 },
  { slug: "hobby",           name: "Хобби и творчество",      icon: "🎨", order: 101 },
];

@Injectable()
export class CategoriesService implements OnModuleInit {
  private readonly logger = new Logger(CategoriesService.name);

  constructor(private readonly prisma: PrismaService) {}

  async onModuleInit() {
    void this.seedDefaults().catch((e) => {
      this.logger.warn(`seedDefaults skipped: ${(e as Error).message}`);
    });
  }

  /** Засеваем, если таблица пуста. Идемпотентно. */
  async seedDefaults(): Promise<{ added: number }> {
    const existingSlugs = await this.prisma.category
      .findMany({ select: { slug: true } })
      .then((rows) => new Set(rows.map((r) => r.slug)));

    const toAdd = DEFAULT_CATEGORIES.filter((c) => !existingSlugs.has(c.slug));
    if (toAdd.length === 0) {
      this.logger.log("All default categories already exist");
      return { added: 0 };
    }
    await this.prisma.category.createMany({ data: toAdd });
    this.logger.log(`Seeded ${toAdd.length} categories`);
    return { added: toAdd.length };
  }

  async findAll(): Promise<CategoryDto[]> {
    const rows = await this.prisma.category.findMany({ orderBy: [{ order: "asc" }, { name: "asc" }] });
    return rows.map((r) => ({
      id: r.id, slug: r.slug, name: r.name, icon: r.icon, order: r.order,
      // @ts-ignore — parentId добавлен в схему
      parentId: (r as any).parentId ?? null,
    }));
  }

  // ── Admin methods ─────────────────────────────────────────────────────────

  /** Иерархический список: родители + их дети */
  async adminList() {
    return this.prisma.category.findMany({
      where: { parentId: null },
      orderBy: { order: "asc" },
      include: { children: { orderBy: { order: "asc" } } },
    });
  }

  async adminCreate(dto: { name: string; icon?: string; parentId?: string }) {
    const base = dto.name.toLowerCase().replace(/\s+/g, "-").replace(/[^a-zа-яё0-9-]/gi, "").slice(0, 50);
    const slug = `${base}-${Date.now().toString(36)}`;
    const agg = await this.prisma.category.aggregate({ _max: { order: true } });
    return this.prisma.category.create({
      data: {
        name: dto.name.trim(), slug, icon: dto.icon ?? null,
        order: (agg._max.order ?? 0) + 10,
        parentId: dto.parentId ?? null,
      },
    });
  }

  async adminDelete(id: string) {
    const cat = await this.prisma.category.findUnique({ where: { id } });
    if (!cat) throw new NotFoundException("Категория не найдена");
    return this.prisma.category.delete({ where: { id } });
  }
}
