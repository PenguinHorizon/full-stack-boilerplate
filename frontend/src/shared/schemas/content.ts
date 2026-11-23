import { z } from "zod";
import type {
  BannerInput,
  FaqInput,
  GalleryInput,
  PageInput,
  TestimonialInput,
} from "@/shared/api/content";
import { isoToZoned, zonedToIso } from "@/shared/lib/zoned";
import type { AdminBannerResponse } from "@/shared/types/api.generated";
import { toNullable } from "./organization";

/*
 * Website editors and customer forms, mirroring
 * backend/src/modules/content/content.dto.ts. Dates are edited on the
 * organization's clock and sent as instants.
 */

const text = (max: number) => z.string().trim().max(max, `Use at most ${max} characters`);
const required = (label: string, max: number) => text(max).min(1, `${label} is required`);
const DATETIME = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/;
const optionalDateTime = z
  .string()
  .trim()
  .refine((value) => value === "" || DATETIME.test(value), "Pick a date and time");
const intOrNull = (value: string) => (value.trim() === "" ? null : Number(value));

/* ── Website content ───────────────────────────────────────────────── */

const LINK = /^(\/\S*|https:\/\/\S+)$/;

export const bannerSchema = z
  .object({
    placement: z.enum(["hero", "home"]),
    internalName: required("Name", 120),
    headline: text(160),
    subheadline: text(300),
    ctaLabel: text(40),
    ctaUrl: text(500).refine(
      (v) => v === "" || LINK.test(v),
      "Use a page like /about or an https:// link",
    ),
    desktopMediaId: z
      .number()
      .nullable()
      .refine((v): boolean => v !== null, "Choose an image"),
    mobileMediaId: z.number().nullable(),
    startsAt: optionalDateTime,
    endsAt: optionalDateTime,
    status: z.enum(["draft", "published"]),
  })
  .superRefine((values, ctx) => {
    if (values.startsAt && values.endsAt && values.endsAt <= values.startsAt) {
      ctx.addIssue({
        code: "custom",
        path: ["endsAt"],
        message: "Must be after the start",
      });
    }
    if (values.ctaLabel && !values.ctaUrl) {
      ctx.addIssue({
        code: "custom",
        path: ["ctaUrl"],
        message: "Where should the button go?",
      });
    }
  });
export type BannerValues = z.input<typeof bannerSchema>;

export function bannerToValues(
  banner: AdminBannerResponse | null,
  timeZone: string,
): BannerValues {
  return {
    placement: banner?.placement ?? "hero",
    internalName: banner?.internalName ?? "",
    headline: banner?.headline ?? "",
    subheadline: banner?.subheadline ?? "",
    ctaLabel: banner?.ctaLabel ?? "",
    ctaUrl: banner?.ctaUrl ?? "",
    desktopMediaId: banner?.desktopMediaId ?? null,
    mobileMediaId: banner?.mobileMediaId ?? null,
    startsAt: banner?.startsAt ? isoToZoned(banner.startsAt, timeZone) : "",
    endsAt: banner?.endsAt ? isoToZoned(banner.endsAt, timeZone) : "",
    status: banner?.status ?? "draft",
  };
}

export function bannerInput(
  values: z.output<typeof bannerSchema>,
  timeZone: string,
): BannerInput {
  return {
    placement: values.placement,
    internalName: values.internalName.trim(),
    headline: toNullable(values.headline),
    subheadline: toNullable(values.subheadline),
    ctaLabel: toNullable(values.ctaLabel),
    ctaUrl: toNullable(values.ctaUrl),
    desktopMediaId: values.desktopMediaId!,
    mobileMediaId: values.mobileMediaId,
    startsAt: values.startsAt ? zonedToIso(values.startsAt, timeZone) : null,
    endsAt: values.endsAt ? zonedToIso(values.endsAt, timeZone) : null,
    status: values.status,
  };
}

export const gallerySchema = z.object({
  mediaId: z
    .number()
    .nullable()
    .refine((v): boolean => v !== null, "Choose an image"),
  caption: text(255),
  tag: text(40),
  status: z.enum(["draft", "published"]),
});
export type GalleryValues = z.infer<typeof gallerySchema>;

export const galleryInput = (values: GalleryValues): GalleryInput => ({
  mediaId: values.mediaId!,
  caption: toNullable(values.caption),
  tag: toNullable(values.tag),
  status: values.status,
});

export const testimonialSchema = z.object({
  authorName: required("Name", 120),
  authorDetail: text(120),
  quote: required("Quote", 2000),
  rating: z.string().refine((v) => v === "" || /^[1-5]$/.test(v), "1 to 5"),
  source: text(40),
  avatarMediaId: z.number().nullable(),
  status: z.enum(["draft", "published"]),
});
export type TestimonialValues = z.infer<typeof testimonialSchema>;

export function testimonialInput(values: TestimonialValues): TestimonialInput {
  return {
    authorName: values.authorName.trim(),
    authorDetail: toNullable(values.authorDetail),
    quote: values.quote.trim(),
    rating: intOrNull(values.rating),
    source: toNullable(values.source),
    avatarMediaId: values.avatarMediaId,
    status: values.status,
  };
}

export const faqSchema = z.object({
  category: required("Category", 60),
  question: required("Question", 255),
  answer: required("Answer", 4000),
  status: z.enum(["draft", "published"]),
});
export type FaqValues = z.infer<typeof faqSchema>;

export const faqInput = (values: FaqValues): FaqInput => ({
  category: values.category.trim(),
  question: values.question.trim(),
  answer: values.answer.trim(),
  status: values.status,
});

export const pageSchema = z.object({
  title: required("Title", 160),
  body: z.string().max(50_000, "That is too long"),
  heroMediaId: z.number().nullable(),
});
export type PageValues = z.infer<typeof pageSchema>;

export const pageInput = (
  values: PageValues,
  status: "draft" | "published",
): PageInput => ({
  title: values.title.trim(),
  body: values.body,
  heroMediaId: values.heroMediaId,
  status,
});

export const blockSchema = z.object({
  reason: required("A reason", 255),
});
