import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { RolesGuard } from "../auth/roles.guard";
import { Roles } from "../auth/roles.decorator";
import { Public } from "../auth/public.decorator";
import { AdminService } from "./admin.service";
import { CategoryAiService } from "../catalog/category-ai.service";
import { CategoriesService } from "../catalog/categories.service";

@ApiTags("admin")
@ApiBearerAuth()
@Controller("admin")
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles("ADMIN")
export class AdminController {
  constructor(
    private readonly admin: AdminService,
    private readonly categoryAi: CategoryAiService,
    private readonly categories: CategoriesService,
  ) {}

  @Post("login")
  @HttpCode(HttpStatus.OK)
  @Public()
  @ApiOperation({ summary: "Логин администратора" })
  async login(@Body() dto: { email: string; password: string }) {
    return this.admin.login(dto.email, dto.password);
  }

  @Post("seed")
  @HttpCode(HttpStatus.OK)
  @Public()
  @ApiOperation({ summary: "Создать тестовых пользователей" })
  async seed() {
    return this.admin.seedTestUsers();
  }

  @Post("reset-operations")
  @HttpCode(HttpStatus.OK)
  @Public()
  @ApiOperation({ summary: "Удалить все операционные данные (заказы, заявки, корзины, чаты)" })
  async resetOperations() {
    return this.admin.resetOperations();
  }

  @Get("stats")
  @ApiOperation({ summary: "Статистика дашборда" })
  async getStats() {
    return this.admin.getStats();
  }

  @Get("supplier-users")
  @ApiOperation({ summary: "Все зарегистрированные пользователи-поставщики" })
  async listSupplierUsers(
    @Query("page") page?: string,
    @Query("limit") limit?: string,
    @Query("search") search?: string,
  ) {
    return this.admin.listSupplierUsers(
      page ? Number(page) : 1,
      limit ? Number(limit) : 50,
      search,
    );
  }

  @Get("suppliers")
  @ApiOperation({ summary: "Список поставщиков" })
  async listSuppliers(
    @Query("status") status?: string,
    @Query("page") page?: string,
    @Query("limit") limit?: string,
  ) {
    return this.admin.listSuppliers(
      status,
      page ? Number(page) : 1,
      limit ? Number(limit) : 20,
    );
  }

  @Get("suppliers/:id")
  @ApiOperation({ summary: "Детали поставщика" })
  async getSupplier(@Param("id", new ParseUUIDPipe()) id: string) {
    return this.admin.getSupplier(id);
  }

  @Post("suppliers/:id/approve")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Одобрить заявку" })
  async approve(@Param("id", new ParseUUIDPipe()) id: string) {
    return this.admin.approve(id);
  }

  @Post("suppliers/:id/reject")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Отклонить заявку" })
  async reject(
    @Param("id", new ParseUUIDPipe()) id: string,
    @Body() dto: { reason: string },
  ) {
    return this.admin.reject(id, dto.reason);
  }

  @Post("suppliers/:id/revision")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Запросить доработку" })
  async revision(
    @Param("id", new ParseUUIDPipe()) id: string,
    @Body() dto: { reason: string },
  ) {
    return this.admin.requestRevision(id, dto.reason);
  }

  @Get("buyers")
  @ApiOperation({ summary: "Список покупателей" })
  async listBuyers(
    @Query("page") page?: string,
    @Query("limit") limit?: string,
  ) {
    return this.admin.listBuyers(page ? Number(page) : 1, limit ? Number(limit) : 20);
  }

  @Get("locations")
  @ApiOperation({ summary: "Справочник локаций" })
  async listLocations() {
    return this.admin.listLocations();
  }

