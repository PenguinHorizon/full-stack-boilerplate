import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  Logger,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Permission } from '@common/constants/roles.config';
import {
  PERMISSIONS_KEY,
  PLATFORM_ONLY_KEY,
} from '@common/decorators/permissions.decorator';
import { IS_PUBLIC_KEY } from '@common/decorators/public.decorator';
import { PayloadDto } from '@common/dto/payload.dto';
import { TenantContext } from '@common/tenancy/tenant-context';
import { TENANT_REQUEST_KEY } from '@common/tenancy/tenant.decorator';
import { AccessService } from '../access.service';

/**
 * Enforces @PlatformOnly() and @RequirePermissions(). Always 403, never 401:
 * "signed in but not allowed" is a different condition from "not signed in",
 * and the frontend keeps the session alive on 403.
 */
@Injectable()
export class PermissionsGuard implements CanActivate {
  private readonly logger = new Logger(PermissionsGuard.name);

  constructor(
    private readonly reflector: Reflector,
    private readonly access: AccessService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const targets = [context.getHandler(), context.getClass()];
    if (this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, targets)) return true;

    const request = context.switchToHttp().getRequest();
    const platformOnly = this.reflector.getAllAndOverride<boolean>(
      PLATFORM_ONLY_KEY,
      targets,
    );
    const required = this.reflector.getAllAndOverride<Permission[]>(
      PERMISSIONS_KEY,
      targets,
    );

    if (platformOnly) {
      const user = request.user as PayloadDto | undefined;
      if (!user || !(await this.access.isActiveSuperAdmin(user.userId))) {
        throw new ForbiddenException('Platform administrators only');
      }
    }

    if (required?.length) {
      const tenant = request[TENANT_REQUEST_KEY] as TenantContext | undefined;
      if (!tenant) {
        // Wiring bug: permissions declared on a route without @OrganizationScoped().
        this.logger.error(
          `Permissions required without tenant context on ${request.method} ${request.url}`,
        );
        throw new ForbiddenException('Insufficient permissions');
      }
      const missing = required.filter((p) => !tenant.permissions.includes(p));
      if (missing.length) {
        throw new ForbiddenException('Insufficient permissions');
      }
    }

    return true;
  }
}
