import { create } from "zustand";
import { customerApi } from "@/shared/api/customer";
import { isApiError } from "@/shared/api/errors";
import type {
  CustomerProfileResponse,
  CustomerSessionResponse,
} from "@/shared/types/api.generated";

/* ── Customer session: access token in memory, refresh cookie httpOnly ── */

type SessionStatus = "unknown" | "signed-in" | "guest";

interface CustomerSessionState {
  slug: string | null;
  accessToken: string | null;
  customer: CustomerProfileResponse | null;
  status: SessionStatus;
  signIn: (slug: string, session: CustomerSessionResponse) => void;
  setCustomer: (customer: CustomerProfileResponse) => void;
  signOut: () => void;
}

/** Remembers (per organization) that this browser has an account session to restore. */
const HINT = (slug: string) => `app-customer-${slug}`;

export const useCustomerSession = create<CustomerSessionState>()((set) => ({
  slug: null,
  accessToken: null,
  customer: null,
  status: "unknown",
  signIn: (slug, session) => {
    try {
      localStorage.setItem(HINT(slug), "1");
    } catch {
      /* Private mode: the session still works for this tab. */
    }
    set({
      slug,
      accessToken: session.accessToken,
      customer: session.customer,
      status: "signed-in",
    });
  },
  setCustomer: (customer) => set({ customer }),
  signOut: () =>
    set((state) => {
      if (state.slug) {
        try {
          localStorage.removeItem(HINT(state.slug));
        } catch {
          /* ignore */
        }
      }
      return { accessToken: null, customer: null, status: "guest" };
    }),
}));

let refreshing: Promise<string | null> | null = null;

/** Single-flight refresh from the path-scoped cookie; null when not signed in. */
export function refreshCustomer(slug: string): Promise<string | null> {
  refreshing ??= customerApi
    .refresh(slug)
    .then((session) => {
      useCustomerSession.getState().signIn(slug, session);
      return session.accessToken;
    })
    .catch((error) => {
      if (isApiError(error) && [400, 401, 403].includes(error.status)) {
        useCustomerSession.getState().signOut();
      } else {
        // Couldn't ask (offline, rate limit, server error): a guest for now, but
        // keep the "signed in here" hint so the next page load tries again.
        useCustomerSession.setState({ accessToken: null, status: "guest" });
      }
      return null;
    })
    .finally(() => {
      refreshing = null;
    });
  return refreshing;
}

/**
 * Restores a session on first load — only if this browser signed in before,
 * so guests never make a request that is bound to fail.
 */
export function restoreCustomer(slug: string): void {
  const state = useCustomerSession.getState();
  if (state.status !== "unknown" && state.slug === slug) return;
  let hinted = false;
  try {
    hinted = localStorage.getItem(HINT(slug)) === "1";
  } catch {
    hinted = false;
  }
  useCustomerSession.setState({ slug });
  if (hinted) void refreshCustomer(slug);
  else useCustomerSession.setState({ status: "guest" });
}

/**
 * Runs a customer API call with the access token, refreshing once on 401.
 * Rejects with the API error when the session cannot be renewed.
 */
export async function withCustomer<T>(
  slug: string,
  call: (token: string | null) => Promise<T>,
): Promise<T> {
  const token =
    useCustomerSession.getState().accessToken ?? (await refreshCustomer(slug));
  try {
    return await call(token);
  } catch (error) {
    if (isApiError(error) && error.status === 401) {
      const renewed = await refreshCustomer(slug);
      if (renewed) return call(renewed);
    }
    throw error;
  }
}
