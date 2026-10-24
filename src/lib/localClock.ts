/**
 * Phase 2.4 — location-aware local clock utilities.
 *
 * The weather location's IANA timezone is the source of truth.
 * The browser/device timezone is never used for the selected location.
 *
 * `Intl.DateTimeFormat` construction is expensive relative to `format()`, and the
 * hero clock formats once per second, so formatters are cached per options set.
 */

const FALLBACK_TIME = "--:--:--";
const FALLBACK_ZONE = "Waktu lokal";

const formatters = new Map<string, Intl.DateTimeFormat | null>();
const MAX_FORMATTERS = 32;

function formatter(
  locale: string,
  options: Intl.DateTimeFormatOptions,
  timezone: string,
): Intl.DateTimeFormat | null {
  const key = `${locale}|${timezone}|${JSON.stringify(options)}`;
  if (formatters.has(key)) return formatters.get(key) ?? null;
  let created: Intl.DateTimeFormat | null;
  try {
    created = new Intl.DateTimeFormat(locale, { ...options, timeZone: timezone });
  } catch {
    created = null; // Unsupported locale/timezone: callers fall back to a safe label.
  }
  if (formatters.size >= MAX_FORMATTERS) formatters.clear();
  formatters.set(key, created);
  return created;
}

const CLOCK_OPTIONS: Intl.DateTimeFormatOptions = {
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
  hourCycle: "h23",
};

export function formatLocalClock(
  date: Date,
  timezone: string,
  locale = "id-ID",
): string {
  if (!timezone || !isValidTimeZone(timezone)) return FALLBACK_TIME;
  const format = formatter(locale, CLOCK_OPTIONS, timezone);
  const parts = format?.formatToParts(date);
  if (!parts) return FALLBACK_TIME;
  // `format()` ikut membawa pemisah bawaan locale (CLDR memakai titik untuk
  // id-ID, mis. "20.00.00"). Jam ini dipakai berdampingan dengan timestamp
  // ISO, jadi dirakit dari part agar selalu "hh:mm:ss" di lingkungan mana pun.
  const value = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((part) => part.type === type)?.value;
  const [hour, minute, second] = [value("hour"), value("minute"), value("second")];
  if (!hour || !minute) return FALLBACK_TIME;
  return `${hour}:${minute}:${second ?? "00"}`;
}

export function formatLocalTimeZone(
  date: Date,
  timezone: string,
  locale = "id-ID",
): string {
  if (!timezone || !isValidTimeZone(timezone)) return FALLBACK_ZONE;
  const format = formatter(locale, { timeZoneName: "short" }, timezone);
  const parts = format?.formatToParts(date);
  return parts?.find((part) => part.type === "timeZoneName")?.value ?? FALLBACK_ZONE;
}

/** Full date + time so `<time datetime>` carries a valid timestamp, not a bare clock. */
export function localClockDateTime(
  date: Date,
  timezone: string,
  locale = "id-ID",
): string | undefined {
  if (!timezone || !isValidTimeZone(timezone)) return undefined;
  const format = formatter(
    locale,
    {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hourCycle: "h23",
    },
    timezone,
  );
  const parts = format?.formatToParts(date);
  if (!parts) return undefined;
  const value = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((part) => part.type === type)?.value ?? "";
  const [year, month, day, hour, minute, second] = [
    value("year"),
    value("month"),
    value("day"),
    value("hour"),
    value("minute"),
    value("second"),
  ];
  if (!year || !month || !day) return undefined;
  return `${year}-${month}-${day}T${hour || "00"}:${minute || "00"}:${second || "00"}`;
}

export function isValidTimeZone(timezone: string): boolean {
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: timezone }).format();
    return true;
  } catch {
    return false;
  }
}
