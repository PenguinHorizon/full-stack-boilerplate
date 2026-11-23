/*
 * Money (ADR-011): DECIMAL(12,2) in the database, decimal strings over JSON
 * ("1150.00"), integer minor units for any arithmetic. Never floats.
 */

/** Up to 10 integer digits and 2 decimals: fits DECIMAL(12,2). */
export const MONEY_PATTERN = /^\d{1,10}(\.\d{1,2})?$/;
export const MONEY_MESSAGE = 'Enter an amount like 150 or 150.50';

export function isMoney(value: unknown): value is string {
  return typeof value === 'string' && MONEY_PATTERN.test(value);
}

/** "150" → "150.00", "007.5" → "7.50". Throws on anything that isn't money. */
export function normalizeMoney(value: string): string {
  if (!isMoney(value)) throw new RangeError(`Invalid amount "${value}"`);
  return fromMinor(toMinor(value));
}

export function toMinor(value: string): number {
  if (!isMoney(value)) throw new RangeError(`Invalid amount "${value}"`);
  const [whole, fraction = ''] = value.split('.');
  return Number(whole) * 100 + Number(fraction.padEnd(2, '0'));
}

export function fromMinor(minor: number): string {
  if (!Number.isSafeInteger(minor) || minor < 0) {
    throw new RangeError(`Invalid minor amount ${minor}`);
  }
  return `${Math.floor(minor / 100)}.${String(minor % 100).padStart(2, '0')}`;
}
