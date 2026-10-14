import { useEffect, useState } from "react";
import { hour, sunProgress } from "../lib/dates";
import type { Weather } from "../weather";
export default function SunCycle({ data }: { data: Weather }) {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);
  const today = data.daily[0],
    progress = sunProgress(today.sunrise, today.sunset, data.timezone, now);
  const angle = Math.PI * (1 - (progress ?? 0));
  return (
    <section className="glass panel sun-panel" aria-labelledby="sun-title">
      <div className="section-heading">
        <div>
          <p className="eyebrow">Ritme hari ini</p>
          <h3 id="sun-title">Matahari</h3>
        </div>
        <span className="small-tag">Waktu lokal</span>
      </div>
      <svg viewBox="0 0 300 130" className="sun-arc" aria-hidden="true">
        <defs>
          <linearGradient id="sun-fill" x1="0" y1="0" x2="0" y2="1">
            <stop stopColor="#e9cc95" stopOpacity=".17" />
            <stop offset="1" stopColor="#e9cc95" stopOpacity="0" />
          </linearGradient>
        </defs>
        <path d="M30 112a120 90 0 0 1 240 0Z" fill="url(#sun-fill)" />
        <path
          d="M30 112a120 90 0 0 1 240 0"
          fill="none"
          stroke="#7a776e"
          strokeDasharray="3 5"
        />
        <path d="M20 113h260" stroke="#ffffff20" />
        {progress !== null && (
          <circle
            cx={150 + 120 * Math.cos(angle)}
            cy={112 - 90 * Math.sin(angle)}
            r="7"
            fill="#f0d499"
            stroke="#f0d49930"
            strokeWidth="12"
          />
        )}
      </svg>
      <dl className="sun-times">
        <div>
          <dt>
            <span aria-hidden="true">↗ </span>Matahari Terbit
          </dt>
          <dd>{hour(today.sunrise, data.timezone)}</dd>
        </div>
        <div>
          <dt>
            <span aria-hidden="true">↘ </span>Matahari Terbenam
          </dt>
          <dd>{hour(today.sunset, data.timezone)}</dd>
        </div>
      </dl>
      {progress !== null ? (
        <div
          className="sun-progress"
          role="progressbar"
          aria-label="Perjalanan matahari hari ini"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={Math.round(progress * 100)}
          aria-valuetext={
            progress === 0
              ? "Sebelum matahari terbit"
              : progress === 1
                ? "Matahari sudah terbenam"
                : `${Math.round(progress * 100)}% waktu siang berlalu`
          }
        >
          <span style={{ width: `${progress * 100}%` }} />
        </div>
      ) : (
        <p className="panel-note">Posisi matahari saat ini tidak tersedia</p>
      )}
      <p className="panel-note">{data.timezone.replace(/_/g, " ")}</p>
    </section>
  );
}
