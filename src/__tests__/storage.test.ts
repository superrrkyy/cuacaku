import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { readFavorites, readPlace, writeStorage } from "../lib/storage";
const place = { id: 1, name: "Jakarta", latitude: -6, longitude: 106 };
const values = new Map<string, string>();
const storage = {
  getItem: vi.fn((key: string) => values.get(key) ?? null),
  setItem: vi.fn((key: string, value: string) => { values.set(key, value); }),
  removeItem: vi.fn((key: string) => { values.delete(key); }),
};
beforeEach(() => { values.clear(); vi.stubGlobal("localStorage", storage); });
afterEach(() => { vi.restoreAllMocks(); vi.unstubAllGlobals(); });
describe("safe storage", () => {
  it("valid JSON roundtrip", () => {
    expect(writeStorage("cuacaku_place", place)).toBe(true);
    expect(writeStorage("cuacaku_favs", [place])).toBe(true);
    expect(readPlace(place)).toEqual(place); expect(readFavorites()).toEqual([place]);
  });
  it("missing keys use defaults", () => {
    expect(readPlace(place)).toEqual(place); expect(readFavorites()).toEqual([]);
  });
  it.each(["{bad", "null", "42", '"hello"', "{}", '[{"name":"Jakarta"}]', JSON.stringify([{ ...place, latitude: 91 }]), JSON.stringify(Array(9).fill(place))])("clears invalid favorites %s", raw => {
    values.set("cuacaku_favs", raw);
    expect(readFavorites()).toEqual([]); expect(values.has("cuacaku_favs")).toBe(false);
  });
  it("clears unexpected place type", () => {
    values.set("cuacaku_place", "[]");
    expect(readPlace(place)).toEqual(place); expect(values.has("cuacaku_place")).toBe(false);
  });
  it("unavailable storage", () => {
    vi.stubGlobal("localStorage", undefined);
    expect(readFavorites()).toEqual([]); expect(readPlace(place)).toEqual(place);
    expect(writeStorage("cuacaku_favs", [])).toBe(false);
  });
  it("security exception on property access", () => {
    Object.defineProperty(globalThis, "localStorage", { configurable: true, get() { throw new Error("SecurityError"); } });
    expect(readFavorites()).toEqual([]); expect(writeStorage("cuacaku_favs", [])).toBe(false);
  });
  it("quota and removal exceptions never escape", () => {
    vi.stubGlobal("localStorage", { getItem() { return "bad"; }, setItem() { throw new Error("QuotaExceededError"); }, removeItem() { throw new Error("SecurityError"); } });
    expect(readFavorites()).toEqual([]); expect(writeStorage("cuacaku_place", place)).toBe(false);
  });
});
