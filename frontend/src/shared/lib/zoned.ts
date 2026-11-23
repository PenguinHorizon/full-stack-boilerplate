/*
 * Wall-clock times in an organization's time zone, for <input type="datetime-local">.
 * Staff may sit in another time zone than the organization (or travel), so the
 * browser's own zone is never used: "2026-12-24T18:00" always means 18:00 in
 * the organization.
 */

const LOCAL = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/;

const formatters = new Map<string, Intl.DateTimeFormat>();

function formatter(timeZone: string): Intl.DateTimeFormat {
  let format = formatters.get(timeZone);
  if (!format) {
    format = new Intl.DateTimeFormat("en-US", {
      timeZone,
      hourCycle: "h23",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
    formatters.set(timeZone, format);
  }
  return format;
}

function wallClock(instant: number, timeZone: string) {
  const parts = Object.fromEntries(
    formatter(timeZone)
      .formatToParts(new Date(instant))
      .map((part) => [part.type, part.value]),
  );
  return {
    year: Number(parts.year),
    month: Number(parts.month),
    day: Number(parts.day),
    hour: Number(parts.hour),
    minute: Number(parts.minute),
  };
}

/** Minutes the zone is ahead of UTC at that instant (PKT = +300). */
function offsetAt(instant: number, timeZone: string): number {
  const c = wallClock(instant, timeZone);
  const asUtc = Date.UTC(c.year, c.month - 1, c.day, c.hour, c.minute);
  return Math.round((asUtc - Math.floor(instant / 60_000) * 60_000) / 60_000);
}

/**
 * "2026-12-24T18:00" in `timeZone` → ISO instant, or null when malformed.
 * A time skipped by a DST jump resolves to the moment after the jump.
 */
export function zonedToIso(local: string, timeZone: string): string | null {
  const match = LOCAL.exec(local);
  if (!match) return null;
  const [y = 0, mo = 1, d = 1, h = 0, mi = 0] = match.slice(1).map(Number);
  const guess = Date.UTC(y, mo - 1, d, h, mi);
  const first = offsetAt(guess, timeZone);
  const candidate = guess - first * 60_000;
  const second = offsetAt(candidate, timeZone);
  if (second === first) return new Date(candidate).toISOString();
  // Near a DST change the first offset can be the wrong one; keep the retry
  // only if it really shows this wall time (a skipped time never does).
  const retry = guess - second * 60_000;
  return new Date(
    isoToZoned(new Date(retry).toISOString(), timeZone) === local ? retry : candidate,
  ).toISOString();
}

/** ISO instant → "2026-12-24T18:00" as seen in `timeZone`. */
export function isoToZoned(iso: string, timeZone: string): string {
  const c = wallClock(Date.parse(iso), timeZone);
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${c.year}-${pad(c.month)}-${pad(c.day)}T${pad(c.hour)}:${pad(c.minute)}`;
}

/** "Tue 24 Dec, 18:00" in the organization's zone (adds the year when not this year). */
export function formatZoned(iso: string, timeZone: string, now = new Date()): string {
  const date = new Date(iso);
  const sameYear =
    wallClock(date.getTime(), timeZone).year === wallClock(now.getTime(), timeZone).year;
  return new Intl.DateTimeFormat("en-GB", {
    timeZone,
    weekday: "short",
    day: "numeric",
    month: "short",
    year: sameYear ? undefined : "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).format(date);
}
