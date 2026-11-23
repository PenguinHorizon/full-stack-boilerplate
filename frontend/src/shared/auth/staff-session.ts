import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { StaffPrincipalResponse } from "@/shared/types/api.generated";

export interface StaffSessionState {
  /**
   * Who is signed in. Roles and permissions are per organization, so they are
   * not part of the principal: they come from `GET /admin/me/organizations`.
   */
  user: StaffPrincipalResponse | null;
  /** In memory only — never persisted (XSS could otherwise exfiltrate it). */
  accessToken: string | null;
  /** True until the initial refresh-cookie exchange settles. */
  bootstrapping: boolean;
  /**
   * The session check couldn't reach a verdict (network, rate limit, server
   * error). Not the same as signed out: the cookie may still be valid.
   */
  sessionCheckFailed: boolean;
  /** The organization `/admin` reopens; cleared on sign-out. */
  lastOrganizationId: number | null;

  setAccessToken: (token: string | null) => void;
  setSession: (session: { user: StaffPrincipalResponse; accessToken: string }) => void;
  updateUser: (fields: Partial<StaffPrincipalResponse>) => void;
  clearSession: () => void;
  setBootstrapping: (value: boolean) => void;
  setSessionCheckFailed: (value: boolean) => void;
  setLastOrganizationId: (id: number | null) => void;
}

/**
 * The single source of truth for the staff session (admin portal).
 * The refresh token lives in an httpOnly cookie; the principal is cached so
 * the shell can paint immediately while the token is re-obtained.
 */
export const useStaffSession = create<StaffSessionState>()(
  persist(
    (set) => ({
      user: null,
      accessToken: null,
      bootstrapping: true,
      sessionCheckFailed: false,
      lastOrganizationId: null,

      setAccessToken: (accessToken) => set({ accessToken }),

      setSession: ({ user, accessToken }) =>
        set((state) => ({
          user,
          accessToken,
          bootstrapping: false,
          sessionCheckFailed: false,
          // Another account on this browser must not inherit the last organization.
          lastOrganizationId:
            state.user && state.user.userId !== user.userId
              ? null
              : state.lastOrganizationId,
        })),

      updateUser: (fields) =>
        set((state) => ({
          user: state.user ? { ...state.user, ...fields } : state.user,
        })),

      clearSession: () =>
        set({
          user: null,
          accessToken: null,
          bootstrapping: false,
          sessionCheckFailed: false,
          lastOrganizationId: null,
        }),

      setBootstrapping: (bootstrapping) => set({ bootstrapping }),

      setSessionCheckFailed: (sessionCheckFailed) =>
        set({ sessionCheckFailed, bootstrapping: false }),

      setLastOrganizationId: (lastOrganizationId) => set({ lastOrganizationId }),
    }),
    {
      name: "staff-session",
      version: 2,
      // v1 cached roles/permissions on the principal; they are per organization now.
      migrate: () => ({ user: null, lastOrganizationId: null }),
      partialize: (state) => ({
        user: state.user,
        lastOrganizationId: state.lastOrganizationId,
      }),
    },
  ),
);

export const useIsSignedIn = () => useStaffSession((s) => Boolean(s.accessToken));

export const useIsSuperAdmin = () =>
  useStaffSession((s) => s.user?.isSuperAdmin === true);
