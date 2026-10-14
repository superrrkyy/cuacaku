/**
 * Unit test untuk modul cuaca CuacaKu (Open-Meteo).
 * fetch selalu di-mock; tidak ada permintaan jaringan sungguhan.
 *
 * Format tanggal tidak bergantung pada timezone mesin uji.
 */
import { fixture, iso } from "./fixtures";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  dayName,
  getWeather,
  hour,
  icon,
  info,
  longDate,
  searchPlaces,
  theme,
  uvLabel,
  windDir,
} from "../weather";

const okJson = (data: unknown) =>
  ({ ok: true, status: 200, json: async () => data }) as unknown as Response;

afterEach(() => { vi.restoreAllMocks(); vi.unstubAllGlobals(); });

describe("pemetaan kode cuaca WMO", () => {
  it("info() mengenali kode yang diketahui", () => {
    expect(info(0).label).toBe("Cerah");
    expect(info(61).label).toBe("Hujan Ringan");
    expect(info(95).label).toBe("Badai Petir");
    expect(info(0).group).toBe("clear");
  });

  it("info() memberi label aman untuk kode tak dikenal", () => {
    expect(info(1234).label).toBe("Tidak diketahui");
    expect(info(1234).group).toBe("cloud");
  });

  it("icon() membedakan siang & malam", () => {
    expect(icon(0, true)).toBe("☀️");
    expect(icon(0, false)).toBe("🌙");
    expect(icon(2, false)).toBe("☁️");
    expect(icon(999)).toBe("🌡️");
  });

  it("theme() menyesuaikan gradien dengan cuaca & waktu", () => {
    expect(theme(0, true)).toContain("from-sky-400");
    expect(theme(2, true)).toContain("from-slate-400");
    expect(theme(95, false)).toContain("from-slate-950");
    expect(theme(61, false)).toContain("from-slate-900");
    expect(theme(0, false)).toContain("from-indigo-950");
  });
});

describe("helper format", () => {
  it("hour() memotong string ISO menjadi jam", () => {
    expect(hour("2026-10-13T07:00")).toBe("07:00");
    expect(hour("2026-10-13T23:45")).toBe("23:45");
  });

  it("dayName() memberi label Hari ini / Besok / nama hari", () => {
    expect(dayName("2026-10-13", 0)).toBe("Hari ini");
    expect(dayName("2026-10-14", 1)).toBe("Besok");
    expect(dayName("2026-10-14", 2)).toBe("Rabu"); // 14 Okt 2026 = Rabu
  });

  it("longDate() memformat tanggal panjang bahasa Indonesia", () => {
    expect(longDate("2026-10-14T08:00")).toBe("Rabu, 14 Okt 2026");
  });

  it("windDir() memetakan derajat ke mata angin", () => {
    expect(windDir(0)).toBe("U");
    expect(windDir(45)).toBe("TL");
    expect(windDir(90)).toBe("T");
    expect(windDir(180)).toBe("S");
    expect(windDir(270)).toBe("B");
    expect(windDir(315)).toBe("BL");
  });

  it("uvLabel() memakai ambang batas yang benar", () => {
    expect(uvLabel(0)).toBe("Rendah");
    expect(uvLabel(2.9)).toBe("Rendah");
    expect(uvLabel(3)).toBe("Sedang");
    expect(uvLabel(6)).toBe("Tinggi");
    expect(uvLabel(8)).toBe("Sangat Tinggi");
    expect(uvLabel(11)).toBe("Ekstrem");
  });
});

describe("searchPlaces()", () => {
  it("mengembalikan hasil pencarian", async () => {
    const places = [{ id: 1, name: "Jakarta", latitude: -6.2, longitude: 106.8 }];
    const fetchMock = vi.fn(async (_url: string) => okJson({ results: places }));
    vi.stubGlobal("fetch", fetchMock);

    await expect(searchPlaces("Jakarta")).resolves.toEqual(places);
    expect(String(fetchMock.mock.calls[0][0])).toContain("name=Jakarta");
  });

  it("mengembalikan array kosong bila kota tidak ditemukan", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => okJson({})));
    await expect(searchPlaces("Negeri-Entah")).resolves.toEqual([]);
  });

  it("melempar error bila layanan gagal", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => ({ ok: false, status: 500 }) as unknown as Response));
    await expect(searchPlaces("Jakarta")).rejects.toMatchObject({ code: "HTTP_ERROR", status: 500 });
  });
});

describe("getWeather()", () => {
  it("memetakan respons API ke bentuk internal", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => okJson(fixture)));

    const w = await getWeather(-6.2, 106.8);

    expect(w.timezone).toBe("Asia/Jakarta");
    expect(w.current.temperature).toBe(31.5);
    expect(w.current.isDay).toBe(true);
    expect(w.current.code).toBe(61);

    // 24 jam ke depan, dimulai dari jam saat ini (indeks 1 dalam fixture)
    expect(w.hourly).toHaveLength(24);
    expect(w.hourly[0].time).toBe(iso(7));

    expect(w.daily).toHaveLength(2);
    expect(w.daily[1].rain).toBeNull(); // null stays unknown, never shown as 0%
    expect(w.daily[1].uv).toBe(0); // null → 0
  });

  it("preserves unavailable daily probability instead of inventing zero", async () => {
    const raw = structuredClone(fixture);
    const probabilities: (number | null)[] = [...raw.daily.precipitation_probability_max];
    probabilities[1] = null;
    probabilities[0] = 0;
    vi.stubGlobal("fetch", vi.fn(async () => okJson({ ...raw, daily: { ...raw.daily, precipitation_probability_max: probabilities } })));
    const result = await getWeather(0, 0);
    expect(result.daily[1].rain).toBeNull();
    expect(result.daily[0].rain).toBe(0);
  });

  it("preserves unavailable hourly probability instead of inventing zero", async () => {
    const raw = structuredClone(fixture);
    const probabilities: (number | null)[] = [...raw.hourly.precipitation_probability];
    probabilities[1] = null;
    probabilities[2] = 0;
    vi.stubGlobal("fetch", vi.fn(async () => okJson({ ...raw, hourly: { ...raw.hourly, precipitation_probability: probabilities } })));
    const result = await getWeather(0, 0);
    expect(result.hourly[0].rain).toBeNull();
    expect(result.hourly[1].rain).toBe(0);
  });

  it("meminta parameter & timezone yang benar ke Open-Meteo", async () => {
    const fetchMock = vi.fn(async (_url: string) => okJson(fixture));
    vi.stubGlobal("fetch", fetchMock);

    await getWeather(-6.2, 106.8);
    const url = String(fetchMock.mock.calls[0][0]);
    expect(url).toContain("latitude=-6.2");
    expect(url).toContain("longitude=106.8");
    expect(url).toContain("timezone=auto");
    expect(url).toContain("forecast_days=7");
  });

  it("melempar error bila layanan cuaca gagal", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => ({ ok: false, status: 503 }) as unknown as Response));
    await expect(getWeather(0, 0)).rejects.toMatchObject({ code: "HTTP_ERROR", status: 503 });
  });
});
