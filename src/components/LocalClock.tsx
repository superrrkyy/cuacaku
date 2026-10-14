import { useLocalClock } from "../hooks/useLocalClock";

interface LocalClockProps {
  timezone?: string;
  locationName?: string;
  locale?: string;
  className?: string;
}

export function LocalClock({
  timezone,
  locationName,
  locale = "id-ID",
  className = "",
}: LocalClockProps) {
  const { time, zoneLabel } = useLocalClock(timezone, locale);

  const accessibleLabel = locationName
    ? `Waktu lokal saat ini di ${locationName}: ${time}`
    : `Waktu lokal saat ini: ${time}`;

  return (
    <div
      className={`local-clock ${className}`.trim()}
      aria-label={accessibleLabel}
      data-testid="local-clock"
    >
      <time
        dateTime={time === "--:--:--" ? undefined : time}
        className="block font-mono text-2xl font-semibold tracking-tight tabular-nums sm:text-3xl"
        aria-hidden="true"
      >
        {time}
      </time>

      <div className="mt-1 flex items-center gap-2 text-xs text-white/60 sm:text-sm">
        <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-emerald-300" />
        <span>{locationName ?? "Waktu lokal"}</span>
        <span aria-hidden="true">•</span>
        <span>{zoneLabel}</span>
      </div>
    </div>
  );
}

export default LocalClock;
