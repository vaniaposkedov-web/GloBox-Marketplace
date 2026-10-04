import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module";
import { CatalogModule } from "../catalog/catalog.module";
import { SupplierController } from "./supplier.controller";
import { SupplierService } from "./supplier.service";
import { SupplierDictsSeeder } from "./supplier-dicts-seeder.service";

@Module({
  imports: [AuthModule, CatalogModule],
  controllers: [SupplierController],
  providers: [SupplierService, SupplierDictsSeeder],
  exports: [SupplierService],
})
export class SupplierModule {}
