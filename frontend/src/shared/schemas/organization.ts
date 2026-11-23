import { z } from "zod";

/*
 * Organization profile and settings forms, mirroring the API DTOs
 * (backend/src/modules/organizations/dto/profile.dto.ts). Inputs stay strings
 * in the form; `toNullable` / `toIntOrNull` convert on submit. Phones are
 * normalised by the API (in the organization's country). The money rules are
 * shared by future price fields.
 */

export const MONEY_PATTERN = /^\d{1,10}(\.\d{1,2})?$/;
const MONEY_MESSAGE = "Enter an amount like 150 or 150.50";

export const moneyRule = z.string().trim().regex(MONEY_PATTERN, MONEY_MESSAGE);
export const optionalMoneyRule = z
  .string()
  .trim()
  .refine((value) => value === "" || MONEY_PATTERN.test(value), MONEY_MESSAGE);

const text = (max: number) => z.string().trim().max(max, `Use at most ${max} characters`);
const required = (label: string, max: number) => text(max).min(1, `${label} is required`);

const httpsLink = z
  .string()
  .trim()
  .max(255)
  .refine((value) => value === "" || /^https:\/\/[^\s/]+\.[^\s]+$/.test(value), {
    message: "Use a full link starting with https://",
  });

const webLink = z
  .string()
  .trim()
  .max(255)
  .refine((value) => value === "" || /^https?:\/\/[^\s/]+\.[^\s]+$/.test(value), {
    message: "Use a full link starting with https://",
  });

const optionalEmail = z
  .string()
  .trim()
  .max(255)
  .refine((value) => value === "" || z.string().email().safeParse(value).success, {
    message: "Enter a valid email address",
  });

const phone = text(30).refine(
  (value) => value === "" || /^[+\d][\d\s()-]{5,}$/.test(value),
  {
    message: "Enter a phone number, e.g. 021 3587 0000",
  },
);

export const HEX_PATTERN = /^#[0-9a-fA-F]{6}$/;
const hex = z.string().trim().regex(HEX_PATTERN, "Use a colour like #C8553D");

/* ── Conversions ───────────────────────────────────────────────────── */

export const toNullable = (value: string): string | null => value.trim() || null;
export const toIntOrNull = (value: string): number | null =>
  value.trim() === "" ? null : Number(value);
export const toNumberOrNull = (value: string): number | null =>
  value.trim() === "" ? null : Number(value);

/** "Treks, Tours ,, Road trips" → ["Treks", "Tours", "Road trips"] (duplicates removed). */
export function splitList(value: string, separator: RegExp = /[,\n]/): string[] {
  const seen = new Set<string>();
  return value
    .split(separator)
    .map((item) => item.trim())
    .filter((item) => {
      const key = item.toLowerCase();
      if (!item || seen.has(key)) return false;
      seen.add(key);
      return true;
    });
}

/* ── Organization profile ────────────────────────────────────────────── */

export const organizationProfileSchema = z.object({
  name: required("Name", 120),
  tagline: text(160),
  shortDescription: text(300),
  description: text(5000),
  contactPhone: phone,
  whatsappNumber: phone,
  contactEmail: optionalEmail,
  websiteUrl: webLink,
  addressLine: text(255),
  city: text(100),
  social: z.object({
    facebook: httpsLink,
    instagram: httpsLink,
    tiktok: httpsLink,
    x: httpsLink,
    youtube: httpsLink,
  }),
  countryCode: z.string().regex(/^[A-Z]{2}$/, "Choose a country"),
  timezone: z.string().min(1, "Choose a time zone"),
  currencyCode: z.string().regex(/^[A-Z]{3}$/, "Choose a currency"),
  locale: z
    .string()
    .trim()
    .min(2, "Enter a language code such as en-PK")
    .max(10)
    .regex(/^[A-Za-z]{2,3}(-[A-Za-z0-9]{2,4})*$/, "Enter a language code such as en-PK"),
});
export type OrganizationProfileValues = z.infer<typeof organizationProfileSchema>;

export const brandingSchema = z.object({
  brandPrimaryColor: hex,
  brandAccentColor: z
    .string()
    .trim()
    .refine(
      (value) => value === "" || HEX_PATTERN.test(value),
      "Use a colour like #E9B44C",
    ),
});
export type BrandingValues = z.infer<typeof brandingSchema>;

/* ── Settings ──────────────────────────────────────────────────────── */

export const websiteSchema = z.object({
  websiteEnabled: z.boolean(),
  customerEmailsEnabled: z.boolean(),
  seoTitle: text(70),
  seoDescription: text(160),
  analyticsMeasurementId: z
    .string()
    .trim()
    .regex(/^(G-[A-Za-z0-9]{4,20})?$/, "Use a Google Analytics ID like G-ABC123XYZ"),
  footerText: text(500),
});
export type WebsiteValues = z.infer<typeof websiteSchema>;
