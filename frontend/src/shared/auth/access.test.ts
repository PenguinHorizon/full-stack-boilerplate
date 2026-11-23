import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  assignableRoles,
  canManageRole,
  isOrganizationRole,
  PERMISSIONS,
  ORGANIZATION_ROLES,
  ROLE_LABELS,
} from "./access";

describe("access mirror", () => {
  it.each([
    ["OWNER", "OWNER", true],
    ["ADMIN", "OWNER", false],
    ["ADMIN", "ADMIN", false],
    ["ADMIN", "MANAGER", true],
    ["ADMIN", "MEMBER", true],
    ["MANAGER", "MEMBER", true],
    ["MANAGER", "MANAGER", false],
    ["MEMBER", "MEMBER", false],
    [null, "MEMBER", false],
  ] as const)("%s managing %s → %s (same as the API)", (actor, target, expected) => {
    expect(canManageRole(actor, target)).toBe(expected);
  });

  it("lets a super admin manage every role", () => {
    expect(assignableRoles(null, true)).toHaveLength(4);
  });

  it("offers admins every role below admin", () => {
    expect(assignableRoles("ADMIN")).toEqual(["MANAGER", "MEMBER"]);
    expect(assignableRoles("MANAGER")).toEqual(["MEMBER"]);
    expect(assignableRoles("MEMBER")).toEqual([]);
  });

  it("recognises role strings from the API", () => {
    expect(isOrganizationRole("MEMBER")).toBe(true);
    expect(isOrganizationRole("SUPER_ADMIN")).toBe(false);
    expect(isOrganizationRole(null)).toBe(false);
  });
});

/*
 * The permission names are repeated from the backend matrix. CI checks out the
 * whole repository, so this catches a permission added or renamed there.
 */
// Tests run from frontend/ (jsdom gives import.meta.url an http: scheme).
const backendMatrix = resolve(
  process.cwd(),
  "../backend/src/common/constants/roles.config.ts",
);

describe.skipIf(!existsSync(backendMatrix))("permission names", () => {
  it("match backend/src/common/constants/roles.config.ts", () => {
    const source = readFileSync(backendMatrix, "utf8");
    const block = /export const PERMISSIONS = \[([\s\S]*?)\] as const/.exec(source)?.[1];
    const backend = [...(block ?? "").matchAll(/'([a-z.]+)'/g)].map((m) => m[1]);
    expect(backend.length).toBeGreaterThan(0);
    expect([...PERMISSIONS]).toEqual(backend);
  });

  it("label every role, highest rank first", () => {
    expect(Object.keys(ROLE_LABELS)).toEqual([...ORGANIZATION_ROLES]);
  });
});
