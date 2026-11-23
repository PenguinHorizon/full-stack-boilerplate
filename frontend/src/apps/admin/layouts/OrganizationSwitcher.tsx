import { Check, ChevronsUpDown, ShieldCheck, Store } from "lucide-react";
import type { ReactNode } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { membershipLabel } from "@/shared/auth/access";
import { useIsSuperAdmin } from "@/shared/auth/staff-session";
import { cn } from "@/shared/lib/format";
import {
  Menu,
  MenuContent,
  MenuItem,
  MenuLabel,
  MenuSeparator,
  MenuTrigger,
} from "@/shared/ui";
import {
  useAccessibleOrganizations,
  type AccessibleOrganization,
} from "../access/access-context";
import { switchPath } from "../access/routing";
import { OrganizationMark } from "../components/OrganizationMark";

/** Organizations a super admin can open without a membership, before "see all". */
const OTHERS_LIMIT = 8;

function Identity({
  mark,
  title,
  subtitle,
}: {
  mark: ReactNode;
  title: string;
  subtitle: string;
}) {
  return (
    <span className="flex min-w-0 items-center gap-2.5">
      {mark}
      <span className="min-w-0 text-left">
        <span className="block truncate text-sm leading-tight font-semibold text-ink">
          {title}
        </span>
        <span className="block truncate text-xs leading-tight text-ink-subtle">
          {subtitle}
        </span>
      </span>
    </span>
  );
}

function PlatformMark() {
  return (
    <span
      aria-hidden="true"
      className="grid size-7 shrink-0 place-items-center rounded-control bg-ink text-white"
    >
      <ShieldCheck size={15} />
    </span>
  );
}

/**
 * Top-bar context switcher: the user's organizations, plus the platform console
 * for super admins. Switching keeps the current screen when the other
 * organization allows it.
 */
export function OrganizationSwitcher({
  current,
  inPlatform,
}: {
  current: AccessibleOrganization | null;
  inPlatform: boolean;
}) {
  const organizations = useAccessibleOrganizations();
  const isSuperAdmin = useIsSuperAdmin();
  const navigate = useNavigate();
  const { pathname } = useLocation();

  const memberships = organizations.filter((r) => r.role !== null);
  const others = organizations.filter((r) => r.role === null);

  const identity =
    inPlatform || !current ? (
      <Identity
        mark={<PlatformMark />}
        title="Platform admin"
        subtitle="All organizations"
      />
    ) : (
      <Identity
        mark={<OrganizationMark name={current.name} color={current.brandPrimaryColor} />}
        title={current.name}
        subtitle={membershipLabel(current.role)}
      />
    );

  if (organizations.length <= 1 && !isSuperAdmin) {
    return <div className="min-w-0 px-2 py-1.5">{identity}</div>;
  }

  const item = (organization: AccessibleOrganization) => {
    const selected = !inPlatform && organization.id === current?.id;
    return (
      <MenuItem
        key={organization.id}
        onSelect={() => navigate(switchPath(pathname, organization))}
      >
        <span className="flex min-w-0 flex-1 items-center gap-2.5">
          <OrganizationMark
            name={organization.name}
            color={organization.brandPrimaryColor}
            size={24}
          />
          <span className="min-w-0 flex-1">
            <span className="block truncate font-medium">{organization.name}</span>
            <span className="block truncate text-xs text-ink-subtle">
              {membershipLabel(organization.role)}
              {organization.status !== "active" && ` · ${organization.status}`}
            </span>
          </span>
          {selected && <Check size={16} className="text-accent" aria-label="Current" />}
        </span>
      </MenuItem>
    );
  };

  return (
    <Menu>
      <MenuTrigger className="flex max-w-full min-w-0 items-center gap-2 rounded-control py-1.5 pr-2 pl-1.5 hover:bg-surface-muted">
        {identity}
        {/* The visible name stays the accessible name (WCAG 2.5.3); this adds the purpose. */}
        <span className="sr-only">, switch organization</span>
        <ChevronsUpDown
          size={16}
          className="shrink-0 text-ink-subtle"
          aria-hidden="true"
        />
      </MenuTrigger>
      <MenuContent align="start" className="max-h-[70vh] w-72 overflow-y-auto">
        {memberships.length > 0 && <SectionLabel>Your organizations</SectionLabel>}
        {memberships.map(item)}

        {others.length > 0 && (
          <>
            {memberships.length > 0 && <MenuSeparator />}
            <SectionLabel>Open as platform admin</SectionLabel>
            {others.slice(0, OTHERS_LIMIT).map(item)}
            {others.length > OTHERS_LIMIT && (
              <MenuItem
                icon={Store}
                onSelect={() => navigate("/admin/platform/organizations")}
              >
                All {others.length} organizations…
              </MenuItem>
            )}
          </>
        )}

        {isSuperAdmin && (
          <>
            <MenuSeparator />
            <MenuItem icon={ShieldCheck} onSelect={() => navigate("/admin/platform")}>
              <span className={cn(inPlatform && "font-semibold")}>Platform admin</span>
            </MenuItem>
          </>
        )}
      </MenuContent>
    </Menu>
  );
}

function SectionLabel({ children }: { children: ReactNode }) {
  return (
    <MenuLabel>
      <span className="text-[0.7rem] font-semibold tracking-wider text-ink-subtle uppercase">
        {children}
      </span>
    </MenuLabel>
  );
}
