import { uvLabel, windDir, type Weather } from "../weather";
export function UVIndex({ value }: { value: number }) {
  return (
    <>
      <p className="detail-value">
        {value}
        <span className="uv-label">{uvLabel(value)}</span>
      </p>
      <div
        className="uv-track"
        role="meter"
        aria-label="Indeks UV maksimum hari ini"
        aria-valuemin={0}
        aria-valuemax={Math.max(11, value)}
        aria-valuenow={value}
        aria-valuetext={`${value}, ${uvLabel(value)}`}
      >
        <span style={{ left: `${Math.min(100, (value / 11) * 100)}%` }} />
      </div>
      <p className="panel-note">Maksimum hari ini</p>
    </>
  );
}
export default function WeatherDetails({ data }: { data: Weather }) {
  const c = data.current;
  const details = [
    [
      "Kelembapan",
      `${c.humidity}%`,
      c.humidity > 70
        ? "Udara lembap"
        : c.humidity < 40
          ? "Udara kering"
          : "Nyaman",
    ],
    ["Angin", `${Math.round(c.wind)} km/j`, `Arah ${windDir(c.windDir)}`],
    ["Tekanan udara", `${Math.round(c.pressure)} hPa`, "Tekanan permukaan"],
    [
      "Visibilitas",
      c.visibility == null
        ? "—"
        : `${(c.visibility / 1000).toLocaleString("id-ID", { maximumFractionDigits: 1 })} km`,
      c.visibility == null ? "Data tidak tersedia" : "Prakiraan jam ini",
    ],
    ["Presipitasi", `${c.precipitation} mm`, "Curah hujan saat ini"],
  ];
  return (
    <section className="details-section" aria-labelledby="details-title">
      <div className="section-heading">
        <div>
          <p className="eyebrow">Lebih dekat dengan cuaca</p>
          <h3 id="details-title">Detail cuaca</h3>
        </div>
      </div>
      <div className="details-grid">
        {details.map(([label, value, sub]) => (
          <article className="glass detail-card" key={label}>
            <h4>{label}</h4>
            <p className="detail-value">{value}</p>
            <p className="panel-note">{sub}</p>
          </article>
        ))}
        <article className="glass detail-card">
          <h4>Indeks UV</h4>
          <UVIndex value={data.daily[0].uv} />
        </article>
      </div>
    </section>
  );
}
