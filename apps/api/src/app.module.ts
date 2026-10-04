import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { ThrottlerModule } from "@nestjs/throttler";
import { ScheduleModule } from "@nestjs/schedule";
import { PrismaModule } from "./modules/prisma/prisma.module";
import { HealthModule } from "./modules/health/health.module";
import { AuthModule } from "./modules/auth/auth.module";
import { CatalogModule } from "./modules/catalog/catalog.module";
import { CommerceModule } from "./modules/commerce/commerce.module";
import { VerificationModule } from "./modules/verification/verification.module";
import { SupplierModule } from "./modules/supplier/supplier.module";
import { MediatorModule } from "./modules/mediator/mediator.module";
import { AdminModule } from "./modules/admin/admin.module";
import { SupportModule } from "./modules/support/support.module";
import { NotificationModule } from "./modules/notifications/notification.module";

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ScheduleModule.forRoot(),
    // Rate-limit по умолчанию (1.5.1): 5 попыток регистрации / час. Точечные лимиты — в AuthModule.
    ThrottlerModule.forRoot([
      { name: "short", ttl: 60_000, limit: 60 }, // 60 rpm общий
    ]),
    PrismaModule,
    VerificationModule,
    HealthModule,
    AuthModule,
    CatalogModule,
    CommerceModule,
    MediatorModule,
    SupplierModule,
    AdminModule,
    SupportModule,
    NotificationModule,
  ],
})
export class AppModule {}
