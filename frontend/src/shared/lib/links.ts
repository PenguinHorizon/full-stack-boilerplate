import { phoneDigits } from "./format";

/*
 * Deep links used by "Call", "WhatsApp" and "Directions" actions. Each returns
 * null when there is nothing to link to, so callers can hide the action
 * instead of rendering a dead button.
 */

export function telHref(phone: string | null | undefined): string | null {
  const digits = phoneDigits(phone);
  return digits ? `tel:+${digits}` : null;
}

export function whatsappHref(
  phone: string | null | undefined,
  message?: string,
): string | null {
  const digits = phoneDigits(phone);
  if (!digits) return null;
  const text = message ? `?text=${encodeURIComponent(message)}` : "";
  return `https://wa.me/${digits}${text}`;
}

export function mapsSearchHref(
  ...parts: Array<string | null | undefined>
): string | null {
  const query = parts.filter(Boolean).join(", ");
  return query
    ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`
    : null;
}

export function mailHref(email: string | null | undefined): string | null {
  return email ? `mailto:${email}` : null;
}
