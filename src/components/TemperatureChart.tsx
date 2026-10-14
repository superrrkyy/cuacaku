import { useId, useMemo } from "react";
import { dayName, type Weather } from "../weather";

export default function TemperatureChart({
  data,
}: {
  data: Weather;
}) {
  const id = useId();

  const values = useMemo(
    () =>
      data.daily.slice(0, 7).map((day, index) => ({
        date: day.date,
        min: day.min,
        max: day.max,
        label: dayName(day.date, index, data.timezone),
      })),
    [data.daily, data.timezone],
  );

  if (!values.length) return null;

  const temperatures = values.flatMap((day) => [
    day.min,
    day.max,
  ]);

  const min = Math.min(...temperatures);
  const max = Math.max(...temperatures);

  const range = Math.max(max - min, 1);

  const width = 680;
  const height = 230;

  const paddingLeft = 42;
  const paddingRight = 20;
  const paddingTop = 24;
  const paddingBottom = 48;

  const chartWidth =
    width - paddingLeft - paddingRight;

  const chartHeight =
    height - paddingTop - paddingBottom;

  const x = (index: number) => {
    if (values.length === 1) {
      return paddingLeft + chartWidth / 2;
    }

    return (
      paddingLeft +
      (index / (values.length - 1)) * chartWidth
    );
  };

  const y = (temperature: number) =>
    paddingTop +
    (1 - (temperature - min) / range) *
      chartHeight;

  const maxPoints = values
    .map((day, index) => `${x(index)},${y(day.max)}`)
    .join(" ");

  const minPoints = values
    .map((day, index) => `${x(index)},${y(day.min)}`)
    .join(" ");

  const summaryDay = values.reduce(
    (warmest, current) =>
      current.max > warmest.max ? current : warmest,
    values[0],
  );

  const coolestDay = values.reduce(
    (coolest, current) =>
      current.min < coolest.min ? current : coolest,
    values[0],
  );

  const summary = `Dalam 7 hari ke depan, suhu berkisar dari ${Math.round(
    min,
  )} hingga ${Math.round(
    max,
  )} derajat Celsius. Suhu tertinggi diperkirakan pada ${
    summaryDay.label
  }, sedangkan suhu terendah pada ${coolestDay.label}.`;

  return (
    <section
      className="glass panel chart-panel"
      aria-labelledby={`${id}-title`}
    >
      <div className="section-heading">
        <div>
          <p className="eyebrow">Tren temperatur</p>
          <h3 id={`${id}-title`}>
            Suhu 7 Hari
          </h3>
        </div>

        <span className="small-tag">7 hari</span>
      </div>

      <p
        className="chart-summary"
        id={`${id}-summary`}
      >
        {summary}
      </p>

      <div className="temperature-chart-wrap">
        <svg
          className="temperature-chart temperature-chart--daily"
          viewBox={`0 0 ${width} ${height}`}
          role="img"
          aria-label="Grafik tren suhu minimum dan maksimum selama 7 hari"
          aria-describedby={`${id}-summary`}
        >
          <defs>
            <linearGradient
              id={`${id}-max-fill`}
              x1="0"
              y1="0"
              x2="0"
              y2="1"
            >
              <stop
                offset="0%"
                stopColor="#b3e5d2"
                stopOpacity=".20"
              />
              <stop
                offset="100%"
                stopColor="#b3e5d2"
                stopOpacity="0"
              />
            </linearGradient>
          </defs>

          {[0, 0.5, 1].map((position) => {
            const lineY =
              paddingTop +
              position * chartHeight;

            return (
              <line
                key={position}
                x1={paddingLeft}
                y1={lineY}
                x2={width - paddingRight}
                y2={lineY}
                stroke="white"
                strokeOpacity=".08"
                strokeDasharray="4 6"
              />
            );
          })}

          <polygon
            points={`${paddingLeft},${
              paddingTop + chartHeight
            } ${maxPoints} ${
              x(values.length - 1)
            },${paddingTop + chartHeight}`}
            fill={`url(#${id}-max-fill)`}
          />

          <polyline
            points={maxPoints}
            fill="none"
            stroke="#b3e5d2"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          <polyline
            points={minPoints}
            fill="none"
            stroke="#9aa9bd"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeDasharray="5 4"
          />

          {values.map((day, index) => {
            const pointX = x(index);
            const maxY = y(day.max);
            const minY = y(day.min);

            return (
              <g key={day.date}>
                <circle
                  cx={pointX}
                  cy={maxY}
                  r="4.5"
                  fill="#b3e5d2"
                  stroke="#101b30"
                  strokeWidth="2"
                />

                <circle
                  cx={pointX}
                  cy={minY}
                  r="4"
                  fill="#9aa9bd"
                  stroke="#101b30"
                  strokeWidth="2"
                />

                <text
                  x={pointX}
                  y={height - 23}
                  textAnchor="middle"
                  fill="#a4b1c5"
                  fontSize="11"
                >
                  {index === 0
                    ? "Hari ini"
                    : day.label}
                </text>
              </g>
            );
          })}
        </svg>
      </div>

      <div className="chart-legend">
        <span>
          <i
            className="chart-legend-dot chart-legend-dot--max"
            aria-hidden="true"
          />
          Maksimum
        </span>

        <span>
          <i
            className="chart-legend-dot chart-legend-dot--min"
            aria-hidden="true"
          />
          Minimum
        </span>
      </div>

      <details className="chart-data">
        <summary>
          Lihat data suhu harian
        </summary>

        <table>
          <caption>
            Suhu minimum dan maksimum ·{" "}
            {data.timezone}
          </caption>

          <thead>
            <tr>
              <th scope="col">Hari</th>
              <th scope="col">Minimum</th>
              <th scope="col">Maksimum</th>
            </tr>
          </thead>

          <tbody>
            {values.map((day) => (
              <tr key={day.date}>
                <th scope="row">
                  {day.label}
                </th>

                <td>
                  {Math.round(day.min)}°C
                </td>

                <td>
                  {Math.round(day.max)}°C
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </details>
    </section>
  );
}
