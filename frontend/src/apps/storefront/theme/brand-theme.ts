import { brandPalette, type BrandPalette } from "@/shared/lib/color";

const VARIABLES = [
  "--brand",
  "--brand-hover",
  "--brand-soft",
  "--brand-contrast",
  "--brand-accent",
  "--brand-accent-contrast",
] as const;

/**
 * Re-skins the storefront for one organization: writes the brand palette as CSS
 * variables on <html>, where `[data-app="storefront"]` tokens pick them up
 * (shared/styles/index.css). Also sets the browser theme colour.
 */
export function applyBrandTheme(
  brand: { primary: string; accent: string | null },
  root: HTMLElement = document.documentElement,
): BrandPalette {
  const palette = brandPalette(brand.primary, brand.accent);
  root.style.setProperty("--brand", palette.brand);
  root.style.setProperty("--brand-hover", palette.brandHover);
  root.style.setProperty("--brand-soft", palette.brandSoft);
  root.style.setProperty("--brand-contrast", palette.brandContrast);
  root.style.setProperty("--brand-accent", palette.accent);
  root.style.setProperty("--brand-accent-contrast", palette.accentContrast);

  document
    .querySelector('meta[name="theme-color"]')
    ?.setAttribute("content", palette.brand);
  return palette;
}

export function clearBrandTheme(root: HTMLElement = document.documentElement) {
  for (const name of VARIABLES) root.style.removeProperty(name);
}

/** Points the tab icon at the organization's favicon (or logo), if it has one. */
export function applyFavicon(url: string | null) {
  if (!url) return;
  let link = document.querySelector<HTMLLinkElement>('link[rel="icon"]');
  if (!link) {
    link = document.createElement("link");
    link.rel = "icon";
    document.head.appendChild(link);
  }
  link.removeAttribute("type");
  link.href = url;
}
