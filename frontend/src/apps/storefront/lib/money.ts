import { formatMoney } from "@/shared/lib/format";

/*
 * Money on the storefront (ADR-011): decimal strings from the API, integer
 * minor units for any sums shown while choosing options. The server is the
 * authority on every price; these numbers are a preview only.
 */

const MONEY = /^\d{1,10}(\.\d{1,2})?$/;

export function toMinor(value: string): number {
  if (!MONEY.test(value)) return 0;
  const [whole = "0", fraction = ""] = value.split(".");
  return Number(whole) * 100 + Number(fraction.padEnd(2, "0"));
}

export function fromMinor(minor: number): string {
  const safe = Math.max(0, Math.round(minor));
  return `${Math.floor(safe / 100)}.${String(safe % 100).padStart(2, "0")}`;
}

/** "Rs 1,450" in the organization's currency and locale. */
export function money(value: string | number, currency: string, locale: string): string {
  const decimal = typeof value === "number" ? fromMinor(value) : value;
  return formatMoney(decimal, currency, locale);
}
