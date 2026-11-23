import { SetMetadata } from '@nestjs/common';
import type { Permission } from '@common/constants/roles.config';

export const PERMISSIONS_KEY = 'permissions';
export const PLATFORM_ONLY_KEY = 'platformOnly';
export const ORGANIZATION_SCOPED_KEY = 'organizationScoped';

/**
 * Requires every listed permission inside the current organization
 *. Only valid on @OrganizationScoped()
 * routes — PermissionsGuard fails closed if no tenant context exists.
 */
export const RequirePermissions = (...permissions: Permission[]) =>
  SetMetadata(PERMISSIONS_KEY, permissions);

/**
 * Marks a controller whose routes live under `/admin/organizations/:orgId/...`.
 * TenantGuard resolves the caller's membership of `:orgId` and attaches the
 * TenantContext (`@Tenant()`); non-members get 403.
 */
export const OrganizationScoped = () => SetMetadata(ORGANIZATION_SCOPED_KEY, true);

/** Platform super admins only; the flag is re-checked in the database. */
export const PlatformOnly = () => SetMetadata(PLATFORM_ONLY_KEY, true);
