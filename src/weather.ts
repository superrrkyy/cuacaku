// Data cuaca dari Open-Meteo (gratis, tanpa API key)

import type { Place, Weather } from "./types/weather";
export type { Place, Weather } from "./types/weather";
import { ApiError, endpoint, requestJson, type RequestOptions } from "./lib/api";
import { isRecord, isPlace, validCoordinates, validateWeather } from "./lib/validation";
export { hour, dayName, longDate } from "./lib/dates";

export async function searchPlaces(q: string, options: RequestOptions = {}): Promise<Place[]> {
  const query = q.trim();
  if (query.length < 2) return [];
  const params = new URLSearchParams({ name: query, count: "6", language: "id" });
  const data = await requestJson(endpoint(`https://geocoding-api.open-meteo.com/v1/search?${params}`, `/mock/geocoding?${params}`), options);
  if (!isRecord(data) || "error" in data) throw new ApiError("INVALID_RESPONSE");
  // Open-Meteo omits results entirely for a valid search with no matches.
  if (!("results" in data)) {
    if (Object.keys(data).every(k => k === "generationtime_ms") &&
        (data.generationtime_ms === undefined || (typeof data.generationtime_ms === "number" && Number.isFinite(data.generationtime_ms)))) return [];
    throw new ApiError("INVALID_RESPONSE");
  }
  if (!Array.isArray(data.results) || !data.results.every(isPlace)) throw new ApiError("INVALID_RESPONSE");
  return data.results;
}

export async function getWeather(lat: number, lon: number, options: RequestOptions = {}): Promise<Weather> {
  if (!validCoordinates(lat, lon)) throw new ApiError("INVALID_COORDINATES");
  const params = new URLSearchParams({
    latitude: String(lat),
    longitude: String(lon),
    current:
      "temperature_2m,apparent_temperature,relative_humidity_2m,wind_speed_10m,wind_direction_10m,surface_pressure,weather_code,is_day,precipitation",
    hourly: "temperature_2m,weather_code,precipitation_probability,is_day,visibility",
    daily: "weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max,sunrise,sunset,uv_index_max",
    timezone: "auto",
    forecast_days: "7",
  });
  const raw = await requestJson(endpoint(`https://api.open-meteo.com/v1/forecast?${params}`, `/mock/forecast?${params}`), options);
  const d = validateWeather(raw);

  // ambil 24 jam ke depan mulai dari jam sekarang
  const nowHour = d.current.time.slice(0, 13);
  const startIdx = d.hourly.time.findIndex(t => t.slice(0, 13) === nowHour);
  if (startIdx < 0 || d.hourly.time.length - startIdx < 24 || d.daily.time[0] !== d.current.time.slice(0, 10)) {
    throw new ApiError("INVALID_RESPONSE");
  }

  return {
    timezone: d.timezone,
    current: {
      time: d.current.time,
      temperature: d.current.temperature_2m,
      feelsLike: d.current.apparent_temperature,
      humidity: d.current.relative_humidity_2m,
      wind: d.current.wind_speed_10m,
      windDir: d.current.wind_direction_10m,
      pressure: d.current.surface_pressure,
      code: d.current.weather_code,
      isDay: d.current.is_day === 1,
      precipitation: d.current.precipitation,
      visibility: d.hourly.visibility?.[startIdx] ?? null,
    },
    hourly: d.hourly.time.slice(startIdx, startIdx + 24).map((t: string, i: number) => ({
      time: t,
      temp: d.hourly.temperature_2m[startIdx + i],
      code: d.hourly.weather_code[startIdx + i],
      rain: d.hourly.precipitation_probability[startIdx + i],
      isDay: d.hourly.is_day[startIdx + i] === 1,
    })),
    daily: d.daily.time.map((t: string, i: number) => ({
      date: t,
      code: d.daily.weather_code[i],
      max: d.daily.temperature_2m_max[i],
      min: d.daily.temperature_2m_min[i],
      // Unknown probability stays unknown; the UI shows "—" instead of an invented 0%.
      rain: d.daily.precipitation_probability_max[i] ?? null,
      sunrise: d.daily.sunrise[i],
      sunset: d.daily.sunset[i],
      uv: d.daily.uv_index_max[i] ?? 0,
    })),
  };
}

// Kode cuaca WMO → label & ikon
type Info = { label: string; day: string; night: string; group: Group };
type Group = "clear" | "cloud" | "fog" | "rain" | "storm" | "snow";

