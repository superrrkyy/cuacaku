import type { Place } from "../types/weather";
import { isPlace } from "./validation";

export function readStorage<T>(key: string, fallback: T, valid: (v: unknown) => v is T): T {
  try {
    const raw = localStorage.getItem(key);
    if (raw === null) return fallback;
    const value: unknown = JSON.parse(raw);
    if (valid(value)) return value;
  } catch { /* unavailable storage or invalid JSON: best-effort removal below */ }
  try { localStorage.removeItem(key); } catch { /* security restrictions */ }
  return fallback;
}
export function writeStorage(key: string, value: unknown): boolean {
  try { localStorage.setItem(key, JSON.stringify(value)); return true; }
  catch { return false; } // quota/security: app continues with in-memory state
}
export const readPlace = (fallback: Place) => readStorage("cuacaku_place", fallback, isPlace);
export const readFavorites = () => readStorage("cuacaku_favs", [], (v): v is Place[] => Array.isArray(v) && v.length <= 8 && v.every(isPlace));
