// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { getPosition, locatePlace, reversePlaceName } from "../lib/geolocation";
const position = { coords: { latitude: -6.2, longitude: 106.8 } } as GeolocationPosition;
function geo(getCurrentPosition: Geolocation["getCurrentPosition"]) {
  vi.stubGlobal("navigator", { onLine: true, geolocation: { getCurrentPosition } });
}
afterEach(() => { vi.useRealTimers(); vi.restoreAllMocks(); vi.unstubAllGlobals(); });
describe("geolocation", () => {
  it("unsupported browser", async () => {
    vi.stubGlobal("navigator", {});
    await expect(getPosition()).rejects.toThrow("Browser tidak mendukung lokasi");
  });
  it.each([[1, "Izin lokasi ditolak"], [2, "Lokasi belum tersedia"], [3, "terlalu lama"]] as const)("handles code %s", async (code, message) => {
    geo((_success, error) => error?.({ code } as GeolocationPositionError));
    await expect(getPosition()).rejects.toThrow(message);
  });
  it("valid position and options", async () => {
    const get = vi.fn<Geolocation["getCurrentPosition"]>((success) => success(position)); geo(get);
    await expect(getPosition()).resolves.toEqual(position);
    expect(get.mock.calls[0][2]).toEqual({ timeout: 10000, maximumAge: 60000 });
  });
  it.each([[NaN, 0], [0, Infinity], [91, 0], [0, -181]])("invalid coordinate %s,%s", async (latitude, longitude) => {
    geo(success => success({ coords: { latitude, longitude } } as GeolocationPosition));
    await expect(getPosition()).rejects.toMatchObject({ code: "INVALID_COORDINATES" });
  });
  it("handles synchronous security failure", async () => {
    geo(() => { throw new Error("SecurityError"); });
    await expect(getPosition()).rejects.toThrow("Lokasi tidak dapat diakses");
  });
  it("deadline works even when browser never calls back", async () => {
    vi.useFakeTimers(); geo(() => {});
    const result = expect(getPosition()).rejects.toThrow("terlalu lama");
    await vi.advanceTimersByTimeAsync(10000); await result; expect(vi.getTimerCount()).toBe(0);
  });
  it("abort ignores late success and removes listeners/timers", async () => {
    vi.useFakeTimers(); let success!: PositionCallback;
    geo(callback => { success = callback; });
    const controller = new AbortController(); const remove = vi.spyOn(controller.signal, "removeEventListener");
    const result = expect(getPosition(controller.signal)).rejects.toMatchObject({ code: "ABORTED" });
    controller.abort(); success(position); await result;
    expect(remove).toHaveBeenCalled(); expect(vi.getTimerCount()).toBe(0);
  });
  it("pre-abort does not call browser", async () => {
    const get = vi.fn(); geo(get); const controller = new AbortController(); controller.abort();
    await expect(getPosition(controller.signal)).rejects.toMatchObject({ code: "ABORTED" }); expect(get).not.toHaveBeenCalled();
  });
  it("keeps reverse city naming", async () => {
    geo(success => success(position));
    const fetcher = vi.fn().mockResolvedValue(new Response(JSON.stringify({ address: { town: "Depok" } })));
    vi.stubGlobal("fetch", fetcher);
    await expect(locatePlace(new AbortController().signal)).resolves.toMatchObject({ name: "Depok", latitude: -6.2, longitude: 106.8 });
    expect(new URL(fetcher.mock.calls[0][0]).searchParams.get("lat")).toBe("-6.2");
  });
  it.each([null, {}, { address: null }, { address: { city: {} } }, { address: { city: " " } }])("malformed reverse name falls back %j", async data => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify(data))));
    await expect(reversePlaceName(0, 0)).resolves.toBe("Lokasiku");
  });
  it.each([new Response("", { status: 500 }), new Response("bad json")])("reverse API failure falls back", async response => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(response));
    await expect(reversePlaceName(0, 0)).resolves.toBe("Lokasiku");
  });
  it("reverse network failure falls back", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new TypeError("offline")));
    await expect(reversePlaceName(0, 0)).resolves.toBe("Lokasiku");
  });
  it("reverse timeout falls back but cancellation propagates", async () => {
    vi.useFakeTimers(); vi.stubGlobal("fetch", vi.fn().mockImplementation(() => new Promise(() => {})));
    const result = expect(reversePlaceName(0, 0, { timeoutMs: 10 })).resolves.toBe("Lokasiku");
    await vi.advanceTimersByTimeAsync(10); await result;
    const controller = new AbortController(); const aborted = expect(reversePlaceName(0, 0, { signal: controller.signal })).rejects.toMatchObject({ code: "ABORTED" });
    controller.abort(); await aborted;
  });
  it("invalid reverse coordinates avoid fetch", async () => {
    const fetcher = vi.fn(); vi.stubGlobal("fetch", fetcher);
    await expect(reversePlaceName(91, 0)).rejects.toMatchObject({ code: "INVALID_COORDINATES" }); expect(fetcher).not.toHaveBeenCalled();
  });
  it("offline skips reverse lookup", async () => {
    vi.stubGlobal("navigator", { onLine: false, geolocation: { getCurrentPosition: (success: PositionCallback) => success(position) } });
    const fetcher = vi.fn(); vi.stubGlobal("fetch", fetcher);
    await expect(locatePlace(new AbortController().signal)).resolves.toMatchObject({ name: "Lokasiku" }); expect(fetcher).not.toHaveBeenCalled();
  });
});
