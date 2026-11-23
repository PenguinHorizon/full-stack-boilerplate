import { type CountryCode, parsePhoneNumberFromString } from 'libphonenumber-js';

/*
 * Phone numbers are stored in E.164 ("+923001234567"). Input may be local
 * ("0300 1234567") and is read in the organization's country
 *.
 */

/** E.164 for a valid number, otherwise null. Blank input is not a number. */
export function normalizePhone(input: string, defaultCountry: string): string | null {
  const value = input.trim();
  if (!value) return null;
  const parsed = parsePhoneNumberFromString(value, defaultCountry as CountryCode);
  return parsed?.isValid() ? parsed.number : null;
}
