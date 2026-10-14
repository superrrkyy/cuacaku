// @vitest-environment jsdom
import { act, StrictMode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import App from "../App";
import { getWeather, searchPlaces, type Weather } from "../weather";
import { ApiError } from "../lib/api";
import { click, deferred, dom, tick, type } from "./dom";
vi.mock("../weather", async importOriginal => ({ ...await importOriginal<typeof import("../weather")>(), getWeather: vi.fn(), searchPlaces: vi.fn() }));
const get = vi.mocked(getWeather);
const bandung = { id: 2, name: "Bandung", latitude: -6.9, longitude: 107.6 };
const weather: Weather = {
  timezone: "Asia/Jakarta",
  current: { time: "2026-10-14T07:00", temperature: 31, feelsLike: 34, humidity: 70, wind: 12, windDir: 90, pressure: 1008, code: 61, isDay: true, precipitation: 0.4 },
  hourly: [{ time: "2026-10-14T07:00", temp: 31, code: 61, rain: 80, isDay: true }],
  daily: [{ date: "2026-10-14", code: 61, max: 32, min: 25, rain: 80, sunrise: "2026-10-14T05:30", sunset: "2026-10-14T17:45", uv: 7.5 }],
};
let view: ReturnType<typeof dom>;
let connected = true;
beforeEach(() => {
  vi.useFakeTimers(); vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  localStorage.clear(); connected = true;
  vi.spyOn(navigator, "onLine", "get").mockImplementation(() => connected);
  get.mockReset().mockResolvedValue(weather);
  vi.mocked(searchPlaces).mockReset().mockResolvedValue([bandung]);
  view = dom();
});
afterEach(async () => { await view.unmount(); vi.useRealTimers(); vi.restoreAllMocks(); vi.unstubAllGlobals(); Reflect.deleteProperty(navigator, "geolocation"); });
const button = (label: string) => view.container.querySelector(`button[aria-label="${label}"]`);
async function connection(online: boolean) {
  connected = online;
  await act(async () => { window.dispatchEvent(new Event(online ? "online" : "offline")); });
}
async function selectBandung() {
  const input = view.container.querySelector("input")!;
  await type(input, "Bandung"); await tick(400); await click(view.container.querySelector('[role="option"]'));
}
describe("App regression protection", () => {
  it("renders current, forecasts, weather icon/theme and detail labels", async () => {
    await view.render(<App />);
    const text = view.container.textContent;
    for (const part of ["Jakarta", "31°", "Hujan Ringan", "24 JAM KE DEPAN", "PRAKIRAAN 7 HARI", "12 km/j", "Arah T", "Tinggi", "05:30", "17:45", "Rabu, 14 Okt 2026"]) expect(text).toContain(part);
    expect(view.container.querySelector(".bg-gradient-to-b")?.className).toContain("from-slate-600");
    expect(text).toContain("🌦️"); expect(button("Muat ulang cuaca")?.hasAttribute("disabled")).toBe(false);
  });
  it("refresh loading disables button, clears old data and exposes retry on failure", async () => {
    await view.render(<App />);
    const pending = deferred<Weather>(); get.mockReturnValueOnce(pending.promise);
    await click(button("Muat ulang cuaca"));
    expect(button("Muat ulang cuaca")?.hasAttribute("disabled")).toBe(true);
    expect(view.container.textContent).toContain("Memuat cuaca Jakarta"); expect(view.container.querySelector("main")).toBeNull();
    await act(async () => pending.reject(new ApiError("TIMEOUT")));
    expect(view.container.querySelector('[role="alert"]')?.textContent).toContain("terlalu lama"); expect(view.container.querySelector("main")).toBeNull();
    await click(Array.from(view.container.querySelectorAll("button")).find(b => b.textContent === "Coba lagi") ?? null);
    expect(view.container.querySelector("main")).not.toBeNull(); expect(get).toHaveBeenCalledTimes(3);
  });
  it("city switch aborts previous weather and never mislabels stale data", async () => {
    const old = deferred<Weather>(), latest = deferred<Weather>();
    get.mockReturnValueOnce(old.promise).mockReturnValueOnce(latest.promise);
    await view.render(<App />); await selectBandung();
    expect(get.mock.calls[0][2]?.signal?.aborted).toBe(true);
    expect(get.mock.calls[1].slice(0, 2)).toEqual([-6.9, 107.6]);
    await act(async () => old.resolve(weather));
    expect(view.container.querySelector("main")).toBeNull(); expect(view.container.textContent).toContain("Memuat cuaca Bandung");
    await act(async () => latest.resolve({ ...weather, current: { ...weather.current, temperature: 20 } }));
    expect(view.container.querySelector("h2")?.textContent).toContain("Bandung"); expect(view.container.textContent).toContain("20°");
  });
  it("stale weather failure does not erase a newer successful city", async () => {
    const old = deferred<Weather>(); get.mockReturnValueOnce(old.promise);
    await view.render(<App />); await selectBandung();
    await act(async () => old.reject(new ApiError("HTTP_ERROR", 500)));
    expect(view.container.querySelector("h2")?.textContent).toContain("Bandung");
    expect(view.container.querySelector('[role="alert"]')).toBeNull();
  });
  it("corrupt favorites and last location recover, favorites still persist/toggle", async () => {
    localStorage.setItem("cuacaku_favs", '{"wrong":true}'); localStorage.setItem("cuacaku_place", "bad");
    await view.render(<App />);
    expect(view.container.querySelector("h2")?.textContent).toContain("Jakarta");
    expect(JSON.parse(localStorage.getItem("cuacaku_favs")!)).toEqual([]);
    await click(button("Tambah ke favorit"));
    expect(JSON.parse(localStorage.getItem("cuacaku_favs")!)).toHaveLength(1);
    await selectBandung();
    await click(Array.from(view.container.querySelectorAll("button")).find(b => b.textContent?.trim() === "⭐ Jakarta") ?? null);
    expect(view.container.querySelector("h2")?.textContent).toContain("Jakarta");
    await click(button("Hapus dari favorit")); expect(JSON.parse(localStorage.getItem("cuacaku_favs")!)).toEqual([]);
  });
  it("storage write failure does not crash UI", async () => {
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => { throw new Error("QuotaExceededError"); });
    await view.render(<App />); await click(button("Tambah ke favorit"));
    expect(view.container.querySelector("main")).not.toBeNull();
    expect(view.container.textContent).toContain("Favorit belum tersimpan");
  });
  it("offline skips initial fetch, reconnect refreshes once without retry loop", async () => {
    connected = false; await view.render(<App />);
    expect(get).not.toHaveBeenCalled(); expect(view.container.textContent).toContain("Perangkat sedang offline");
    expect(button("Muat ulang cuaca")?.hasAttribute("disabled")).toBe(true);
    await tick(20 * 60 * 1000); expect(get).not.toHaveBeenCalled();
    get.mockRejectedValueOnce(new ApiError("NETWORK_ERROR"));
    await connection(true); expect(get).toHaveBeenCalledTimes(1);
    await connection(true); await tick(1000); expect(get).toHaveBeenCalledTimes(1);
    expect(view.container.querySelector('[role="alert"]')?.textContent).toContain("Periksa koneksi");
  });
  it("offline cancels pending weather, no late update, resumes once", async () => {
    const pending = deferred<Weather>(); get.mockReturnValueOnce(pending.promise);
    await view.render(<App />); await connection(false);
    expect(get.mock.calls[0][2]?.signal?.aborted).toBe(true);
    await act(async () => pending.resolve(weather)); expect(view.container.querySelector("main")).toBeNull();
    await connection(true); expect(get).toHaveBeenCalledTimes(2); expect(view.container.querySelector("main")).not.toBeNull();
  });
  it("auto refresh remains 10 minutes and does not overlap pending requests", async () => {
    await view.render(<App />); await tick(599999); expect(get).toHaveBeenCalledTimes(1);
    const pending = deferred<Weather>(); get.mockReturnValueOnce(pending.promise);
    await tick(1); expect(get).toHaveBeenCalledTimes(2);
    await tick(600000); expect(get).toHaveBeenCalledTimes(2);
    await act(async () => pending.resolve(weather)); await tick(600000); expect(get).toHaveBeenCalledTimes(3);
    await view.unmount(); expect(vi.getTimerCount()).toBe(0);
  });
  it("geolocation permission error is actionable", async () => {
    Object.defineProperty(navigator, "geolocation", { configurable: true, value: { getCurrentPosition: (_success: PositionCallback, failure: PositionErrorCallback) => failure({ code: 1 } as GeolocationPositionError) } });
    await view.render(<App />); await click(button("Gunakan lokasiku"));
    expect(view.container.querySelector('[role="alert"]')?.textContent).toContain("Izin lokasi ditolak");
    expect(button("Gunakan lokasiku")?.hasAttribute("disabled")).toBe(false);
  });
  it("late geolocation cannot override manual city selection", async () => {
    let success!: PositionCallback;
    Object.defineProperty(navigator, "geolocation", { configurable: true, value: { getCurrentPosition: (callback: PositionCallback) => { success = callback; } } });
    await view.render(<App />); await click(button("Gunakan lokasiku"));
    expect(button("Gunakan lokasiku")?.hasAttribute("disabled")).toBe(true);
    await selectBandung();
    await act(async () => success({ coords: { latitude: 0, longitude: 0 } } as GeolocationPosition));
    expect(view.container.querySelector("h2")?.textContent).toContain("Bandung"); expect(get).toHaveBeenCalledTimes(2);
  });
  it("unmount cancels geolocation and toast without late requests", async () => {
    let success!: PositionCallback;
    Object.defineProperty(navigator, "geolocation", { configurable: true, value: { getCurrentPosition: (callback: PositionCallback) => { success = callback; } } });
    const fetcher = vi.fn(); vi.stubGlobal("fetch", fetcher);
    await view.render(<App />); await click(button("Tambah ke favorit"));
    await click(button("Gunakan lokasiku")); await tick(0); await view.unmount();
    expect(vi.getTimerCount()).toBe(0);
    await act(async () => success({ coords: { latitude: 0, longitude: 0 } } as GeolocationPosition));
    expect(fetcher).not.toHaveBeenCalled(); expect(get).toHaveBeenCalledTimes(1);
  });
  it("StrictMode cleanup aborts discarded requests; unmount removes listeners/timers", async () => {
    const pending = deferred<Weather>(); get.mockReturnValue(pending.promise);
    const remove = vi.spyOn(window, "removeEventListener");
    await view.render(<StrictMode><App /></StrictMode>);
    expect(get).toHaveBeenCalledTimes(2); expect(get.mock.calls[0][2]?.signal?.aborted).toBe(true);
    // jsdom queues storage events with zero-delay timers; flush those before checking app cleanup.
    await tick(0);
    await view.unmount(); expect(get.mock.calls[1][2]?.signal?.aborted).toBe(true); expect(vi.getTimerCount()).toBe(0);
    expect(remove).toHaveBeenCalledWith("online", expect.any(Function)); expect(remove).toHaveBeenCalledWith("offline", expect.any(Function));
    await act(async () => pending.resolve(weather));
  });
});
