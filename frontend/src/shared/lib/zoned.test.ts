import { describe, expect, it } from "vitest";
import { formatZoned, isoToZoned, zonedToIso } from "./zoned";

describe("zoned wall-clock times", () => {
  it.each([
    ["2026-12-24T18:00", "Asia/Karachi", "2026-12-24T13:00:00.000Z"],
    ["2026-01-01T00:00", "Asia/Karachi", "2025-12-31T19:00:00.000Z"],
    ["2026-07-01T09:30", "Europe/London", "2026-07-01T08:30:00.000Z"],
    ["2026-01-15T09:30", "Europe/London", "2026-01-15T09:30:00.000Z"],
    ["2026-06-01T12:00", "America/New_York", "2026-06-01T16:00:00.000Z"],
    ["2026-03-08T03:15", "America/New_York", "2026-03-08T07:15:00.000Z"],
  ])("%s in %s is %s", (local, zone, iso) => {
    expect(zonedToIso(local, zone)).toBe(iso);
    expect(isoToZoned(iso, zone)).toBe(local);
  });

  it("moves a time skipped by DST to just after the jump", () => {
    // 02:30 doesn't exist in New York on 8 March 2026 (clocks go 02:00 → 03:00).
    expect(
      isoToZoned(zonedToIso("2026-03-08T02:30", "America/New_York")!, "America/New_York"),
    ).toBe("2026-03-08T03:30");
  });

  it("rejects malformed input", () => {
    expect(zonedToIso("2026-12-24", "Asia/Karachi")).toBeNull();
    expect(zonedToIso("24/12/2026 18:00", "Asia/Karachi")).toBeNull();
  });

  it("formats in the organization's zone, adding the year only when it differs", () => {
    const now = new Date("2026-11-13T10:00:00Z");
    expect(formatZoned("2026-12-24T13:00:00Z", "Asia/Karachi", now)).toBe(
      "Thu 24 Dec, 18:00",
    );
    expect(formatZoned("2027-01-02T13:00:00Z", "Asia/Karachi", now)).toBe(
      "Sat, 2 Jan 2027, 18:00",
    );
  });
});
