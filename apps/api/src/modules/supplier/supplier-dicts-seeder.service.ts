import { Injectable, Logger, OnModuleInit } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";

const LOCATIONS = [
  { code: "sadovod_a", name: "Садовод — Корпус А (крытый)", order: 1 },
  { code: "sadovod_b", name: "Садовод — Корпус Б (крытый)", order: 2 },
  { code: "sadovod_open", name: "Садовод — Некрытый рынок", order: 3 },
];

const TOP_CATEGORIES = [
  { slug: "women_clothing", name: "Женская одежда", order: 1 },
  { slug: "men_clothing", name: "Мужская одежда", order: 2 },
  { slug: "kids_clothing", name: "Детская одежда", order: 3 },
  { slug: "women_shoes", name: "Женская обувь", order: 4 },
  { slug: "men_shoes", name: "Мужская обувь", order: 5 },
  { slug: "kids_shoes", name: "Детская обувь", order: 6 },
  { slug: "bags_accessories", name: "Сумки и аксессуары", order: 7 },
  { slug: "cosmetics", name: "Косметика и парфюмерия", order: 8 },
  { slug: "jewelry", name: "Ювелирные изделия и бижутерия", order: 9 },
  { slug: "home_textile", name: "Текстиль для дома", order: 10 },
];

@Injectable()
export class SupplierDictsSeeder implements OnModuleInit {
  private readonly logger = new Logger(SupplierDictsSeeder.name);

  constructor(private readonly prisma: PrismaService) {}

  async onModuleInit() {
    void (async () => {
      try {
        await this.seedLocations();
        await this.seedTopCategories();
      } catch (e) {
        this.logger.warn(`seed skipped: ${(e as Error).message}`);
      }
    })();
  }

  private async seedLocations() {
    for (const loc of LOCATIONS) {
      await this.prisma.dictLocation.upsert({
        where: { code: loc.code },
        create: loc,
        update: { name: loc.name, order: loc.order },
      });
    }
    this.logger.log(`locations: ${LOCATIONS.length} synced`);
  }

  private async seedTopCategories() {
    for (const cat of TOP_CATEGORIES) {
      await this.prisma.supplierTopCategory.upsert({
        where: { slug: cat.slug },
        create: cat,
        update: { name: cat.name, order: cat.order },
      });
    }
    this.logger.log(`supplier top categories: ${TOP_CATEGORIES.length} synced`);
  }
}
