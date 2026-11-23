import type { AccessibleOrganizationResponse } from "@/shared/types/api.generated";

/*
 * Client-side mirror of backend/src/common/constants/roles.config.ts.
 *
 * The API decides every request; these only shape the UI (which menu items,
 * buttons and role options to offer). The permission list arrives per
 * organization from GET /admin/me/organizations, so only the names, the role
 * labels and the team-management rules are repeated here.
 */

export const PERMISSIONS = [
  "organization.view",
  "organization.update",
  "organization.domains",
  "customer.view",
  "customer.manage",
  "inquiry.view",
  "inquiry.manage",
  "content.view",
  "content.manage",
  "media.view",
  "media.upload",
  "media.delete",
  "team.view",
  "team.manage",
  "dashboard.view",
  "audit.view",
] as const;

export type Permission = (typeof PERMISSIONS)[number];

/** From the generated contracts, so a new backend role fails the typecheck here. */
export type OrganizationRole = NonNullable<AccessibleOrganizationResponse["role"]>;

/** Highest rank first. */
export const ORGANIZATION_ROLES = [
  "OWNER",
  "ADMIN",
  "MANAGER",
  "MEMBER",
] as const satisfies readonly OrganizationRole[];

export const ROLE_LABELS: Record<OrganizationRole, string> = {
  OWNER: "Owner",
  ADMIN: "Admin",
  MANAGER: "Manager",
  MEMBER: "Member",
};

/** A super admin without a membership has no role in the organization. */
export function membershipLabel(role: OrganizationRole | null): string {
  return role ? ROLE_LABELS[role] : "Platform admin";
}

/** One line per role for the team form. */
export const ROLE_DESCRIPTIONS: Record<OrganizationRole, string> = {
  OWNER: "Everything, including domains and other owners.",
  ADMIN: "Runs the business: website, customers, team below admin.",
  MANAGER: "Day-to-day work: website, customers, inbox and members.",
  MEMBER: "Read-mostly access; can upload images.",
};

const ROLE_RANK: Record<OrganizationRole, number> = {
  OWNER: 4,
  ADMIN: 3,
  MANAGER: 2,
  MEMBER: 1,
};

export function isOrganizationRole(value: unknown): value is OrganizationRole {
  return (ORGANIZATION_ROLES as readonly unknown[]).includes(value);
}

/** Same rule as the API's `canManageRole`. */
export function canManageRole(
  actor: OrganizationRole | null,
  target: OrganizationRole,
  actorIsSuperAdmin = false,
): boolean {
  if (actorIsSuperAdmin || actor === "OWNER") return true;
  switch (actor) {
    case "ADMIN":
      return ROLE_RANK[target] < ROLE_RANK.ADMIN;
    case "MANAGER":
      return target === "MEMBER";
    default:
      return false;
  }
}

/** Roles the actor may hand out, highest first. */
export function assignableRoles(
  actor: OrganizationRole | null,
  actorIsSuperAdmin = false,
): OrganizationRole[] {
  return ORGANIZATION_ROLES.filter((role) =>
    canManageRole(actor, role, actorIsSuperAdmin),
  );
}
