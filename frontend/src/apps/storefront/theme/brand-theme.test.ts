import { applyBrandTheme, clearBrandTheme } from "./brand-theme";

describe("applyBrandTheme", () => {
  afterEach(() => clearBrandTheme());

  it("writes the brand palette as CSS variables on <html>", () => {
    const palette = applyBrandTheme({ primary: "#1F5C4A", accent: "#E3A72F" });
    const style = document.documentElement.style;

    expect(style.getPropertyValue("--brand")).toBe("#1F5C4A");
    expect(style.getPropertyValue("--brand-contrast")).toBe("#FFFFFF");
    expect(style.getPropertyValue("--brand-accent")).toBe("#E3A72F");
    expect(style.getPropertyValue("--brand-accent-contrast")).toBe("#1C1A17");
    expect(style.getPropertyValue("--brand-hover")).toBe(palette.brandHover);
  });

  it("falls back to the platform default for an invalid colour", () => {
    applyBrandTheme({ primary: "red-ish", accent: null });
    expect(document.documentElement.style.getPropertyValue("--brand")).toBe("#C8553D");
  });

  it("clears every variable it set", () => {
    applyBrandTheme({ primary: "#1F5C4A", accent: null });
    clearBrandTheme();
    expect(document.documentElement.style.getPropertyValue("--brand")).toBe("");
    expect(document.documentElement.style.getPropertyValue("--brand-accent")).toBe("");
  });
});
