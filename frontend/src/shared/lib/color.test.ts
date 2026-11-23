import {
  brandPalette,
  contrastRatio,
  INK,
  mix,
  parseHex,
  readableOn,
  toHex,
  WHITE,
} from "./color";

describe("color helpers", () => {
  it("parses 3- and 6-digit hex, with or without #", () => {
    expect(parseHex("#fff")).toEqual({ r: 255, g: 255, b: 255 });
    expect(parseHex("1F5C4A")).toEqual({ r: 31, g: 92, b: 74 });
    expect(parseHex("not-a-colour")).toBeNull();
    expect(parseHex(undefined)).toBeNull();
  });

  it("round-trips hex", () => {
    expect(toHex(parseHex("#b4432b")!)).toBe("#B4432B");
  });

  it("computes WCAG contrast ratios", () => {
    expect(contrastRatio("#000000", "#FFFFFF")).toBeCloseTo(21, 0);
    expect(contrastRatio("#FFFFFF", "#FFFFFF")).toBeCloseTo(1, 5);
    // Order does not matter.
    expect(contrastRatio("#1F5C4A", WHITE)).toBeCloseTo(contrastRatio(WHITE, "#1F5C4A"));
  });

  it("picks the more readable text colour", () => {
    expect(readableOn("#1F5C4A")).toBe(WHITE); // deep green
    expect(readableOn("#E9B44C")).toBe(INK); // saffron
    expect(readableOn("#FFFFFF")).toBe(INK);
  });

  it("mixes colours linearly", () => {
    expect(mix("#000000", "#FFFFFF", 0.5)).toBe("#808080");
    expect(mix("#000000", "#FFFFFF", 2)).toBe("#FFFFFF");
  });

  describe("brandPalette", () => {
    it("derives an accessible palette from a dark brand", () => {
      const palette = brandPalette("#B4432B", "#E9B44C");
      expect(palette.brand).toBe("#B4432B");
      expect(palette.brandContrast).toBe(WHITE);
      expect(palette.meetsAA).toBe(true);
      expect(contrastRatio(palette.brandHover, WHITE)).toBeGreaterThan(
        contrastRatio(palette.brand, WHITE),
      );
      expect(palette.accentContrast).toBe(INK);
    });

    it("uses ink text on a light brand and lightens it on hover", () => {
      const palette = brandPalette("#F4D35E");
      expect(palette.brandContrast).toBe(INK);
      expect(palette.brandHover).not.toBe(palette.brand);
    });

    it("flags brands that cannot reach AA with either text colour", () => {
      expect(brandPalette("#808080").meetsAA).toBe(false);
    });

    it("falls back to platform defaults for invalid input", () => {
      expect(brandPalette("nope").brand).toBe("#C8553D");
      // ("bad" would be a valid 3-digit hex: #BBAADD.)
      expect(brandPalette(null, "not-a-colour").accent).toBe("#E9B44C");
    });
  });
});
