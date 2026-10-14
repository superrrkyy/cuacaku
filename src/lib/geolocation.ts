import type { Place } from "../types/weather";
import { ApiError, isAbortError, requestJson, type RequestOptions } from "./api";
import { isRecord, validCoordinates } from "./validation";

export class GeolocationError extends Error {
  readonly name = "GeolocationError";
}
export function geolocationMessage(code: number): string {
  if (code === 1) return "Izin lokasi ditolak. Izinkan akses lokasi atau cari kota secara manual.";
  if (code === 2) return "Lokasi belum tersedia. Coba lagi atau cari kota secara manual.";
  return "Pencarian lokasi terlalu lama. Coba lagi atau cari kota secara manual.";
}
export function getPosition(signal?: AbortSignal): Promise<GeolocationPosition> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) { reject(new ApiError("ABORTED")); return; }
    if (!navigator.geolocation) { reject(new GeolocationError("Browser tidak mendukung lokasi. Cari kota secara manual.")); return; }
    let settled = false;
    let timer: ReturnType<typeof setTimeout>;
    const finish = (error?: Error, position?: GeolocationPosition) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      signal?.removeEventListener("abort", abort);
      if (error) reject(error);
      else if (position) resolve(position);
    };
    const abort = () => finish(new ApiError("ABORTED"));
    signal?.addEventListener("abort", abort, { once: true });
    timer = setTimeout(() => finish(new GeolocationError(geolocationMessage(3))), 10000);
    try {
      navigator.geolocation.getCurrentPosition(
        position => {
          if (!validCoordinates(position.coords.latitude, position.coords.longitude)) finish(new ApiError("INVALID_COORDINATES"));
          else finish(undefined, position);
        },
        error => finish(new GeolocationError(geolocationMessage(error.code))),
        { timeout: 10000, maximumAge: 60000 },
      );
    } catch { finish(new GeolocationError("Lokasi tidak dapat diakses. Cari kota secara manual.")); }
  });
}
/** Existing optional Nominatim city label: failure never blocks weather at valid coordinates. */
export async function reversePlaceName(lat: number, lon: number, options: RequestOptions = {}): Promise<string> {
  if (!validCoordinates(lat, lon)) throw new ApiError("INVALID_COORDINATES");
  const params = new URLSearchParams({ lat: String(lat), lon: String(lon), format: "json", "accept-language": "id", zoom: "10" });
  try {
    const data = await requestJson(`https://nominatim.openstreetmap.org/reverse?${params}`, options);
    if (!isRecord(data) || !isRecord(data.address)) throw new ApiError("INVALID_RESPONSE");
    for (const key of ["city", "town", "county", "state"]) {
      const name = data.address[key];
      if (typeof name === "string" && name.trim()) return name;
    }
    return "Lokasiku";
  } catch (error) {
    if (isAbortError(error)) throw error;
    return "Lokasiku";
  }
}
export async function locatePlace(signal: AbortSignal): Promise<Place> {
  const { coords: { latitude, longitude } } = await getPosition(signal);
  if (signal.aborted) throw new ApiError("ABORTED");
  const name = navigator.onLine === false ? "Lokasiku" : await reversePlaceName(latitude, longitude, { signal, timeoutMs: 5000 });
  return { id: Date.now(), name, latitude, longitude };
}
