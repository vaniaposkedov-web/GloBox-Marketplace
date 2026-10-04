import { Injectable } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import type { UserRole } from "@prisma/client";

export interface AccessTokenPayload {
  sub: string;
  role: UserRole;
}

@Injectable()
export class TokensService {
  constructor(private readonly jwt: JwtService) {}

  async signAccessToken(userId: string, role: UserRole): Promise<string> {
    const payload: AccessTokenPayload = { sub: userId, role };
    return this.jwt.signAsync(payload);
  }

  async verifyAccessToken(token: string): Promise<AccessTokenPayload> {
    return this.jwt.verifyAsync<AccessTokenPayload>(token);
  }
}
