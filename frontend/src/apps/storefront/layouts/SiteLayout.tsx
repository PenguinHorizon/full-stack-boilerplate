import { ArrowUpRight, Menu as MenuIcon, MessageCircle, Phone } from "lucide-react";
import { Suspense, useEffect, useState } from "react";
import { Link, NavLink, Outlet, ScrollRestoration } from "react-router-dom";
import { cn, formatPhone } from "@/shared/lib/format";
import { mailHref, mapsSearchHref, telHref, whatsappHref } from "@/shared/lib/links";
import { buttonClasses } from "@/shared/ui/classes";
import { Drawer } from "@/shared/ui/Overlay";
import { BrandMark } from "../components/BrandMark";
import { LoadingBlock, Seo } from "../components/Bits";
import { PreviewBar } from "../components/PreviewBar";
import { WhatsAppFab } from "../components/ContactActions";
import { AccountLink } from "../account/AccountLink";
import { restoreCustomer } from "../account/customer-session";
import { useSite } from "../site-context";

const SOCIAL_LABELS: Record<string, string> = {
  facebook: "Facebook",
  instagram: "Instagram",
  tiktok: "TikTok",
  x: "X",
  youtube: "YouTube",
};

interface NavEntry {
  to: string;
  label: string;
}

/**
 * Main sections; optional pages only when they have content. Add your
 * domain's public pages (e.g. tours) to `main`.
 */
function useNavigation(): { main: NavEntry[]; more: NavEntry[]; legal: NavEntry[] } {
  const { site } = useSite();
  const pages = new Set(site.navigation.pages);
  const main: NavEntry[] = [
    ...(pages.has("about") ? [{ to: "/about", label: "About" }] : []),
    ...(pages.has("gallery") ? [{ to: "/gallery", label: "Gallery" }] : []),
    ...(pages.has("faqs") ? [{ to: "/faqs", label: "FAQs" }] : []),
    { to: "/contact", label: "Contact" },
  ];
  const more: NavEntry[] = [];
  const legal: NavEntry[] = [
    ...(pages.has("privacy") ? [{ to: "/privacy", label: "Privacy" }] : []),
    ...(pages.has("terms") ? [{ to: "/terms", label: "Terms" }] : []),
  ];
  return { main, more, legal };
}

