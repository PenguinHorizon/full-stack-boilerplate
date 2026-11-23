import { organizationNav, visibleNav } from "../nav";
import type { AccessibleOrganization } from "./access-context";

/** `:orgId` from the URL: a positive integer, anything else is not an organization. */
export function parseOrganizationId(value: string | undefined | null): number | null {
  if (!value || !/^[1-9]\d{0,9}$/.test(value)) return null;
  const id = Number(value);
  return Number.isSafeInteger(id) ? id : null;
}

/** Organization id in an admin path ("/admin/12/team" → 12), else null. */
export function organizationIdFromPath(pathname: string): number | null {
  return parseOrganizationId(/^\/admin\/([^/]+)/.exec(pathname)?.[1]);
}

/**
 * Where `/admin` sends someone: the last organization they used, else their
 * first membership, else the platform console (super admins). `null` means
 * they cannot open anything yet.
 */
export function homePath(
  organizations: readonly AccessibleOrganization[],
  lastOrganizationId: number | null,
  isSuperAdmin: boolean,
): string | null {
  const last = organizations.find((r) => r.id === lastOrganizationId);
  if (last) return `/admin/${last.id}`;
  const membership = organizations.find((r) => r.role !== null);
  if (membership) return `/admin/${membership.id}`;
  return isSuperAdmin ? "/admin/platform" : null;
}

/**
 * Switching organizations keeps you on the same screen when the other
 * organization allows it ("/admin/1/team" → "/admin/2/team"), otherwise lands
 * on its home.
 */
export function switchPath(pathname: string, target: AccessibleOrganization): string {
  const section = /^\/admin\/\d+\/([^/?#]+)/.exec(pathname)?.[1];
  if (section) {
    const match = visibleNav(organizationNav(target.id), target.permissions)
      .flatMap((group) => group.items)
      .find((item) => item.to === `/admin/${target.id}/${section}`);
    if (match) return match.to;
  }
  return `/admin/${target.id}`;
}
