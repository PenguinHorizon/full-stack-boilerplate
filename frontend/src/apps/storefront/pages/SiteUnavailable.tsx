import { RefreshCw, Store } from "lucide-react";
import { isApiError } from "@/shared/api/errors";

/**
 * Shown when the host or slug does not map to a publicly available
 * organization (unknown, draft, suspended, website off — the API makes these
 * indistinguishable on purpose), or when the bootstrap request fails.
 */
export function SiteUnavailable({
  error,
  onRetry,
}: {
  error: unknown;
  onRetry?: () => void;
}) {
  const unavailable = isApiError(error) && error.code === "ORGANIZATION_UNAVAILABLE";

  return (
    <main className="grid min-h-dvh place-items-center bg-canvas px-6 text-center">
      <title>{unavailable ? "Organization not available" : "Something went wrong"}</title>
      <div className="max-w-md">
        <span className="mx-auto mb-6 grid size-14 place-items-center rounded-full bg-surface-muted text-ink-subtle">
          <Store size={26} aria-hidden="true" />
        </span>
        <h1 className="font-display text-3xl font-semibold text-ink">
          {unavailable
            ? "This organization isn't available"
            : "We couldn't load this page"}
        </h1>
        <p className="mt-3 text-ink-muted">
          {unavailable
            ? "The website you're looking for doesn't exist or is not open to visitors right now."
            : "Please check your connection and try again."}
        </p>
        {!unavailable && onRetry && (
          <button
            type="button"
            onClick={onRetry}
            className="mt-8 inline-flex h-11 items-center gap-2 rounded-full bg-ink px-6 text-sm font-medium text-white hover:bg-ink/85"
          >
            <RefreshCw size={16} aria-hidden="true" />
            Try again
          </button>
        )}
      </div>
    </main>
  );
}
