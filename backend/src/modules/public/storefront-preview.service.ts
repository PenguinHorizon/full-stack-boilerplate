import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Request } from 'express';
import { hasPermission } from '@common/tenancy/tenant-context';
import { AccessService } from '@modules/access/access.service';
import { AccessTokenClaims } from '@modules/auth/token.service';

/**
 * Draft preview on the storefront: `?preview=1`
 * with a staff bearer token that holds `content.view` in the organization
 * shows draft content next to the published. Anything else — no token, an
 * expired one, another organization — quietly shows the published site.
 * Preview responses are never cached (PublicCacheInterceptor).
 */
@Injectable()
export class StorefrontPreviewService {
  constructor(
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
    private readonly access: AccessService,
  ) {}

  async includeDrafts(req: Request, organizationId: number): Promise<boolean> {
    if (req.query.preview !== '1') return false;
    const [type, token] = req.headers.authorization?.split(' ') ?? [];
    if (type !== 'Bearer' || !token) return false;
    try {
      const claims = await this.jwt.verifyAsync<AccessTokenClaims>(token, {
        secret: this.config.get<string>('JWT_SECRET'),
        algorithms: ['HS256'],
        issuer: this.config.get<string>('JWT_ISSUER'),
        audience: this.config.get<string>('JWT_AUDIENCE'),
      });
      if (claims.typ !== 'access') return false;
      const ctx = await this.access.resolveTenant(Number(claims.sub), organizationId);
      return hasPermission(ctx, 'content.view');
    } catch {
      return false;
    }
  }
}
