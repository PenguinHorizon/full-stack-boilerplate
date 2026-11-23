import { ExternalLink } from "lucide-react";
import { Suspense } from "react";
import { PageSpinner } from "@/shared/ui/Spinner";
import { NavLink, Outlet, useLocation } from "react-router-dom";
import { cn } from "@/shared/lib/format";
import { buttonClasses, PageHeader } from "@/shared/ui";
import { useCurrentOrganization } from "../../../access/access-context";
import { storefrontPreviewHref } from "../../../lib/links";

/** Website editors: one place for everything customers read. */
const WEBSITE_SECTIONS = [
  { path: "home", label: "Home page" },
  { path: "banners", label: "Banners" },
  { path: "gallery", label: "Gallery" },
  { path: "testimonials", label: "Reviews" },
  { path: "faqs", label: "FAQs" },
  { path: "pages/about", label: "About us" },
  { path: "pages/privacy", label: "Privacy policy" },
  { path: "pages/terms", label: "Terms of service" },
] as const;

export function WebsiteLayout() {
  const organization = useCurrentOrganization();
  const { pathname } = useLocation();
  const section = WEBSITE_SECTIONS.find((item) =>
    pathname.endsWith(`/website/${item.path}`),
  );
  return (
    <>
      <title>{`${section ? `${section.label} · ` : ""}Website · ${organization.name} · Admin`}</title>
      <PageHeader
        title="Website"
        description="Change what customers see on your site. Drafts stay hidden until you publish them."
        breadcrumbs={[
          { label: organization.name, to: `/admin/${organization.id}` },
          { label: "Website" },
        ]}
        actions={
          <a
            href={storefrontPreviewHref(organization.slug)}
            target="_blank"
            rel="noopener noreferrer"
            className={buttonClasses("secondary")}
          >
            Preview with drafts <ExternalLink size={15} aria-hidden="true" />
          </a>
        }
      />
      <div className="flex flex-col gap-6 lg:flex-row">
        <nav aria-label="Website sections" className="lg:w-56 lg:shrink-0">
          <ul className="scrollbar-none -mx-4 flex gap-1 overflow-x-auto px-4 lg:mx-0 lg:flex-col lg:px-0">
            {WEBSITE_SECTIONS.map((item) => (
              <li key={item.path} className="shrink-0">
                <NavLink
                  to={`/admin/${organization.id}/website/${item.path}`}
                  className={({ isActive }) =>
                    cn(
                      "block rounded-control px-3 py-2 text-sm font-medium whitespace-nowrap transition-colors",
                      isActive
                        ? "bg-accent-soft text-accent"
                        : "text-ink-muted hover:bg-surface-muted hover:text-ink",
                    )
                  }
                >
                  {item.label}
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
