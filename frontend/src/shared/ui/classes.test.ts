import { buttonClasses, iconButtonClasses } from "./classes";

describe("button classes", () => {
  it("never gives icon-only buttons horizontal padding (it squeezed icons to 8px)", () => {
    for (const size of ["sm", "md", "lg"] as const) {
      expect(iconButtonClasses("ghost", size)).not.toMatch(/(^|\s)p[xl]?-/);
    }
    expect(iconButtonClasses("ghost", "sm")).toContain("size-8");
  });

  it("keeps padding on text buttons", () => {
    expect(buttonClasses("primary", "md")).toContain("px-4");
  });
});
