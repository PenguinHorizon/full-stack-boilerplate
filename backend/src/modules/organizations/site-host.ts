/** Lower-case kebab slug, as stored in `organizations.slug` (max 60). */
export const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export function isValidSlug(value: unknown): value is string {
  return typeof value === 'string' && value.length <= 60 && SLUG_PATTERN.test(value);
}

/**
 * `Northern-Trails.Example.com:443.` → `northern-trails.example.com`.
 * Returns null for anything that is not a plausible host name.
 */
export function normalizeHost(raw: string | undefined | null): string | null {
  if (!raw) return null;
  let host = raw.trim().toLowerCase();
  // Strip an IPv4/hostname port; IPv6 literals are not storefront hosts.
  host = host.replace(/:\d{1,5}$/, '').replace(/\.$/, '');
  if (!host || host.length > 253) return null;
  if (!/^[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)*$/.test(host)) {
    return null;
  }
  return host;
}

/**
 * The organization slug implied by a platform subdomain, if any:
 *   northern-trails.localhost      + platform "localhost"      → "northern-trails"
 *   northern-trails.platform.com   + platform "platform.com"   → "northern-trails"
 *   platform.com / a.b.platform.com / www.platform.com   → null
 */
export function slugFromPlatformSubdomain(
  host: string,
  platformDomain: string,
): string | null {
  const suffix = `.${platformDomain.toLowerCase()}`;
  if (!host.endsWith(suffix)) return null;
  const label = host.slice(0, -suffix.length);
  if (!label || label.includes('.') || label === 'www') return null;
  return isValidSlug(label) ? label : null;
}
