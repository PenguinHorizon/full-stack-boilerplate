import type { ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useStaffSession } from "@/shared/auth/staff-session";
import { retryStaffSession } from "@/shared/auth/use-staff-auth";
import { Button } from "@/shared/ui/Button";
import { PageSpinner } from "@/shared/ui/Spinner";

/**
 * Gate for every signed-in admin route. What the user may do inside a
 * organization comes from their memberships (AccessGate); the API enforces the
 * same rules on every request, this only decides what to render.
 */
export function RequireStaff({ children }: { children: ReactNode }) {
  const bootstrapping = useStaffSession((s) => s.bootstrapping);
  const checkFailed = useStaffSession((s) => s.sessionCheckFailed);
  const signedIn = useStaffSession((s) => Boolean(s.accessToken));
  const location = useLocation();

  // Wait for the refresh-cookie exchange, or a hard reload bounces to sign-in.
  if (bootstrapping) return <PageSpinner label="Checking your session" />;

  // Not a sign-out: the server couldn't be asked. Offer another try.
  if (checkFailed && !signedIn) {
    return (
      <main className="grid min-h-dvh place-items-center bg-canvas p-6">
        <div role="alert" className="max-w-sm text-center">
          <h1 className="text-lg font-semibold text-ink">
            We couldn’t check your session
          </h1>
          <p className="mt-2 text-sm text-ink-muted">
            The server didn’t answer or is busy. You are probably still signed in; try
            again in a moment.
          </p>
          <Button className="mt-5" onClick={() => void retryStaffSession()}>
            Try again
          </Button>
        </div>
      </main>
    );
  }

  if (!signedIn) {
    const target = `${location.pathname}${location.search}${location.hash}`;
    return (
      <Navigate to={`/admin/sign-in?redirect=${encodeURIComponent(target)}`} replace />
    );
  }

  return children;
}
