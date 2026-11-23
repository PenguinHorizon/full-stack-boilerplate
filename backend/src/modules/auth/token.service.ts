import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, LessThan, Repository } from 'typeorm';
import { createHash, randomBytes, randomUUID } from 'node:crypto';
import { RefreshToken } from '@database/entities/identity/refresh-token.entity';
import { User } from '@database/entities/identity/user.entity';
import { durationToSeconds } from '@common/config/configuration';

/** No role claim: organization roles are resolved per request (ADR-006). */
export interface AccessTokenClaims {
  sub: number;
  email: string;
  code: string;
  name: string;
  /** Platform super admin. Re-checked against the database on platform routes. */
  sa: boolean;
  typ: 'access';
}

export interface StaffPrincipal {
  userId: number;
  userCode: string;
  email: string;
  name: string;
  phone: string | null;
  avatar: string | null;
  isSuperAdmin: boolean;
}

export interface IssuedTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

/** SHA-256 hex. Raw refresh tokens are never persisted. */
const sha256 = (value: string) => createHash('sha256').update(value).digest('hex');

@Injectable()
export class TokenService {
  private readonly logger = new Logger(TokenService.name);

  constructor(
    private readonly jwtService: JwtService,
    private readonly config: ConfigService,
    @InjectRepository(RefreshToken)
    private readonly refreshTokens: Repository<RefreshToken>,
    @InjectRepository(User)
    private readonly users: Repository<User>,
  ) {}

  get accessTokenTtl(): number {
    return durationToSeconds(this.config.get<string>('JWT_ACCESS_EXPIRES_IN') ?? '15m');
  }

  get refreshTokenTtl(): number {
    return durationToSeconds(this.config.get<string>('JWT_REFRESH_EXPIRES_IN') ?? '7d');
  }

  issueAccessToken(user: User): string {
    const claims: AccessTokenClaims = {
      sub: user.id,
      email: user.email,
      code: user.userCode,
      name: user.name,
      sa: user.isSuperAdmin,
      typ: 'access',
    };

    return this.jwtService.sign(claims, {
      secret: this.config.get<string>('JWT_SECRET'),
      expiresIn: this.accessTokenTtl,
      algorithm: 'HS256',
      issuer: this.config.get<string>('JWT_ISSUER'),
      audience: this.config.get<string>('JWT_AUDIENCE'),
    });
  }

  /** Issues a brand-new session (new rotation family). */
  async issueSession(
    user: User,
    context: { userAgent?: string; ip?: string } = {},
  ): Promise<IssuedTokens> {
    const refreshToken = await this.persistRefreshToken(user.id, randomUUID(), context);

    // Cheap opportunistic GC; avoids pulling in a scheduler for one sweep.
    void this.purgeExpired();

    return {
      accessToken: this.issueAccessToken(user),
      refreshToken,
      expiresIn: this.accessTokenTtl,
    };
  }

  /**
   * Rotates a refresh token.
   *
   * Presenting an already-revoked token means someone replayed a stolen one,
   * so the entire family is revoked rather than just this row.
   */
  async rotate(
    rawToken: string,
    context: { userAgent?: string; ip?: string } = {},
  ): Promise<IssuedTokens & { user: User }> {
    const tokenHash = sha256(rawToken);
    const stored = await this.refreshTokens.findOne({ where: { tokenHash } });

    if (!stored) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    if (stored.revokedAt) {
      this.logger.warn(
        `Refresh token reuse detected for user ${stored.userId}; revoking family ${stored.familyId}`,
      );
      await this.revokeFamily(stored.familyId);
      throw new UnauthorizedException('Invalid refresh token');
    }

    if (stored.expiresAt.getTime() <= Date.now()) {
      throw new UnauthorizedException('Refresh token expired');
    }

    const user = await this.users.findOne({ where: { id: stored.userId } });
    if (!user || !user.isActive) {
      await this.revokeFamily(stored.familyId);
      throw new UnauthorizedException('Account is not active');
    }

    const refreshToken = await this.persistRefreshToken(
      user.id,
      stored.familyId,
      context,
    );

    await this.refreshTokens.update(stored.id, {
      revokedAt: new Date(),
      replacedBy: sha256(refreshToken),
    });

    return {
      user,
      accessToken: this.issueAccessToken(user),
      refreshToken,
      expiresIn: this.accessTokenTtl,
    };
  }

  /** Revokes just the presented token's family — used on explicit logout. */
  async revokeByToken(rawToken: string): Promise<void> {
    const stored = await this.refreshTokens.findOne({
      where: { tokenHash: sha256(rawToken) },
    });
    if (stored) {
      await this.revokeFamily(stored.familyId);
    }
  }

  async revokeFamily(familyId: string): Promise<void> {
    await this.refreshTokens.update(
      { familyId, revokedAt: IsNull() },
      { revokedAt: new Date() },
    );
  }

  /** Called when an account is deactivated, deleted, or its password changes. */
  async revokeAllForUser(userId: number): Promise<void> {
    await this.refreshTokens.update(
      { userId, revokedAt: IsNull() },
      { revokedAt: new Date() },
    );
  }

  /** Public shape of the signed-in staff user (`/auth/me`, sessions). */
  buildPrincipal(user: User): StaffPrincipal {
    return {
      userId: user.id,
      userCode: user.userCode,
      email: user.email,
      name: user.name,
      phone: user.phone,
      avatar: user.avatar,
      isSuperAdmin: user.isSuperAdmin,
    };
  }

  private async persistRefreshToken(
    userId: number,
    familyId: string,
    context: { userAgent?: string; ip?: string },
  ): Promise<string> {
    const rawToken = randomBytes(32).toString('hex');

    await this.refreshTokens.save(
      this.refreshTokens.create({
        userId,
        familyId,
        tokenHash: sha256(rawToken),
        expiresAt: new Date(Date.now() + this.refreshTokenTtl * 1000),
        userAgent: context.userAgent?.slice(0, 255) ?? null,
        ip: context.ip?.slice(0, 45) ?? null,
      }),
    );

    return rawToken;
  }

  private async purgeExpired(): Promise<void> {
    try {
      await this.refreshTokens.delete({ expiresAt: LessThan(new Date()) });
    } catch (error) {
      this.logger.debug(`Refresh token purge skipped: ${error}`);
    }
  }
}
