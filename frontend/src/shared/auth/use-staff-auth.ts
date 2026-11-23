import { isAxiosError } from "axios";
import { useCallback, useEffect } from "react";
import { refreshAccessToken } from "@/shared/api/client";
import { isApiError } from "@/shared/api/errors";
import { staffAuthApi } from "@/shared/api/endpoints";
import { queryClient } from "@/shared/api/query";
import { useStaffSession } from "./staff-session";

/** Sign in / sign out for the admin portal. Session state lives in the store. */
export function useStaffAuth() {
  const setSession = useStaffSession((s) => s.setSession);
  const clearSession = useStaffSession((s) => s.clearSession);

  const signIn = useCallback(
    async (credentials: { email: string; password: string }) => {
      const session = await staffAuthApi.login(credentials);
      setSession(session);
      return session;
    },
    [setSession],
  );

  const signOut = useCallback(async () => {
    try {
      // Must reach the server, or the refresh-token family stays valid.
      await staffAuthApi.logout();
    } catch {
      // Already-expired session: local teardown below is still correct.
    } finally {
      clearSession();
      // Nothing from the previous user may be shown to the next one.
      queryClient.removeQueries({ queryKey: ["admin"] });
    }
  }, [clearSession]);

  return { signIn, signOut };
}

let bootstrap: Promise<void> | null = null;

/** HTTP status of a failed session call (raw axios for refresh, ApiError otherwise). */
function statusOf(error: unknown): number | undefined {
  if (isApiError(error)) return error.status || undefined;
  if (isAxiosError(error)) return error.response?.status;
  return undefined;
}

/** Only these mean "no valid session"; anything else means "couldn't tell". */
const SIGNED_OUT = new Set([400, 401, 403]);

/**
 * Exchanges the httpOnly refresh cookie for an access token and loads the
 * principal — once per page load. Module-level (not effect-scoped) so React
 * StrictMode's mount → unmount → mount cannot cancel it half-way and leave
 * the portal on a spinner.
 */
export function bootstrapStaffSession(): Promise<void> {
  bootstrap ??= (async () => {
    const { setSession, clearSession, setSessionCheckFailed } =
      useStaffSession.getState();
    try {
      const accessToken = await refreshAccessToken();
      const me = await staffAuthApi.me();
      setSession({ user: me, accessToken });
    } catch (error) {
      const status = statusOf(error);
      // A network blip, a rate limit or a server error must not sign anyone
      // out: their cookie may be fine. RequireStaff offers to try again.
      if (status !== undefined && SIGNED_OUT.has(status)) clearSession();
      else setSessionCheckFailed(true);
    }
  })();
  return bootstrap;
}

/** "Try again" after a failed session check. */
export function retryStaffSession(): Promise<void> {
  bootstrap = null;
  useStaffSession.setState({ bootstrapping: true, sessionCheckFailed: false });
  return bootstrapStaffSession();
}

/** Test hook: lets each test start from a fresh bootstrap. */
export function resetStaffBootstrapForTests() {
  bootstrap = null;
}

export function useStaffSessionBootstrap() {
  useEffect(() => {
    void bootstrapStaffSession();
  }, []);
}
