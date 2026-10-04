import { Injectable, Logger } from "@nestjs/common";
import { Cron, CronExpression } from "@nestjs/schedule";
import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class SupportTimeoutCron {
  private readonly logger = new Logger(SupportTimeoutCron.name);

  constructor(private readonly prisma: PrismaService) {}

  @Cron(CronExpression.EVERY_10_MINUTES)
  async closeStaleWaitingAdminTickets() {
    const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000);

    const stale = await this.prisma.supportTicket.findMany({
      where: { status: "WAITING_ADMIN", lastMessageAt: { lt: cutoff } },
      select: { id: true },
    });

    if (stale.length === 0) return;

    for (const ticket of stale) {
      await this.prisma.$transaction([
        this.prisma.supportMessage.create({
          data: {
            ticketId: ticket.id,
            sender: "SYSTEM",
            text: "Чат закрыт автоматически: превышено время ожидания (24 ч)",
          },
        }),
        this.prisma.supportTicket.update({
          where: { id: ticket.id },
          data: { status: "CLOSED", closedAt: new Date(), lastMessageAt: new Date() },
        }),
      ]);
    }

    this.logger.log(`Auto-closed ${stale.length} stale WAITING_ADMIN tickets`);
  }
}
