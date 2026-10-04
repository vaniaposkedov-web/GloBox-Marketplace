import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { TokensService, type AccessTokenPayload } from "./tokens.service";
import { IS_PUBLIC_KEY } from "./public.decorator";

/** Минимальный тип request — не зависим от пакета fastify в импортах guard. */
export interface AuthenticatedRequest {
  headers: Record<string, string | string[] | undefined>;
  user?: AccessTokenPayload;
}

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly tokens: TokensService,
    private readonly reflector: Reflector,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;

    const req = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const raw = req.headers["authorization"];
    const header = Array.isArray(raw) ? raw[0] : raw;
    if (!header || !header.startsWith("Bearer ")) {
      throw new UnauthorizedException("Требуется авторизация");
    }
    const token = header.slice("Bearer ".length).trim();
    try {
      req.user = await this.tokens.verifyAccessToken(token);
      return true;
    } catch {
      throw new UnauthorizedException("Сессия истекла, войдите снова");
    }
  }
}
