import { QueryClientProvider, useQuery } from "@tanstack/react-query";
import { lazy, Suspense } from "react";
import { publicApi } from "@/shared/api/endpoints";
import { queryClient, queryKeys } from "@/shared/api/query";
import { ErrorBoundary } from "@/shared/ui/ErrorBoundary";
import { PageSpinner } from "@/shared/ui/Spinner";
import { Toaster } from "@/shared/ui/Toaster";
import { TooltipProvider } from "@/shared/ui/Overlay";
import { SiteUnavailable } from "@/apps/storefront/pages/SiteUnavailable";
import type { AppTarget } from "./resolve-app";

/*
 * Each app is its own lazily-loaded chunk: customers never download admin
 * code, and staff never download storefront code (ADR-004).
 */
const AdminApp = lazy(() => import("@/apps/admin/AdminApp"));
const StorefrontApp = lazy(() => import("@/apps/storefront/StorefrontApp"));
const DirectoryApp = lazy(() => import("@/apps/platform/DirectoryApp"));

/** Brand domain or `{slug}.platform` → ask the API which organization this is. */
function HostStorefront({ host }: { host: string }) {
  const resolved = useQuery({
    queryKey: queryKeys.siteResolve(host),
    queryFn: () => publicApi.resolveSite(host),
    staleTime: Infinity,
  });

  if (resolved.isPending) return <PageSpinner label="Loading organization" />;
  if (resolved.isError) return <SiteUnavailable error={resolved.error} />;
  return <StorefrontApp slug={resolved.data.organizationSlug} basename="/" />;
}

function AppForTarget({ target }: { target: AppTarget }) {
  switch (target.kind) {
    case "admin":
      return <AdminApp />;
    case "platform":
      return <DirectoryApp />;
    case "storefront":
      return <StorefrontApp slug={target.slug} basename={target.basename} />;
    case "storefront-host":
      return <HostStorefront host={target.host} />;
  }
}

export function Root({ target }: { target: AppTarget }) {
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <Suspense fallback={<PageSpinner />}>
            <AppForTarget target={target} />
          </Suspense>
          <Toaster />
        </TooltipProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}
