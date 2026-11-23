import { OrganizationRole } from './tenancy.enums';

export { OrganizationRole };

/*
 * The single source of truth for what each organization role may do (ADR-006).
 *
 * The API enforces these through PermissionsGuard; the admin UI receives the
 * same strings per organization (GET /admin/me/organizations) and only uses them
 * to hide what the API would refuse anyway. A unit test snapshots the matrix
 * so every change is visible in review.
 *
 * Platform super admin is a flag on the user, not a role: it is checked by
 * @PlatformOnly() routes and grants every permission inside any organization.
 *
 * Adding a feature: add `<feature>.view` / `<feature>.manage` here, grant it
 * to the right roles, and guard the routes with @RequirePermissions().
 */

export const PERMISSIONS = [
  'organization.view',
  'organization.update',
  'organization.domains',
  'customer.view',
  'customer.manage',
  'inquiry.view',
  'inquiry.manage',
  'content.view',
  'content.manage',
  'media.view',
  'media.upload',
  'media.delete',
  'team.view',
  'team.manage',
  'dashboard.view',
  'audit.view',
] as const;

export type Permission = (typeof PERMISSIONS)[number];

const ALL: Permission[] = [...PERMISSIONS];

export const ROLE_PERMISSIONS: Record<OrganizationRole, readonly Permission[]> = {
  [OrganizationRole.Owner]: ALL,
  [OrganizationRole.Admin]: ALL.filter((p) => p !== 'organization.domains'),
  [OrganizationRole.Manager]: [
    'organization.view',
    'customer.view',
    'customer.manage',
    'inquiry.view',
    'inquiry.manage',
    'content.view',
    'content.manage',
    'media.view',
    'media.upload',
    'media.delete',
    'team.view',
    'team.manage',
    'dashboard.view',
  ],
  [OrganizationRole.Member]: [
    'organization.view',
    'customer.view',
    'inquiry.view',
    'content.view',
    'media.view',
    'media.upload',
    'dashboard.view',
  ],
};

/** Higher rank may manage lower ranks (team rules). */
export const ROLE_RANK: Record<OrganizationRole, number> = {
  [OrganizationRole.Owner]: 4,
  [OrganizationRole.Admin]: 3,
  [OrganizationRole.Manager]: 2,
  [OrganizationRole.Member]: 1,
};

export const ROLE_LABELS: Record<OrganizationRole, string> = {
  [OrganizationRole.Owner]: 'Owner',
  [OrganizationRole.Admin]: 'Admin',
  [OrganizationRole.Manager]: 'Manager',
  [OrganizationRole.Member]: 'Member',
};

export function permissionsFor(
  role: OrganizationRole | null,
  isSuperAdmin = false,
): Permission[] {
  if (isSuperAdmin) return [...ALL];
  return role ? [...ROLE_PERMISSIONS[role]] : [];
}

/**
 * Team rule: may `actor` assign / edit / remove a member holding `target`?
 *  - owners manage everyone (including other owners)
 *  - admins manage ranks below their own (not owners, not other admins)
 *  - managers manage members only
 *  - members manage no one
 */
export function canManageRole(
  actor: OrganizationRole | null,
  target: OrganizationRole,
  actorIsSuperAdmin = false,
): boolean {
  if (actorIsSuperAdmin || actor === OrganizationRole.Owner) return true;
  switch (actor) {
    case OrganizationRole.Admin:
      return ROLE_RANK[target] < ROLE_RANK[OrganizationRole.Admin];
    case OrganizationRole.Manager:
      return target === OrganizationRole.Member;
    default:
      return false;
  }
}
