import {
  changePasswordSchema,
  profileSchema,
  resetPasswordSchema,
  signInSchema,
} from "./auth";
import { onboardOrganizationSchema, slugify } from "./platform";
import { addMemberSchema, editMemberSchema } from "./team";

const STRONG = "Password123";

describe("auth schemas", () => {
  it("requires a valid email to sign in", () => {
    expect(signInSchema.safeParse({ email: "nope", password: "x" }).success).toBe(false);
    expect(signInSchema.safeParse({ email: " a@b.co ", password: "x" }).success).toBe(
      true,
    );
  });

  it.each([
    ["short", "Use at least 8 characters"],
    ["alllowercase1", "Add an uppercase letter"],
    ["ALLUPPERCASE1", "Add a lowercase letter"],
    ["NoDigitsHere", "Add a number"],
  ])("rejects weak password %s", (password, message) => {
    const result = resetPasswordSchema.safeParse({ password, confirmPassword: password });
    expect(result.success).toBe(false);
    expect(result.error?.issues.map((issue) => issue.message)).toContain(message);
  });

  it("requires matching confirmation", () => {
    const result = resetPasswordSchema.safeParse({
      password: STRONG,
      confirmPassword: "Password124",
    });
    expect(result.error?.issues[0]?.path).toEqual(["confirmPassword"]);
  });

  it("rejects reusing the current password", () => {
    const result = changePasswordSchema.safeParse({
      currentPassword: STRONG,
      newPassword: STRONG,
      confirmPassword: STRONG,
    });
    expect(result.success).toBe(false);
  });

  it("normalises phone numbers the way the API expects", () => {
    const parsed = profileSchema.parse({ name: "A", phone: " +92 (300) 123-4567 " });
    expect(parsed.phone).toBe("+923001234567");
    expect(profileSchema.parse({ name: "A", phone: "" }).phone).toBe("");
    expect(profileSchema.safeParse({ name: "A", phone: "12ab" }).success).toBe(false);
  });
});

describe("team schemas", () => {
  const base = { email: "a@b.co", name: "A", password: "" };

  it("needs a role, and only edits role and access", () => {
    expect(addMemberSchema.safeParse({ ...base, role: "" }).success).toBe(false);
    expect(editMemberSchema.safeParse({ role: "MEMBER", isActive: true }).success).toBe(
      true,
    );
  });

  it("treats the password as optional but checks it when given", () => {
    const ok = { ...base, role: "MANAGER" };
    expect(addMemberSchema.safeParse(ok).success).toBe(true);
    expect(addMemberSchema.safeParse({ ...ok, password: "weak" }).success).toBe(false);
    expect(addMemberSchema.safeParse({ ...ok, password: STRONG }).success).toBe(true);
  });

  it("only accepts organization roles", () => {
    expect(addMemberSchema.safeParse({ ...base, role: "SUPER_ADMIN" }).success).toBe(
      false,
    );
  });
});

describe("organization onboarding", () => {
  const valid = {
    name: "Silk Route Tours",
    slug: "silk-route-tours",
    owner: { email: "owner@x.co", name: "Sara", password: "" },
  };

  it("accepts an organization whose owner already has an account", () => {
    expect(onboardOrganizationSchema.safeParse(valid).success).toBe(true);
  });

  it.each(["Silk Route Tours", "silk--route", "-route", "route-", "rôute"])(
    "rejects the web address %s",
    (slug) => {
      expect(onboardOrganizationSchema.safeParse({ ...valid, slug }).success).toBe(false);
    },
  );

  it.each([
    ["Northern Trails", "northern-trails"],
    ["  Café Déjà Vu! ", "cafe-deja-vu"],
    ["Silk Route Tours — Gulberg", "silk-route-tours-gulberg"],
    ["***", ""],
  ])("suggests %j → %j", (name, slug) => {
    expect(slugify(name)).toBe(slug);
  });

  it("never suggests more than 60 characters or a trailing hyphen", () => {
    const slug = slugify(`${"a".repeat(59)} b`);
    expect(slug.length).toBeLessThanOrEqual(60);
    expect(slug.endsWith("-")).toBe(false);
  });
});
