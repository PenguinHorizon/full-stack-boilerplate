import { PLATFORM_NAV, organizationNav, visibleNav } from "./nav";

const labels = (groups: ReturnType<typeof visibleNav>) =>
  groups.flatMap((group) => group.items.map((item) => item.label));

describe("visibleNav", () => {
  it("hides items the organization does not grant, and empty groups", () => {
    const groups = visibleNav(organizationNav(7), ["dashboard.view"]);
    expect(labels(groups)).toEqual(["Dashboard"]);
    expect(groups.some((group) => group.label === "Manage")).toBe(false);
  });

  it("shows permitted items with organization-scoped links", () => {
    const groups = visibleNav(organizationNav(7), ["team.view", "audit.view"]);
    expect(groups.flatMap((g) => g.items.map((i) => i.to))).toEqual([
      "/admin/7/team",
      "/admin/7/audit",
    ]);
  });

  it("shows customers and website screens by their own permissions", () => {
    const groups = visibleNav(organizationNav(7), [
      "customer.view",
      "inquiry.view",
      "content.view",
    ]);
    expect(groups.map((group) => group.label)).toEqual(["Customers", "Business"]);
    expect(groups.flatMap((g) => g.items.map((i) => i.to))).toEqual([
      "/admin/7/customers",
      "/admin/7/inbox",
      "/admin/7/website",
    ]);
    expect(labels(visibleNav(organizationNav(7), ["inquiry.view"]))).toEqual(["Inbox"]);
  });

  it("leaves platform items unfiltered (the platform gate decides)", () => {
    expect(labels(visibleNav(PLATFORM_NAV, []))).toEqual([
      "Overview",
      "Organizations",
      "Staff accounts",
      "Audit log",
    ]);
  });
});
