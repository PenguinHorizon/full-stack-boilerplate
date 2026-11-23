import { isPlatformHost } from "@/boot/resolve-app";

const PLATFORM_DOMAIN = import.meta.env.VITE_PLATFORM_DOMAIN || "localhost";

/**
 * An organization's public site in path mode (`/s/{slug}`, ADR-003). Relative on
 * the platform host; absolute when the admin is opened on another host (a
 * organization's own domain), where `/s/…` would not be the platform.
 */
export function storefrontHref(
  slug: string,
  location: Pick<Location, "hostname" | "port" | "protocol"> = window.location,
  platformDomain: string = PLATFORM_DOMAIN,
): string {
  const path = `/s/${encodeURIComponent(slug)}`;
  if (isPlatformHost(location.hostname, platformDomain)) return path;
  const port = location.port ? `:${location.port}` : "";
  return `${location.protocol}//${platformDomain}${port}${path}`;
}

/** The public site with drafts shown; the API checks `content.view`. */
export function storefrontPreviewHref(slug: string, path = ""): string {
  return `${storefrontHref(slug)}${path}?preview=1`;
}
