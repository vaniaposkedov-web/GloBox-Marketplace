import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  UseGuards,
  UsePipes,
} from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import { Throttle } from "@nestjs/throttler";
import {
  completeEmailRegistrationSchema,
  loginEmailRequestCodeSchema,
  loginPhoneRequestCodeSchema,
  loginWithEmailCodeSchema,
  loginWithEmailSchema,
  loginWithPhoneCodeSchema,
  passwordResetCompleteSchema,
  passwordResetRequestSchema,
  passwordResetVerifySchema,
  registerEmailRequestSchema,
  registerPhoneRequestCodeSchema,
  registerWithPhoneSchema,
  updateProfileSchema,
  verifyEmailCodeSchema,
  type CompleteEmailRegistration,
  type LoginEmailRequestCode,
  type LoginPhoneRequestCode,
  type LoginWithEmail,
  type LoginWithEmailCode,
  type LoginWithPhoneCode,
  type PasswordResetComplete,
  type PasswordResetRequest,
  type PasswordResetVerify,
  type RegisterEmailRequest,
  type RegisterPhoneRequestCode,
  type RegisterWithPhone,
  type UpdateProfile,
  type VerifyEmailCode,
} from "@marketplace/shared";
import { ZodValidationPipe } from "../../common/zod-validation.pipe";
import { AuthService } from "./auth.service";
import { VkOAuthService } from "./vk-oauth.service";
import { MaxAuthService } from "./telegram-auth.service";
import { JwtAuthGuard } from "./jwt-auth.guard";
import { CurrentUser } from "./current-user.decorator";
import type { AccessTokenPayload } from "./tokens.service";

