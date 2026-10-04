import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  Body,
  UseGuards,
  HttpCode,
  HttpStatus,
  Header,
} from "@nestjs/common";
import {
  ApiBearerAuth,
  ApiOperation,
  ApiTags,
} from "@nestjs/swagger";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { CurrentUser } from "../auth/current-user.decorator";
import { AccessTokenPayload } from "../auth/tokens.service";
import { NotificationService } from "./notification.service";

@ApiTags("Уведомления")
@Controller("notifications")
export class NotificationController {
  constructor(private readonly notify: NotificationService) {}

  // ——— Пользовательские эндпоинты (требуют JWT) ———

  @Get("my")
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Мои подписки на уведомления" })
  async mySubscriptions(@CurrentUser() user: AccessTokenPayload) {
    return this.notify.getSubscriptions(user.sub);
  }

  @Post("link/:channel")
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: "Начать привязку канала уведомлений (TELEGRAM | VK | MAX)",
  })
  async startLink(
    @CurrentUser() user: AccessTokenPayload,
    @Param("channel") channel: "TELEGRAM" | "VK" | "MAX",
  ) {
    return this.notify.startLink(user.sub, channel);
  }

  @Delete(":channel")
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Отключить канал уведомлений" })
  async unsubscribe(
    @CurrentUser() user: AccessTokenPayload,
    @Param("channel") channel: "TELEGRAM" | "VK" | "MAX",
  ) {
    await this.notify.unsubscribe(user.sub, channel);
    return { ok: true };
  }

  @Post("setup-webhooks")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Зарегистрировать webhook у Telegram и MAX ботов (вызывается однократно при настройке)" })
  async setupWebhooks() {
    const base = process.env.PUBLIC_URL ?? "https://glo-box.ru";
    const results: Record<string, unknown> = {};
    results.telegram = await this.notify["telegram"].setWebhook(`${base}/api/notifications/webhook/telegram`);
    results.max = await this.notify["max"].setWebhook(`${base}/api/notifications/webhook/max`);
    return { ok: true, results, vkWebhookUrl: `${base}/api/notifications/webhook/vk` };
  }

  // ——— Webhook эндпоинты (без авторизации) ———

  @Post("webhook/telegram")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Telegram Bot webhook" })
  async telegramWebhook(@Body() update: any) {
    await this.notify.handleTelegramWebhook(update);
    return { ok: true };
  }

  @Post("webhook/vk")
  @HttpCode(HttpStatus.OK)
  @Header("Content-Type", "text/plain")
  @ApiOperation({ summary: "VK Callback API" })
  async vkCallback(@Body() body: any): Promise<string> {
    return this.notify.handleVkCallback(body);
  }

  @Post("webhook/max")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Max Bot webhook" })
  async maxWebhook(@Body() update: any) {
    await this.notify.handleMaxWebhook(update);
    return { ok: true };
  }
}
