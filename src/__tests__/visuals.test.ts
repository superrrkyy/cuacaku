import { describe, expect, it, vi, afterEach } from "vitest";
import {
  weatherVisualState,
  temperatureRange,
  uvLabel,
  getWeather,
} from "../weather";
import { hour, shortDate, sunProgress } from "../lib/dates";
import { fixture } from "./fixtures";
afterEach(() => vi.unstubAllGlobals());
describe("weather visual vocabulary", () => {
  it.each([
    [0, true, "clear-day"],
    [1, false, "clear-night"],
    [2, true, "cloudy"],
    [3, false, "cloudy"],
    [45, false, "fog"],
    [48, true, "fog"],
    [61, false, "rain"],
    [56, true, "rain"],
    [82, true, "storm"],
    [95, false, "storm"],
    [71, false, "snow"],
    [86, true, "snow"],
    [999, true, "cloudy"],
  ] as const)("maps WMO %s / day=%s to %s", (code, isDay, state) => {
    expect(weatherVisualState(code, isDay)).toBe(state);
  });
  it.each([
    [0, "Rendah"],
    [2.9, "Rendah"],
    [3, "Sedang"],
    [5.9, "Sedang"],
    [6, "Tinggi"],
    [7.9, "Tinggi"],
    [8, "Sangat Tinggi"],
    [10.9, "Sangat Tinggi"],
    [11, "Ekstrem"],
    [16, "Ekstrem"],
  ] as const)("UV %s has semantic severity %s", (value, label) =>
    expect(uvLabel(value)).toBe(label),
  );
});
describe("daily temperature range", () => {
  it("positions a range on the shared weekly scale", () =>
    expect(temperatureRange(25, 32, 20, 40)).toEqual({ left: 25, width: 35 }));
  it("handles negative, equal and out-of-range values", () => {
    expect(temperatureRange(-10, 0, -20, 20)).toEqual({ left: 25, width: 25 });
    expect(temperatureRange(4, 4, 4, 4)).toEqual({ left: 0, width: 100 });
    expect(temperatureRange(-30, 30, -20, 20)).toEqual({ left: 0, width: 100 });
  });
});
describe("location-local sun cycle", () => {
  const rise = "2026-10-14T06:00",
    set = "2026-10-14T18:00";
  it("formats wall time and offset-bearing instants in the location timezone", () => {
    expect(hour(rise, "Asia/Jakarta")).toBe("06:00");
    expect(hour("2026-10-13T23:00:00Z", "Asia/Jakarta")).toBe("06:00");
    expect(shortDate(rise, "Asia/Jakarta")).toBe("14 Okt");
  });
  it("uses Jakarta noon, not the browser timezone", () =>
    expect(
      sunProgress(rise, set, "Asia/Jakarta", new Date("2026-10-14T05:00:00Z")),
    ).toBe(0.5));
  it("clamps before sunrise and after sunset", () => {
    expect(
      sunProgress(rise, set, "Asia/Jakarta", new Date("2026-10-13T22:00:00Z")),
    ).toBe(0);
    expect(
      sunProgress(rise, set, "Asia/Jakarta", new Date("2026-10-14T13:00:00Z")),
    ).toBe(1);
  });
  it("does not show a position for stale, missing or invalid sun times", () => {
    const now = new Date("2026-10-15T05:00:00Z");
    expect(sunProgress(rise, set, "Asia/Jakarta", now)).toBeNull();
    expect(sunProgress("", set, "Asia/Jakarta", now)).toBeNull();
    expect(
      sunProgress(set, rise, "Asia/Jakarta", new Date("2026-10-14T05:00:00Z")),
    ).toBeNull();
    expect(sunProgress(rise, set, "Bad/Timezone", now)).toBeNull();
  });
});
describe("optional visibility through the existing API", () => {
  it("reads visibility from the matching hour, not the first forecast hour", async () => {
    const visibility = fixture.hourly.time.map((_, i) => (i ? 12000 : 500));
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({
        ok: true,
        json: async () => ({
          ...fixture,
          hourly: { ...fixture.hourly, visibility },
        }),
      })),
    );
    expect((await getWeather(0, 0)).current.visibility).toBe(12000);
  });
  it.each([undefined, null])(
    "keeps missing visibility (%s) unavailable, not zero",
    async (value) => {
      vi.stubGlobal(
        "fetch",
        vi.fn(async () => ({
          ok: true,
          json: async () => ({
            ...fixture,
            hourly: {
              ...fixture.hourly,
              visibility:
                value === undefined
                  ? undefined
                  : fixture.hourly.time.map(() => value),
            },
          }),
        })),
      );
      expect((await getWeather(0, 0)).current.visibility).toBeNull();
    },
  );
  it("rejects invalid visibility values", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({
        ok: true,
        json: async () => ({
          ...fixture,
          hourly: {
            ...fixture.hourly,
            visibility: fixture.hourly.time.map(() => -1),
          },
        }),
      })),
    );
    await expect(getWeather(0, 0)).rejects.toMatchObject({
      code: "INVALID_RESPONSE",
    });
  });
});
