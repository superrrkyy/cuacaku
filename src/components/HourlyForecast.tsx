import { useEffect, useId, useMemo, useState } from "react";
import { info, type Weather } from "../weather";
import { localHourKey, shortDate } from "../lib/dates";
import { finite, isRecord } from "../lib/validation";
import WeatherIcon from "./WeatherIcon";

// Keep the existing data prop, but depend only on normalized hourly data and timezone.
type Props = { data: Pick<Weather, "hourly" | "timezone"> };

export default function HourlyForecast({ data }: Props) {
  const titleId = useId();
  const noteId = useId();
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    // One clock for the entire timeline, not one timer per card. Also update on tab return.
    const update = () => setNow(new Date());
    const timer = setInterval(update, 60000);
    document.addEventListener("visibilitychange", update);
    return () => {
      clearInterval(timer);
      document.removeEventListener("visibilitychange", update);
    };
  }, []);

  // Derive once per response, not on each clock tick. Never fabricate missing readings.
  const hours = useMemo(() => {
    if (!Array.isArray(data.hourly)) return [];
    return data.hourly.flatMap((h) => {
      if (!isRecord(h)) return [];
      const key = localHourKey(h.time, data.timezone);
      if (!key) return [];
      return [{
        time: h.time as string,
        key,
        label: `${key.slice(11)}:00`,
        date: shortDate(h.time as string, data.timezone),
        temp: finite(h.temp) ? Math.round(h.temp) : null,
        code: finite(h.code) ? h.code : -1,
        isDay: typeof h.isDay === "boolean" ? h.isDay : undefined,
        rain: finite(h.rain) && h.rain >= 0 && h.rain <= 100 ? h.rain : null,
      }];
    }).slice(0, 24);
  }, [data.hourly, data.timezone]);
  const currentKey = localHourKey(now.toISOString(), data.timezone);
  // A repeated offset-free DST hour cannot be disambiguated by the API. Mark at most one.
  const currentIndex = hours.findIndex((h) => h.key === currentKey);

  return (
    <section className="glass panel hourly-panel" aria-labelledby={titleId}>
      <div className="section-heading">
        <div>
          <p className="eyebrow">Rencanakan harimu</p>
          <h3 id={titleId}>24 JAM KE DEPAN</h3>
        </div>
        {hours.length > 0 && <span className="muted scroll-hint">Geser untuk melihat →</span>}
      </div>
      {hours.length === 0 ? (
        <p className="hourly-empty" role="status">Prakiraan per jam belum tersedia.</p>
      ) : (
        <>
          <div
            className="hourly-scroll"
            tabIndex={0}
            role="region"
            aria-label="Prakiraan per jam, gulir horizontal untuk 24 jam"
            aria-describedby={noteId}
          >
            <ol className="hourly-list" role="list">
              {hours.map((h, i) => {
                const current = i === currentIndex;
                const condition = info(h.code).label;
                const temperature = h.temp === null ? "Suhu tidak tersedia" : `${h.temp} derajat Celsius`;
                const precipitation = h.rain === null ? "Peluang hujan tidak tersedia" : `Peluang hujan ${h.rain} persen`;
                return (
                  <li
                    key={`${h.time}-${i}`}
                    className={`hour-card ${current ? "current" : ""}`}
                    aria-current={current ? "time" : undefined}
                    aria-label={`${h.date}, ${h.label}${current ? ", Kini" : ""}, ${condition}, ${temperature}, ${precipitation}.`}
                  >
                    <span className={`hour-marker ${current ? "now-marker" : ""}`}>
                      {current ? "Kini" : h.date}
                    </span>
                    <time dateTime={h.time}>{h.label}</time>
                    {h.isDay === undefined || condition === "Tidak diketahui" ? (
                      <span className="hourly-unknown" role="img" aria-label={condition}>—</span>
                    ) : <WeatherIcon code={h.code} isDay={h.isDay} />}
                    <strong aria-label={temperature}>{h.temp === null ? "—" : `${h.temp}°`}</strong>
                    <span className="rain-chance" aria-label={precipitation}>
                      <svg aria-hidden="true" width="10" height="13" viewBox="0 0 12 16" fill="currentColor">
                        <path d="M6 0C5 4 1 7 1 10a5 5 0 0 0 10 0C11 7 7 4 6 0Z" />
                      </svg>
                      {h.rain === null ? "—" : `${h.rain}%`}
                    </span>
                    {h.rain !== null && (
                      <span className="rain-track" aria-hidden="true">
                        <span style={{ width: `${h.rain}%` }} />
                      </span>
                    )}
                  </li>
                );
              })}
            </ol>
          </div>
          <p id={noteId} className="panel-note hourly-note">
            Peluang hujan · Waktu setempat ({data.timezone}). Geser atau gunakan tombol panah saat timeline difokuskan.
          </p>
        </>
      )}
    </section>
  );
}
