/**
 * Phase 2.4 — location-aware local clock utilities.
 *
 * The weather location's IANA timezone is the source of truth.
 * The browser/device timezone is never used for the selected location.
 */

export function formatLocalClock(
  date: Date,
  timezone: string,
  locale = "id-ID",
): string {
  if (!timezone || !isValidTimeZone(timezone)) {
    return "--:--:--";
  }

  return new Intl.DateTimeFormat(locale, {
    timeZone: timezone,
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  }).format(date);
}

export function formatLocalTimeZone(
  date: Date,
  timezone: string,
  locale = "id-ID",
): string {
  if (!timezone || !isValidTimeZone(timezone)) {
    return "Waktu lokal";
  }

  const parts = new Intl.DateTimeFormat(locale, {
    timeZone: timezone,
    timeZoneName: "short",
  }).formatToParts(date);

  return parts.find((part) => part.type === "timeZoneName")?.value ?? "Waktu lokal";
}

export function isValidTimeZone(timezone: string): boolean {
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: timezone }).format();
    return true;
  } catch {
    return false;
  }
}
