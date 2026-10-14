// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import TemperatureChart from "../components/TemperatureChart";
import type { Weather } from "../weather";
import { dom } from "./dom";

type Data = Pick<Weather, "daily" | "hourly" | "timezone">;
let view: ReturnType<typeof dom>;

const date = (i: number) => `2026-10-${String(13 + i).padStart(2, "0")}`;
// Patches accept null/undefined so tests can prove the UI never invents a value.
const day = (
  i: number,
  patch: Partial<Record<keyof Weather["daily"][number], unknown>> = {},
) =>
  ({
    date: date(i),
    code: 61,
    max: 30 + i,
    min: 20 + i,
    rain: 10 * i,
    sunrise: `${date(i)}T05:30`,
    sunset: `${date(i)}T17:45`,
    uv: 5,
    ...patch,
  }) as Weather["daily"][number];
const week = Array.from({ length: 7 }, (_, i) => day(i));
const data = (daily: Weather["daily"] = week, timezone = "Asia/Jakarta"): Data => ({
  timezone,
  daily,
  hourly: [],
});
const svg = () => view.container.querySelector("svg");
const paths = () => view.container.querySelectorAll("svg path");
const summary = () => view.container.querySelector(".chart-summary")?.textContent ?? "";

beforeEach(() => {
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  view = dom();
});
afterEach(async () => {
  await view.unmount();
  vi.unstubAllGlobals();
});

