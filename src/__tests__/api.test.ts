import { afterEach, describe, expect, it, vi } from "vitest";
import { getWeather, searchPlaces } from "../weather";
import { requestJson, type RequestOptions } from "../lib/api";
import { fixture } from "./fixtures";
const json = (value: unknown) => new Response(JSON.stringify(value));
afterEach(() => { vi.useRealTimers(); vi.restoreAllMocks(); vi.unstubAllGlobals(); });

for (const [name, call] of [
  ["weather", (options?: RequestOptions) => getWeather(0, 0, options)],
  ["search", (options?: RequestOptions) => searchPlaces("Jakarta", options)],
] as const) {
  describe(`${name}: error boundaries`, () => {
    it.each([400, 404, 429, 500, 503])("HTTP %s", async status => {
      vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("", { status })));
      await expect(call()).rejects.toMatchObject({ code: "HTTP_ERROR", status });
    });
    it("network failure", async () => {
      vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new TypeError("Failed to fetch")));
      await expect(call()).rejects.toMatchObject({ code: "NETWORK_ERROR" });
    });
    it("invalid JSON", async () => {
      vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("<html>bad gateway")));
      await expect(call()).rejects.toMatchObject({ code: "INVALID_RESPONSE" });
    });
    it("body transfer failure", async () => {
      vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true, json: () => Promise.reject(new TypeError("connection lost")) }));
      await expect(call()).rejects.toMatchObject({ code: "NETWORK_ERROR" });
    });
    it("timeout aborts fetch and clears timer", async () => {
      vi.useFakeTimers();
      const fetcher = vi.fn().mockImplementation(() => new Promise(() => {}));
      vi.stubGlobal("fetch", fetcher);
      const result = expect(call({ timeoutMs: 50 })).rejects.toMatchObject({ code: "TIMEOUT" });
      await vi.advanceTimersByTimeAsync(50);
      await result;
      expect(fetcher.mock.calls[0][1].signal.aborted).toBe(true);
      expect(vi.getTimerCount()).toBe(0);
    });
    it("timeout includes stalled JSON body", async () => {
      vi.useFakeTimers();
      vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true, json: () => new Promise(() => {}) }));
      const result = expect(call({ timeoutMs: 10 })).rejects.toMatchObject({ code: "TIMEOUT" });
      await vi.advanceTimersByTimeAsync(10); await result;
    });
    it("supports cancellation and removes caller listener", async () => {
      vi.useFakeTimers();
      vi.stubGlobal("fetch", vi.fn().mockImplementation(() => new Promise(() => {})));
      const controller = new AbortController();
      const remove = vi.spyOn(controller.signal, "removeEventListener");
      const result = expect(call({ signal: controller.signal })).rejects.toMatchObject({ code: "ABORTED" });
      controller.abort(); await result;
      expect(remove).toHaveBeenCalledWith("abort", expect.any(Function));
      expect(vi.getTimerCount()).toBe(0);
    });
    it("pre-aborted request makes no fetch", async () => {
      const fetcher = vi.fn(); vi.stubGlobal("fetch", fetcher);
      const controller = new AbortController(); controller.abort();
      await expect(call({ signal: controller.signal })).rejects.toMatchObject({ code: "ABORTED" });
      expect(fetcher).not.toHaveBeenCalled();
    });
    it.each([null, [], "bad", { error: true, reason: "bad" }])("rejects malformed response %j", async value => {
      vi.stubGlobal("fetch", vi.fn().mockResolvedValue(json(value)));
      await expect(call()).rejects.toMatchObject({ code: "INVALID_RESPONSE" });
    });
  });
}

