import {
  formatBytes,
  cn,
  formatMoney,
  formatPhone,
  initials,
  phoneDigits,
  relativeTime,
} from "./format";

describe("format helpers", () => {
  it("joins class names", () => {
    expect(cn("a", false, null, "b", undefined)).toBe("a b");
  });

  it.each([
    ["Northern Trails", "NT"],
    ["Silk Route Tours", "SR"],
    ["Saffron", "SA"],
    ["", "?"],
    [null, "?"],
  ])("derives initials for %p", (name, expected) => {
    expect(initials(name)).toBe(expected);
  });

  it("formats relative times", () => {
    const now = new Date("2026-11-12T12:00:00Z");
    expect(relativeTime("2026-11-12T11:57:00Z", now)).toBe("3 minutes ago");
    expect(relativeTime("2026-11-11T12:00:00Z", now)).toBe("yesterday");
    expect(relativeTime("2026-11-12T11:59:50Z", now)).toBe("just now");
  });

  it("formats decimal-string money without float arithmetic", () => {
    expect(formatMoney("1150.00")).toMatch(/1,150/);
    expect(formatMoney("1150.00")).not.toMatch(/\.00/);
    expect(formatMoney("99.50")).toMatch(/99\.50/);
    expect(formatMoney("not money")).toBe("—");
  });

  it("formats phone numbers for display and links", () => {
    expect(phoneDigits("+92 21 0000 0001")).toBe("922100000001");
    expect(formatPhone("+922100000001")).toBe("+92 21 0000 0001");
    expect(formatPhone("+923001234567")).toBe("+92 300 1234567");
    expect(formatPhone("+14155550100")).toBe("+14155550100");
    expect(formatPhone(null)).toBe("");
  });

  it.each([
    [512, "512 B"],
    [1536, "1.5 KB"],
    [5_242_880, "5 MB"],
    [15_000_000, "14 MB"],
  ])("formats %i bytes as %s", (bytes, text) => {
    expect(formatBytes(bytes)).toBe(text);
  });
});
