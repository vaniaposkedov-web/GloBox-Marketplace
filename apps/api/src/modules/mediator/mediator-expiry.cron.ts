import { Injectable, Logger } from "@nestjs/common";
import { Cron, CronExpression } from "@nestjs/schedule";
import { PrismaService } from "../prisma/prisma.service";
import { NotificationService } from "../notifications/notification.service";

@Injectable()
export class MediatorExpiryCron {
  private readonly logger = new Logger(MediatorExpiryCron.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationService,
  ) {}

  /** Runs every hour: check for upcoming expirations and freeze expired accounts */
  @Cron(CronExpression.EVERY_HOUR)
  async handleExpiryChecks() {
    const now = new Date();
    const in7d = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    const in3d = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);
    const in1d = new Date(now.getTime() + 1 * 24 * 60 * 60 * 1000);

    // 1. Freeze expired accounts
    const expired = await this.prisma.mediatorProfile.findMany({
      where: {
        status: "APPROVED",
        accountExpiresAt: { lte: now },
      },
    });

    for (const m of expired) {
      await this.prisma.mediatorProfile.update({
        where: { id: m.id },
        data: { status: "FROZEN" },
      });
      this.notifications
        .notify(
          m.userId,
          "❄️ Ваш аккаунт заморожен!\n\nСрок действия пропуска истёк. Обновите данные пропуска и отправьте заявку повторно, чтобы продолжить работу.",
        )
        .catch(() => {});
      this.logger.log(`Frozen mediator ${m.id} (user ${m.userId}) — pass expired`);
    }

    // 2. Notify 1 day before
    const notify1d = await this.prisma.mediatorProfile.findMany({
      where: {
        status: "APPROVED",
        accountExpiresAt: { lte: in1d, gt: now },
        expiryNotified1d: false,
      },
    });
    for (const m of notify1d) {
      await this.prisma.mediatorProfile.update({
        where: { id: m.id },
        data: { expiryNotified1d: true },
      });
      this.notifications
        .notify(
          m.userId,
          "⚠️ Срок действия пропуска истекает сегодня!\n\nОбновите фото пропуска в личном кабинете прямо сейчас, иначе аккаунт будет заморожен.",
        )
        .catch(() => {});
    }

    // 3. Notify 3 days before
    const notify3d = await this.prisma.mediatorProfile.findMany({
      where: {
        status: "APPROVED",
        accountExpiresAt: { lte: in3d, gt: in1d },
        expiryNotified3d: false,
      },
    });
    for (const m of notify3d) {
      await this.prisma.mediatorProfile.update({
        where: { id: m.id },
        data: { expiryNotified3d: true },
      });
      this.notifications
        .notify(
          m.userId,
          "📋 Срок действия пропуска истекает через 3 дня.\n\nПожалуйста, подготовьте обновлённый пропуск и загрузите фото в разделе «Документы».",
        )
        .catch(() => {});
    }

    // 4. Notify 7 days before
    const notify7d = await this.prisma.mediatorProfile.findMany({
      where: {
        status: "APPROVED",
        accountExpiresAt: { lte: in7d, gt: in3d },
        expiryNotified7d: false,
      },
    });
    for (const m of notify7d) {
      await this.prisma.mediatorProfile.update({
        where: { id: m.id },
        data: { expiryNotified7d: true },
      });
      this.notifications
        .notify(
          m.userId,
          "📅 Напоминание: срок действия пропуска истекает через 7 дней.\n\nОбновите фото пропуска заранее, чтобы избежать заморозки аккаунта.",
        )
        .catch(() => {});
    }

    const total = expired.length + notify1d.length + notify3d.length + notify7d.length;
    if (total > 0) {
      this.logger.log(
        `Expiry check: frozen=${expired.length}, notified1d=${notify1d.length}, notified3d=${notify3d.length}, notified7d=${notify7d.length}`,
      );
    }
  }
}
