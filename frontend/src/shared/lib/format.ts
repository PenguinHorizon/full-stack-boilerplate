/** Joins class names, skipping falsy values. Tiny stand-in for `clsx`. */
export function cn(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(" ");
}

/** "Northern Trails" → "EO"; "Saffron" → "SA". Used for logo/avatar fallbacks. */
export function initials(name: string | null | undefined, max = 2): string {
  const words = (name ?? "")
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .trim()
    .split(/\s+/);
  if (!words[0]) return "?";
  if (words.length === 1) return words[0].slice(0, max).toUpperCase();
  return words
    .slice(0, max)
    .map((word) => word[0])
    .join("")
    .toUpperCase();
}

const UNITS: Array<[Intl.RelativeTimeFormatUnit, number]> = [
  ["year", 31_536_000],
  ["month", 2_592_000],
  ["week", 604_800],
  ["day", 86_400],
  ["hour", 3_600],
  ["minute", 60],
];

/** "3 minutes ago", "yesterday". `now` is injectable for tests. */
export function relativeTime(
  iso: string | Date,
  now: Date = new Date(),
  locale = "en",
): string {
  const seconds = Math.round((new Date(iso).getTime() - now.getTime()) / 1000);
  const formatter = new Intl.RelativeTimeFormat(locale, { numeric: "auto" });
  for (const [unit, size] of UNITS) {
    if (Math.abs(seconds) >= size)
      return formatter.format(Math.round(seconds / size), unit);
  }
  return "just now";
}

export function formatDate(
  iso: string | Date,
  options: Intl.DateTimeFormatOptions = { dateStyle: "medium" },
  locale = "en",
): string {
  return new Intl.DateTimeFormat(locale, options).format(new Date(iso));
}

/**
 * Money arrives as a decimal string ("1150.00", ADR-011) and is only ever
 * formatted here — the frontend never does arithmetic on prices.
 */
export function formatMoney(
  amount: string | number,
  currency = "PKR",
  locale = "en-PK",
): string {
  const value = typeof amount === "number" ? amount : Number.parseFloat(amount);
  if (!Number.isFinite(value)) return "—";
  const whole = Number.isInteger(value);
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
    currencyDisplay: "narrowSymbol",
    minimumFractionDigits: whole ? 0 : 2,
    maximumFractionDigits: 2,
  }).format(value);
}

/** Digits-only E.164 form for `tel:` and WhatsApp links. */
export function phoneDigits(phone: string | null | undefined): string {
  return (phone ?? "").replace(/[^\d]/g, "");
}

/** "+922100000001" → "+92 21 0000 0001" (display only; storage stays E.164). */
export function formatPhone(phone: string | null | undefined): string {
  const digits = phoneDigits(phone);
  if (!digits) return "";
  if (digits.startsWith("92") && digits.length === 12) {
    const rest = digits.slice(2);
    // Mobile numbers (3xx) group as 3-7, landlines as 2-4-4.
    return rest.startsWith("3")
      ? `+92 ${rest.slice(0, 3)} ${rest.slice(3)}`
      : `+92 ${rest.slice(0, 2)} ${rest.slice(2, 6)} ${rest.slice(6)}`;
  }
  return `+${digits}`;
}

/** 1536 → "1.5 KB", 5_242_880 → "5 MB". */
export function formatBytes(bytes: number, locale = "en"): string {
  const units = ["B", "KB", "MB", "GB"];
  let value = bytes;
  let unit = 0;
  while (value >= 1024 && unit < units.length - 1) {
    value /= 1024;
    unit += 1;
  }
  const digits = unit === 0 || value >= 10 ? 0 : 1;
  return `${new Intl.NumberFormat(locale, { maximumFractionDigits: digits }).format(value)} ${units[unit]}`;
}
