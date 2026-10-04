import { Injectable, OnModuleDestroy, OnModuleInit } from "@nestjs/common";
import { PrismaClient } from "@prisma/client";

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  async onModuleInit(): Promise<void> {
    try {
      await this.$connect();
      console.log("[prisma] Connected to database");
    } catch (e) {
      console.error("[prisma] Failed to connect to database:", (e as Error).message);
      console.error("[prisma] App will start but DB queries will fail until connection is restored");
    }
  }

  async onModuleDestroy(): Promise<void> {
    await this.$disconnect();
  }
}
