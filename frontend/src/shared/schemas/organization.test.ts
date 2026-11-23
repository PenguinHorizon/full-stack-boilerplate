import { organizationProfileSchema, splitList, websiteSchema } from "./organization";

describe("organization schemas", () => {
  it("splits lists, trimming and dropping duplicates", () => {
    expect(splitList("Treks, Tours ,, treks\nRoad trips")).toEqual([
      "Treks",
      "Tours",
      "Road trips",
    ]);
  });

  it("requires a name on the profile", () => {
    const profile = {
      name: "",
      tagline: "",
      shortDescription: "",
      description: "",
      contactPhone: "",
      whatsappNumber: "",
      contactEmail: "",
      websiteUrl: "",
      addressLine: "",
      city: "",
    };
    expect(
      organizationProfileSchema.safeParse(profile).error?.issues.map((i) => i.path[0]),
    ).toContain("name");
  });

  it("accepts an empty or well-formed analytics ID only", () => {
    const base = {
      websiteEnabled: true,
      customerEmailsEnabled: true,
      seoTitle: "",
      seoDescription: "",
      footerText: "",
    };
    expect(websiteSchema.safeParse({ ...base, analyticsMeasurementId: "" }).success).toBe(
      true,
    );
    expect(
      websiteSchema.safeParse({ ...base, analyticsMeasurementId: "G-ABC123XYZ" }).success,
    ).toBe(true);
    expect(
      websiteSchema.safeParse({ ...base, analyticsMeasurementId: "UA-1" }).success,
    ).toBe(false);
  });
});
