import { Controller, Get } from "@nestjs/common";
import { ApiOperation, ApiTags } from "@nestjs/swagger";
import type { CategoryDto } from "@marketplace/shared";
import { CategoriesService } from "./categories.service";

@ApiTags("catalog")
@Controller("categories")
export class CategoriesController {
  constructor(private readonly categories: CategoriesService) {}

  @Get()
  @ApiOperation({ summary: "Список категорий" })
  list(): Promise<CategoryDto[]> {
    return this.categories.findAll();
  }
}
