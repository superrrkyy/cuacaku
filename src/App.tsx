import { useEffect, useMemo, useRef, useState } from "react";
import Search from "./components/Search";
import {
  Place, info, icon, theme, hour, dayName, longDate, windDir, uvLabel,
} from "./weather";

import { readPlace, readFavorites, writeStorage } from "./lib/storage";
import { errorMessage, isAbortError } from "./lib/api";
import { GeolocationError, locatePlace } from "./lib/geolocation";
import { useOnline } from "./hooks/useOnline";
import { useWeather } from "./hooks/useWeather";

const DEFAULT: Place = { id: 1642911, name: "Jakarta", admin1: "DKI Jakarta", country: "Indonesia", latitude: -6.2146, longitude: 106.8451 };

export default function App() {
  const [place, setPlace] = useState<Place>(() => readPlace(DEFAULT));
  const [favs, setFavs] = useState<Place[]>(readFavorites);
  const online = useOnline();
  const { data, error, status, refresh } = useWeather(place, online);
  const loading = status === "loading";
  const [toast, setToast] = useState("");
  const [locating, setLocating] = useState(false);
  const [locationError, setLocationError] = useState("");
  const toastTimer = useRef<ReturnType<typeof setTimeout>>();
  const locationRequest = useRef<AbortController | null>(null);

  const notify = (message: string) => {
    clearTimeout(toastTimer.current);
    setToast(message);
    toastTimer.current = setTimeout(() => setToast(""), 2200);
  };
  useEffect(() => () => {
    clearTimeout(toastTimer.current);
    locationRequest.current?.abort();
    locationRequest.current = null;
  }, []);
  useEffect(() => {
    if (!writeStorage("cuacaku_place", place)) notify("Penyimpanan tidak tersedia. Perubahan hanya berlaku selama sesi ini.");
  }, [place]);
  useEffect(() => {
    if (!writeStorage("cuacaku_favs", favs)) notify("Favorit belum tersimpan di perangkat. Tetap tersedia selama sesi ini.");
  }, [favs]);

  const selectPlace = (selected: Place) => {
    locationRequest.current?.abort();
    locationRequest.current = null;
    setLocating(false);
    setLocationError("");
    setPlace(selected);
  };
  const locate = async () => {
    if (locationRequest.current) return;
    const controller = new AbortController();
    locationRequest.current = controller;
    setLocating(true);
    setLocationError("");
    try {
      const selected = await locatePlace(controller.signal);
      if (!controller.signal.aborted) setPlace(selected);
    } catch (error) {
      if (!controller.signal.aborted && !isAbortError(error)) {
        setLocationError(error instanceof GeolocationError ? error.message : errorMessage(error));
      }
    } finally {
      if (locationRequest.current === controller) {
        locationRequest.current = null;
        setLocating(false);
      }
    }
  };

  const isFav = favs.some(f => f.name === place.name && Math.abs(f.latitude - place.latitude) < 0.01);
  const toggleFav = () => {
    if (isFav) { setFavs(favs.filter(f => !(f.name === place.name && Math.abs(f.latitude - place.latitude) < 0.01))); notify("Dihapus dari favorit"); }
    else { setFavs([...favs, place].slice(-8)); notify("⭐ Ditambahkan ke favorit"); }
  };

  const c = data?.current;
  const bg = c ? theme(c.code, c.isDay) : "from-indigo-900 via-violet-900 to-slate-950";
  const group = c ? info(c.code).group : "clear";
  const today = data?.daily[0];

  // efek latar: hujan / bintang
  const drops = useMemo(() => Array.from({ length: 40 }, () => ({
    left: Math.random() * 100, dur: 0.6 + Math.random() * 0.6, delay: Math.random() * 2,
  })), []);
  const stars = useMemo(() => Array.from({ length: 40 }, () => ({
    left: Math.random() * 100, top: Math.random() * 60, delay: Math.random() * 3,
  })), []);

  const range = data ? { lo: Math.min(...data.daily.map(d => d.min)), hi: Math.max(...data.daily.map(d => d.max)) } : { lo: 0, hi: 1 };

  return (
    <div className={`relative min-h-screen overflow-hidden bg-gradient-to-b ${bg} text-white transition-colors duration-1000`}>
      {/* efek latar */}
      <div className="pointer-events-none fixed inset-0">
        {(group === "rain" || group === "storm") && drops.map((d, i) => (
          <span key={i} className="drop" style={{ left: `${d.left}%`, animationDuration: `${d.dur}s`, animationDelay: `${d.delay}s` }} />
        ))}
        {c && !c.isDay && group !== "rain" && group !== "storm" && stars.map((s, i) => (
          <span key={i} className="star" style={{ left: `${s.left}%`, top: `${s.top}%`, animationDelay: `${s.delay}s` }} />
        ))}
      </div>

      <div className="relative mx-auto max-w-xl px-4 pb-10 pt-5">
        {/* header */}
        <header className="mb-4 flex items-center justify-between">
          <h1 className="text-xl font-extrabold tracking-wide">⛅ Cuaca<span className="text-yellow-300">Ku</span></h1>
          <button onClick={() => void refresh()} disabled={loading || !online} className="rounded-full px-3 py-1 text-sm text-white/80 hover:bg-white/10 disabled:opacity-50" title="Muat ulang" aria-label="Muat ulang cuaca">
            <span className={loading ? "inline-block animate-spin" : ""}>🔄</span>
          </button>
        </header>

        <Search onSelect={selectPlace} onLocate={() => void locate()} online={online} locating={locating} />
        {!online && <p role="status" className="glass mt-3 p-3 text-sm">Perangkat sedang offline. Cuaca akan dimuat sekali saat koneksi kembali.</p>}
        {locating && <p role="status" className="mt-3 text-sm">📍 Mencari lokasimu...</p>}
        {locationError && <p role="alert" className="glass mt-3 p-3 text-sm">{locationError}</p>}
        {loading && <p role="status" className="mt-3 text-sm">Memuat cuaca {place.name}...</p>}

        {/* favorit */}
        {favs.length > 0 && (
          <div className="no-scrollbar mt-3 flex gap-2 overflow-x-auto">
            {favs.map(f => (
              <button key={`${f.name}${f.latitude}`} onClick={() => selectPlace(f)}
                className={`shrink-0 rounded-full border px-3 py-1 text-sm transition ${f.name === place.name ? "border-white bg-white text-indigo-900 font-semibold" : "border-white/25 bg-white/10 hover:bg-white/20"}`}>
                ⭐ {f.name}
              </button>
            ))}
          </div>
        )}

        {error && (
          <div className="glass mt-6 p-6 text-center">
            <p role="alert" className="mb-3">😢 {error}</p>
            <button onClick={() => void refresh()} disabled={loading || !online} className="rounded-xl bg-white px-4 py-2 font-semibold text-indigo-900 disabled:opacity-50">Coba lagi</button>
          </div>
        )}

        {loading && !data && (
          <div aria-hidden="true" className="mt-6 space-y-4">
            {[260, 120, 300].map((h, i) => <div key={i} className="glass animate-pulse" style={{ height: h }} />)}
          </div>
        )}

        {data && c && today && (
          <main key={place.name + data.current.time} className="mt-6 space-y-4">
            {/* cuaca sekarang */}
            <section className="fade-up text-center">
              <div className="flex items-center justify-center gap-2">
                <h2 className="text-2xl font-bold">📍 {place.name}</h2>
                <button onClick={toggleFav} className="text-2xl transition active:scale-90" title="Favorit" aria-label={isFav ? "Hapus dari favorit" : "Tambah ke favorit"} aria-pressed={isFav}>{isFav ? "⭐" : "☆"}</button>
              </div>
              <p className="text-sm text-white/70">{[place.admin1, place.country].filter(Boolean).join(", ") || "Lokasi saat ini"}</p>
              <p className="text-sm text-white/70">{longDate(c.time, data.timezone)} • {hour(c.time, data.timezone)}</p>
              <div className="float my-2 text-8xl drop-shadow-2xl">{icon(c.code, c.isDay)}</div>
              <div className="text-7xl font-extralight leading-none">{Math.round(c.temperature)}°</div>
              <p className="mt-2 text-xl font-medium">{info(c.code).label}</p>
              <p className="text-white/80">↑ {Math.round(today.max)}°  ↓ {Math.round(today.min)}° • Terasa {Math.round(c.feelsLike)}°</p>
            </section>

            {/* per jam */}
            <section className="glass fade-up p-4" style={{ animationDelay: ".1s" }}>
              <h3 className="mb-3 text-sm font-semibold text-white/80">🕐 24 JAM KE DEPAN</h3>
              <div className="no-scrollbar flex gap-3 overflow-x-auto pb-1">
                {data.hourly.map((h, i) => (
                  <div key={`${h.time}-${i}`} className={`flex min-w-[60px] flex-col items-center gap-1 rounded-2xl py-2 ${i === 0 ? "bg-white/20" : ""}`}>
                    <span className="text-xs text-white/70">{i === 0 ? "Kini" : hour(h.time, data.timezone)}</span>
                    <span className="text-2xl">{icon(h.code, h.isDay)}</span>
                    <span className="font-semibold">{Math.round(h.temp)}°</span>
                    <span className={`text-[11px] ${h.rain >= 50 ? "text-sky-300" : "text-white/50"}`}>💧{h.rain}%</span>
                  </div>
                ))}
              </div>
            </section>

            {/* 7 hari */}
            <section className="glass fade-up p-4" style={{ animationDelay: ".2s" }}>
              <h3 className="mb-2 text-sm font-semibold text-white/80">📅 PRAKIRAAN 7 HARI</h3>
              {data.daily.map((d, i) => {
                const span = range.hi - range.lo || 1;
                return (
                  <div key={d.date} className="flex items-center gap-3 border-b border-white/10 py-2.5 last:border-0">
                    <span className="w-20 text-sm font-medium">{dayName(d.date, i, data.timezone)}</span>
                    <span className="w-8 text-xl">{icon(d.code)}</span>
                    <span className={`w-12 whitespace-nowrap text-xs ${d.rain >= 50 ? "text-sky-300" : "text-white/50"}`}>💧{d.rain}%</span>
                    <span className="w-8 text-right text-sm text-white/60">{Math.round(d.min)}°</span>
                    <div className="relative h-1.5 flex-1 rounded-full bg-white/15">
                      <div className="absolute h-full rounded-full bg-gradient-to-r from-sky-300 via-yellow-300 to-orange-400"
                        style={{ left: `${((d.min - range.lo) / span) * 100}%`, right: `${100 - ((d.max - range.lo) / span) * 100}%` }} />
                    </div>
                    <span className="w-8 text-sm font-semibold">{Math.round(d.max)}°</span>
                  </div>
                );
              })}
            </section>

            {/* detail */}
            <section className="fade-up grid grid-cols-2 gap-3" style={{ animationDelay: ".3s" }}>
              {[
                ["💧", "Kelembapan", `${c.humidity}%`, c.humidity > 70 ? "Lembap" : c.humidity < 40 ? "Kering" : "Nyaman"],
                ["💨", "Angin", `${Math.round(c.wind)} km/j`, `Arah ${windDir(c.windDir)}`],
                ["🔆", "Indeks UV", `${Math.round(today.uv)}`, uvLabel(today.uv)],
                ["🌡️", "Tekanan", `${Math.round(c.pressure)}`, "hPa"],
                ["🌅", "Matahari Terbit", hour(today.sunrise, data.timezone), "Waktu setempat"],
                ["🌇", "Matahari Terbenam", hour(today.sunset, data.timezone), "Waktu setempat"],
              ].map(([ic, label, val, sub]) => (
                <div key={label} className="glass p-4">
                  <p className="text-xs font-semibold text-white/70">{ic} {label.toUpperCase()}</p>
                  <p className="mt-1 text-2xl font-bold">{val}</p>
                  <p className="text-xs text-white/60">{sub}</p>
                </div>
              ))}
            </section>
          </main>
        )}

        <footer className="mt-8 text-center text-xs text-white/60">
          Data: <a href="https://open-meteo.com" className="underline" target="_blank" rel="noopener">Open-Meteo</a> • Dibuat dengan 💜 oleh{" "}
          <a href="https://superrrkyy.github.io/" className="font-semibold text-yellow-300" target="_blank" rel="noopener">AXRYZURE</a>
        </footer>
      </div>

      {toast && (
        <div role="status" className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2 rounded-full bg-white px-5 py-2 text-sm font-semibold text-indigo-900 shadow-xl">
          {toast}
        </div>
      )}
    </div>
  );
}
