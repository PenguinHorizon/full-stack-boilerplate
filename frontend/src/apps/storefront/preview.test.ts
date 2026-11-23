import { beforeEach, describe, expect, it } from "vitest";
import { previewRequested } from "./preview";

describe("previewRequested", () => {
  beforeEach(() => sessionStorage.clear());

  it("is off for ordinary visits", () => {
    expect(previewRequested("northern-trails", "")).toBe(false);
  });

  it("turns on with ?preview=1 and stays on for the tab, per organization", () => {
    expect(previewRequested("northern-trails", "?preview=1")).toBe(true);
    expect(previewRequested("northern-trails", "")).toBe(true);
    expect(previewRequested("other-place", "")).toBe(false);
  });

  it("turns off with ?preview=0", () => {
    previewRequested("northern-trails", "?preview=1");
    expect(previewRequested("northern-trails", "?preview=0")).toBe(false);
    expect(previewRequested("northern-trails", "")).toBe(false);
  });
});
