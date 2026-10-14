// Open-Meteo timezone=auto returns location-local ISO wall times WITHOUT offsets.
// Never parse those as browser-local instants. UTC below is only a calendar carrier,
// not a claim that the weather location is in UTC. Offset-bearing instants use Intl.
export function isLocalDate(value: unknown): value is string {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const d = new Date(`${value}T00:00:00Z`);
  return Number.isFinite(d.getTime()) && d.toISOString().slice(0, 10) === value;
}
export function isLocalTime(value: unknown): value is string {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2})?$/.test(value)) return false;
  return isLocalDate(value.slice(0, 10)) && Number(value.slice(11, 13)) < 24 &&
    Number(value.slice(14, 16)) < 60 && (value.length === 16 || Number(value.slice(17, 19)) < 60);
}
export function isTimezone(value: unknown): value is string {
  if (typeof value !== "string" || !value.trim()) return false;
  try { new Intl.DateTimeFormat("id-ID", { timeZone: value }); return true; } catch { return false; }
}
function localParts(iso: string, timezone: string): string {
  if (!isTimezone(timezone)) return "";
  if (isLocalTime(iso) || isLocalDate(iso)) return iso;
  if (!/(Z|[+-]\d{2}:\d{2})$/.test(iso)) return "";
  const date = new Date(iso);
  if (!Number.isFinite(date.getTime())) return "";
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone, year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", hourCycle: "h23",
  }).formatToParts(date);
  const part = (type: Intl.DateTimeFormatPartTypes) => parts.find(p => p.type === type)?.value;
  return `${part("year")}-${part("month")}-${part("day")}T${part("hour")}:${part("minute")}`;
}
const HARI = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];
const BULAN = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];
export const hour = (iso: string, timezone = "UTC") => localParts(iso, timezone).slice(11, 16) || "—";
export function dayName(iso: string, i: number, timezone = "UTC") {
  const local = localParts(iso, timezone);
  if (!local) return "—";
  if (i === 0) return "Hari ini";
  if (i === 1) return "Besok";
  return HARI[new Date(`${local.slice(0, 10)}T00:00:00Z`).getUTCDay()];
}
export function longDate(iso: string, timezone = "UTC") {
  const local = localParts(iso, timezone);
  if (!local) return "—";
  const d = new Date(`${local.slice(0, 10)}T00:00:00Z`);
  return `${HARI[d.getUTCDay()]}, ${d.getUTCDate()} ${BULAN[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
}
