import { Module } from "@nestjs/common";
import { JwtModule } from "@nestjs/jwt";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { AuthController } from "./auth.controller";
import { AuthService } from "./auth.service";
import { EmailCodeService } from "./email-code.service";
import { SmsCodeService } from "./sms-code.service";
import { VkOAuthService } from "./vk-oauth.service";
import { MaxAuthService } from "./telegram-auth.service";
import { MailService } from "../mail/mail.service";
import { SmsSenderService } from "../sms/sms-sender.service";
import { TokensService } from "./tokens.service";
import { JwtAuthGuard } from "./jwt-auth.guard";
import { RolesGuard } from "./roles.guard";

@Module({
  imports: [
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (cfg: ConfigService) => ({
        secret: cfg.get<string>("JWT_SECRET") ?? "dev_secret_change_me",
        signOptions: {
          expiresIn: cfg.get<string>("JWT_ACCESS_TTL") ?? "30d",
        },
      }),
    }),
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    EmailCodeService,
    SmsCodeService,
    VkOAuthService,
    MaxAuthService,
    MailService,
    SmsSenderService,
    TokensService,
    JwtAuthGuard,
    RolesGuard,
  ],
  exports: [AuthService, TokensService, JwtAuthGuard, RolesGuard, EmailCodeService, SmsCodeService, MailService, SmsSenderService],
})
export class AuthModule {}
