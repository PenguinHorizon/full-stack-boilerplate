import {
  Menu as MenuIcon,
  PanelLeftClose,
  PanelLeftOpen,
  ShieldAlert,
} from "lucide-react";
import { Suspense, useState } from "react";
import { PageSpinner } from "@/shared/ui/Spinner";
import { Link, NavLink, Outlet } from "react-router-dom";
import { useIsSuperAdmin } from "@/shared/auth/staff-session";
import { cn } from "@/shared/lib/format";
import { Button, Drawer, IconButton, Tooltip } from "@/shared/ui";
import type { AccessibleOrganization } from "../access/access-context";
import {
  PLATFORM_NAV,
  PLATFORM_SHORTCUT,
  organizationNav,
  visibleNav,
  type NavGroup,
} from "../nav";
import { OrganizationSwitcher } from "./OrganizationSwitcher";
import { useShellPrefs } from "./shell-prefs";
import { useShellContext, type ShellArea } from "./shell-context";
import { NotificationBell } from "./NotificationBell";
import { UserMenu } from "./UserMenu";

const PLATFORM_NAME = import.meta.env.VITE_PLATFORM_NAME || "Tourism Platform";

function navFor(
  area: ShellArea,
  organization: AccessibleOrganization | null,
  isSuperAdmin: boolean,
): NavGroup[] {
  if (area === "platform") return PLATFORM_NAV;
  if (organization) {
    const groups = visibleNav(organizationNav(organization.id), organization.permissions);
    return isSuperAdmin ? [...groups, PLATFORM_SHORTCUT] : groups;
  }
  return isSuperAdmin ? PLATFORM_NAV : [];
}

