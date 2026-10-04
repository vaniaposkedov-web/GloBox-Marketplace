import { Injectable, Logger, OnModuleInit } from "@nestjs/common";
import * as argon2 from "argon2";
import { PrismaService } from "../prisma/prisma.service";

const TEST_SELLER_EMAIL = "test.seller@gmail.com";

interface SeedItem {
  categorySlug: string;
  title: string;
  description: string;
  priceRub: number;
  stock: number;
  imageUrl: string;
}

/**
 * Тестовые товары — по 2-3 в каждой категории.
 * Используются для наполнения при первом деплое И для автовосстановления,
 * если в БД обнаружена "битая" кодировка (title содержит '?').
 */
const SEED: SeedItem[] = [
  // Электроника
  {
    categorySlug: "electronics",
    title: "iPhone 15 Pro Max 256GB",
    description:
      "Тестовое описание: смартфон Apple iPhone 15 Pro Max, 256 ГБ, цвет Titanium Black. Состояние нового, в оригинальной коробке, все аксессуары в комплекте. Гарантия 1 год.",
    priceRub: 129000,
    stock: 5,
    imageUrl:
      "https://images.unsplash.com/photo-1592750475338-74b7b21085ab?w=800",
  },
  {
    categorySlug: "electronics",
    title: "MacBook Pro 14\" M3 16/512",
    description:
      "Тестовое описание: ноутбук Apple MacBook Pro 14 дюймов на чипе Apple M3, 16 ГБ оперативной памяти, 512 ГБ SSD. Цвет Space Black. Практически новый, покупал полгода назад.",
    priceRub: 185000,
    stock: 3,
    imageUrl:
      "https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=800",
  },
  {
    categorySlug: "electronics",
    title: "AirPods Pro 2 с кейсом USB-C",
    description:
      "Тестовое описание: беспроводные наушники Apple AirPods Pro второго поколения с активным шумоподавлением и кейсом для зарядки USB-C. В комплекте три пары амбушюр разных размеров.",
    priceRub: 18500,
    stock: 20,
    imageUrl:
      "https://images.unsplash.com/photo-1606220588913-b3aacb4d2f46?w=800",
  },
  // Одежда и обувь
  {
    categorySlug: "clothing",
    title: "Кроссовки Nike Air Max 90",
    description:
      "Тестовое описание: кроссовки Nike Air Max 90 белые, размер 42, подошва Air. Покупал в официальном магазине, чек сохранен. Состояние отличное, ходил пару раз.",
    priceRub: 8900,
    stock: 7,
    imageUrl:
      "https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=800",
  },
  {
    categorySlug: "clothing",
    title: "Джинсы Levi's 501 Original",
    description:
      "Тестовое описание: классические джинсы Levi's 501 Original Fit, прямой крой, цвет синий (средняя потёртость). Размер W32 L32. Новые, с бирками.",
    priceRub: 6500,
    stock: 10,
    imageUrl:
      "https://images.unsplash.com/photo-1541099649105-f69ad21f3246?w=800",
  },
  {
    categorySlug: "clothing",
    title: "Куртка зимняя The North Face",
    description:
      "Тестовое описание: мужская зимняя куртка The North Face McMurdo Parka с капюшоном на пуху, цвет чёрный, размер L. Состояние отличное, ношена одну зиму.",
    priceRub: 22000,
    stock: 2,
    imageUrl:
      "https://images.unsplash.com/photo-1544966503-7cc5ac882d5f?w=800",
  },
  // Для дома и дачи
  {
    categorySlug: "home",
    title: "Робот-пылесос Xiaomi Mi Robot Vacuum",
    description:
      "Тестовое описание: робот-пылесос Xiaomi Mi Robot Vacuum с влажной уборкой, умеет строить карту квартиры через приложение. Комплект: зарядная станция, контейнер для воды, запасные фильтры.",
    priceRub: 24500,
    stock: 4,
    imageUrl:
      "https://images.unsplash.com/photo-1527515637462-cff94eecc1ac?w=800",
  },
  {
    categorySlug: "home",
    title: "Газонокосилка бензиновая Husqvarna",
    description:
      "Тестовое описание: бензиновая газонокосилка Husqvarna LC 140, ширина кошения 40 см, мощность 3 л.с. В отличном состоянии, использовалась один сезон на даче.",
    priceRub: 19000,
    stock: 2,
    imageUrl:
      "https://images.unsplash.com/photo-1558904541-efa843a96f01?w=800",
  },
  // Транспорт
  {
    categorySlug: "transport",
    title: "Велосипед горный Merida Big.Nine",
    description:
      "Тестовое описание: горный велосипед Merida Big.Nine 20, рама 19 дюймов (L), колёса 29, алюминиевая рама, 27 скоростей Shimano Altus. Состояние хорошее, на ходу.",
    priceRub: 45000,
    stock: 1,
    imageUrl:
      "https://images.unsplash.com/photo-1485965120184-e220f721d03e?w=800",
  },
  {
    categorySlug: "transport",
    title: "Электросамокат Xiaomi Mi Pro 2",
    description:
      "Тестовое описание: электросамокат Xiaomi Mi Electric Scooter Pro 2, запас хода до 45 км, максимальная скорость 25 км/ч. Пробег 150 км, батарея в отличном состоянии.",
    priceRub: 28000,
    stock: 3,
    imageUrl:
      "https://images.unsplash.com/photo-1623689043725-d93b98a5b7b4?w=800",
  },
  // Недвижимость
  {
    categorySlug: "realty",
    title: "Сдам 2-комн. квартиру в центре Москвы",
    description:
      "Тестовое описание: сдаётся двухкомнатная квартира в центре Москвы рядом с метро Чистые пруды. Площадь 55 кв.м, есть вся мебель и техника. Только на длительный срок.",
    priceRub: 85000,
    stock: 1,
    imageUrl:
      "https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=800",
  },
  {
    categorySlug: "realty",
    title: "Продам дачу в Подмосковье, 6 соток",
    description:
      "Тестовое описание: продаётся дачный участок 6 соток с домом 60 кв.м в Раменском районе Московской области. Свет, скважина, баня. До Москвы 40 км.",
    priceRub: 2800000,
    stock: 1,
    imageUrl:
      "https://images.unsplash.com/photo-1568605114967-8130f3a36994?w=800",
  },
  // Услуги
  {
    categorySlug: "services",
    title: "Репетитор по математике ЕГЭ",
    description:
      "Тестовое описание: репетитор по математике для подготовки к ЕГЭ. Опыт преподавания 10 лет, результат учеников от 80 баллов. Занятия онлайн через Zoom или очно в Москве.",
    priceRub: 2500,
    stock: 10,
    imageUrl:
      "https://images.unsplash.com/photo-1509228468518-180dd4864904?w=800",
  },
  {
    categorySlug: "services",
    title: "Генеральная уборка квартиры",
    description:
      "Тестовое описание: генеральная уборка квартир и домов под ключ. Работаем профессиональной химией, своя бригада, все инструменты. Выезд по Москве и области.",
    priceRub: 3500,
    stock: 20,
    imageUrl:
      "https://images.unsplash.com/photo-1581578731548-c64695cc6952?w=800",
  },
  // Работа
  {
    categorySlug: "jobs",
    title: "Курьер-доставщик, от 80000 руб/мес",
    description:
      "Тестовое описание: требуется курьер-доставщик для работы по Москве. График свободный, оплата еженедельно. Предоставляем термосумку и форму. Возможна работа как для пешего, так и для авто-курьера.",
    priceRub: 80000,
    stock: 10,
    imageUrl:
      "https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?w=800",
  },
  {
    categorySlug: "jobs",
    title: "Frontend-разработчик Senior",
    description:
      "Тестовое описание: ищем Senior Frontend-разработчика на React/TypeScript в продуктовую команду. Удалёнка/гибрид, офис в центре Москвы. ДМС, гибкий график, команда из 12 человек.",
    priceRub: 350000,
    stock: 1,
    imageUrl:
      "https://images.unsplash.com/photo-1498050108023-c5249f4df085?w=800",
  },
  // Хобби
  {
    categorySlug: "hobby",
    title: "Гитара акустическая Yamaha F310",
    description:
      "Тестовое описание: акустическая гитара Yamaha F310, отличный инструмент для начинающих и любителей. Состояние хорошее, в комплекте чехол и набор медиаторов.",
    priceRub: 12000,
    stock: 3,
    imageUrl:
      "https://images.unsplash.com/photo-1510915361894-db8b60106cb1?w=800",
  },
  {
    categorySlug: "hobby",
    title: "Лего Technic Porsche 911 GT3 RS",
    description:
      "Тестовое описание: конструктор LEGO Technic 42056 Porsche 911 GT3 RS. 2704 детали, собранная модель в витрине, не разбиралась. Инструкция, оригинальная коробка.",
    priceRub: 45000,
    stock: 2,
    imageUrl:
      "https://images.unsplash.com/photo-1558060370-d644479cb6f7?w=800",
  },
];