/** The storefront shell: header, page, footer, and the WhatsApp button. */
export function SiteLayout() {
  const { slug, site } = useSite();
  const { organization } = site;
  const { main, more } = useNavigation();
  const [drawer, setDrawer] = useState(false);

  // Restore a signed-in customer (only when this browser signed in before).
  useEffect(() => {
    restoreCustomer(slug);
  }, [slug]);
  const call = telHref(organization.contact.phone);
  const whatsapp = whatsappHref(
    organization.contact.whatsapp,
    `Hi ${organization.name}, I'd like to ask a question.`,
  );

  return (
    <div className="flex min-h-dvh flex-col">
      <PreviewBar />
      <Seo />
      <ScrollRestoration />
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-50 focus:rounded-control focus:bg-surface focus:px-4 focus:py-2 focus:shadow-raised"
      >
        Skip to content
      </a>

      <header className="sticky top-0 z-30 border-b border-line bg-canvas/90 backdrop-blur supports-[backdrop-filter]:bg-canvas/80">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4 sm:h-20 sm:px-6">
          <Link to="/" className="flex min-w-0 items-center gap-3">
            <BrandMark name={organization.name} logoUrl={organization.logoUrl} />
            <span className="truncate font-display text-lg font-semibold tracking-tight text-ink sm:text-xl">
              {organization.name}
            </span>
          </Link>

          <nav aria-label="Main" className="hidden lg:block">
            <ul className="flex items-center gap-1">
              {main.map((entry) => (
                <li key={entry.to}>
                  <NavLink
                    to={entry.to}
                    className={({ isActive }) =>
                      cn(
                        "rounded-full px-3.5 py-2 text-sm font-medium transition-colors",
                        isActive
                          ? "bg-accent-soft text-accent"
                          : "text-ink-muted hover:text-ink",
                      )
                    }
                  >
                    {entry.label}
                  </NavLink>
                </li>
              ))}
            </ul>
          </nav>

          <div className="flex shrink-0 items-center gap-2">
            {call && (
              <span className="hidden xl:block">
                <a href={call} className={buttonClasses("ghost", "md", "text-ink")}>
                  <Phone size={16} aria-hidden="true" />
                  {formatPhone(organization.contact.phone)}
                </a>
              </span>
            )}
            <span className="hidden sm:block">
              <AccountLink />
            </span>
            <span className="hidden sm:block">
              <Link to="/contact" className={buttonClasses("primary", "md")}>
                Get in touch
              </Link>
            </span>
            <span className="lg:hidden">
              <button
                type="button"
                onClick={() => setDrawer(true)}
                className="grid size-10 place-items-center rounded-full border border-line text-ink hover:bg-surface-muted"
                aria-label="Open menu"
                aria-expanded={drawer}
              >
                <MenuIcon size={20} aria-hidden="true" />
              </button>
            </span>
          </div>
        </div>
      </header>

      <Drawer open={drawer} onOpenChange={setDrawer} title={organization.name}>
        <div className="mb-4 flex flex-wrap items-center gap-2 sm:hidden">
          <span onClickCapture={() => setDrawer(false)}>
            <AccountLink />
          </span>
        </div>
        <nav aria-label="Main">
          <ul className="space-y-1">
            {[...main, ...more].map((entry) => (
              <li key={entry.to}>
                <NavLink
                  to={entry.to}
                  onClick={() => setDrawer(false)}
                  className={({ isActive }) =>
                    cn(
                      "block rounded-card px-4 py-3 text-lg font-medium",
                      isActive
                        ? "bg-accent-soft text-accent"
                        : "text-ink hover:bg-surface-muted",
                    )
                  }
                >
                  {entry.label}
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>
        <div className="mt-6 space-y-2 border-t border-line pt-6">
          {call && (
            <a href={call} className={buttonClasses("secondary", "lg", "w-full")}>
              <Phone size={18} aria-hidden="true" /> Call{" "}
              {formatPhone(organization.contact.phone)}
            </a>
          )}
          {whatsapp && (
            <a
              href={whatsapp}
              target="_blank"
              rel="noreferrer"
              className={buttonClasses("primary", "lg", "w-full")}
            >
              <MessageCircle size={18} aria-hidden="true" /> WhatsApp us
            </a>
          )}
        </div>
      </Drawer>

      <main id="main" className="flex-1">
        {/* Most pages load on first visit (StorefrontApp); header and footer stay put. */}
        <Suspense fallback={<LoadingBlock />}>
          <Outlet />
        </Suspense>
      </main>

      <SiteFooter />
      {/* Floating shortcuts live in a landmark like everything else on the page. */}
      <aside aria-label="Quick actions">
        <WhatsAppFab raised={false} />
      </aside>
    </div>
  );
}

function SiteFooter() {
  const { site } = useSite();
  const { organization } = site;
  const { main, more, legal } = useNavigation();
  const socials = Object.entries(organization.social).filter(
    (entry): entry is [string, string] => typeof entry[1] === "string",
  );
  const year = new Date().getFullYear();

  return (
    <footer className="bg-[#1C1A17] pb-20 text-white/75 sm:pb-0">
      <div className="mx-auto grid grid-cols-1 max-w-6xl gap-10 px-4 py-14 sm:grid-cols-2 sm:px-6 lg:grid-cols-[1.4fr_1fr_1.2fr_1fr]">
        <div>
          <div className="flex items-center gap-3">
            <BrandMark
              name={organization.name}
              logoUrl={organization.logoUrl}
              size={36}
            />
            <span className="font-display text-xl font-semibold text-white">
              {organization.name}
            </span>
          </div>
          {organization.shortDescription && (
            <p className="mt-4 max-w-sm text-sm leading-relaxed">
              {organization.shortDescription}
            </p>
          )}
          {site.footerText && (
            <p className="mt-3 text-sm text-white/60">{site.footerText}</p>
          )}
        </div>

        <div>
          <h2 className="text-xs font-semibold tracking-[0.14em] text-white uppercase">
            Explore
          </h2>
          <ul className="mt-4 space-y-2 text-sm">
            {[...main, ...more].map((entry) => (
              <li key={entry.to}>
                <Link to={entry.to} className="hover:text-white">
                  {entry.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <h2 className="text-xs font-semibold tracking-[0.14em] text-white uppercase">
            Visit us
          </h2>
          <address className="mt-4 space-y-1 text-sm not-italic">
            {organization.contact.address && <p>{organization.contact.address}</p>}
            {organization.contact.city && <p>{organization.contact.city}</p>}
            {mapsSearchHref(organization.contact.address, organization.contact.city) && (
              <a
                href={mapsSearchHref(
                  organization.contact.address,
                  organization.contact.city,
                )!}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 font-medium text-white hover:underline"
              >
                Get directions <ArrowUpRight size={13} aria-hidden="true" />
              </a>
            )}
          </address>
        </div>

        <div>
          <h2 className="text-xs font-semibold tracking-[0.14em] text-white uppercase">
            Contact
          </h2>
          <ul className="mt-4 space-y-2 text-sm">
            {organization.contact.phone && (
              <li>
                <a
                  href={telHref(organization.contact.phone)!}
                  className="hover:text-white"
                >
                  {formatPhone(organization.contact.phone)}
                </a>
              </li>
            )}
            {organization.contact.email && (
              <li>
                <a
                  href={mailHref(organization.contact.email)!}
                  className="break-all hover:text-white"
                >
                  {organization.contact.email}
                </a>
              </li>
            )}
            {socials.map(([network, url]) => (
              <li key={network}>
                <a
                  href={url}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 hover:text-white"
                >
                  {SOCIAL_LABELS[network] ?? network}
                  <ArrowUpRight size={13} aria-hidden="true" />
                </a>
              </li>
            ))}
          </ul>
        </div>
      </div>
      <div className="border-t border-white/10">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-5 text-xs text-white/50 sm:px-6">
          <p>
            © {year} {organization.name}. All rights reserved.
          </p>
          {legal.length > 0 && (
            <ul className="flex gap-4">
              {legal.map((entry) => (
                <li key={entry.to}>
                  <Link to={entry.to} className="hover:text-white">
                    {entry.label}
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </footer>
  );
}
