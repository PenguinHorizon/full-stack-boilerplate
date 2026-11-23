import { Lock, Sparkles, Store } from "lucide-react";
import { useEffect, type ReactElement } from "react";
import { Link, Navigate, Outlet, useParams } from "react-router-dom";
import type { Permission } from "@/shared/auth/access";
import { ROLE_LABELS } from "@/shared/auth/access";
import { useIsSuperAdmin, useStaffSession } from "@/shared/auth/staff-session";
import { buttonClasses, Card, EmptyState, PageSpinner } from "@/shared/ui";
import { organizationLanding } from "../nav";
import { AdminNotFoundPage } from "../pages/AdminNotFoundPage";
import {
  OrganizationContext,
  useAccessibleOrganizations,
  useCan,
  useCurrentOrganization,
} from "./access-context";
import { homePath, parseOrganizationId } from "./routing";

/** `/admin` → the right starting place for this user. */
export function AdminHome() {
  const organizations = useAccessibleOrganizations();
  const lastOrganizationId = useStaffSession((s) => s.lastOrganizationId);
  const isSuperAdmin = useIsSuperAdmin();
  // AccessGate already turned away users with nowhere to go.
  const target =
    homePath(organizations, lastOrganizationId, isSuperAdmin) ?? "/admin/account";
  return <Navigate to={target} replace />;
}

/**
 * `/admin/:orgId/*`: only organizations from GET /admin/me/organizations open.
 * Anything else gets one answer, whether it exists or not (like the API's 403).
 */
export function OrganizationGate() {
  const { orgId } = useParams();
  const id = parseOrganizationId(orgId);
  const organization = useAccessibleOrganizations().find((r) => r.id === id);
  const setLastOrganizationId = useStaffSession((s) => s.setLastOrganizationId);

  useEffect(() => {
    if (organization) setLastOrganizationId(organization.id);
  }, [organization, setLastOrganizationId]);

  if (!organization) {
    return (
      <Card>
        <title>Organization unavailable · Admin</title>
        <EmptyState
          icon={Store}
          title="You can't open this organization"
          description="It may not exist, or you're not on its team. If you think you should be, ask its owner."
          action={
            <Link to="/admin" className={buttonClasses("secondary")}>
              Go to my organizations
            </Link>
          }
        />
      </Card>
    );
  }

  return (
    <OrganizationContext.Provider value={organization}>
      <Outlet />
    </OrganizationContext.Provider>
  );
}

/** `/admin/:orgId` → the first screen this role may open. */
export function OrganizationIndex() {
  const organization = useCurrentOrganization();
  const landing = organizationLanding(organization);
  if (landing) return <Navigate to={landing} replace />;

  const role = organization.role ? ROLE_LABELS[organization.role] : "your role";
  return (
    <Card>
      <title>{`${organization.name} · Admin`}</title>
      <EmptyState
        icon={Sparkles}
        title={`Welcome to ${organization.name}`}
        description={`There's nothing for ${role} to do here yet. Order screens arrive in an upcoming release, and they'll appear in the menu as soon as they do.`}
      />
    </Card>
  );
}

/** Renders an organization screen only for roles that hold `permission`. */
export function RequirePermission({
  permission,
  children,
}: {
  permission: Permission;
  children: ReactElement;
}) {
  const allowed = useCan(permission);
  const organization = useCurrentOrganization();
  if (allowed) return children;
  return (
    <Card>
      <title>No access · Admin</title>
      <EmptyState
        icon={Lock}
        title="Your role can't open this page"
        description="Ask an owner or admin of this organization if you need access."
        action={
          <Link to={`/admin/${organization.id}`} className={buttonClasses("secondary")}>
            Back to {organization.name}
          </Link>
        }
      />
    </Card>
  );
}

/** `/admin/platform/*`: super admins only (the API re-checks in the database). */
export function PlatformGate() {
  const isSuperAdmin = useIsSuperAdmin();
  const bootstrapping = useStaffSession((s) => s.bootstrapping);
  if (bootstrapping) return <PageSpinner />;
  return isSuperAdmin ? <Outlet /> : <AdminNotFoundPage />;
}
