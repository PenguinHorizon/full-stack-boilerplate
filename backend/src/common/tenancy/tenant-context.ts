import { OrganizationRole } from '@common/constants/tenancy.enums';

/**
 * Who is acting, in which organization, with what rights. Built per request by
 * the tenant guard and passed explicitly to every admin service method —
 * services never read an organization id from a request body.
 */
export interface TenantContext {
  readonly organizationId: number;
  readonly userId: number;
  /** `null` only for a super admin acting without a membership. */
  readonly role: OrganizationRole | null;
  readonly permissions: readonly string[];
  readonly isSuperAdmin: boolean;
}

export function hasPermission(
  ctx: Pick<TenantContext, 'permissions' | 'isSuperAdmin'>,
  permission: string,
): boolean {
  return ctx.isSuperAdmin || ctx.permissions.includes(permission);
}
