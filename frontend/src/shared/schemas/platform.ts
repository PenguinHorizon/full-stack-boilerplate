import { z } from "zod";
import { emailRule, optionalPasswordRule } from "./auth";

/** Same rule as the API's SLUG_RULE: lower-case words joined by single hyphens. */
export const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export const slugRule = z
  .string()
  .trim()
  .min(1, "Web address is required")
  .max(60, "Use at most 60 characters")
  .regex(SLUG_PATTERN, "Use lower-case letters, numbers and single hyphens");

export const organizationNameRule = z
  .string()
  .trim()
  .min(1, "Name is required")
  .max(120, "Use at most 120 characters");

/** POST /platform/organizations: the organization and its first owner together. */
export const onboardOrganizationSchema = z.object({
  name: organizationNameRule,
  slug: slugRule,
  owner: z.object({
    email: emailRule,
    name: z.string().trim().min(1, "Owner name is required").max(255),
    password: optionalPasswordRule,
  }),
});
export type OnboardOrganizationValues = z.infer<typeof onboardOrganizationSchema>;

export const editOrganizationSchema = z.object({
  name: organizationNameRule,
  slug: slugRule,
});
export type EditOrganizationValues = z.infer<typeof editOrganizationSchema>;

/** "Northern Trails" → "northern-trails". A suggestion only; the field stays editable. */
export function slugify(value: string): string {
  return value
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60)
    .replace(/-+$/, "");
}
