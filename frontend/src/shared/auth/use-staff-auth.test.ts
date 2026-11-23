import { ApiError } from "@/shared/api/errors";
import { useStaffSession } from "./staff-session";
import {
  bootstrapStaffSession,
  resetStaffBootstrapForTests,
  retryStaffSession,
} from "./use-staff-auth";

const refreshAccessToken = vi.fn();
const me = vi.fn();

vi.mock("@/shared/api/client", () => ({
  refreshAccessToken: () => refreshAccessToken(),
}));
vi.mock("@/shared/api/endpoints", () => ({
  staffAuthApi: { me: () => me(), login: vi.fn(), logout: vi.fn() },
}));

const principal = {
  userId: 1,
  userCode: "USR000001",
  email: "admin@example.com",
  name: "Admin",
  phone: null,
  avatar: null,
  isSuperAdmin: true,
};

describe("bootstrapStaffSession", () => {
  beforeEach(() => {
    resetStaffBootstrapForTests();
    refreshAccessToken.mockReset();
    me.mockReset();
    useStaffSession.setState({
      accessToken: null,
      user: null,
      bootstrapping: true,
      sessionCheckFailed: false,
    });
  });

  it("restores the session once, however many times it is triggered", async () => {
    refreshAccessToken.mockResolvedValue("token");
    me.mockResolvedValue(principal);

    // StrictMode mounts effects twice; both must share one exchange.
    await Promise.all([bootstrapStaffSession(), bootstrapStaffSession()]);

    expect(refreshAccessToken).toHaveBeenCalledTimes(1);
    const state = useStaffSession.getState();
    expect(state.accessToken).toBe("token");
    expect(state.user?.email).toBe("admin@example.com");
    expect(state.bootstrapping).toBe(false);
  });

  it("ends bootstrapping signed out when there is no valid refresh cookie", async () => {
    refreshAccessToken.mockRejectedValue(
      new ApiError({ message: "No refresh token", status: 401, code: "UNAUTHENTICATED" }),
    );

    await bootstrapStaffSession();

    const state = useStaffSession.getState();
    expect(state.accessToken).toBeNull();
    expect(state.bootstrapping).toBe(false);
    expect(state.sessionCheckFailed).toBe(false);
    expect(me).not.toHaveBeenCalled();
  });

  it.each([
    [
      "a rate limit",
      new ApiError({ message: "Slow down", status: 429, code: "RATE_LIMITED" }),
    ],
    [
      "a dropped connection",
      new ApiError({
        message: "Offline",
        status: 0,
        code: "NETWORK_ERROR",
        isNetworkError: true,
      }),
    ],
    [
      "a server error",
      new ApiError({ message: "Boom", status: 503, code: "INTERNAL_ERROR" }),
    ],
  ])("doesn't sign anyone out after %s, and can try again", async (_label, error) => {
    useStaffSession.setState({ user: principal, lastOrganizationId: 4 });
    refreshAccessToken.mockRejectedValueOnce(error);

    await bootstrapStaffSession();
    let state = useStaffSession.getState();
    expect(state.sessionCheckFailed).toBe(true);
    expect(state.bootstrapping).toBe(false);
    expect(state.user?.userId).toBe(1);
    expect(state.lastOrganizationId).toBe(4);

    refreshAccessToken.mockResolvedValueOnce("token");
    me.mockResolvedValue(principal);
    await retryStaffSession();
    state = useStaffSession.getState();
    expect(state.accessToken).toBe("token");
    expect(state.sessionCheckFailed).toBe(false);
  });
});
