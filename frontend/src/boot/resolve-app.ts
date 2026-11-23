/*
 * Which app does this URL belong to?
 *
 *   /admin/**                                  → admin portal (any host)
 *   {organization host}/**                       → storefront, resolved via API
 *   {platform host}/s/{slug}/**                → storefront, path mode
 *   {platform host}/**                         → platform directory
 */

export type AppTarget =
  | { kind: "admin" }
  | { kind: "platform" }
  | { kind: "storefront"; slug: string; basename: string }
  | { kind: "storefront-host"; host: string };

export type AppKind = "admin" | "platform" | "storefront";

const SLUG = "[a-z0-9]+(?:-[a-z0-9]+)*";
const STOREFRONT_PATH = new RegExp(`^/s/(${SLUG})(?=/|$)`);

export function isPlatformHost(hostname: string, platformDomain: string): boolean {
  const host = hostname.toLowerCase();
  const platform = platformDomain.toLowerCase();
  return host === platform || host === `www.${platform}` || host === "127.0.0.1";
}

export function resolveAppTarget(
  location: { hostname: string; host: string; pathname: string },
  platformDomain: string,
): AppTarget {
  const { pathname } = location;

  if (pathname === "/admin" || pathname.startsWith("/admin/")) {
    return { kind: "admin" };
  }

  if (!isPlatformHost(location.hostname, platformDomain)) {
    return { kind: "storefront-host", host: location.host.toLowerCase() };
  }

  const match = STOREFRONT_PATH.exec(pathname);
  if (match?.[1]) {
    return { kind: "storefront", slug: match[1], basename: `/s/${match[1]}` };
  }

  return { kind: "platform" };
}

export function appKindOf(target: AppTarget): AppKind {
  return target.kind === "storefront-host" ? "storefront" : target.kind;
}
