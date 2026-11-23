import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { useStaffSession } from "@/shared/auth/staff-session";
import { AccessContext, type AccessibleOrganization } from "./access-context";
import {
  AdminHome,
  RequirePermission,
  OrganizationGate,
  OrganizationIndex,
} from "./gates";

function organization(
  id: number,
  role: AccessibleOrganization["role"],
  permissions: string[],
): AccessibleOrganization {
  return {
    id,
    slug: `r-${id}`,
    name: `Organization ${id}`,
    status: "active",
    brandPrimaryColor: "#C8553D",
    timezone: "Asia/Karachi",
    currencyCode: "PKR",
    role,
    permissions,
  };
}

const owned = organization(1, "OWNER", ["dashboard.view", "team.view"]);
/** Holds only an action permission: no screen of its own to land on. */
const staffed = organization(2, "MEMBER", ["media.upload"]);

function renderAt(path: string, organizations = [owned, staffed]) {
  return render(
    <AccessContext.Provider value={organizations}>
      <MemoryRouter initialEntries={[path]}>
        <Routes>
          <Route path="/admin" element={<AdminHome />} />
          <Route path="/admin/platform" element={<p>platform console</p>} />
          <Route path="/admin/:orgId" element={<OrganizationGate />}>
            <Route index element={<OrganizationIndex />} />
            <Route path="dashboard" element={<p>dashboard screen</p>} />
            <Route
              path="team"
              element={
                <RequirePermission permission="team.view">
                  <p>team screen</p>
                </RequirePermission>
              }
            />
          </Route>
        </Routes>
      </MemoryRouter>
    </AccessContext.Provider>,
  );
}

describe("admin route gates", () => {
  beforeEach(() => {
    useStaffSession.setState({ lastOrganizationId: null, user: null });
  });

  it("refuses organizations the user cannot open, existing or not", () => {
    renderAt("/admin/99/team");
    expect(screen.getByText("You can't open this organization")).toBeInTheDocument();
    expect(screen.queryByText("team screen")).not.toBeInTheDocument();
  });

  it("refuses non-numeric organization ids", () => {
    renderAt("/admin/1abc/team");
    expect(screen.getByText("You can't open this organization")).toBeInTheDocument();
  });

  it("shows a screen only to roles holding its permission", () => {
    renderAt("/admin/1/team");
    expect(screen.getByText("team screen")).toBeInTheDocument();
  });

  it("explains instead of showing a screen the role lacks", () => {
    renderAt("/admin/2/team");
    expect(screen.getByText("Your role can't open this page")).toBeInTheDocument();
    expect(screen.queryByText("team screen")).not.toBeInTheDocument();
  });

  it("remembers the organization that was opened", () => {
    renderAt("/admin/2/team");
    expect(useStaffSession.getState().lastOrganizationId).toBe(2);
  });

  it("lands each role on its first permitted screen", () => {
    renderAt("/admin/1");
    expect(screen.getByText("dashboard screen")).toBeInTheDocument();
  });

  it("welcomes roles that have no screens yet", () => {
    renderAt("/admin/2");
    expect(screen.getByText("Welcome to Organization 2")).toBeInTheDocument();
  });

  it("sends /admin to the last organization used", () => {
    useStaffSession.setState({ lastOrganizationId: 2 });
    renderAt("/admin");
    expect(screen.getByText("Welcome to Organization 2")).toBeInTheDocument();
  });

  it("sends a super admin without memberships to the platform console", () => {
    useStaffSession.setState({
      user: {
        userId: 1,
        userCode: "USR000001",
        email: "root@x.co",
        name: "Root",
        phone: null,
        avatar: null,
        isSuperAdmin: true,
      },
    });
    renderAt("/admin", [organization(5, null, ["dashboard.view"])]);
    expect(screen.getByText("platform console")).toBeInTheDocument();
  });
});
