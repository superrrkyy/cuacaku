import { useLocalClock } from "../hooks/useLocalClock";

interface LocalClockProps {
  timezone?: string;
  locationName?: string;
  locale?: string;
  className?: string;
  /** Injectable instant for tests; the app always uses the current time. */
  now?: Date;
}

/**
 * Location-local clock. The reading itself is the accessible text, so nothing
 * here needs `aria-label` on a non-interactive element; the context sentence is
 * provided separately for screen readers and the digits stay `aria-hidden` to
 * avoid a second, duplicated announcement.
 */
export function LocalClock({
  timezone,
  locationName,
  locale = "id-ID",
  className = "",
  now,
}: LocalClockProps) {
  const { time, dateTime, zoneLabel } = useLocalClock(timezone, locale, now);
  const unavailable = time === "--:--:--";
  const context = locationName
    ? `Waktu lokal di ${locationName} (${zoneLabel}).`
    : `Waktu lokal (${zoneLabel}).`;

  return (
    <p className={`local-clock${className ? ` ${className}` : ""}`}>
      <time dateTime={dateTime} className="local-clock-time" aria-hidden={unavailable ? undefined : true}>
        {time}
      </time>
      <span className="sr-only">
        {unavailable ? "Waktu lokal tidak tersedia." : `${time}. ${context}`}
      </span>
      <span className="local-clock-meta" aria-hidden="true">
        <span className="local-clock-dot" />
        <span>{locationName ?? "Waktu lokal"}</span>
        <span aria-hidden="true">•</span>
        <span>{zoneLabel}</span>
      </span>
    </p>
  );
}

export default LocalClock;
