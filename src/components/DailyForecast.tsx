import { dayName, info, temperatureRange, type Weather } from "../weather";
import { shortDate } from "../lib/dates";
import WeatherIcon from "./WeatherIcon";
export default function DailyForecast({ data }: { data: Weather }) {
  const low = Math.min(...data.daily.map((d) => d.min)),
    high = Math.max(...data.daily.map((d) => d.max));
  return (
    <section className="glass panel daily-panel" aria-labelledby="daily-title">
      <div className="section-heading">
        <div>
          <p className="eyebrow">Sepekan di depan</p>
          <h3 id="daily-title">PRAKIRAAN 7 HARI</h3>
        </div>
        <span className="small-tag">°C</span>
      </div>
      <ol className="daily-list">
        {data.daily.map((d, i) => {
          const range = temperatureRange(d.min, d.max, low, high);
          return (
            <li key={d.date} className="daily-row">
              <div className="daily-day">
                <strong>{dayName(d.date, i, data.timezone)}</strong>
                <time dateTime={d.date}>
                  {shortDate(d.date, data.timezone)}
                </time>
              </div>
              <WeatherIcon code={d.code} />
              <div className="daily-condition">
                <span>{info(d.code).label}</span>
                <span className="rain-chance">Peluang hujan {d.rain}%</span>
              </div>
              <div
                className="daily-range"
                aria-label={`Minimum ${Math.round(d.min)}°, maksimum ${Math.round(d.max)}°`}
              >
                <span>{Math.round(d.min)}°</span>
                <div className="range-track" aria-hidden="true">
                  <div
                    style={{ left: `${range.left}%`, width: `${range.width}%` }}
                  />
                </div>
                <strong>{Math.round(d.max)}°</strong>
              </div>
            </li>
          );
        })}
      </ol>
      <p className="panel-note">Rentang suhu minimum — maksimum harian</p>
    </section>
  );
}
