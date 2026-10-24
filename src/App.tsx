import { useEffect, useRef, useState } from "react";
import Search from "./components/Search";
import { type Place } from "./weather";
import WeatherBackground from "./components/WeatherBackground";
import WeatherHero from "./components/WeatherHero";
import HourlyForecast from "./components/HourlyForecast";
import DailyForecast from "./components/DailyForecast";
import TemperatureChart from "./components/TemperatureChart";
import WeatherDetails from "./components/WeatherDetails";
import SunCycle from "./components/SunCycle";
import FavoriteCities from "./components/FavoriteCities";
import { placeKey } from "./lib/place";

import { readPlace, readFavorites, writeStorage } from "./lib/storage";
import { errorMessage, isAbortError } from "./lib/api";
import { GeolocationError, locatePlace } from "./lib/geolocation";
import { useOnline } from "./hooks/useOnline";
import { useWeather } from "./hooks/useWeather";

const DEFAULT: Place = {
  id: 1642911,
  name: "Jakarta",
  admin1: "DKI Jakarta",
  country: "Indonesia",
  latitude: -6.2146,
  longitude: 106.8451,
};

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
  useEffect(
    () => () => {
      clearTimeout(toastTimer.current);
      locationRequest.current?.abort();
      locationRequest.current = null;
    },
    [],
  );
  useEffect(() => {
    if (!writeStorage("cuacaku_place", place))
      notify(
        "Penyimpanan tidak tersedia. Perubahan hanya berlaku selama sesi ini.",
      );
  }, [place]);
  useEffect(() => {
    if (!writeStorage("cuacaku_favs", favs))
      notify(
        "Favorit belum tersimpan di perangkat. Tetap tersedia selama sesi ini.",
      );
  }, [favs]);

  const selectPlace = (selected: Place) => {
    locationRequest.current?.abort();
    locationRequest.current = null;
    setLocating(false);
    setLocationError("");
    if (selected === place) void refresh();
    else setPlace(selected);
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
        setLocationError(
          error instanceof GeolocationError
            ? error.message
            : errorMessage(error),
        );
      }
    } finally {
      if (locationRequest.current === controller) {
        locationRequest.current = null;
        setLocating(false);
      }
    }
  };

  const isFav = favs.some((f) => placeKey(f) === placeKey(place));
  const toggleFav = () => {
    if (isFav) {
      setFavs(favs.filter((f) => !(placeKey(f) === placeKey(place))));
      notify("Dihapus dari favorit");
    } else {
      setFavs([...favs, place].slice(-8));
      notify("⭐ Ditambahkan ke favorit");
    }
  };

  const c = data?.current;
  return (
    <div className="app-shell">
      <WeatherBackground code={c?.code} isDay={c?.isDay} timezone={data?.timezone} />
      <a className="skip-link" href="#weather-content">
        Lewati ke cuaca
      </a>
      <div className="dashboard">
        <header className="app-header">
          <a
            href={import.meta.env.BASE_URL}
            className="brand"
            aria-label="CuacaKu beranda"
          >
            <span className="brand-symbol" aria-hidden="true">
              ☼
            </span>
            <h1>
              Cuaca<span>Ku</span>
            </h1>
            <span className="brand-divider" />
            <span className="brand-tagline">Langit berubah. Tetap siap.</span>
          </a>
          <button
            onClick={() => void refresh()}
            disabled={loading || !online}
            className="icon-button refresh-button"
            title="Muat ulang cuaca"
            aria-label="Muat ulang cuaca"
          >
            <span aria-hidden="true" className={loading ? "spinner" : ""}>
              ↻
            </span>
            <span className="refresh-label">Perbarui</span>
          </button>
        </header>
        <div className="intro">
          <div>
            <p className="eyebrow">SELANGKAH LEBIH SIAP</p>
            <p className="intro-title">Cuaca hari ini, rencana esok hari.</p>
          </div>
          <span className="intro-note">
            Prakiraan lokal. Perspektif lebih luas.
          </span>
        </div>
        <Search
          onSelect={selectPlace}
          onLocate={() => void locate()}
          online={online}
          locating={locating}
        />
        {!online && (
          <p role="status" className="notice">
            Perangkat sedang offline. Cuaca akan dimuat sekali saat koneksi
            kembali.
          </p>
        )}
        {locating && (
          <p role="status" className="notice">
            Mencari lokasimu...
          </p>
        )}
        {locationError && (
          <p role="alert" className="notice error-notice">
            {locationError}
          </p>
        )}
        {loading && (
          <p role="status" className="loading-status">
            Memuat cuaca {place.name}...
          </p>
        )}
        <FavoriteCities
          favorites={favs}
          selectedError={error}
          place={place}
          data={data}
          online={online}
          onSelect={selectPlace}
          onRemove={(removed) => {
            setFavs((previous) =>
              previous.filter((f) => placeKey(f) !== placeKey(removed)),
            );
            notify("Dihapus dari favorit");
          }}
          onClear={() => {
            setFavs([]);
            notify("Semua favorit dihapus");
          }}
        />
        {error && (
          <div className="glass error-state">
            <span className="error-symbol" aria-hidden="true">
              ☁
            </span>
            <h2>Cuaca belum dapat dimuat</h2>
            <p role="alert">{error}</p>
            <button
              onClick={() => void refresh()}
              disabled={loading || !online}
              className="primary-button"
            >
              Coba lagi
            </button>
          </div>
        )}
        {loading && !data && (
          <div aria-hidden="true" className="loading-layout">
            <div className="glass skeleton" />
            <div className="glass skeleton" />
            <div className="glass skeleton" />
          </div>
        )}
        {data && c && data.daily[0] && (
          <main id="weather-content" tabIndex={-1} className="weather-layout">
            <WeatherHero
              place={place}
              data={data}
              favorite={isFav}
              onFavorite={toggleFav}
            />
            <div className="today-trends">
              <TemperatureChart data={data} />
              <SunCycle data={data} />
            </div>
            <HourlyForecast data={data} />
            <DailyForecast data={data} />
            <TemperatureChart data={data} mode="daily" />
            <WeatherDetails data={data} />
          </main>
        )}
        <footer className="app-footer">
          <p>
            <span className="footer-brand">CuacaKu</span> Kenali langit, nikmati
            harimu.
          </p>
          <p>
            Data{" "}
            <a
              href="https://open-meteo.com"
              target="_blank"
              rel="noopener noreferrer"
            >
              Open-Meteo ↗
            </a>
            <span> · </span>Dibuat oleh{" "}
            <a
              href="https://superrrkyy.github.io/"
              target="_blank"
              rel="noopener noreferrer"
            >
              AXRYZURE
            </a>
          </p>
        </footer>
      </div>
      {toast && (
        <div role="status" className="toast">
          {toast}
        </div>
      )}
    </div>
  );
}
