import { useStaffSession } from "./staff-session";
import type { StaffPrincipalResponse } from "@/shared/types/api.generated";

const user: StaffPrincipalResponse = {
  userId: 1,
  userCode: "USR000001",
  email: "admin@example.com",
  name: "Admin",
  phone: null,
  avatar: null,
  isSuperAdmin: true,
};

describe("staff session store", () => {
  beforeEach(() => {
    localStorage.clear();
    useStaffSession.getState().clearSession();
  });

  it("stores a session", () => {
    useStaffSession.getState().setSession({ user, accessToken: "token" });
    const state = useStaffSession.getState();
    expect(state.accessToken).toBe("token");
    expect(state.user?.isSuperAdmin).toBe(true);
    expect(state.bootstrapping).toBe(false);
  });

  it("never persists the access token", () => {
    useStaffSession.getState().setSession({ user, accessToken: "secret-token" });
    const persisted = localStorage.getItem("staff-session") ?? "";
    expect(persisted).toContain("admin@example.com");
    expect(persisted).not.toContain("secret-token");
  });

  it("clears everything on sign-out, including the last organization", () => {
    useStaffSession.getState().setSession({ user, accessToken: "token" });
    useStaffSession.getState().setLastOrganizationId(4);
    useStaffSession.getState().clearSession();
    const state = useStaffSession.getState();
    expect(state.user).toBeNull();
    expect(state.accessToken).toBeNull();
    expect(state.lastOrganizationId).toBeNull();
  });

  it("remembers the last organization for the same person only", () => {
    const store = useStaffSession.getState();
    store.setSession({ user, accessToken: "a" });
    store.setLastOrganizationId(4);

    // Token refresh / re-sign-in by the same person keeps it.
    useStaffSession.getState().setSession({ user, accessToken: "b" });
    expect(useStaffSession.getState().lastOrganizationId).toBe(4);

    // Someone else signing in on this browser starts fresh.
    useStaffSession
      .getState()
      .setSession({ user: { ...user, userId: 2, email: "b@x.co" }, accessToken: "c" });
    expect(useStaffSession.getState().lastOrganizationId).toBeNull();
  });

  it("merges profile updates into the cached user", () => {
    useStaffSession.getState().setSession({ user, accessToken: "token" });
    useStaffSession.getState().updateUser({ name: "Renamed" });
    expect(useStaffSession.getState().user?.name).toBe("Renamed");
  });
});
