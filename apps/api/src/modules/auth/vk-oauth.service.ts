import {
  Injectable,
  BadRequestException,
  UnauthorizedException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { createHash, randomBytes } from "crypto";
import { PrismaService } from "../prisma/prisma.service";
import { TokensService } from "./tokens.service";

export interface VkIdTokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
  user_id: number;
  id_token?: string;
  scope?: string;
}

export interface VkIdUserInfo {
  user_id: string;
  first_name: string;
  last_name: string;
  avatar?: string;
  email?: string;
  phone?: string;
}

@Injectable()
export class VkOAuthService {
  private readonly clientId: string;
  private readonly clientSecret: string;
  private readonly redirectUri: string;
  /** In-memory PKCE store: state → code_verifier (TTL ~10 min) */
  private readonly pkceStore = new Map<string, { verifier: string; ts: number }>();

  constructor(
    private readonly config: ConfigService,
    private readonly prisma: PrismaService,
    private readonly tokens: TokensService,
  ) {
    this.clientId = this.config.get<string>("VK_CLIENT_ID") ?? "";
    this.clientSecret = this.config.get<string>("VK_CLIENT_SECRET") ?? "";
    this.redirectUri = this.config.get<string>("VK_REDIRECT_URI") ?? "";
    // Cleanup old PKCE entries every 5 min
    setInterval(() => this.cleanupPkce(), 5 * 60_000);
  }

  private cleanupPkce() {
    const now = Date.now();
    for (const [key, val] of this.pkceStore) {
      if (now - val.ts > 10 * 60_000) this.pkceStore.delete(key);
    }
  }

  private generateCodeVerifier(): string {
    return randomBytes(32).toString("base64url");
  }

  private generateCodeChallenge(verifier: string): string {
    return createHash("sha256").update(verifier).digest("base64url");
  }

  /** Генерирует URL для редиректа на VK ID OAuth */
  getAuthUrl(state: string): string {
    const codeVerifier = this.generateCodeVerifier();
    const codeChallenge = this.generateCodeChallenge(codeVerifier);
    this.pkceStore.set(state, { verifier: codeVerifier, ts: Date.now() });

    const params = new URLSearchParams({
      response_type: "code",
      client_id: this.clientId,
      redirect_uri: this.redirectUri,
      state,
      code_challenge: codeChallenge,
      code_challenge_method: "S256",
      scope: "vkid.personal_info email",
    });
    return `https://id.vk.com/authorize?${params.toString()}`;
  }

  /** Обменивает code на access_token и профиль, создаёт/находит юзера, выдаёт JWT */
  async handleCallback(
    code: string,
    state: string,
    deviceId: string,
  ): Promise<{ accessToken: string; userId: string }> {
    if (!this.clientId || !this.clientSecret) {
      throw new BadRequestException(
        "VK OAuth не настроен. Укажите VK_CLIENT_ID и VK_CLIENT_SECRET в .env",
      );
    }

    // 1. Retrieve PKCE verifier
    const pkceEntry = this.pkceStore.get(state);
    if (!pkceEntry) {
      throw new BadRequestException("Invalid or expired state parameter");
    }
    this.pkceStore.delete(state);

    // 2. Exchange code → access_token via VK ID
    const tokenData = await this.exchangeCode(code, pkceEntry.verifier, deviceId);

    // 3. Get user profile via VK ID
    const profile = await this.fetchUserInfo(tokenData.access_token);

    // 4. Find or create user
    const vkId = String(profile.user_id);
    let user = await this.prisma.user.findUnique({ where: { vkId } });

    if (!user) {
      if (profile.email) {
        const byEmail = await this.prisma.user.findUnique({
          where: { email: profile.email },
        });
        if (byEmail) {
          user = await this.prisma.user.update({
            where: { id: byEmail.id },
            data: {
              vkId,
              avatarUrl: byEmail.avatarUrl ?? profile.avatar ?? null,
              lastLoginAt: new Date(),
            },
          });
        }
      }

      if (!user) {
        user = await this.prisma.user.create({
          data: {
            vkId,
            email: profile.email ?? null,
            emailVerified: !!profile.email,
            firstName: profile.first_name,
            lastName: profile.last_name,
            avatarUrl: profile.avatar ?? null,
            role: "BUYER",
            roles: ["BUYER"],
            lastLoginAt: new Date(),
          },
        });
      }
    } else {
      await this.prisma.user.update({
        where: { id: user.id },
        data: { lastLoginAt: new Date() },
      });
    }

    const accessToken = await this.tokens.signAccessToken(user.id, user.role);
    return { accessToken, userId: user.id };
  }

  /** Exchange authorization code → access_token via VK ID */
  private async exchangeCode(code: string, codeVerifier: string, deviceId: string): Promise<VkIdTokenResponse> {
    const body = new URLSearchParams({
      grant_type: "authorization_code",
      code,
      client_id: this.clientId,
      redirect_uri: this.redirectUri,
      code_verifier: codeVerifier,
      device_id: deviceId,
    });

    const res = await fetch("https://id.vk.com/oauth2/auth", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: body.toString(),
    });
    const data = (await res.json()) as VkIdTokenResponse & { error?: string; error_description?: string };

    if (data.error) {
      throw new UnauthorizedException(
        data.error_description ?? "Ошибка авторизации VK",
      );
    }

    return data;
  }

  /** Get user info via VK ID */
  private async fetchUserInfo(accessToken: string): Promise<VkIdUserInfo> {
    const body = new URLSearchParams({
      client_id: this.clientId,
      access_token: accessToken,
    });

    const res = await fetch("https://id.vk.com/oauth2/user_info", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: body.toString(),
    });
    const data = (await res.json()) as { user: VkIdUserInfo; error?: string };

    if (data.error || !data.user) {
      throw new UnauthorizedException("Не удалось получить профиль VK");
    }

    return data.user;
  }
}