@ApiTags("auth")
@Controller("auth")
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly vkOAuth: VkOAuthService,
    private readonly maxAuth: MaxAuthService,
  ) {}

  /**
   * 1.2.2 шаг 1: пользователь вводит email → проверка whitelist, отправка 6-значного кода.
   * Rate-limit (1.5.1): не более 5 попыток регистрации за час с одного IP.
   */
  @Post("register/email")
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 5, ttl: 3_600_000 } })
  @ApiOperation({ summary: "Запросить код подтверждения на email" })
  @UsePipes(new ZodValidationPipe(registerEmailRequestSchema))
  async requestEmailCode(
    @Body() dto: RegisterEmailRequest,
  ): Promise<{ ok: true; devCode?: string }> {
    return this.authService.requestEmailRegistrationCode(dto);
  }

  /**
   * 1.2.2 шаг 2: пользователь вводит 6-значный код.
   * 15 минут срок, 3 попытки.
   */
  @Post("register/verify")
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 10, ttl: 3_600_000 } })
  @ApiOperation({ summary: "Проверить код подтверждения email" })
  @UsePipes(new ZodValidationPipe(verifyEmailCodeSchema))
  async verifyEmailCode(
    @Body() dto: VerifyEmailCode,
  ): Promise<{ ok: true; attemptsLeft?: number }> {
    return this.authService.verifyEmailRegistrationCode(dto);
  }

  /**
   * 1.2.2 шаг 3: пользователь вводит пароль, ФИО и телефон → регистрация завершена.
   * На этом шаге анти-фрод валидация телефона (1.4.2). SMS НЕ шлётся (1.4.3 — гибрид).
   */
  @Post("register/complete")
  @HttpCode(HttpStatus.CREATED)
  @Throttle({ default: { limit: 5, ttl: 3_600_000 } })
  @ApiOperation({ summary: "Завершить регистрацию: пароль + телефон" })
  @UsePipes(new ZodValidationPipe(completeEmailRegistrationSchema))
  async completeRegistration(
    @Body() dto: CompleteEmailRegistration,
  ): Promise<{ accessToken: string; userId: string }> {
    return this.authService.completeEmailRegistration(dto);
  }

  /**
   * Вход по email + пароль.
   */
  @Post("login/email")
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 10, ttl: 3_600_000 } })
  @ApiOperation({ summary: "Вход по email и паролю" })
  @UsePipes(new ZodValidationPipe(loginWithEmailSchema))
  async loginEmail(
    @Body() dto: LoginWithEmail,
  ): Promise<{ accessToken: string; userId: string }> {
    return this.authService.loginWithEmail(dto);
  }

  /**
   * Текущий пользователь (по JWT). Используется фронтом для гидрации сессии
   * после перезагрузки страницы или при заходе с новой вкладки.
   */
  @Get("me")
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Профиль текущего пользователя" })
  async me(@CurrentUser() user: AccessTokenPayload) {
    return this.authService.getProfile(user.sub);
  }

  @Patch("me")
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Обновить профиль" })
  async updateMe(
    @CurrentUser() user: AccessTokenPayload,
    @Body(new ZodValidationPipe(updateProfileSchema)) dto: UpdateProfile,
  ) {
    return this.authService.updateProfile(user.sub, dto);
  }

  // ——— Регистрация по телефону ———

  @Post("register/phone/request-code")
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 5, ttl: 3_600_000 } })
  @ApiOperation({ summary: "Запросить SMS-код для регистрации по телефону" })
  @UsePipes(new ZodValidationPipe(registerPhoneRequestCodeSchema))
  async registerPhoneRequestCode(
    @Body() dto: RegisterPhoneRequestCode,
  ): Promise<{ ok: true; devCode?: string; maskedPhone: string }> {
    return this.authService.requestPhoneRegistrationCode(dto);
  }

  @Post("register/phone/complete")
  @HttpCode(HttpStatus.CREATED)
  @Throttle({ default: { limit: 5, ttl: 3_600_000 } })
  @ApiOperation({ summary: "Завершить регистрацию по телефону" })
  @UsePipes(new ZodValidationPipe(registerWithPhoneSchema))
  async registerWithPhone(
    @Body() dto: RegisterWithPhone,
  ): Promise<{ accessToken: string; userId: string }> {
    return this.authService.registerWithPhone(dto);
  }

  // ——— Вход по телефону с SMS-кодом ———

  @Post("login/phone/request-code")
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 5, ttl: 3_600_000 } })
  @ApiOperation({ summary: "Запросить SMS-код для входа по телефону" })
  @UsePipes(new ZodValidationPipe(loginPhoneRequestCodeSchema))
  async loginPhoneRequestCode(
    @Body() dto: LoginPhoneRequestCode,
  ): Promise<{ ok: true; devCode?: string; maskedPhone: string }> {
    return this.authService.requestLoginPhoneCode(dto);
  }

  @Post("login/phone/verify")
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 10, ttl: 3_600_000 } })
  @ApiOperation({ summary: "Вход по телефону + SMS-код" })
  @UsePipes(new ZodValidationPipe(loginWithPhoneCodeSchema))
  async loginWithPhoneCode(
    @Body() dto: LoginWithPhoneCode,
  ): Promise<{ accessToken: string; userId: string }> {
    return this.authService.loginWithPhoneCode(dto);
  }

  // ——— Вход по email с кодом ———

  @Post("login/email/request-code")
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 5, ttl: 3_600_000 } })
  @ApiOperation({ summary: "Запросить код для входа на email" })
  @UsePipes(new ZodValidationPipe(loginEmailRequestCodeSchema))
  async loginEmailRequestCode(
    @Body() dto: LoginEmailRequestCode,
  ): Promise<{ ok: true; devCode?: string }> {
    return this.authService.requestLoginEmailCode(dto);
  }

  @Post("login/email/verify")
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 10, ttl: 3_600_000 } })
  @ApiOperation({ summary: "Вход по email + код" })
  @UsePipes(new ZodValidationPipe(loginWithEmailCodeSchema))
  async loginWithEmailCode(
    @Body() dto: LoginWithEmailCode,
  ): Promise<{ accessToken: string; userId: string }> {
    return this.authService.loginWithEmailCode(dto);
  }

  // ——— 1.5.2 Восстановление пароля ———

  @Post("password-reset/request")
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 5, ttl: 3_600_000 } })
  @ApiOperation({ summary: "Запросить код сброса пароля" })
  @UsePipes(new ZodValidationPipe(passwordResetRequestSchema))
  async passwordResetRequest(
    @Body() dto: PasswordResetRequest,
  ): Promise<{ ok: true; devCode?: string }> {
    return this.authService.requestPasswordReset(dto);
  }

  @Post("password-reset/verify")
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 10, ttl: 3_600_000 } })
  @ApiOperation({ summary: "Проверить код сброса пароля" })
  @UsePipes(new ZodValidationPipe(passwordResetVerifySchema))
  async passwordResetVerify(
    @Body() dto: PasswordResetVerify,
  ): Promise<{ ok: true; attemptsLeft?: number }> {
    return this.authService.verifyPasswordResetCode(dto);
  }

  @Post("password-reset/complete")
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 5, ttl: 3_600_000 } })
  @ApiOperation({ summary: "Сбросить пароль и войти" })
  @UsePipes(new ZodValidationPipe(passwordResetCompleteSchema))
  async passwordResetComplete(
    @Body() dto: PasswordResetComplete,
  ): Promise<{ accessToken: string; userId: string }> {
    return this.authService.completePasswordReset(dto);
  }

  // ——— VK OAuth ———

  @Get("vk/auth-url")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Получить URL для авторизации через VK" })
  getVkAuthUrl(): { url: string } {
    const state = Math.random().toString(36).slice(2);
    return { url: this.vkOAuth.getAuthUrl(state) };
  }

  @Post("vk/callback")
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 10, ttl: 3_600_000 } })
  @ApiOperation({ summary: "Обменять VK code на JWT токен" })
  async vkCallback(
    @Body() body: { code: string; state?: string; device_id?: string },
  ): Promise<{ accessToken: string; userId: string }> {
    return this.vkOAuth.handleCallback(body.code, body.state ?? "", body.device_id ?? "");
  }

  // ——— MAX (max.ru) ———

  @Post("max/start")
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 10, ttl: 3_600_000 } })
  @ApiOperation({ summary: "Начать сессию авторизации через MAX" })
  maxStart(): { sessionId: string; botLink: string } {
    return this.maxAuth.startSession();
  }

  @Post("max/bot-callback")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Webhook от MAX бота" })
  async maxBotCallback(@Body() update: any): Promise<{ ok: true }> {
    await this.maxAuth.handleWebhook(update);
    return { ok: true };
  }

  @Get("max/status/:sessionId")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Проверить статус MAX авторизации" })
  maxStatus(
    @Param("sessionId") sessionId: string,
  ): { ready: false } | { ready: true; accessToken: string; userId: string } {
    return this.maxAuth.checkStatus(sessionId);
  }
}
