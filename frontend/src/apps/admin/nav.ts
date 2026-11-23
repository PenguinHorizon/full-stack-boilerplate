import {
  Building2,
  Globe,
  History,
  Images,
  Inbox,
  LayoutDashboard,
  Settings,
  ShieldCheck,
  Store,
  UserRound,
  Users,
  UsersRound,
  type LucideIcon,
} from "lucide-react";
import type { Permission } from "@/shared/auth/access";

export interface NavItem {
  to: string;
  label: string;
  icon: LucideIcon;
  /** Hidden unless the organization grants this permission (the API enforces it too). */
  permission?: Permission;
  end?: boolean;
}

export interface NavGroup {
  label?: string;
  items: NavItem[];
}

/*
 * Organization navigation. Add a group (or items) here for each new feature;
 * items are hidden unless the member's role grants their permission.
 */
export function organizationNav(orgId: number): NavGroup[] {
  const base = `/admin/${orgId}`;
  return [
    {
      items: [
        {
          to: `${base}/dashboard`,
          label: "Dashboard",
          icon: LayoutDashboard,
          permission: "dashboard.view",
        },
      ],
    },
    {
      label: "Customers",
      items: [
        {
          to: `${base}/customers`,
          label: "Customers",
          icon: UserRound,
          permission: "customer.view",
        },
        { to: `${base}/inbox`, label: "Inbox", icon: Inbox, permission: "inquiry.view" },
      ],
    },
    {
      label: "Business",
      items: [
        {
          to: `${base}/website`,
          label: "Website",
          icon: Globe,
          permission: "content.view",
        },
        {
          to: `${base}/media`,
          label: "Media library",
          icon: Images,
          permission: "media.view",
        },
        {
          to: `${base}/settings`,
          label: "Settings",
          icon: Settings,
          permission: "organization.view",
        },
      ],
    },
    {
      label: "Manage",
      items: [
        { to: `${base}/team`, label: "Team", icon: Users, permission: "team.view" },
        {
          to: `${base}/audit`,
          label: "Audit log",
          icon: History,
          permission: "audit.view",
        },
      ],
    },
  ];
}

/** Super admins only; access is checked by the API on every request. */
export const PLATFORM_NAV: NavGroup[] = [
  {
    label: "Platform",
    items: [
      { to: "/admin/platform", label: "Overview", icon: ShieldCheck, end: true },
      { to: "/admin/platform/organizations", label: "Organizations", icon: Store },
      { to: "/admin/platform/users", label: "Staff accounts", icon: UsersRound },
      { to: "/admin/platform/audit", label: "Audit log", icon: History },
    ],
  },
];

/** Shown inside an organization to super admins, to get back to the platform. */
export const PLATFORM_SHORTCUT: NavGroup = {
  label: "Platform",
  items: [{ to: "/admin/platform", label: "Platform admin", icon: Building2 }],
};

export function visibleNav(
  groups: NavGroup[],
  permissions: readonly string[],
): NavGroup[] {
  return groups
    .map((group) => ({
      ...group,
      items: group.items.filter(
        (item) => !item.permission || permissions.includes(item.permission),
      ),
    }))
    .filter((group) => group.items.length > 0);
}

/** First screen of an organization the user may open, or null if there is none yet. */
export function organizationLanding(organization: {
  id: number;
  permissions: readonly string[];
}): string | null {
  const [first] = visibleNav(organizationNav(organization.id), organization.permissions)
    .flatMap((group) => group.items)
    .map((item) => item.to);
  return first ?? null;
}
