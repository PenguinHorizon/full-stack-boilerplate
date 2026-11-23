import { NavLink, Outlet, useLocation } from "react-router-dom";
import { Suspense } from "react";
import { PageSpinner } from "@/shared/ui/Spinner";
import { cn } from "@/shared/lib/format";
import { PageHeader } from "@/shared/ui";
import { useCurrentOrganization } from "../../../access/access-context";

/** Settings sections. Add a route in AdminApp.tsx for each new one. */
const SETTINGS_SECTIONS = [
  { path: "profile", label: "Profile & contact" },
  { path: "branding", label: "Branding" },
  { path: "website", label: "Website & SEO" },
] as const;

export function SettingsLayout() {
  const organization = useCurrentOrganization();
  const { pathname } = useLocation();
  const section = SETTINGS_SECTIONS.find((item) =>
    pathname.endsWith(`/settings/${item.path}`),
  );
  return (
    <>
      <title>{`${section ? `${section.label} · ` : ""}Settings · ${organization.name} · Admin`}</title>
      <PageHeader
        title="Settings"
        description={`How ${organization.name} looks and appears online.`}
        breadcrumbs={[
          { label: organization.name, to: `/admin/${organization.id}` },
          { label: "Settings" },
        ]}
      />
      <div className="flex flex-col gap-6 lg:flex-row">
        <nav aria-label="Settings sections" className="lg:w-56 lg:shrink-0">
          <ul className="scrollbar-none -mx-4 flex gap-1 overflow-x-auto px-4 lg:mx-0 lg:flex-col lg:px-0">
            {SETTINGS_SECTIONS.map((section) => (
              <li key={section.path} className="shrink-0">
                <NavLink
                  to={`/admin/${organization.id}/settings/${section.path}`}
                  className={({ isActive }) =>
                    cn(
                      "block rounded-control px-3 py-2 text-sm font-medium whitespace-nowrap transition-colors",
                      isActive
                        ? "bg-accent-soft text-accent"
                        : "text-ink-muted hover:bg-surface-muted hover:text-ink",
                    )
                  }
                >
                  {section.label}
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>
        <div className="min-w-0 flex-1 space-y-6">
          <Suspense fallback={<PageSpinner label="Loading" />}>
            <Outlet />
          </Suspense>
        </div>
      </div>
    </>
  );
}
