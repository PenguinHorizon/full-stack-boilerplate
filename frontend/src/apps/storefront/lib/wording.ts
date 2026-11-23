/* Customer-facing wording helpers. */

/**
 * "1 Example Road, Saddar" + "Saddar" + "Islamabad" → no repeated parts:
 * anything already in an earlier part is left out.
 */
export function joinAddress(...parts: Array<string | null | undefined>): string {
  const kept: string[] = [];
  for (const part of parts) {
    const text = part?.trim();
    if (!text) continue;
    const lower = text.toLowerCase();
    if (kept.some((earlier) => earlier.toLowerCase().includes(lower))) continue;
    kept.push(text);
  }
  return kept.join(", ");
}
