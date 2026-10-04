import { createParamDecorator, ExecutionContext } from "@nestjs/common";
import type { AuthenticatedRequest } from "./jwt-auth.guard";
import type { AccessTokenPayload } from "./tokens.service";

export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): AccessTokenPayload => {
    const req = ctx.switchToHttp().getRequest<AuthenticatedRequest>();
    if (!req.user) {
      // До этого декоратора должен отработать JwtAuthGuard
      throw new Error("CurrentUser использован без JwtAuthGuard");
    }
    return req.user;
  },
);
