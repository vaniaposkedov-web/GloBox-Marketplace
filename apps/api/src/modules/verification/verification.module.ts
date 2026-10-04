import { Global, Module } from "@nestjs/common";
import { MaxVerificationService } from "./max-verification.service";
import { SmsSenderService } from "../sms/sms-sender.service";

@Global()
@Module({
  providers: [MaxVerificationService, SmsSenderService],
  exports: [MaxVerificationService],
})
export class VerificationModule {}
