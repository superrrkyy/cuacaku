import { useEffect, useState } from "react";
import { getWeather, info, type Place, type Weather } from "../weather";
import { errorMessage, isAbortError } from "../lib/api";
import WeatherIcon from "./WeatherIcon";
export const placeKey = (place: Place) =>
  `${place.latitude},${place.longitude}`;
type Snapshot = { data?: Weather; error?: string };
export default function FavoriteCities({
  favorites,
  place,
  data,
  online,
  selectedError,
  onSelect,
  onRemove,
  onClear,
}: {
  favorites: Place[];
  place: Place;
  data: Weather | null;
  online: boolean;
  selectedError?: string;
  onSelect: (place: Place) => void;
  onRemove: (place: Place) => void;
  onClear: () => void;
}) {
  const [snapshots, setSnapshots] = useState<Record<string, Snapshot>>({});
  const [confirmClear, setConfirmClear] = useState(false);
  // Reuse the selected city's response; fetch other favorites once per selection/list change.
  // Requests share the existing API, cancellation and validation path. No polling per card.
  useEffect(() => {
    setSnapshots((previous) => {
      // Keep only the eight saved cities plus the active city in session memory.
      const keep = new Set([...favorites.map(placeKey), placeKey(place)]);
      const next = Object.fromEntries(
        Object.entries(previous).filter(([key]) => keep.has(key)),
      );
      if (data) next[placeKey(place)] = { data };
      return next;
    });
  }, [place, data, favorites]);
  useEffect(() => {
    if (!online) return;
    const controller = new AbortController();
    for (const favorite of favorites) {
      const key = placeKey(favorite);
      if (key === placeKey(place) || snapshots[key]?.data) continue;
      void getWeather(favorite.latitude, favorite.longitude, {
        signal: controller.signal,
      })
        .then((weather) => {
          if (!controller.signal.aborted)
            setSnapshots((previous) => ({
              ...previous,
              [key]: { data: weather },
            }));
        })
        .catch((error) => {
          if (!controller.signal.aborted && !isAbortError(error))
            setSnapshots((previous) => ({
              ...previous,
              [key]: { error: errorMessage(error) },
            }));
        });
    }
    return () => controller.abort();
    // Snapshots are deliberately not a trigger: settling a card must not refetch other cards.
  }, [favorites, place, online]);
  if (!favorites.length)
    return (
      <aside className="favorites-empty">
        <span aria-hidden="true">☆</span> Simpan kota favorit untuk melihat
        cuacanya sekilas.
      </aside>
    );
  return (
    <aside className="favorites-section" aria-label="Kota favorit">
      <div className="favorites-heading">
        <h3>
          Kota favorit <span>{favorites.length}/8</span>
        </h3>
        {confirmClear ? (
          <div className="clear-confirm">
            <span>Hapus semua?</span>
            <button
              onClick={() => {
                onClear();
                setConfirmClear(false);
              }}
              className="text-button"
            >
              Ya, hapus
            </button>
            <button
              className="text-button"
              onClick={() => setConfirmClear(false)}
            >
              Batal
            </button>
          </div>
        ) : (
          <button className="text-button" onClick={() => setConfirmClear(true)}>
            Bersihkan favorit
          </button>
        )}
      </div>
      <ul className="favorites-list">
        {favorites.map((favorite) => {
          const key = placeKey(favorite),
            selected = key === placeKey(place);
          const snapshot = selected
            ? { data: data ?? undefined, error: selectedError }
            : snapshots[key];
          const current = snapshot?.data?.current;
          return (
            <li
              className={`glass favorite-card ${selected ? "selected" : ""}`}
              key={key}
            >
              <button
                className="favorite-select"
                onClick={() => onSelect(favorite)}
                aria-label={`Lihat cuaca ${favorite.name}`}
                aria-pressed={selected}
              >
                <span className="favorite-city">
                  {favorite.name}
                  <small>
                    {current
                      ? info(current.code).label
                      : snapshot?.error
                        ? "Gagal memuat · pilih untuk mencoba"
                        : !online
                          ? "Offline"
                          : "Memuat cuaca…"}
                  </small>
                </span>
                {current && (
                  <>
                    <WeatherIcon code={current.code} isDay={current.isDay} />
                    <strong>{Math.round(current.temperature)}°</strong>
                  </>
                )}
              </button>
              <button
                className="favorite-remove icon-button"
                onClick={() => onRemove(favorite)}
                aria-label={`Hapus ${favorite.name} dari favorit`}
                title={`Hapus ${favorite.name}`}
              >
                ×
              </button>
              {current && (
                <span className="favorite-time">
                  {selected
                    ? "Dipilih"
                    : `Data ${current.time.slice(8, 10)}/${current.time.slice(5, 7)} ${current.time.slice(11, 16)} · lokal`}
                </span>
              )}
            </li>
          );
        })}
      </ul>
    </aside>
  );
}