describe("weather schema", () => {
  it.each(["timezone", "current", "hourly", "daily"])("rejects missing %s", async key => {
    const value: Record<string, unknown> = structuredClone(fixture); delete value[key];
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(json(value)));
    await expect(getWeather(0, 0)).rejects.toMatchObject({ code: "INVALID_RESPONSE" });
  });
  it.each([NaN, Infinity, -Infinity, "31", null])("rejects numeric value %s", async value => {
    const data = { ...fixture, current: { ...fixture.current, temperature_2m: value } };
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true, json: async () => data }));
    await expect(getWeather(0, 0)).rejects.toMatchObject({ code: "INVALID_RESPONSE" });
  });
  it.each([
    { timezone: "Fake/Timezone" },
    { current: { ...fixture.current, weather_code: 100 } },
    { current: { ...fixture.current, time: "2026-02-30T07:00" } },
    { current: { ...fixture.current, time: "2026-10-13T25:00" } },
    { current: { ...fixture.current, relative_humidity_2m: 101 } },
    { current: { ...fixture.current, is_day: 2 } },
    { current: { ...fixture.current, wind_direction_10m: 361 } },
    { hourly: { ...fixture.hourly, weather_code: [] } },
    { hourly: { ...fixture.hourly, time: [] } },
    { hourly: { ...fixture.hourly, temperature_2m: undefined } },
    { hourly: { ...fixture.hourly, weather_code: fixture.hourly.time.map(() => -1) } },
    { hourly: { ...fixture.hourly, time: fixture.hourly.time.map(() => "not a date") } },
    { daily: { ...fixture.daily, time: [] } },
    { daily: { ...fixture.daily, sunset: ["bad", "bad"] } },
    { daily: { ...fixture.daily, temperature_2m_min: [99, 99] } },
    { daily: { ...fixture.daily, uv_index_max: ["7", 2] } },
    { daily: { ...fixture.daily, precipitation_probability_max: [101, 0] } },
    { daily: { ...fixture.daily, time: ["2026-10-14", "2026-10-15"] } },
    { current: { ...fixture.current, time: "2026-10-12T07:00" } },
    { current: { ...fixture.current, time: "2026-10-14T12:00" } },
  ])("rejects inconsistent fields %#", async patch => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(json({ ...fixture, ...patch })));
    await expect(getWeather(0, 0)).rejects.toMatchObject({ code: "INVALID_RESPONSE" });
  });
  it.each([[NaN, 0], [Infinity, 0], [0, -Infinity], [91, 0], [-91, 0], [0, 181], [0, -181]])("invalid coordinates %s,%s avoid fetch", async (lat, lon) => {
    const fetcher = vi.fn(); vi.stubGlobal("fetch", fetcher);
    await expect(getWeather(lat, lon)).rejects.toMatchObject({ code: "INVALID_COORDINATES" });
    expect(fetcher).not.toHaveBeenCalled();
  });
  it.each([[-90, -180], [90, 180], [0, 0]])("accepts coordinate boundary %s,%s", async (lat, lon) => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(json(fixture)));
    await expect(getWeather(lat, lon)).resolves.toHaveProperty("timezone", "Asia/Jakarta");
  });
});

describe("search validation", () => {
  it.each(["", " ", " a "])("short query %j avoids fetch", async query => {
    const fetcher = vi.fn(); vi.stubGlobal("fetch", fetcher);
    await expect(searchPlaces(query)).resolves.toEqual([]); expect(fetcher).not.toHaveBeenCalled();
  });
  it("trims and encodes query without injecting parameters", async () => {
    const fetcher = vi.fn().mockResolvedValue(json({ results: [] })); vi.stubGlobal("fetch", fetcher);
    await searchPlaces("  São Paulo &東京?count=99#  ");
    const url = new URL(fetcher.mock.calls[0][0]);
    expect(url.searchParams.get("name")).toBe("São Paulo &東京?count=99#");
    expect(url.searchParams.get("count")).toBe("6"); expect(url.hash).toBe("");
  });
  it.each([{}, { generationtime_ms: 1.2 }, { results: [] }])("valid empty result %j", async data => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(json(data)));
    await expect(searchPlaces("Unknown")).resolves.toEqual([]);
  });
  const place = { id: 1, name: "Jakarta", latitude: -6.2, longitude: 106.8 };
  it.each([
    { results: null }, { results: {} }, { unexpected: true },
    ...[{ id: "1" }, { name: " " }, { latitude: 100 }, { longitude: null }, { country: {} }, { id: null }].map(patch => ({ results: [{ ...place, ...patch }] })),
  ])("malformed geocoding %#", async data => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(json(data)));
    await expect(searchPlaces("Jakarta")).rejects.toMatchObject({ code: "INVALID_RESPONSE" });
  });
  it("successful request clears timeout and abort listener", async () => {
    vi.useFakeTimers();
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(json({ results: [place] })));
    const controller = new AbortController();
    const remove = vi.spyOn(controller.signal, "removeEventListener");
    await expect(searchPlaces("Jakarta", { signal: controller.signal })).resolves.toEqual([place]);
    expect(vi.getTimerCount()).toBe(0); expect(remove).toHaveBeenCalled();
  });
});

it("requestJson does not abort its caller on timeout", async () => {
  vi.useFakeTimers(); vi.stubGlobal("fetch", vi.fn().mockImplementation(() => new Promise(() => {})));
  const controller = new AbortController();
  const result = expect(requestJson("https://api.open-meteo.com", { signal: controller.signal, timeoutMs: 1 })).rejects.toMatchObject({ code: "TIMEOUT" });
  await vi.advanceTimersByTimeAsync(1); await result;
  expect(controller.signal.aborted).toBe(false);
});
