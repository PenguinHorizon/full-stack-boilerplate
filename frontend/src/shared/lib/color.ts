/*
 * Colour maths for tenant branding (WCAG 2.x relative luminance / contrast).
 * Used to derive hover/soft tints and an accessible text colour from a
 * organization's single brand colour, and by the admin to warn when a
 * chosen colour cannot meet AA contrast.
 */

export interface Rgb {
  r: number;
  g: number;
  b: number;
}

export const INK = "#1C1A17";
export const WHITE = "#FFFFFF";

export function parseHex(hex: string | null | undefined): Rgb | null {
  if (!hex) return null;
  const match = /^#?([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(hex.trim());
  if (!match) return null;
  let value = match[1]!;
  if (value.length === 3) {
    value = value
      .split("")
      .map((char) => char + char)
      .join("");
  }
  const int = Number.parseInt(value, 16);
  return { r: (int >> 16) & 255, g: (int >> 8) & 255, b: int & 255 };
}

export function toHex({ r, g, b }: Rgb): string {
  const part = (n: number) =>
    Math.round(Math.min(255, Math.max(0, n)))
      .toString(16)
      .padStart(2, "0");
  return `#${part(r)}${part(g)}${part(b)}`.toUpperCase();
}

export function relativeLuminance({ r, g, b }: Rgb): number {
  const channel = (value: number) => {
    const c = value / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
}

/** WCAG contrast ratio, 1 (none) to 21 (black on white). */
export function contrastRatio(a: string, b: string): number {
  const first = parseHex(a);
  const second = parseHex(b);
  if (!first || !second) return 1;
  const [light, dark] = [relativeLuminance(first), relativeLuminance(second)].sort(
    (x, y) => y - x,
  ) as [number, number];
  return (light + 0.05) / (dark + 0.05);
}

/** White or ink — whichever reads better on the given background. */
export function readableOn(background: string): string {
  return contrastRatio(background, WHITE) >= contrastRatio(background, INK) ? WHITE : INK;
}

/** Linear blend: `amount` 0 → a, 1 → b. */
export function mix(a: string, b: string, amount: number): string {
  const first = parseHex(a);
  const second = parseHex(b);
  if (!first || !second) return a;
  const t = Math.min(1, Math.max(0, amount));
  return toHex({
    r: first.r + (second.r - first.r) * t,
    g: first.g + (second.g - first.g) * t,
    b: first.b + (second.b - first.b) * t,
  });
}

export interface BrandPalette {
  brand: string;
  brandHover: string;
  brandSoft: string;
  brandContrast: string;
  accent: string;
  accentContrast: string;
  /** False when neither white nor ink reaches 4.5:1 on the brand colour. */
  meetsAA: boolean;
}

export const DEFAULT_BRAND = "#C8553D";
export const DEFAULT_ACCENT = "#E9B44C";

export function brandPalette(
  primary: string | null | undefined,
  accent?: string | null,
): BrandPalette {
  const brand = toHex(parseHex(primary) ?? parseHex(DEFAULT_BRAND)!);
  const second = toHex(parseHex(accent) ?? parseHex(DEFAULT_ACCENT)!);
  const brandContrast = readableOn(brand);
  // Darken light brands on hover, lighten dark ones, so hover is always visible.
  const brandHover =
    brandContrast === WHITE ? mix(brand, "#000000", 0.14) : mix(brand, "#FFFFFF", 0.18);

  return {
    brand,
    brandHover,
    brandSoft: mix(brand, "#FFFFFF", 0.88),
    brandContrast,
    accent: second,
    accentContrast: readableOn(second),
    meetsAA: contrastRatio(brand, brandContrast) >= 4.5,
  };
}