describe("daily trend", () => {
  it("draws max/min series with an accessible summary and a text table", async () => {
    const fetchSpy = vi.fn();
    vi.stubGlobal("fetch", fetchSpy);
    await view.render(<TemperatureChart data={data()} mode="daily" />);
    expect(svg()).not.toBeNull();
    expect(paths().length).toBeGreaterThanOrEqual(3); // band + two lines
    expect(view.container.querySelectorAll("svg circle")).toHaveLength(14);
    expect(svg()?.getAttribute("role")).toBe("img");
    expect(svg()?.getAttribute("aria-label")).toBe(
      "Grafik tren suhu maksimum dan minimum harian selama 7 hari",
    );
    const described = svg()?.getAttribute("aria-describedby");
    expect(document.getElementById(described!)?.textContent).toContain(
      "Suhu berkisar 20° hingga 36°",
    );
    // Generated from the data, not hard-coded: 36° lands on 19 Okt 2026 (Senin).
    expect(summary()).toContain(
      "Suhu berkisar 20° hingga 36° selama 7 hari ke depan, terhangat pada hari Senin.",
    );
    const table = view.container.querySelector("table")!;
    expect(table.querySelectorAll("tbody tr")).toHaveLength(7);
    expect(table.textContent).toContain("Senin, 19 Okt");
    expect(table.textContent).toContain("Maksimum °C");
    expect(table.textContent).toContain("Minimum °C");
    expect(view.container.querySelectorAll(".chart-axis > div")).toHaveLength(7);
    expect(view.container.querySelector('[aria-labelledby]')?.textContent).toContain(
      "TREN SUHU 7 HARI",
    );
    // "°" is unreliable in speech output, so the unit is spelled out for assistive tech.
    expect(summary()).toContain("Semua nilai dalam derajat Celsius.");
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("labels every plotted point without leaving the plot area", async () => {
    await view.render(<TemperatureChart data={data()} mode="daily" />);
    const viewBox = svg()?.getAttribute("viewBox");
    expect(viewBox).toBe("0 0 640 220");
    for (const circle of view.container.querySelectorAll("svg circle")) {
      const cx = Number(circle.getAttribute("cx")), cy = Number(circle.getAttribute("cy"));
      expect(cx).toBeGreaterThanOrEqual(4);
      expect(cx).toBeLessThanOrEqual(636);
      expect(cy).toBeGreaterThanOrEqual(4);
      expect(cy).toBeLessThanOrEqual(216);
    }
    const lefts = [...view.container.querySelectorAll<HTMLElement>(".chart-axis > div")].map(
      (cell) => parseFloat(cell.style.left),
    );
    expect(lefts).toHaveLength(7);
    expect(lefts[0]).toBeGreaterThan(0);
    expect(lefts[6]).toBeLessThan(100);
    for (let i = 1; i < lefts.length; i += 1) expect(lefts[i]).toBeGreaterThan(lefts[i - 1]);
  });

  it("handles a single day", async () => {
    await view.render(<TemperatureChart data={data([day(0)])} mode="daily" />);
    expect(svg()).not.toBeNull();
    expect(view.container.querySelectorAll("svg circle")).toHaveLength(2);
    expect(view.container.querySelectorAll(".chart-axis > div")).toHaveLength(1);
    expect(summary()).toContain("Suhu berkisar 20° hingga 30° selama 1 hari ke depan");
    expect(view.container.innerHTML).not.toMatch(/NaN|Infinity/);
  });

  it("handles identical temperatures without dividing by zero", async () => {
    const flat = week.map((d, i) => day(i, { max: 25, min: 25 }));
    await view.render(<TemperatureChart data={data(flat)} mode="daily" />);
    expect(view.container.innerHTML).not.toMatch(/NaN|Infinity/);
    expect(summary()).toContain("Suhu berkisar 25° hingga 25°");
    // Flat series sit on the vertical centre of the plot area: y = 20 + 176 / 2.
    for (const circle of view.container.querySelectorAll("svg circle"))
      expect(Number(circle.getAttribute("cy"))).toBeCloseTo(108, 0);
  });

  it("handles negative temperatures and very wide ranges", async () => {
    const cold = week.map((d, i) => day(i, { max: -2 + i, min: -14 + i }));
    await view.render(<TemperatureChart data={data(cold)} mode="daily" />);
    expect(summary()).toContain("Suhu berkisar -14° hingga 4°");
    expect(view.container.innerHTML).not.toMatch(/NaN|Infinity/);
    const extreme = week.map((d, i) => day(i, { max: 50 - i * 10, min: -50 + i * 5 }));
    await view.render(<TemperatureChart data={data(extreme)} mode="daily" />);
    expect(view.container.innerHTML).not.toMatch(/NaN|Infinity/);
    expect(summary()).toContain("Suhu berkisar -50° hingga 50°");
  });

  it("keeps days with a missing bound and shows a truthful dash", async () => {
    const partial = [day(0, { min: null }), day(1, { max: null }), day(2)];
    await view.render(<TemperatureChart data={data(partial)} mode="daily" />);
    expect(view.container.querySelectorAll("svg circle")).toHaveLength(4);
    const table = view.container.querySelector("table")!;
    expect(table.querySelectorAll("tbody tr")).toHaveLength(3);
    expect(table.textContent).toContain("—");
    expect(view.container.querySelectorAll(".chart-axis > div")).toHaveLength(3);
    expect(view.container.innerHTML).not.toMatch(/NaN|Infinity/);
  });

  it.each([[], null, undefined, {}, [null, {}, { date: "bad" }]])(
    "renders nothing for an unusable dataset: %j",
    async (daily) => {
      await view.render(
        <TemperatureChart
          data={{ timezone: "Asia/Jakarta", daily: daily as Weather["daily"], hourly: [] }}
          mode="daily"
        />,
      );
      expect(view.container.querySelector("svg")).toBeNull();
      expect(view.container.querySelector("section")).toBeNull();
    },
  );

  it("does not fall back to the browser timezone", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-10-13T20:30:00Z"));
    await view.render(<TemperatureChart data={data(week, "America/New_York")} mode="daily" />);
    // Location dates only: labels stay 13–19 Okt even though the device clock is past midnight in Jakarta.
    expect(view.container.querySelector("table")?.textContent).toContain("Selasa, 13 Okt");
    expect(view.container.querySelector("table")?.textContent).toContain("America/New_York");
    expect(view.container.textContent).not.toContain("NaN");
    vi.useRealTimers();
  });
});

describe("hourly trend", () => {
  const hours = Array.from({ length: 24 }, (_, i) => ({
    time: `${date(i < 14 ? 0 : 1)}T${String(i % 24).padStart(2, "0")}:00`,
    temp: 25 + i,
    code: 61,
    rain: 10,
    isDay: true,
  }));

  it("still plots the 24 loaded hours and never requests data itself", async () => {
    const fetchSpy = vi.fn();
    vi.stubGlobal("fetch", fetchSpy);
    await view.render(
      <TemperatureChart data={{ timezone: "Asia/Jakarta", daily: [], hourly: hours }} />,
    );
    expect(svg()?.getAttribute("aria-label")).toBe("Grafik tren suhu per jam");
    expect(view.container.querySelectorAll("tbody tr")).toHaveLength(24);
    expect(view.container.querySelectorAll(".chart-axis > div")).toHaveLength(4);
    expect(summary()).toContain("Suhu berkisar 25° hingga 48° dalam 24 jam ke depan.");
    expect(view.container.querySelector("summary")?.textContent).toBe("Lihat data suhu per jam");
    expect(summary()).toContain("Semua nilai dalam derajat Celsius.");
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it.each([
    ["one point", hours.slice(0, 1)],
    ["constant values", hours.map((h) => ({ ...h, temp: 30 }))],
    ["negative values", hours.map((h) => ({ ...h, temp: -20 }))],
  ])("renders %s without invalid coordinates", async (_name, hourly) => {
    await view.render(
      <TemperatureChart data={{ timezone: "Asia/Jakarta", daily: [], hourly }} />,
    );
    expect(svg()).not.toBeNull();
    expect(view.container.innerHTML).not.toMatch(/NaN|Infinity/);
  });

  it("renders nothing when no hour is usable", async () => {
    await view.render(
      <TemperatureChart
        data={{ timezone: "Asia/Jakarta", daily: [], hourly: [{ ...hours[0], temp: NaN }] }}
      />,
    );
    expect(view.container.querySelector("svg")).toBeNull();
  });
});