function SidebarNav({
  groups,
  collapsed = false,
  onNavigate,
}: {
  groups: NavGroup[];
  collapsed?: boolean;
  onNavigate?: () => void;
}) {
  return (
    <nav
      aria-label="Admin"
      className={cn("flex flex-col gap-5 py-4", collapsed ? "px-2" : "px-3")}
    >
      {groups.map((group, index) => (
        <div key={group.label ?? index}>
          {group.label &&
            (collapsed ? (
              <hr className="mx-2 mb-2 border-line" aria-hidden="true" />
            ) : (
              <p className="mb-1.5 px-3 text-[0.7rem] font-semibold tracking-wider text-ink-subtle uppercase">
                {group.label}
              </p>
            ))}
          <ul className="space-y-0.5">
            {group.items.map((item) => {
              const link = (
                <NavLink
                  to={item.to}
                  end={item.end}
                  onClick={onNavigate}
                  className={({ isActive }) =>
                    cn(
                      "flex items-center gap-3 rounded-control py-2 text-sm font-medium transition-colors",
                      collapsed ? "justify-center px-2" : "px-3",
                      isActive
                        ? "bg-accent-soft text-accent"
                        : "text-ink-muted hover:bg-surface-muted hover:text-ink",
                    )
                  }
                >
                  <item.icon size={18} aria-hidden="true" className="shrink-0" />
                  <span className={cn(collapsed && "sr-only")}>{item.label}</span>
                </NavLink>
              );
              return (
                <li key={item.to}>
                  {collapsed ? (
                    // Wrapped: Radix's asChild would merge NavLink's className
                    // function as a string and drop the link's styles.
                    <Tooltip content={item.label}>
                      <span className="block">{link}</span>
                    </Tooltip>
                  ) : (
                    link
                  )}
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </nav>
  );
}

function Brand({ collapsed = false }: { collapsed?: boolean }) {
  return (
    <Link
      to="/admin"
      className={cn(
        "flex h-16 shrink-0 items-center gap-2.5 border-b border-line",
        collapsed ? "justify-center px-2" : "px-5",
      )}
    >
      <span
        aria-hidden="true"
        className="grid size-8 shrink-0 place-items-center rounded-control bg-accent text-sm font-bold text-on-accent"
      >
        R
      </span>
      <span className={cn("leading-tight", collapsed && "sr-only")}>
        <span className="block text-sm font-semibold text-ink">{PLATFORM_NAME}</span>
        <span className="block text-xs text-ink-subtle">Admin portal</span>
      </span>
    </Link>
  );
}

/** Shown while a super admin works inside an organization they don't belong to. */
function ActingAsPlatformAdmin({
  organization,
}: {
  organization: AccessibleOrganization;
}) {
  return (
    <div
      role="status"
      className="flex flex-wrap items-center gap-x-3 gap-y-1 border-b border-warning/30 bg-warning-soft px-4 py-2 text-sm text-warning sm:px-6"
    >
      <ShieldAlert size={16} aria-hidden="true" className="shrink-0" />
      <p className="min-w-0 flex-1">
        <strong className="font-semibold">Acting as platform admin</strong> in{" "}
        {organization.name}. Everything you change is recorded as a platform-admin action.
      </p>
      <Link to="/admin/platform" className="font-medium underline underline-offset-2">
        Back to platform
      </Link>
    </div>
  );
}

/**
 * Collapsible sidebar on large screens, slide-in drawer below `lg`. The top
 * bar carries the organization switcher, the branch scope and the user menu.
 */
export function AdminShell() {
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const collapsed = useShellPrefs((s) => s.sidebarCollapsed);
  const toggleSidebar = useShellPrefs((s) => s.toggleSidebar);
  const isSuperAdmin = useIsSuperAdmin();
  const { area, organization } = useShellContext();
  const groups = navFor(area, organization, isSuperAdmin);

  return (
    <div className="min-h-dvh bg-canvas">
      <a
        href="#admin-main"
        className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-50 focus:rounded-control focus:bg-surface focus:px-4 focus:py-2 focus:shadow-raised"
      >
        Skip to content
      </a>

      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-30 hidden flex-col border-r border-line bg-surface transition-[width] duration-200 lg:flex",
          collapsed ? "w-[4.5rem]" : "w-64",
        )}
      >
        <Brand collapsed={collapsed} />
        <div className="min-h-0 flex-1 overflow-y-auto">
          <SidebarNav groups={groups} collapsed={collapsed} />
        </div>
        <div
          className={cn("border-t border-line p-2", collapsed && "flex justify-center")}
        >
          {collapsed ? (
            <IconButton
              icon={PanelLeftOpen}
              label="Expand sidebar"
              onClick={toggleSidebar}
            />
          ) : (
            <Button
              variant="ghost"
              size="sm"
              icon={PanelLeftClose}
              onClick={toggleSidebar}
            >
              Collapse sidebar
            </Button>
          )}
        </div>
      </aside>

      <Drawer
        open={mobileNavOpen}
        onOpenChange={setMobileNavOpen}
        title="Menu"
        side="left"
      >
        <div className="-mx-5 -my-4">
          <SidebarNav groups={groups} onNavigate={() => setMobileNavOpen(false)} />
        </div>
      </Drawer>

      <div
        className={cn(
          "transition-[padding] duration-200",
          collapsed ? "lg:pl-[4.5rem]" : "lg:pl-64",
        )}
      >
        <header className="sticky top-0 z-20 border-b border-line bg-surface/90 backdrop-blur">
          <div className="flex h-16 items-center justify-between gap-3 px-4 sm:px-6">
            <div className="flex min-w-0 items-center gap-2">
              <span className="lg:hidden">
                <IconButton
                  icon={MenuIcon}
                  label="Open navigation"
                  onClick={() => setMobileNavOpen(true)}
                />
              </span>
              <OrganizationSwitcher
                current={organization}
                inPlatform={area === "platform"}
              />
            </div>
            <div className="flex items-center gap-1">
              {area === "organization" && organization && (
                <NotificationBell organization={organization} />
              )}
              <UserMenu organization={area === "platform" ? null : organization} />
            </div>
          </div>
          {area === "organization" && organization?.role === null && (
            <ActingAsPlatformAdmin organization={organization} />
          )}
        </header>

        <main id="admin-main" className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6">
          {/* Pages load on first visit; the shell stays put meanwhile. */}
          <Suspense fallback={<PageSpinner label="Loading" />}>
            <Outlet />
          </Suspense>
        </main>
      </div>
    </div>
  );
}