const CODES: Record<number, Info> = {
  0: { label: "Cerah", day: "☀️", night: "🌙", group: "clear" },
  1: { label: "Cerah Berawan", day: "🌤️", night: "🌙", group: "clear" },
  2: { label: "Berawan Sebagian", day: "⛅", night: "☁️", group: "cloud" },
  3: { label: "Berawan", day: "☁️", night: "☁️", group: "cloud" },
  45: { label: "Berkabut", day: "🌫️", night: "🌫️", group: "fog" },
  48: { label: "Kabut Beku", day: "🌫️", night: "🌫️", group: "fog" },
  51: { label: "Gerimis Ringan", day: "🌦️", night: "🌧️", group: "rain" },
  53: { label: "Gerimis", day: "🌦️", night: "🌧️", group: "rain" },
  55: { label: "Gerimis Lebat", day: "🌧️", night: "🌧️", group: "rain" },
  56: { label: "Gerimis Beku", day: "🌧️", night: "🌧️", group: "rain" },
  57: { label: "Gerimis Beku", day: "🌧️", night: "🌧️", group: "rain" },
  61: { label: "Hujan Ringan", day: "🌦️", night: "🌧️", group: "rain" },
  63: { label: "Hujan Sedang", day: "🌧️", night: "🌧️", group: "rain" },
  65: { label: "Hujan Lebat", day: "🌧️", night: "🌧️", group: "rain" },
  66: { label: "Hujan Beku", day: "🌧️", night: "🌧️", group: "rain" },
  67: { label: "Hujan Beku", day: "🌧️", night: "🌧️", group: "rain" },
  71: { label: "Salju Ringan", day: "🌨️", night: "🌨️", group: "snow" },
  73: { label: "Salju", day: "🌨️", night: "🌨️", group: "snow" },
  75: { label: "Salju Lebat", day: "❄️", night: "❄️", group: "snow" },
  77: { label: "Butiran Salju", day: "🌨️", night: "🌨️", group: "snow" },
  80: { label: "Hujan Lokal", day: "🌦️", night: "🌧️", group: "rain" },
  81: { label: "Hujan Lokal", day: "🌧️", night: "🌧️", group: "rain" },
  82: { label: "Hujan Deras", day: "⛈️", night: "⛈️", group: "storm" },
  85: { label: "Salju Lokal", day: "🌨️", night: "🌨️", group: "snow" },
  86: { label: "Salju Lebat", day: "❄️", night: "❄️", group: "snow" },
  95: { label: "Badai Petir", day: "⛈️", night: "⛈️", group: "storm" },
  96: { label: "Badai Petir & Es", day: "⛈️", night: "⛈️", group: "storm" },
  99: { label: "Badai Petir & Es", day: "⛈️", night: "⛈️", group: "storm" },
};

export function info(code: number) {
  return CODES[code] ?? { label: "Tidak diketahui", day: "🌡️", night: "🌡️", group: "cloud" as Group };
}
export const icon = (code: number, isDay = true) => (isDay ? info(code).day : info(code).night);

// Latar dinamis sesuai cuaca & siang/malam
export function theme(code: number, isDay: boolean) {
  const g = info(code).group;
  if (!isDay) {
    if (g === "storm") return "from-slate-950 via-indigo-950 to-black";
    if (g === "rain") return "from-slate-900 via-slate-800 to-indigo-950";
    return "from-indigo-950 via-violet-950 to-slate-950";
  }
  switch (g) {
    case "clear": return "from-sky-400 via-blue-500 to-indigo-600";
    case "cloud": return "from-slate-400 via-slate-500 to-indigo-700";
    case "fog": return "from-gray-400 via-slate-500 to-slate-700";
    case "rain": return "from-slate-600 via-slate-700 to-indigo-900";
    case "storm": return "from-slate-800 via-indigo-900 to-slate-950";
    case "snow": return "from-sky-200 via-slate-300 to-slate-500";
  }
}

export function windDir(deg: number) {
  return ["U", "TL", "T", "TG", "S", "BD", "B", "BL"][Math.round(deg / 45) % 8];
}
export function uvLabel(uv: number) {
  return uv < 3 ? "Rendah" : uv < 6 ? "Sedang" : uv < 8 ? "Tinggi" : uv < 11 ? "Sangat Tinggi" : "Ekstrem";
}

export type WeatherVisualState = "clear-day" | "clear-night" | "cloudy" | "rain" | "storm" | "snow" | "fog";
/** One WMO source of truth for icons and atmosphere. */
export function weatherVisualState(code: number, isDay = true): WeatherVisualState {
  const group = info(code).group;
  return group === "clear" ? (isDay ? "clear-day" : "clear-night") : group === "cloud" ? "cloudy" : group;
}

export function temperatureRange(min: number, max: number, low: number, high: number) {
  if (high <= low) return { left: 0, width: 100 };
  const clamp = (v: number) => Math.max(0, Math.min(100, v));
  const left = clamp((min - low) / (high - low) * 100);
  return { left, width: Math.max(0, clamp((max - low) / (high - low) * 100) - left) };
}
