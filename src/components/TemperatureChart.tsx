import { useId } from "react";
import { hour, type Weather } from "../weather";
export default function TemperatureChart({ data }: { data: Weather }) {
  const id = useId();
  const values = data.hourly;
  if (!values.length) return null;
  const min = Math.min(...values.map((h) => h.temp)),
    max = Math.max(...values.map((h) => h.temp));
  const x = (i: number) => 28 + (i / Math.max(1, values.length - 1)) * 564;
  const y = (temp: number) => 130 - ((temp - min) / (max - min || 1)) * 76;
  const points = values.map((h, i) => `${x(i)},${y(h.temp)}`).join(" ");
  const ticks = [
    ...new Set([
      0,
      Math.floor((values.length - 1) / 3),
      Math.floor(((values.length - 1) * 2) / 3),
      values.length - 1,
    ]),
  ];
  return (
    <section
      className="glass panel chart-panel"
      aria-labelledby={`${id}-title`}
    >
      <div className="section-heading">
        <div>
          <p className="eyebrow">Naik & turun</p>
          <h3 id={`${id}-title`}>Tren suhu</h3>
        </div>
        <span className="small-tag">24 jam</span>
      </div>
      <p className="chart-summary" id={`${id}-summary`}>
        Suhu berkisar <strong>{Math.round(min)}°</strong> hingga{" "}
        <strong>{Math.round(max)}°</strong>
        <span> dalam 24 jam ke depan.</span>
      </p>
      <svg
        className="temperature-chart"
        viewBox="0 0 620 150"
        preserveAspectRatio="none"
        role="img"
        aria-label="Grafik tren suhu per jam"
        aria-describedby={`${id}-summary`}
      >
        <defs>
          <linearGradient id={`${id}-fill`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#a6dfca" stopOpacity=".22" />
            <stop offset="100%" stopColor="#a6dfca" stopOpacity="0" />
          </linearGradient>
        </defs>
        {[54, 92, 130].map((v) => (
          <line
            key={v}
            x1="28"
            y1={v}
            x2="592"
            y2={v}
            stroke="white"
            strokeOpacity=".08"
            strokeDasharray="4 6"
          />
        ))}
        <polygon
          points={`28,148 ${points} ${x(values.length - 1)},148`}
          fill={`url(#${id}-fill)`}
        />
        <polyline
          points={points}
          fill="none"
          stroke="#a6dfca"
          strokeWidth="2.5"
          strokeLinejoin="round"
        />
        {ticks.map((i) => (
          <g key={i}>
            <circle
              cx={x(i)}
              cy={y(values[i].temp)}
              r="4"
              fill="#b4ead6"
              stroke="#101b30"
              strokeWidth="2"
            />
          </g>
        ))}
      </svg>
      <div className="chart-axis" aria-hidden="true">
        {ticks.map((i) => (
          <div key={i}>
            <strong>{Math.round(values[i].temp)}°</strong>
            <span>{hour(values[i].time, data.timezone)}</span>
          </div>
        ))}
      </div>
      <details className="chart-data">
        <summary>Lihat data suhu per jam</summary>
        <table>
          <caption>Suhu per jam · {data.timezone}</caption>
          <thead>
            <tr>
              <th scope="col">Jam</th>
              <th scope="col">Suhu °C</th>
            </tr>
          </thead>
          <tbody>
            {values.map((h) => (
              <tr key={h.time}>
                <th scope="row">
                  {h.time.slice(0, 10)} {hour(h.time, data.timezone)}
                </th>
                <td>{h.temp}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </details>
    </section>
  );
}
