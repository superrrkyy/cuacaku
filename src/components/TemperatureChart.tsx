import { useId, useMemo } from "react";
import type { Weather } from "../weather";
import { hour, shortDate, weekdayName, weekdayShort } from "../lib/dates";
import { finite, isRecord } from "../lib/validation";

/**
 * Trend chart drawn with plain SVG — no chart library, no extra request.
 * "daily" plots the loaded 7-day min/max forecast, "hourly" the loaded 24 hours.
 */
export type ChartMode = "hourly" | "daily";
type Props = {
  data: Pick<Weather, "daily" | "hourly" | "timezone">;
  mode?: ChartMode;
};

// One viewBox in user units; CSS scales it. No screen pixels are baked in.
const VIEW = { width: 640, height: 220, top: 20, right: 20, bottom: 24, left: 30 };
const BASELINE = VIEW.height - VIEW.bottom;
const MINT = "#b3e5d2";
const INDIGO = "#a9b8ea";
const round = (v: number) => Math.round(v * 100) / 100;

type Series = { name: string; color: string; values: (number | null)[]; dashed?: boolean };

export default function TemperatureChart({ data, mode = "hourly" }: Props) {
  const id = useId();
  const summaryId = `${id}-summary`;
  const timezone = typeof data?.timezone === "string" ? data.timezone : "";

  const chart = useMemo(() => {
    const daily = mode === "daily";
    const rows: { key: string; label: string; caption: string; values: (number | null)[] }[] = [];

    if (daily) {
      for (const d of Array.isArray(data?.daily) ? data.daily.slice(0, 7) : []) {
        if (!isRecord(d)) continue;
        const date = typeof d.date === "string" ? d.date : "";
        if (!date) continue;
        const max = finite(d.max) ? d.max : null;
        const min = finite(d.min) ? d.min : null;
        if (max === null && min === null) continue;
        rows.push({
          key: date,
          label: weekdayShort(date, timezone) || "—",
          caption: `${weekdayName(date, timezone)}, ${shortDate(date, timezone)}`,
          values: [max, min],
        });
      }
    } else {
      for (const h of Array.isArray(data?.hourly) ? data.hourly.slice(0, 24) : []) {
        if (!isRecord(h)) continue;
        const time = typeof h.time === "string" ? h.time : "";
        if (!time || !finite(h.temp)) continue;
        rows.push({
          key: time,
          label: hour(time, timezone) || "—",
          caption: `${time.slice(0, 10)} ${hour(time, timezone) || "—"}`,
          values: [h.temp],
        });
      }
    }
    if (!rows.length) return null;

    const series: Series[] = daily
      ? [
          { name: "Maksimum", color: MINT, values: rows.map((r) => r.values[0]) },
          { name: "Minimum", color: INDIGO, values: rows.map((r) => r.values[1]), dashed: true },
        ]
      : [{ name: "Suhu", color: MINT, values: rows.map((r) => r.values[0]) }];

    const measured = series.flatMap((s) => s.values).filter(finite);
    const low = Math.min(...measured), high = Math.max(...measured);
    // Identical readings get a ±1° window so a flat line is still drawn mid-plot.
    const pad = high > low ? (high - low) * 0.12 : 1;
    const lo = low - pad, hi = high + pad;
    const innerW = VIEW.width - VIEW.left - VIEW.right;
    const innerH = VIEW.height - VIEW.top - VIEW.bottom;
    const count = rows.length;
    // Band scale: every point sits inside the plot area, so nothing clips at either edge.
    const x = (i: number) => VIEW.left + ((i + 0.5) / count) * innerW;
    const y = (value: number) => VIEW.top + (1 - (value - lo) / (hi - lo)) * innerH;

    const line = (values: (number | null)[]) => {
      let path = "", open = false;
      values.forEach((value, i) => {
        if (!finite(value)) { open = false; return; }
        path += `${open ? "L" : "M"}${round(x(i))},${round(y(value))} `;
        open = true;
      });
      return path.trim();
    };
    // Band between two series, split wherever a value is missing.
    const band = (top: (number | null)[], bottom: (number | null)[]) => {
      let path = "", run: number[] = [];
      const flush = () => {
        if (run.length > 1) {
          const upper = run.map((i) => `${round(x(i))},${round(y(top[i] as number))}`).join(" L");
          const lower = [...run].reverse().map((i) => `${round(x(i))},${round(y(bottom[i] as number))}`).join(" L");
          path += `M${upper} L${lower} Z `;
        }
        run = [];
      };
      for (let i = 0; i < top.length; i += 1) {
        if (finite(top[i]) && finite(bottom[i])) run.push(i);
        else flush();
      }
      flush();
      return path.trim();
    };
    const area = (values: (number | null)[]) => {
      const indexes = values.map((v, i) => (finite(v) ? i : -1)).filter((i) => i >= 0);
      if (indexes.length < 2) return "";
      const top = indexes.map((i) => `${round(x(i))},${round(y(values[i] as number))}`).join(" L");
      return `M${round(x(indexes[0]))},${BASELINE} L${top} L${round(x(indexes[indexes.length - 1]))},${BASELINE} Z`;
    };

    const ticks = daily
      ? rows.map((_, i) => i)
      : [...new Set([0, Math.floor((count - 1) / 3), Math.floor(((count - 1) * 2) / 3), count - 1])]
          .filter((i) => i >= 0 && i < count)
          .filter((i, index, all) => all.indexOf(i) === index);
    const warmest = daily
      ? rows.reduce<number>((best, row, i) => {
          const value = row.values[0];
          return finite(value) && (best < 0 || value > (rows[best].values[0] as number)) ? i : best;
        }, -1)
      : -1;

    return {
      rows,
      series,
      warmest,
      ticks,
      low,
      high,
      count,
      x,
      y,
      line,
      band: daily && series[0] && series[1] ? band(series[0].values, series[1].values) : "",
      area: daily ? "" : area(series[0].values),
    };
  }, [data.daily, data.hourly, mode, timezone]);

  // Empty or unusable dataset: render nothing rather than a broken axis.
  if (!chart) return null;

  const { rows, series, ticks, low, high, count, x, y, line, warmest } = chart;
  const daily = mode === "daily";
  const warmestLabel = warmest >= 0 ? weekdayName(rows[warmest].key, timezone) : "";
  const period = daily
    ? `selama ${count} hari ke depan${warmestLabel ? `, terhangat pada hari ${warmestLabel}` : ""}`
    : "dalam 24 jam ke depan";
  const svgLabel = daily
    ? `Grafik tren suhu maksimum dan minimum harian selama ${count} hari`
    : "Grafik tren suhu per jam";
  const tableCaption = daily ? `Suhu harian · ${timezone}` : `Suhu per jam · ${timezone}`;

  return (
    <section
      className={`glass panel chart-panel${daily ? " chart-panel--daily" : ""}`}
      aria-labelledby={`${id}-title`}
    >
      <div className="section-heading">
        <div>
          <p className="eyebrow">{daily ? "Minggu ini" : "Naik & turun"}</p>
          <h3 id={`${id}-title`}>{daily ? "TREN SUHU 7 HARI" : "Tren suhu"}</h3>
        </div>
        <span className="small-tag">{daily ? `${count} hari` : "24 jam"}</span>
      </div>
      <p className="chart-summary" id={summaryId}>
        Suhu berkisar <strong>{Math.round(low)}°</strong> hingga <strong>{Math.round(high)}°</strong>
        <span> {period}.</span>
        {/* The degree sign is not spoken reliably by every screen reader. */}
        <span className="sr-only"> Semua nilai dalam derajat Celsius.</span>
      </p>
      <div className="chart-frame">
        <svg
          className="temperature-chart"
          viewBox={`0 0 ${VIEW.width} ${VIEW.height}`}
          role="img"
          aria-label={svgLabel}
          aria-describedby={summaryId}
        >
          <defs>
            <linearGradient id={`${id}-fill`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={MINT} stopOpacity=".24" />
              <stop offset="100%" stopColor={MINT} stopOpacity="0" />
            </linearGradient>
            <linearGradient id={`${id}-band`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={MINT} stopOpacity=".2" />
              <stop offset="100%" stopColor={INDIGO} stopOpacity=".08" />
            </linearGradient>
          </defs>
          {[0, 0.5, 1].map((fraction) => {
            const gridY = round(VIEW.top + fraction * (BASELINE - VIEW.top));
            return (
              <line
                key={fraction}
                x1={VIEW.left}
                y1={gridY}
                x2={VIEW.width - VIEW.right}
                y2={gridY}
                stroke="white"
                strokeOpacity={fraction === 1 ? 0.12 : 0.06}
                strokeDasharray={fraction === 1 ? undefined : "4 6"}
              />
            );
          })}
          {chart.band && <path d={chart.band} fill={`url(#${id}-band)`} />}
          {chart.area && <path d={chart.area} fill={`url(#${id}-fill)`} />}
          {series.map((s) => (
            <path
              key={s.name}
              d={line(s.values)}
              fill="none"
              stroke={s.color}
              strokeWidth="2.5"
              strokeDasharray={s.dashed ? "6 5" : undefined}
              strokeLinejoin="round"
              strokeLinecap="round"
            />
          ))}
          {series.map((s) =>
            s.values.map((value, i) =>
              finite(value) && (daily || ticks.includes(i)) ? (
                <circle
                  key={`${s.name}-${rows[i].key}`}
                  cx={round(x(i))}
                  cy={round(y(value))}
                  r={s.dashed ? 3.2 : 4}
                  fill={s.color}
                  stroke="#101b30"
                  strokeWidth="2"
                />
              ) : null,
            ),
          )}
        </svg>
        <div className={`chart-axis${daily ? " chart-axis--daily" : ""}`}>
          {ticks.map((i) => {
            const row = rows[i];
            const [max, min] = row.values;
            return (
              <div key={row.key} style={{ left: `${round((x(i) / VIEW.width) * 100)}%` }}>
                <strong>{finite(max) ? `${Math.round(max)}°` : "—"}</strong>
                {daily && (
                  <span className="chart-axis-low">
                    {finite(min) ? `${Math.round(min)}°` : "—"}
                  </span>
                )}
                <span>{row.label}</span>
              </div>
            );
          })}
        </div>
      </div>
      {daily && (
        <ul className="chart-legend" aria-hidden="true">
          {series.map((s) => (
            <li key={s.name}>
              <span className="chart-legend-dot" style={{ background: s.color }} />
              {s.name}
            </li>
          ))}
        </ul>
      )}
      <details className="chart-data">
        <summary>{daily ? "Lihat data suhu harian" : "Lihat data suhu per jam"}</summary>
        <table>
          <caption>{tableCaption}</caption>
          <thead>
            <tr>
              <th scope="col">{daily ? "Hari" : "Jam"}</th>
              <th scope="col">{daily ? "Maksimum °C" : "Suhu °C"}</th>
              {daily && <th scope="col">Minimum °C</th>}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => {
              const [max, min] = row.values;
              return (
                <tr key={row.key}>
                  <th scope="row">{row.caption}</th>
                  <td>{finite(max) ? max : "—"}</td>
                  {daily && <td>{finite(min) ? min : "—"}</td>}
                </tr>
              );
            })}
          </tbody>
        </table>
      </details>
    </section>
  );
}
