import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module";
import { SupportService } from "./support.service";
import { AiBotService } from "./ai-bot.service";
import { SupportController, AdminSupportController } from "./support.controller";
import { SupportTimeoutCron } from "./support-timeout.cron";

@Module({
  imports: [AuthModule],
  controllers: [SupportController, AdminSupportController],
  providers: [SupportService, AiBotService, SupportTimeoutCron],
})
export class SupportModule {}