  @Post("locations")
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: "Добавить локацию" })
  async createLocation(@Body() dto: { name: string; code: string }) {
    return this.admin.createLocation(dto.name, dto.code);
  }

  @Get("top-categories")
  @ApiOperation({ summary: "Справочник категорий поставщиков" })
  async listTopCategories() {
    return this.admin.listTopCategories();
  }

  // ——— Блок 3: посредники ———

  @Get("mediator-users")
  @ApiOperation({ summary: "Все пользователи-посредники (включая без профиля)" })
  async listMediatorUsers(
    @Query("status") status?: string,
    @Query("search") search?: string,
    @Query("page") page?: string,
    @Query("limit") limit?: string,
  ) {
    return this.admin.listMediatorUsers(
      status,
      search,
      page ? Number(page) : 1,
      limit ? Number(limit) : 50,
    );
  }

  @Get("mediators")
  @ApiOperation({ summary: "Список посредников" })
  async listMediators(
    @Query("status") status?: string,
    @Query("page") page?: string,
    @Query("limit") limit?: string,
  ) {
    return this.admin.listMediators(
      status,
      page ? Number(page) : 1,
      limit ? Number(limit) : 20,
    );
  }

  @Get("mediators/:id")
  @ApiOperation({ summary: "Детали посредника" })
  async getMediator(@Param("id", new ParseUUIDPipe()) id: string) {
    return this.admin.getMediator(id);
  }

  @Post("mediators/:id/approve")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Одобрить посредника" })
  async approveMediator(@Param("id", new ParseUUIDPipe()) id: string) {
    return this.admin.approveMediator(id);
  }

  @Post("mediators/:id/reject")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Отклонить посредника" })
  async rejectMediator(
    @Param("id", new ParseUUIDPipe()) id: string,
    @Body() dto: { reason: string },
  ) {
    return this.admin.rejectMediator(id, dto.reason);
  }

  @Post("mediators/:id/revision")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Запросить доработку у посредника" })
  async mediatorRevision(
    @Param("id", new ParseUUIDPipe()) id: string,
    @Body() dto: { reason: string },
  ) {
    return this.admin.requestMediatorRevision(id, dto.reason);
  }

  @Patch("mediators/:id")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Обновить данные посредника (ставка, мин. заказ и т.д.)" })
  async updateMediator(
    @Param("id", new ParseUUIDPipe()) id: string,
    @Body() dto: { commissionRate?: number; minOrderAmount?: number; accountExpiresAt?: string | null },
  ) {
    return this.admin.updateMediator(id, dto);
  }

  @Post("mediators/:id/change-requests/:requestId/approve")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Одобрить запрос на изменение данных посредника" })
  async approveChangeRequest(
    @Param("id", new ParseUUIDPipe()) id: string,
    @Param("requestId", new ParseUUIDPipe()) requestId: string,
  ) {
    return this.admin.processChangeRequest(requestId, "approved");
  }

  @Post("mediators/:id/change-requests/:requestId/reject")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Отклонить запрос на изменение данных посредника" })
  async rejectChangeRequest(
    @Param("id", new ParseUUIDPipe()) id: string,
    @Param("requestId", new ParseUUIDPipe()) requestId: string,
  ) {
    return this.admin.processChangeRequest(requestId, "rejected");
  }

  @Get("mediators/by-user/:userId")
  @ApiOperation({ summary: "Профиль посредника по userId" })
  async getMediatorByUserId(@Param("userId", new ParseUUIDPipe()) userId: string) {
    return this.admin.getMediatorByUserId(userId);
  }

  @Patch("suppliers/:id/profile")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Обновить данные профиля поставщика" })
  async updateSupplierProfile(
    @Param("id", new ParseUUIDPipe()) id: string,
    @Body() dto: {
      firstName?: string;
      lastName?: string;
      middleName?: string | null;
      pavilionNumber?: string;
      locationId?: string;
      entityType?: string;
      inn?: string | null;
      ogrnip?: string | null;
      categoryIds?: string[];
    },
  ) {
    return this.admin.updateSupplierProfile(id, dto);
  }

  @Patch("users/:userId/data")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Обновить личные данные пользователя" })
  async updateUserData(
    @Param("userId", new ParseUUIDPipe()) userId: string,
    @Body() dto: {
      firstName?: string;
      lastName?: string;
      middleName?: string | null;
      phone?: string | null;
      email?: string;
    },
  ) {
    return this.admin.updateUserData(userId, dto);
  }

  @Post("users/:userId/block")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Заблокировать пользователя" })
  async blockUser(@Param("userId", new ParseUUIDPipe()) userId: string) {
    return this.admin.blockUser(userId);
  }

  @Post("users/:userId/unblock")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Разблокировать пользователя" })
  async unblockUser(@Param("userId", new ParseUUIDPipe()) userId: string) {
    return this.admin.unblockUser(userId);
  }

  @Delete("users/:userId")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Удалить пользователя" })
  async deleteUser(@Param("userId", new ParseUUIDPipe()) userId: string) {
    return this.admin.deleteUser(userId);
  }

  @Get("category-ai-settings")
  @ApiOperation({ summary: "Настройки AI-матчинга категорий" })
  async getCategoryAiSettings() {
    return this.categoryAi.getSettings();
  }

  @Patch("category-ai-settings")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Обновить настройки AI-матчинга категорий" })
  async updateCategoryAiSettings(
    @Body() dto: {
      apiKey?: string | null;
      apiBaseUrl?: string;
      model?: string;
      threshold?: number;
      enabled?: boolean;
      systemPrompt?: string | null;
    },
  ) {
    return this.categoryAi.updateSettings(dto);
  }

  // ── Categories CRUD ────────────────────────────────────────────────────────

  @Get("categories")
  @ApiOperation({ summary: "Список всех категорий" })
  async listCategories() {
    return this.categories.adminList();
  }

  @Post("categories")
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: "Создать корневую категорию" })
  async createCategory(@Body() dto: { name: string; icon?: string }) {
    return this.categories.adminCreate({ name: dto.name, icon: dto.icon });
  }

  @Post("categories/:parentId/sub")
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: "Создать под-категорию" })
  async createSubCategory(
    @Param("parentId") parentId: string,
    @Body() dto: { name: string; icon?: string },
  ) {
    return this.categories.adminCreate({ name: dto.name, icon: dto.icon, parentId });
  }

  @Delete("categories/:id")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Удалить категорию" })
  async deleteCategory(@Param("id") id: string) {
    return this.categories.adminDelete(id);
  }

  @Post("categories/seed")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Добавить отсутствующие базовые категории" })
  async seedCategories() {
    return this.categories.seedDefaults();
  }
}
