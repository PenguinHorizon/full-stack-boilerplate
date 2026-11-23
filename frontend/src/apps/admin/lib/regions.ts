import type { SelectOption } from "@/shared/ui";

/*
 * Option lists for the organization's region settings, named by the browser's
 * Intl data (no extra library). The API validates the codes again.
 */

/** Countries offered first; any other code already saved is kept as an option. */
const COUNTRIES = [
  "PK",
  "AE",
  "SA",
  "QA",
  "OM",
  "KW",
  "BH",
  "GB",
  "US",
  "CA",
  "AU",
  "NZ",
  "IE",
  "IN",
  "BD",
  "LK",
  "MY",
  "SG",
  "TR",
  "DE",
  "FR",
  "NL",
  "ES",
  "IT",
  "ZA",
  "EG",
  "NG",
  "KE",
];

function displayName(type: "region" | "currency", code: string): string {
  try {
    return new Intl.DisplayNames(["en"], { type }).of(code) ?? code;
  } catch {
    return code;
  }
}

export function countryOptions(current: string): SelectOption[] {
  const codes = COUNTRIES.includes(current) ? COUNTRIES : [current, ...COUNTRIES];
  return codes
    .map((code) => ({ value: code, label: `${displayName("region", code)} (${code})` }))
    .sort((a, b) => a.label.localeCompare(b.label));
}

export function currencyOptions(current: string): SelectOption[] {
  const codes = Intl.supportedValuesOf("currency");
  const list = codes.includes(current) ? codes : [current, ...codes];
  return list.map((code) => ({
    value: code,
    label: `${code} · ${displayName("currency", code)}`,
  }));
}

export function timeZoneOptions(current: string): SelectOption[] {
  const zones = Intl.supportedValuesOf("timeZone");
  const list = zones.includes(current) ? zones : [current, ...zones];
  return list.map((zone) => ({ value: zone, label: zone.replace(/_/g, " ") }));
}
