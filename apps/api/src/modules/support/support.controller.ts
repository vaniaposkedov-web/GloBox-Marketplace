import {
  Body,
  Controller,
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
import { CurrentUser } from "../auth/current-user.decorator";
import type { AccessTokenPayload } from "../auth/tokens.service";
import { SupportService } from "./support.service";
import { AiBotService } from "./ai-bot.service";

// ========== Пользовательские маршруты (SUPPLIER / MEDIATOR) ==========

@ApiTags("support")
@ApiBearerAuth()
@Controller("support")
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles("SUPPLIER", "MEDIATOR")
export class SupportController {
  constructor(private readonly support: SupportService) {}

  @Post("tickets")
  @ApiOperation({ summary: "Создать тикет" })
  async create(
    @CurrentUser() user: AccessTokenPayload,
    @Body() dto: { subject: string; message: string; attachments?: string[] },
  ) {
    return this.support.createTicket(user.sub, user.role, dto);
  }

  @Get("tickets")
  @ApiOperation({ summary: "Мои тикеты" })
  async myTickets(
    @CurrentUser() user: AccessTokenPayload,
    @Query("page") page?: string,
    @Query("limit") limit?: string,
  ) {
    return this.support.myTickets(user.sub, page ? Number(page) : 1, limit ? Number(limit) : 20);
  }

  @Get("tickets/:id")
  @ApiOperation({ summary: "Тикет с сообщениями" })
  async getTicket(
    @CurrentUser() user: AccessTokenPayload,
    @Param("id", new ParseUUIDPipe()) id: string,
  ) {
    return this.support.getTicket(id, user.sub, user.role);
  }

  @Post("tickets/:id/messages")
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: "Отправить сообщение" })
  async postMessage(
    @CurrentUser() user: AccessTokenPayload,
    @Param("id", new ParseUUIDPipe()) id: string,
    @Body() dto: { text: string; attachments?: string[] },
  ) {
    return this.support.postMessage(id, user.sub, dto);
  }

  @Post("tickets/:id/close")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Закрыть тикет" })
  async closeTicket(
    @CurrentUser() user: AccessTokenPayload,
    @Param("id", new ParseUUIDPipe()) id: string,
  ) {
    return this.support.closeTicket(id, user.sub, user.role);
  }

  // ——— Single-chat (мессенджер) ———

  @Get("chat")
  @ApiOperation({ summary: "Получить или создать активный чат" })
  async getChat(@CurrentUser() user: AccessTokenPayload) {
    return this.support.getOrCreateChat(user.sub, user.role);
  }

  @Post("chat/send")
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: "Отправить сообщение в чат" })
  async chatSend(
    @CurrentUser() user: AccessTokenPayload,
    @Body() dto: { text: string },
  ) {
    return this.support.chatSendMessage(user.sub, dto.text);
  }

  @Post("chat/close")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Закрыть чат" })
  async chatClose(@CurrentUser() user: AccessTokenPayload) {
    return this.support.chatClose(user.sub);
  }

  @Post("chat/new")
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: "Начать новый чат" })
  async chatNew(@CurrentUser() user: AccessTokenPayload) {
    return this.support.chatStartNew(user.sub, user.role);
  }
}

// ========== Админские маршруты ==========

@ApiTags("admin/support")
@ApiBearerAuth()
@Controller("admin/support")
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles("ADMIN")
export class AdminSupportController {
  constructor(
    private readonly support: SupportService,
    private readonly aiBot: AiBotService,
  ) {}

  @Get("tickets")
  @ApiOperation({ summary: "Все тикеты (с фильтрами)" })
  async list(
    @Query("status") status?: string,
    @Query("role") role?: string,
    @Query("page") page?: string,
    @Query("limit") limit?: string,
  ) {
    return this.support.adminListTickets({
      status: status as any,
      role: role as any,
      page: page ? Number(page) : 1,
      limit: limit ? Number(limit) : 20,
    });
  }

  @Get("tickets/:id")
  @ApiOperation({ summary: "Тикет с сообщениями (admin)" })
  async getTicket(
    @CurrentUser() user: AccessTokenPayload,
    @Param("id", new ParseUUIDPipe()) id: string,
  ) {
    return this.support.getTicket(id, user.sub, user.role);
  }

  @Post("tickets/:id/reply")
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: "Ответить на тикет" })
  async reply(
    @CurrentUser() user: AccessTokenPayload,
    @Param("id", new ParseUUIDPipe()) id: string,
    @Body() dto: { text: string; attachments?: string[] },
  ) {
    return this.support.adminReply(id, user.sub, dto);
  }

  @Post("tickets/:id/close")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Закрыть тикет (admin)" })
  async closeTicket(
    @CurrentUser() user: AccessTokenPayload,
    @Param("id", new ParseUUIDPipe()) id: string,
  ) {
    return this.support.closeTicket(id, user.sub, user.role);
  }

  @Post("tickets/:id/enable-bot")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Включить AI-бота обратно (убрать метку 'админ подключён')" })
  async enableBot(@Param("id", new ParseUUIDPipe()) id: string) {
    return this.support.adminEnableBot(id);
  }

  @Get("unread-count")
  @ApiOperation({ summary: "Количество тикетов, ожидающих ответа" })
  async unreadCount() {
    return this.support.adminUnreadCount();
  }

  // ——— Bot Settings (role-based: mediator | supplier | buyer) ———

  @Get("bot-settings")
  @ApiOperation({ summary: "Получить настройки AI-бота (по роли)" })
  async getBotSettings(@Query("role") role?: string) {
    return this.aiBot.getSettings(role);
  }

  @Patch("bot-settings")
  @ApiOperation({ summary: "Обновить настройки AI-бота (по роли)" })
  async updateBotSettings(
    @Query("role") role: string | undefined,
    @Body() dto: {
      apiKey?: string;
      apiBaseUrl?: string;
      model?: string;
      systemPrompt?: string;
      temperature?: number;
      maxTokens?: number;
      enabled?: boolean;
    },
  ) {
    return this.aiBot.updateSettings(role, dto);
  }
}
