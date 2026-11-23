import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { CookieOptions } from 'express';
import { IsNull, LessThan, Repository } from 'typeorm';
import { createHash, randomBytes, randomUUID } from 'node:crypto';
import { durationToSeconds } from '@common/config/configuration';
import { CustomerStatus } from '@common/constants/customers';
import {
  Customer,
  CustomerRefreshToken,
} from '@database/entities/customers/customer.entity';

/** A storefront customer's access token: one organization, one customer. */
export interface CustomerTokenClaims {
  sub: number;
  /** The organization the account belongs to. */
  orgId: number;
  name: string;
  typ: 'access';
}

export interface CustomerPrincipal {
  customerId: number;
  organizationId: number;
  name: string;
}

export interface CustomerTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

export const CUSTOMER_REFRESH_COOKIE = 'customer_refresh_token';

const sha256 = (value: string) => createHash('sha256').update(value).digest('hex');

/**
 * Customer sessions. The same
 * shape as staff sessions — short access JWT, rotating refresh token with
 * reuse detection — but a separate audience, so a customer token is never
 * accepted by staff routes and the reverse. Refresh cookies are scoped to
 * one organization's `/storefront/:slug/auth` path.
 */
@Injectable()
export class CustomerTokenService {
  private readonly logger = new Logger(CustomerTokenService.name);

  constructor(
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
    @InjectRepository(CustomerRefreshToken)
    private readonly refreshTokens: Repository<CustomerRefreshToken>,
    @InjectRepository(Customer)
    private readonly customers: Repository<Customer>,
  ) {}

  get accessTtl(): number {
    return durationToSeconds(this.config.get<string>('JWT_ACCESS_EXPIRES_IN') ?? '15m');
  }

  get refreshTtl(): number {
    return durationToSeconds(
      this.config.get<string>('CUSTOMER_REFRESH_EXPIRES_IN') ?? '30d',
    );
  }

  private get verifyOptions() {
    return {
      secret: this.config.get<string>('JWT_SECRET'),
      issuer: this.config.get<string>('JWT_ISSUER'),
      audience: this.config.get<string>('CUSTOMER_JWT_AUDIENCE') ?? 'app-storefront',
    };
  }

  issueAccess(customer: Customer): string {
    const claims: CustomerTokenClaims = {
      sub: customer.id,
      orgId: customer.organizationId,
      name: customer.name,
      typ: 'access',
    };
    return this.jwt.sign(claims, {
      ...this.verifyOptions,
      algorithm: 'HS256',
      expiresIn: this.accessTtl,
    });
  }

  async issueSession(
    customer: Customer,
    context: { userAgent?: string; ip?: string } = {},
  ): Promise<CustomerTokens> {
    const refreshToken = await this.persist(customer, randomUUID(), context);
    void this.purgeExpired();
    return {
      accessToken: this.issueAccess(customer),
      refreshToken,
      expiresIn: this.accessTtl,
    };
  }

  /** Verifies a bearer token for this organization; null when absent or not valid. */
  async verify(
    token: string | undefined,
    organizationId: number,
  ): Promise<CustomerPrincipal | null> {
    if (!token) return null;
    try {
      const claims = await this.jwt.verifyAsync<CustomerTokenClaims>(token, {
        ...this.verifyOptions,
        algorithms: ['HS256'],
      });
      if (claims.typ !== 'access' || Number(claims.orgId) !== organizationId)
        return null;
      return {
        customerId: Number(claims.sub),
        organizationId: Number(claims.orgId),
        name: claims.name,
      };
    } catch {
      return null;
    }
  }

  /** Rotates a refresh token of this organization; a replayed one revokes its family. */
  async rotate(
    raw: string,
    organizationId: number,
    context: { userAgent?: string; ip?: string } = {},
  ): Promise<CustomerTokens & { customer: Customer }> {
    const stored = await this.refreshTokens.findOneBy({ tokenHash: sha256(raw) });
    if (!stored || stored.organizationId !== organizationId) {
      throw new UnauthorizedException('Invalid refresh token');
    }
    if (stored.revokedAt) {
      this.logger.warn(
        `Customer refresh token reuse for customer ${stored.customerId}; revoking family`,
      );
      await this.revokeFamily(stored.familyId);
      throw new UnauthorizedException('Invalid refresh token');
    }
    if (stored.expiresAt.getTime() <= Date.now()) {
      throw new UnauthorizedException('Refresh token expired');
    }
    const customer = await this.customers.findOneBy({
      id: stored.customerId,
      organizationId,
    });
    if (
      !customer ||
      customer.status !== CustomerStatus.Active ||
      !customer.registeredAt
    ) {
      await this.revokeFamily(stored.familyId);
      throw new UnauthorizedException('Account is not active');
    }
    const refreshToken = await this.persist(customer, stored.familyId, context);
    await this.refreshTokens.update(stored.id, {
      revokedAt: new Date(),
      replacedBy: sha256(refreshToken),
    });
    return {
      customer,
      accessToken: this.issueAccess(customer),
      refreshToken,
      expiresIn: this.accessTtl,
    };
  }

  async revokeByToken(raw: string): Promise<void> {
    await this.refreshTokens.update(
      { tokenHash: sha256(raw), revokedAt: IsNull() },
      { revokedAt: new Date() },
    );
  }

  async revokeAll(customerId: number): Promise<void> {
    await this.refreshTokens.update(
      { customerId, revokedAt: IsNull() },
      { revokedAt: new Date() },
    );
  }

  /** The cookie, readable only by this organization's `/storefront/:slug/auth` routes. */
  cookieOptions(slug: string, maxAgeSeconds = this.refreshTtl): CookieOptions {
    return {
      httpOnly: true,
      secure: this.config.get<string>('COOKIE_SECURE') === 'true',
      sameSite: (this.config.get<string>('COOKIE_SAMESITE') ?? 'lax') as
        'lax' | 'strict' | 'none',
      domain: this.config.get<string>('COOKIE_DOMAIN') || undefined,
      path: `/api/v1/storefront/${slug}/auth`,
      maxAge: maxAgeSeconds * 1000,
    };
  }

  private async revokeFamily(familyId: string): Promise<void> {
    await this.refreshTokens.update(
      { familyId, revokedAt: IsNull() },
      { revokedAt: new Date() },
    );
  }

  private async persist(
    customer: Customer,
    familyId: string,
    context: { userAgent?: string; ip?: string },
  ): Promise<string> {
    const raw = randomBytes(48).toString('base64url');
    await this.refreshTokens.save(
      this.refreshTokens.create({
        organizationId: customer.organizationId,
        customerId: customer.id,
        tokenHash: sha256(raw),
        familyId,
        expiresAt: new Date(Date.now() + this.refreshTtl * 1000),
        userAgent: context.userAgent?.slice(0, 255) ?? null,
        ip: context.ip?.slice(0, 45) ?? null,
      }),
    );
    return raw;
  }

  private async purgeExpired(): Promise<void> {
    try {
      await this.refreshTokens.delete({ expiresAt: LessThan(new Date()) });
    } catch (error) {
      this.logger.warn(`Could not purge expired customer tokens: ${String(error)}`);
    }
  }
}
