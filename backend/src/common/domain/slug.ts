/*
 * Slugs: lower-case words joined by single hyphens, unique per scope.
 * On soft delete a row's slug becomes `{slug}--deleted-{id}` so the original
 * can be reused.
 */

export const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export function isValidSlug(value: string): boolean {
  return SLUG_PATTERN.test(value);
}

/** "Northern Trails — Hunza" → "northern-trails-hunza". May return "" (no letters). */
export function slugify(value: string, maxLength = 60): string {
  return value
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, maxLength)
    .replace(/-+$/, '');
}

/** The slug a soft-deleted row takes, kept within the column length. */
export function deletedSlug(slug: string, id: number, maxLength: number): string {
  const suffix = `--deleted-${id}`;
  return `${slug.slice(0, Math.max(1, maxLength - suffix.length))}${suffix}`;
}

/** "clifton" → "clifton-2", "clifton-2" → "clifton-3", within `maxLength`. */
export function nextSlugCandidate(
  slug: string,
  attempt: number,
  maxLength: number,
): string {
  const suffix = `-${attempt}`;
  return `${slug.slice(0, maxLength - suffix.length).replace(/-+$/, '')}${suffix}`;
}
