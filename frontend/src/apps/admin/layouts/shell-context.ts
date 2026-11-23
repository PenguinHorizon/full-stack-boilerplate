import { useLocation } from "react-router-dom";
import { useStaffSession } from "@/shared/auth/staff-session";
import {
  useAccessibleOrganizations,
  type AccessibleOrganization,
} from "../access/access-context";
import { organizationIdFromPath } from "../access/routing";

export type ShellArea = "organization" | "platform" | "personal";

/**
 * What the shell is showing. The shell sits above the route that provides
 * OrganizationContext, so it reads the organization from the URL. Personal pages
 * (account) keep the last organization's menu so people can find their way back.
 */
export function useShellContext(): {
  area: ShellArea;
  organization: AccessibleOrganization | null;
} {
  const { pathname } = useLocation();
  const organizations = useAccessibleOrganizations();
  const lastOrganizationId = useStaffSession((s) => s.lastOrganizationId);

  if (pathname === "/admin/platform" || pathname.startsWith("/admin/platform/")) {
    return { area: "platform", organization: null };
  }
  const orgId = organizationIdFromPath(pathname);
  if (orgId !== null) {
    return {
      area: "organization",
      organization: organizations.find((r) => r.id === orgId) ?? null,
    };
  }
  return {
    area: "personal",
    organization: organizations.find((r) => r.id === lastOrganizationId) ?? null,
  };
}
