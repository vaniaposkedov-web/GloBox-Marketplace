import { Module } from "@nestjs/common";
import { MediatorController } from "./mediator.controller";
import { MediatorService } from "./mediator.service";
import { MediatorExpiryCron } from "./mediator-expiry.cron";
import { AuthModule } from "../auth/auth.module";

@Module({
  imports: [AuthModule],
  controllers: [MediatorController],
  providers: [MediatorService, MediatorExpiryCron],
  exports: [MediatorService],
})
export class MediatorModule {}
