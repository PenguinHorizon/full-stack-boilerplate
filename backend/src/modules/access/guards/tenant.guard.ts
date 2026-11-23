import {
  CanActivate,
  ExecutionContext,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ORGANIZATION_SCOPED_KEY } from '@common/decorators/permissions.decorator';
import { PayloadDto } from '@common/dto/payload.dto';
import { TENANT_REQUEST_KEY } from '@common/tenancy/tenant.decorator';
import { AccessService } from '../access.service';

/**
 * For @OrganizationScoped() routes (`/admin/organizations/:orgId/...`): resolves
 * the caller's membership of `:orgId` and attaches the TenantContext.
 * Runs after JwtAuthGuard (needs the principal) and before
 * PermissionsGuard (which reads the context).
 */
@Injectable()
export class TenantGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly access: AccessService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const scoped = this.reflector.getAllAndOverride<boolean>(ORGANIZATION_SCOPED_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!scoped) return true;

    const request = context.switchToHttp().getRequest();
    const user = request.user as PayloadDto | undefined;
    if (!user) throw new UnauthorizedException('Missing bearer token');

    const orgId = Number(request.params?.orgId);
    if (!Number.isInteger(orgId) || orgId <= 0) {
      throw new NotFoundException('Organization not found');
    }

    request[TENANT_REQUEST_KEY] = await this.access.resolveTenant(user.userId, orgId);
    return true;
  }
}
