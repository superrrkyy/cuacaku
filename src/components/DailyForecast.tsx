import { useId, useMemo } from "react";
import { info, temperatureRange, type Weather } from "../weather";
import { addDays, localDate, shortDate, weekdayName } from "../lib/dates";
import { finite, isRecord } from "../lib/validation";
import WeatherIcon from "./WeatherIcon";

// Data arrives through props only: no fetching, no duplicated WMO mapping.
type Props = {
  data: Pick<Weather, "daily" | "timezone"> & Partial<Pick<Weather, "current">>;
};
const DAY_COUNT = 7;
const percent = (v: unknown) => (finite(v) && v >= 0 && v <= 100 ? v : null);
const celsius = (v: number | null) => (v === null ? "—" : `${Math.round(v)}°`);

export default function DailyForecast({ data }: Props) {
  const titleId = useId();
  const timezone = typeof data?.timezone === "string" ? data.timezone : "";

  // Derive once per response: labels, safe fallbacks and the shared weekly scale.
  const days = useMemo(() => {
    const rows = Array.isArray(data?.daily) ? data.daily : [];
    const today = localDate(data.current?.time, timezone);
    const tomorrow = today ? addDays(today, 1) : "";
    return rows
      .flatMap((d) => {
        if (!isRecord(d)) return [];
        const date = localDate(d.date, timezone);
        if (!date) return [];
        return [
          {
            date,
            label:
              date === today
                ? "Hari ini"
                : date === tomorrow
                  ? "Besok"
                  : weekdayName(date, timezone),
            short: shortDate(date, timezone),
            code: finite(d.code) ? d.code : null,
            min: finite(d.min) ? d.min : null,
            max: finite(d.max) ? d.max : null,
            rain: percent(d.rain),
            today: date === today,
          },
        ];
      })
      .slice(0, DAY_COUNT);
  }, [data.daily, data.current?.time, timezone]);

  // One shared scale so every bar is comparable, without encoding severity in colour.
  const scale = useMemo(() => {
    const values = days.flatMap((d) => [d.min, d.max]).filter(finite);
    return values.length
      ? { low: Math.min(...values), high: Math.max(...values) }
      : null;
  }, [days]);

  const condition = (code: number | null) => (code === null ? "Tidak diketahui" : info(code).label);

  return (
    <section className="glass panel daily-panel" aria-labelledby={titleId}>
      <div className="section-heading">
        <div>
          <p className="eyebrow">Sepekan di depan</p>
          <h3 id={titleId}>PRAKIRAAN 7 HARI</h3>
        </div>
        <span className="small-tag">°C</span>
      </div>
      {days.length === 0 ? (
        <p className="daily-empty" role="status">
          Prakiraan 7 hari belum tersedia.
        </p>
      ) : (
        <ol className="daily-list">
          {days.map((d, i) => {
            const range =
              scale && d.min !== null && d.max !== null
                ? temperatureRange(d.min, d.max, scale.low, scale.high)
                : null;
            const rangeLabel =
              d.min === null && d.max === null
                ? "Rentang suhu tidak tersedia"
                : `Minimum ${celsius(d.min)}, maksimum ${celsius(d.max)}`;
            return (
              <li
                key={d.date}
                className={`daily-row${d.today ? " current" : ""}`}
                aria-current={d.today ? "date" : undefined}
                style={{ animationDelay: `${i * 45}ms` }}
              >
                <div className="daily-day">
                  <strong>{d.label}</strong>
                  <time dateTime={d.date}>{d.short}</time>
                </div>
                {d.code === null ? (
                  <span className="daily-unknown" role="img" aria-label={condition(d.code)}>
                    —
                  </span>
                ) : (
                  <WeatherIcon code={d.code} />
                )}
                <div className="daily-condition">
                  <span>{condition(d.code)}</span>
                  <span
                    className="rain-chance"
                    aria-label={
                      d.rain === null
                        ? "Peluang hujan tidak tersedia"
                        : `Peluang hujan ${Math.round(d.rain)} persen`
                    }
                  >
                    <svg aria-hidden="true" width="9" height="12" viewBox="0 0 12 16" fill="currentColor">
                      <path d="M6 0C5 4 1 7 1 10a5 5 0 0 0 10 0C11 7 7 4 6 0Z" />
                    </svg>
                    Peluang hujan {d.rain === null ? "—" : `${Math.round(d.rain)}%`}
                  </span>
                </div>
                <div className="daily-range" aria-label={rangeLabel}>
                  <span>{celsius(d.min)}</span>
                  {range ? (
                    <div className="range-track" aria-hidden="true">
                      <div style={{ left: `${range.left}%`, width: `${range.width}%` }} />
                    </div>
                  ) : (
                    <div className="range-track range-track--empty" aria-hidden="true" />
                  )}
                  <strong>{celsius(d.max)}</strong>
                </div>
              </li>
            );
          })}
        </ol>
      )}
      <p className="panel-note">
        {scale
          ? `Minimum — maksimum harian pada skala mingguan ${Math.round(scale.low)}°–${Math.round(scale.high)}°`
          : "Rentang suhu minimum — maksimum harian"}
        {timezone ? ` · Waktu setempat (${timezone})` : ""}
      </p>
    </section>
  );
}
