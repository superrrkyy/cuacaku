import { useId } from "react";
import {
  hour,
  info,
  longDate,
  uvLabel,
  type Place,
  type Weather,
} from "../weather";
import WeatherIcon from "./WeatherIcon";
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
  const titleId = useId();
  const c = data.current,
    today = data.daily[0];
  return (
    <section className="glass hero" aria-labelledby={titleId}>
      <div className="hero-top">
        <div>
          <p className="eyebrow">
            <span className="live-dot" aria-hidden="true" /> CUACA SAAT INI
          </p>
          <h2 id={titleId}>{place.name}</h2>
          <p className="muted hero-region">
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
        <div className="hero-reading">
          <p
            className="temperature"
            aria-label={`${Math.round(c.temperature)} derajat Celsius`}
          >
            {Math.round(c.temperature)}
            <span>°</span>
            <small aria-hidden="true">C</small>
          </p>
          <p className="condition">{info(c.code).label}</p>
          <p className="muted feels-like">
            Terasa seperti {Math.round(c.feelsLike)}°
          </p>
        </div>
        <div className="hero-symbol">
          <WeatherIcon code={c.code} isDay={c.isDay} />
        </div>
      </div>
      <dl className="high-low" aria-label="Rentang suhu hari ini">
        <div>
          <dt>Tertinggi hari ini</dt>
          <dd
            aria-label={`Suhu tertinggi ${Math.round(today.max)} derajat Celsius`}
          >
            <span aria-hidden="true">↑ </span>
            {Math.round(today.max)}°
          </dd>
        </div>
        <div>
          <dt>Terendah hari ini</dt>
          <dd
            aria-label={`Suhu terendah ${Math.round(today.min)} derajat Celsius`}
          >
            <span aria-hidden="true">↓ </span>
            {Math.round(today.min)}°
          </dd>
        </div>
      </dl>
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
      <p className="hero-updated muted">
        {longDate(c.time, data.timezone)}{" "}
        <span>· Diperbarui {hour(c.time, data.timezone)} waktu setempat</span>
      </p>
    </section>
  );
}
