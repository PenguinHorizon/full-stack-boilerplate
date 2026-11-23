import { createContext, useContext } from "react";
import type { Permission } from "@/shared/auth/access";
import type { AccessibleOrganizationResponse } from "@/shared/types/api.generated";

export type AccessibleOrganization = AccessibleOrganizationResponse;

/**
 * Every organization the signed-in user can open, loaded once by `AccessGate`
 * before any admin screen renders (GET /admin/me/organizations).
 */
export const AccessContext = createContext<AccessibleOrganization[] | null>(null);

export function useAccessibleOrganizations(): AccessibleOrganization[] {
  const organizations = useContext(AccessContext);
  if (!organizations) throw new Error("useAccessibleOrganizations outside AccessGate");
  return organizations;
}

/** The organization of the current `/admin/:orgId/…` route. */
export const OrganizationContext = createContext<AccessibleOrganization | null>(null);

export function useCurrentOrganization(): AccessibleOrganization {
  const organization = useContext(OrganizationContext);
  if (!organization) throw new Error("useCurrentOrganization outside OrganizationGate");
  return organization;
}

/** Whether the current organization grants `permission` (false outside one). */
export function useCan(permission: Permission): boolean {
  const organization = useContext(OrganizationContext);
  return Boolean(organization?.permissions.includes(permission));
}
