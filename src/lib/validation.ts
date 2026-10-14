import type { Place } from "../types/weather";
import { ApiError } from "./api";
import { isLocalDate, isLocalTime, isTimezone } from "./dates";

export const isRecord = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null && !Array.isArray(v);
export const finite = (v: unknown): v is number => typeof v === "number" && Number.isFinite(v);
export const validCoordinates = (lat: unknown, lon: unknown): boolean => finite(lat) && finite(lon) && lat >= -90 && lat <= 90 && lon >= -180 && lon <= 180;
export function isPlace(v: unknown): v is Place {
  return isRecord(v) && Number.isSafeInteger(v.id) && typeof v.name === "string" && !!v.name.trim() &&
    validCoordinates(v.latitude, v.longitude) &&
    (v.admin1 === undefined || typeof v.admin1 === "string") && (v.country === undefined || typeof v.country === "string");
}
const codes = new Set([0, 1, 2, 3, 45, 48, 51, 53, 55, 56, 57, 61, 63, 65, 66, 67, 71, 73, 75, 77, 80, 81, 82, 85, 86, 95, 96, 99]);
const code = (v: unknown): v is number => finite(v) && codes.has(v);
const nonnegative = (v: unknown): v is number => finite(v) && v >= 0;
const percent = (v: unknown): v is number => nonnegative(v) && v <= 100;
const flag = (v: unknown): v is number => v === 0 || v === 1;
const nullablePercent = (v: unknown): v is number | null => v === null || percent(v);
const nullableUV = (v: unknown): v is number | null => v === null || nonnegative(v);

type CurrentNumbers = "temperature_2m" | "apparent_temperature" | "relative_humidity_2m" | "wind_speed_10m" | "wind_direction_10m" | "surface_pressure" | "weather_code" | "is_day" | "precipitation";
interface RawWeather {
  timezone: string;
  current: { time: string } & Record<CurrentNumbers, number>;
  hourly: { time: string[]; temperature_2m: number[]; weather_code: number[]; precipitation_probability: (number | null)[]; is_day: number[] };
  daily: { time: string[]; weather_code: number[]; temperature_2m_max: number[]; temperature_2m_min: number[]; precipitation_probability_max: (number | null)[]; sunrise: string[]; sunset: string[]; uv_index_max: (number | null)[] };
}
function array<T>(v: unknown, length: number, check: (item: unknown) => item is T): v is T[] {
  return Array.isArray(v) && v.length === length && v.every(check);
}
function isWeather(v: unknown): v is RawWeather {
  if (!isRecord(v) || "error" in v || !isTimezone(v.timezone) || !isRecord(v.current) || !isRecord(v.hourly) || !isRecord(v.daily)) return false;
  const c = v.current, h = v.hourly, d = v.daily;
  if (!isLocalTime(c.time) || !finite(c.temperature_2m) || !finite(c.apparent_temperature) ||
      !percent(c.relative_humidity_2m) || !nonnegative(c.wind_speed_10m) || !nonnegative(c.wind_direction_10m) || c.wind_direction_10m > 360 ||
      !nonnegative(c.surface_pressure) || !code(c.weather_code) || !flag(c.is_day) || !nonnegative(c.precipitation)) return false;
  if (!Array.isArray(h.time) || !h.time.length || !h.time.every(isLocalTime) ||
      !Array.isArray(d.time) || !d.time.length || !d.time.every(isLocalDate)) return false;
  const hn = h.time.length, dn = d.time.length;
  if (!array(h.temperature_2m, hn, finite) || !array(h.weather_code, hn, code) || !array(h.precipitation_probability, hn, nullablePercent) || !array(h.is_day, hn, flag) ||
      !array(d.weather_code, dn, code) || !array(d.temperature_2m_max, dn, finite) || !array(d.temperature_2m_min, dn, finite) ||
      !array(d.precipitation_probability_max, dn, nullablePercent) || !array(d.sunrise, dn, isLocalTime) || !array(d.sunset, dn, isLocalTime) || !array(d.uv_index_max, dn, nullableUV)) return false;
  const dates = d.time;
  const highs = d.temperature_2m_max, lows = d.temperature_2m_min;
  return h.time.every((t, i, times) => i === 0 || t >= times[i - 1]) &&
    dates.every((t, i) => (i === 0 || t > dates[i - 1]) && lows[i] <= highs[i]) &&
    d.sunrise.every((t, i) => t.slice(0, 10) === dates[i]) &&
    d.sunset.every((t, i) => t.slice(0, 10) === dates[i]);
}
export function validateWeather(v: unknown): RawWeather {
  if (!isWeather(v)) throw new ApiError("INVALID_RESPONSE");
  return v;
}
