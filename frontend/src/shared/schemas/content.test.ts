import { describe, expect, it } from "vitest";
import {
  bannerInput,
  bannerSchema,
  bannerToValues,
  galleryInput,
  gallerySchema,
  pageInput,
  testimonialInput,
  testimonialSchema,
} from "./content";

const issues = (result: {
  success: boolean;
  error?: { issues: Array<{ path: PropertyKey[]; message: string }> };
}) =>
  Object.fromEntries(
    (result.error?.issues ?? []).map((issue) => [issue.path.join("."), issue.message]),
  );

describe("banner, gallery, review and page forms", () => {
  it("needs an image, a safe link and a sensible schedule for banners", () => {
    const values = { ...bannerToValues(null, "UTC"), internalName: "Winter" };
    expect(
      issues(
        bannerSchema.safeParse({
          ...values,
          ctaLabel: "Order",
          ctaUrl: "javascript:alert(1)",
          startsAt: "2026-12-02T10:00",
          endsAt: "2026-12-01T10:00",
        }),
      ),
    ).toEqual({
      desktopMediaId: "Choose an image",
      ctaUrl: "Use a page like /about or an https:// link",
      endsAt: "Must be after the start",
    });
    const ok = bannerSchema.parse({
      ...values,
      desktopMediaId: 7,
      ctaLabel: "Order",
      ctaUrl: "/about",
    });
    expect(bannerInput(ok, "UTC")).toMatchObject({
      desktopMediaId: 7,
      ctaUrl: "/about",
      headline: null,
      startsAt: null,
    });
  });

  it("asks for a button link when there is a button label", () => {
    const values = {
      ...bannerToValues(null, "UTC"),
      internalName: "Winter",
      desktopMediaId: 1,
      ctaLabel: "Go",
    };
    expect(issues(bannerSchema.safeParse(values))).toEqual({
      ctaUrl: "Where should the button go?",
    });
  });

  it("turns empty optional text into nulls", () => {
    const gallery = gallerySchema.parse({
      mediaId: 4,
      caption: " ",
      tag: "Treks",
      status: "published",
    });
    expect(galleryInput(gallery)).toEqual({
      mediaId: 4,
      caption: null,
      tag: "Treks",
      status: "published",
    });
    const review = testimonialSchema.parse({
      authorName: "Sara",
      authorDetail: "",
      quote: "Lovely",
      rating: "5",
      source: "",
      avatarMediaId: null,
      status: "draft",
    });
    expect(testimonialInput(review)).toMatchObject({
      rating: 5,
      authorDetail: null,
      source: null,
    });
    expect(testimonialSchema.safeParse({ ...review, rating: "6" }).success).toBe(false);
  });

  it("saves pages as a draft or published", () => {
    expect(
      pageInput({ title: " About ", body: "Hi", heroMediaId: null }, "draft"),
    ).toEqual({
      title: "About",
      body: "Hi",
      heroMediaId: null,
      status: "draft",
    });
  });
});
