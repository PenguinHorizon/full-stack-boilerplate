import { safeAdminRedirect } from "./redirect";

describe("safeAdminRedirect", () => {
  it.each([
    ["/admin", "/admin"],
    ["/admin/users?page=2", "/admin/users?page=2"],
    ["/admin?tab=x", "/admin?tab=x"],
  ])("keeps in-app path %s", (input, expected) => {
    expect(safeAdminRedirect(input)).toBe(expected);
  });

  it.each([
    null,
    "",
    "https://evil.example/admin",
    "//evil.example/admin",
    "/administrator",
    "/s/northern-trails",
    "/admin\\evil",
  ])("falls back to /admin for %p", (input) => {
    expect(safeAdminRedirect(input)).toBe("/admin");
  });
});
