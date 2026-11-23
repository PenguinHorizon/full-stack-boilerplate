import { organizationLanding } from "../nav";
import type { AccessibleOrganization } from "./access-context";
import {
  homePath,
  parseOrganizationId,
  organizationIdFromPath,
  switchPath,
} from "./routing";

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

const owner = organization(1, "OWNER", ["dashboard.view", "team.view", "audit.view"]);
const menu = organization(2, "MANAGER", ["dashboard.view"]);
const visiting = organization(3, null, ["dashboard.view", "team.view", "audit.view"]);
const member = organization(4, "MEMBER", ["customer.view"]);
/** Only an action permission: nothing to open on its own. */
const noScreens = organization(6, "MEMBER", ["media.upload"]);
const contentDesk = organization(7, "MANAGER", ["content.view", "media.view"]);

describe("admin routing", () => {
  it.each([
    ["12", 12],
    ["0", null],
    ["-1", null],
    ["01", null],
    ["platform", null],
    ["1e3", null],
    [undefined, null],
  ])("parses :orgId %j → %j", (value, expected) => {
    expect(parseOrganizationId(value)).toBe(expected);
  });

  it("reads the organization id from admin paths only", () => {
    expect(organizationIdFromPath("/admin/12/team")).toBe(12);
    expect(organizationIdFromPath("/admin/12")).toBe(12);
    expect(organizationIdFromPath("/admin/platform/users")).toBeNull();
    expect(organizationIdFromPath("/admin/account")).toBeNull();
  });

  it("reopens the last organization, else the first membership", () => {
    expect(homePath([owner, menu], 2, false)).toBe("/admin/2");
    expect(homePath([owner, menu], 99, false)).toBe("/admin/1");
    expect(homePath([owner, menu], null, false)).toBe("/admin/1");
  });

  it("prefers a real membership over an organization a super admin can merely open", () => {
    expect(homePath([visiting, menu], null, true)).toBe("/admin/2");
    expect(homePath([visiting], 3, true)).toBe("/admin/3");
  });

  it("sends super admins without memberships to the platform, others nowhere", () => {
    expect(homePath([visiting], null, true)).toBe("/admin/platform");
    expect(homePath([], null, true)).toBe("/admin/platform");
    expect(homePath([], null, false)).toBeNull();
  });

  it("keeps the current screen when switching, if the target allows it", () => {
    expect(switchPath("/admin/1/team", visiting)).toBe("/admin/3/team");
    expect(switchPath("/admin/1/team", menu)).toBe("/admin/2");
    expect(switchPath("/admin/platform", owner)).toBe("/admin/1");
  });

  it("lands each role on its first permitted screen", () => {
    expect(organizationLanding(owner)).toBe("/admin/1/dashboard");
    expect(organizationLanding(member)).toBe("/admin/4/customers");
    expect(organizationLanding(contentDesk)).toBe("/admin/7/website");
    expect(organizationLanding(noScreens)).toBeNull();
  });
});
