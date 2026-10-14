import {
  hour,
  info,
  longDate,
  uvLabel,
  type Place,
  type Weather,
} from "../weather";
import WeatherIcon from "./WeatherIcon";
import LocalClock from "./LocalClock";
export default function WeatherHero({
  place,
  data,
  favorite,
  onFavorite,
}: {
  place: Place;
  data: Weather;
  favorite: boolean;
  onFavorite: () => void;
}) {
  const c = data.current,
    today = data.daily[0];
  return (
    <section className="glass hero" aria-labelledby="location-title">
      <div className="hero-top">
        <div>
          <p className="eyebrow">
            <span className="live-dot" /> CUACA SAAT INI
          </p>
          <h2 id="location-title">{place.name}</h2>
          <p className="muted">
            {[place.admin1, place.country].filter(Boolean).join(", ") ||
              "Lokasi saat ini"}
          </p>
        </div>
        <button
          className={`icon-button favorite-toggle ${favorite ? "selected" : ""}`}
          onClick={onFavorite}
          aria-label={favorite ? "Hapus dari favorit" : "Tambah ke favorit"}
          aria-pressed={favorite}
          title="Simpan kota favorit"
        >
          {favorite ? "★" : "☆"}
        </button>
      </div>
      <div className="hero-weather">
        <div>
          <p
            className="temperature"
            aria-label={`${Math.round(c.temperature)} derajat Celsius`}
          >
            {Math.round(c.temperature)}
            <span>°</span>
          </p>
          <p className="condition">{info(c.code).label}</p>
          <p className="muted feels-like">
            Terasa seperti {Math.round(c.feelsLike)}°
          </p>
        </div>
        <div className="hero-symbol">
          <WeatherIcon code={c.code} isDay={c.isDay} />
          <p className="high-low">
            <span
              aria-label={`Suhu tertinggi ${Math.round(today.max)} derajat`}
            >
              ↑ {Math.round(today.max)}°
            </span>
            <span aria-label={`Suhu terendah ${Math.round(today.min)} derajat`}>
              ↓ {Math.round(today.min)}°
            </span>
          </p>
        </div>
      </div>
      <dl className="hero-metrics">
        {[
          ["Presipitasi", `${c.precipitation} mm`],
          ["Kelembapan", `${c.humidity}%`],
          ["Angin", `${Math.round(c.wind)} km/j`],
          ["UV maks. hari ini", `${today.uv} · ${uvLabel(today.uv)}`],
        ].map(([label, value]) => (
          <div key={label}>
            <dt>{label}</dt>
            <dd>{value}</dd>
          </div>
        ))}
      </dl>
      <div className="hero-footer">
        <p className="hero-updated muted">
          {longDate(c.time, data.timezone)}{" "}
          <span>· Diperbarui {hour(c.time, data.timezone)} waktu setempat</span>
        </p>
        <LocalClock
          timezone={data.timezone}
          locationName={place.name}
          className="hero-local-clock"
        />
      </div>
    </section>
  );
}