@Injectable()
export class ListingsSeeder implements OnModuleInit {
  private readonly logger = new Logger(ListingsSeeder.name);

  constructor(private readonly prisma: PrismaService) {}

  async onModuleInit() {
    void this.maybeSeed().catch((e) => {
      this.logger.warn(`maybeSeed skipped: ${(e as Error).message}`);
    });
  }

  private async maybeSeed(): Promise<void> {
    // Если есть "битые" товары (title содержит "?") — удаляем вместе с заказами
    const corrupted = await this.prisma.listing.count({
      where: { title: { contains: "?" } },
    });
    if (corrupted > 0) {
      this.logger.warn(
        `found ${corrupted} corrupted listings (title contains "?"), wiping all demo data`,
      );
      // order_items.listing_id имеет RESTRICT — сначала чистим заказы, потом всё остальное
      await this.prisma.orderItem.deleteMany({});
      await this.prisma.order.deleteMany({});
      await this.prisma.cartItem.deleteMany({});
      await this.prisma.favorite.deleteMany({});
      await this.prisma.review.deleteMany({});
      await this.prisma.listingView.deleteMany({});
      await this.prisma.listingImage.deleteMany({});
      await this.prisma.listing.deleteMany({});
    }

    const existing = await this.prisma.listing.count();
    if (existing > 0) {
      return;
    }

    this.logger.log("seeding demo listings...");

    // 1) создаём/находим тестового продавца
    const passwordHash = await argon2.hash((process.env.SEED_SELLER_PASSWORD || "change-me"), {
      type: argon2.argon2id,
    });
    const seller = await this.prisma.user.upsert({
      where: { email_role: { email: TEST_SELLER_EMAIL, role: "SUPPLIER" } },
      create: {
        email: TEST_SELLER_EMAIL,
        emailVerified: true,
        passwordHash,
        phone: "+79267771111",
        phoneVerified: true,
        firstName: "Тест",
        lastName: "Селлер",
        role: "SUPPLIER",
      },
      update: {
        firstName: "Тест",
        lastName: "Селлер",
      },
    });

    // 2) подтянем категории
    const categories = await this.prisma.category.findMany();
    const bySlug = new Map(categories.map((c) => [c.slug, c.id]));

    // 3) создаём товары
    let created = 0;
    for (const s of SEED) {
      const categoryId = bySlug.get(s.categorySlug);
      if (!categoryId) continue;
      await this.prisma.listing.create({
        data: {
          title: s.title,
          description: s.description,
          price: s.priceRub * 100, // в копейках
          currency: "RUB",
          status: "PUBLISHED",
          categoryId,
          sellerId: seller.id,
          city: "Москва",
          stock: s.stock,
          images: {
            create: [{ url: s.imageUrl, order: 0 }],
          },
        },
      });
      created += 1;
    }

    this.logger.log(`seeded ${created} listings across ${categories.length} categories`);
  }
}
