import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module";
import { CategoriesController } from "./categories.controller";
import { CategoriesService } from "./categories.service";
import { ListingsController } from "./listings.controller";
import { ListingsService } from "./listings.service";
import { ListingsSeeder } from "./listings-seeder.service";
import { CategoryAiService } from "./category-ai.service";

@Module({
  imports: [AuthModule],
  controllers: [CategoriesController, ListingsController],
  providers: [CategoriesService, ListingsService, ListingsSeeder, CategoryAiService],
  exports: [CategoriesService, ListingsService, CategoryAiService],
})
export class CatalogModule {}
