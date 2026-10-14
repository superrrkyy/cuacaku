import { hour, type Weather } from "../weather";
import WeatherIcon from "./WeatherIcon";
export default function HourlyForecast({ data }: { data: Weather }) {
  return (
    <section
      className="glass panel hourly-panel"
      aria-labelledby="hourly-title"
    >
      <div className="section-heading">
        <div>
          <p className="eyebrow">Rencanakan harimu</p>
          <h3 id="hourly-title">24 JAM KE DEPAN</h3>
        </div>
        <span className="muted scroll-hint">Geser untuk melihat →</span>
      </div>
      <div
        className="hourly-scroll"
        tabIndex={0}
        role="region"
        aria-label="Prakiraan per jam, gulir horizontal untuk 24 jam"
      >
        <ol className="hourly-list">
          {data.hourly.map((h, i) => (
            <li
              key={`${h.time}-${i}`}
              className={`hour-card ${i === 0 ? "current" : ""}`}
              aria-current={i === 0 ? "time" : undefined}
            >
              <time dateTime={h.time}>
                {i === 0 ? "Kini" : hour(h.time, data.timezone)}
              </time>
              <WeatherIcon code={h.code} isDay={h.isDay} />
              <strong>{Math.round(h.temp)}°</strong>
              <span
                className="rain-chance"
                aria-label={`Peluang hujan ${h.rain} persen`}
              >
                <svg
                  aria-hidden="true"
                  width="9"
                  height="12"
                  viewBox="0 0 12 16"
                  fill="currentColor"
                >
                  <path d="M6 0C5 4 1 7 1 10a5 5 0 0 0 10 0C11 7 7 4 6 0Z" />
                </svg>
                {h.rain}%
              </span>
              <span className="rain-track" aria-hidden="true">
                <span style={{ width: `${h.rain}%` }} />
              </span>
            </li>
          ))}
        </ol>
      </div>
      <p className="panel-note">
        Persentase menunjukkan peluang hujan · Waktu setempat
      </p>
    </section>
  );
}
