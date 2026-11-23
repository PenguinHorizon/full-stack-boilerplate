import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { ArrowRight, MapPin, Search, Store } from "lucide-react";
import { useState } from "react";
import { publicApi } from "@/shared/api/endpoints";
import { queryKeys } from "@/shared/api/query";
import { useDebouncedValue } from "@/shared/hooks/useDebouncedValue";
import { brandPalette } from "@/shared/lib/color";
import { initials } from "@/shared/lib/format";
import { EmptyState, ErrorState, Pagination, Skeleton } from "@/shared/ui";
import type { OrganizationDirectoryItemResponse } from "@/shared/types/api.generated";

const PLATFORM_NAME = import.meta.env.VITE_PLATFORM_NAME || "Tourism Platform";
const PAGE_SIZE = 12;

/**
 * Platform root (PLT-03): every publicly available organization, each linking
 * to its own branded site. Uses path mode (`/s/{slug}`), which works on any
 * single host without DNS setup.
 */
export default function DirectoryApp() {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const q = useDebouncedValue(search.trim(), 300);

  const params = { q: q || undefined, page, pageSize: PAGE_SIZE };
  const directory = useQuery({
    queryKey: queryKeys.directory(params),
    queryFn: () => publicApi.directory(params),
    placeholderData: keepPreviousData,
  });

  return (
    <div className="flex min-h-dvh flex-col">
      <title>{`${PLATFORM_NAME} · Find an organization`}</title>
      <meta
        name="description"
        content="Browse organizations, see their menus and order directly from each one."
      />

      <header className="border-b border-line">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
          <span className="font-display text-lg font-semibold tracking-tight">
            {PLATFORM_NAME}
          </span>
          <a href="/admin" className="text-sm font-medium text-ink-muted hover:text-ink">
            Organization sign in
          </a>
        </div>
      </header>

      <main className="flex-1">
        <section className="mx-auto max-w-6xl px-4 pt-16 pb-10 sm:px-6 sm:pt-20">
          <h1 className="max-w-2xl font-display text-4xl leading-tight font-semibold tracking-tight text-balance sm:text-5xl">
            Find an organization and visit its website.
          </h1>
          <p className="mt-4 max-w-xl text-lg text-ink-muted">
            Every organization here runs its own site — browse the menu and order
            directly.
          </p>

          <div className="relative mt-8 max-w-lg">
            <label htmlFor="directory-search" className="sr-only">
              Search organizations
            </label>
            <Search
              size={18}
              aria-hidden="true"
              className="pointer-events-none absolute top-1/2 left-4 -translate-y-1/2 text-ink-subtle"
            />
            <input
              id="directory-search"
              type="search"
              value={search}
              onChange={(event) => {
                setSearch(event.target.value);
                setPage(1);
              }}
              placeholder="Search by name or speciality"
              className="h-12 w-full rounded-full border border-line-strong bg-surface pr-4 pl-11 text-base text-ink shadow-card placeholder:text-ink-subtle"
            />
          </div>
        </section>

        <section
          aria-label="Organizations"
          aria-busy={directory.isFetching || undefined}
          className="mx-auto max-w-6xl px-4 pb-20 sm:px-6"
        >
          {directory.isPending ? (
            <ul className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {Array.from({ length: 6 }, (_, index) => (
                <li
                  key={index}
                  className="overflow-hidden rounded-card border border-line"
                >
                  <Skeleton className="h-28 rounded-none" />
                  <div className="space-y-2 p-5">
                    <Skeleton className="h-5 w-1/2" />
                    <Skeleton className="h-4 w-3/4" />
                  </div>
                </li>
              ))}
            </ul>
          ) : directory.isError ? (
            <ErrorState error={directory.error} onRetry={() => directory.refetch()} />
          ) : directory.data.items.length === 0 ? (
            <EmptyState
              icon={Store}
              title={q ? `No organizations match “${q}”` : "No organizations yet"}
              description={
                q
                  ? "Try a different name or city."
                  : "Organizations appear here once they go live."
              }
            />
          ) : (
            <>
              <ul className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
                {directory.data.items.map((organization) => (
                  <li key={organization.slug}>
                    <OrganizationCard organization={organization} />
                  </li>
                ))}
              </ul>
              <div className="mt-8 overflow-hidden rounded-card border border-line bg-surface">
                <Pagination
                  page={page}
                  pageSize={PAGE_SIZE}
                  total={directory.data.meta.total}
                  onPageChange={(next) => {
                    setPage(next);
                    window.scrollTo({ top: 0, behavior: "smooth" });
                  }}
                />
              </div>
            </>
          )}
        </section>
      </main>

      <footer className="border-t border-line">
        <p className="mx-auto max-w-6xl px-4 py-6 text-xs text-ink-subtle sm:px-6">
          © {new Date().getFullYear()} {PLATFORM_NAME}
        </p>
      </footer>
    </div>
  );
}

function OrganizationCard({
  organization,
}: {
  organization: OrganizationDirectoryItemResponse;
}) {
  const palette = brandPalette(organization.brand.primary, organization.brand.accent);
  return (
    <a
      href={`/s/${organization.slug}`}
      className="group flex h-full flex-col overflow-hidden rounded-card border border-line bg-surface shadow-card transition-shadow hover:shadow-raised"
    >
      <div
        className="relative flex h-28 items-end p-5"
        style={{ backgroundColor: palette.brand, color: palette.brandContrast }}
      >
        {organization.coverUrl && (
          <img
            src={organization.coverUrl}
            alt=""
            loading="lazy"
            className="absolute inset-0 size-full object-cover opacity-90"
          />
        )}
        <span
          aria-hidden="true"
          className="relative grid size-12 place-items-center rounded-card font-display text-lg font-semibold shadow-raised"
          style={{ backgroundColor: palette.accent, color: palette.accentContrast }}
        >
          {initials(organization.name)}
        </span>
      </div>
      <div className="flex flex-1 flex-col p-5">
        <h2 className="font-display text-xl font-semibold text-ink">
          {organization.name}
        </h2>
        {organization.tagline && (
          <p className="mt-1.5 text-sm text-ink-muted">{organization.tagline}</p>
        )}
        <div className="mt-auto flex items-center justify-between pt-5 text-sm text-ink-subtle">
          <span className="inline-flex items-center gap-1.5">
            {organization.city && (
              <>
                <MapPin size={14} aria-hidden="true" />
                {organization.city}
              </>
            )}
          </span>
          <ArrowRight
            size={16}
            aria-hidden="true"
            className="text-ink transition-transform group-hover:translate-x-0.5"
          />
        </div>
      </div>
    </a>
  );
}
