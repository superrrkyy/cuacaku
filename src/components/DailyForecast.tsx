import { dayName, info, temperatureRange, type Weather } from "../weather";
import { shortDate } from "../lib/dates";
import WeatherIcon from "./WeatherIcon";

export default function DailyForecast({ data }: { data: Weather }) {
  const days = data.daily.slice(0, 7);

  if (!days.length) return null;

  const low = Math.min(...days.map((day) => day.min));
  const high = Math.max(...days.map((day) => day.max));

  return (
    <section
      className="glass panel daily-panel"
      aria-labelledby="daily-title"
    >
      <div className="section-heading">
        <div>
          <p className="eyebrow">Sepekan di depan</p>
          <h3 id="daily-title">Prakiraan 7 Hari</h3>
        </div>

        <span className="small-tag">°C</span>
      </div>

      <ol className="daily-list">
        {days.map((day, index) => {
          const range = temperatureRange(
            day.min,
            day.max,
            low,
            high,
          );

          const weather = info(day.code);
          const isToday = index === 0;

          return (
            <li
              key={day.date}
              className={`daily-row ${isToday ? "daily-row--today" : ""}`}
            >
              <div className="daily-day">
                <strong>
                  {isToday
                    ? "Hari ini"
                    : dayName(day.date, index, data.timezone)}
                </strong>

                <time dateTime={day.date}>
                  {shortDate(day.date, data.timezone)}
                </time>
              </div>

              <div
                className="daily-icon"
                aria-label={weather.label}
              >
                <WeatherIcon code={day.code} />
              </div>

              <div className="daily-condition">
                <span>{weather.label}</span>

                <span className="rain-chance">
                  Peluang hujan {day.rain}%
                </span>
              </div>

              <div
                className="daily-range"
                aria-label={`Suhu minimum ${Math.round(
                  day.min,
                )} derajat, maksimum ${Math.round(day.max)} derajat`}
              >
                <span>{Math.round(day.min)}°</span>

                <div
                  className="range-track"
                  aria-hidden="true"
                >
                  <div
                    style={{
                      left: `${range.left}%`,
                      width: `${range.width}%`,
                    }}
                  />
                </div>

                <strong>{Math.round(day.max)}°</strong>
              </div>
            </li>
          );
        })}
      </ol>

      <p className="panel-note">
        Rentang suhu minimum — maksimum harian · Zona waktu{" "}
        {data.timezone}
      </p>
    </section>
  );
}
