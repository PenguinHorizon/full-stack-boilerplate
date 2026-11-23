import {
  createParamDecorator,
  ExecutionContext,
  InternalServerErrorException,
} from '@nestjs/common';
import { TenantContext } from './tenant-context';

export const TENANT_REQUEST_KEY = 'tenant';

/**
 * Injects the TenantContext attached by the tenant guard.
 *
 * Missing context is a wiring bug (route not behind the guard), so it fails
 * loudly with a 500 instead of quietly running an unscoped query.
 */
export const Tenant = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): TenantContext => {
    const request = ctx.switchToHttp().getRequest();
    const tenant = request[TENANT_REQUEST_KEY] as TenantContext | undefined;
    if (!tenant) {
      throw new InternalServerErrorException('Tenant context missing');
    }
    return tenant;
  },
);
