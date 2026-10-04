import { Global, Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module";
import { NotificationController } from "./notification.controller";
import { NotificationService } from "./notification.service";
import { TelegramNotifyService } from "./telegram-notify.service";
import { VkNotifyService } from "./vk-notify.service";
import { MaxNotifyService } from "./max-notify.service";

@Global()
@Module({
  imports: [AuthModule],
  controllers: [NotificationController],
  providers: [
    NotificationService,
    TelegramNotifyService,
    VkNotifyService,
    MaxNotifyService,
  ],
  exports: [NotificationService],
})
export class NotificationModule {}
