// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import DailyForecast from "../components/DailyForecast";
import type { Weather } from "../weather";
import { dom } from "./dom";

type Data = Pick<Weather, "daily" | "timezone"> & Partial<Pick<Weather, "current">>;
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
const data = (
  daily = week,
  timezone = "Asia/Jakarta",
  time: string | undefined = "2026-10-13T07:00",
): Data => ({ timezone, daily, current: { time } as Weather["current"] });
const rows = () => view.container.querySelectorAll(".daily-list > li");
const row = (i: number) => rows()[i] as HTMLElement;

beforeEach(() => {
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  view = dom();
});
afterEach(async () => {
  await view.unmount();
  vi.unstubAllGlobals();
});

it("renders seven days with day names, dates, condition, bounds and rain chance", async () => {
  const fetchSpy = vi.fn();
  vi.stubGlobal("fetch", fetchSpy);
  await view.render(<DailyForecast data={data()} />);
  expect(rows()).toHaveLength(7);
  const text = view.container.textContent ?? "";
  for (const part of [
    "Hari ini",
    "Besok",
    "Kamis",
    "Senin",
    "13 Okt",
    "19 Okt",
    "Hujan Ringan",
    "Peluang hujan 0%",
    "Peluang hujan 60%",
  ])
    expect(text).toContain(part);
  expect(row(0).querySelector("time")?.getAttribute("datetime")).toBe("2026-10-13");
  expect(row(0).querySelector('[aria-label="Minimum 20°, maksimum 30°"]')).not.toBeNull();
  expect(row(6).querySelector('[aria-label="Minimum 26°, maksimum 36°"]')).not.toBeNull();
  expect(row(0).querySelector(".range-track > div")).not.toBeNull();
  expect(view.container.querySelectorAll('[aria-label="Hujan Ringan, siang"]')).toHaveLength(7);
  expect(fetchSpy).not.toHaveBeenCalled();
});

it("positions every range on one shared weekly scale", async () => {
  await view.render(<DailyForecast data={data()} />);
  const bar = row(0).querySelector<HTMLElement>(".range-track > div")!;
  // Weekly span is 20°–36°; day one covers 20°–30° → 0% → 62.5%.
  expect(bar.style.left).toBe("0%");
  expect(bar.style.width).toBe("62.5%");
  const last = row(6).querySelector<HTMLElement>(".range-track > div")!;
  expect(parseFloat(last.style.left) + parseFloat(last.style.width)).toBeCloseTo(100);
  expect(view.container.textContent).toContain("skala mingguan 20°–36°");
});

it("marks the current day with a date-derived state, not by list position", async () => {
  const shifted = [day(-1, { date: "2026-10-12" }), ...week];
  await view.render(<DailyForecast data={data(shifted)} />);
  expect(rows()).toHaveLength(7); // capped at seven days
  const current = view.container.querySelectorAll('[aria-current="date"]');
  expect(current).toHaveLength(1);
  expect(current[0].textContent).toContain("Hari ini");
  expect(current[0].textContent).toContain("13 Okt");
  expect(current[0].className).toContain("current");
  expect(row(0).textContent).toContain("Senin");
  expect(row(0).hasAttribute("aria-current")).toBe(false);
});

it("keeps midnight and late-night boundaries on the location date", async () => {
  await view.render(<DailyForecast data={data(week, "Asia/Jakarta", "2026-10-13T00:00")} />);
  expect(row(0).textContent).toContain("Hari ini");
  await view.render(<DailyForecast data={data(week, "Asia/Jakarta", "2026-10-13T23:59")} />);
  expect(row(0).textContent).toContain("Hari ini");
  expect(row(1).textContent).toContain("Besok");
  await view.render(<DailyForecast data={data(week, "Asia/Jakarta", "2026-10-14T00:00")} />);
  expect(row(0).textContent).toContain("Selasa");
  expect(row(1).getAttribute("aria-current")).toBe("date");
});

it.each(["Asia/Jakarta", "Asia/Tokyo", "Europe/London", "America/New_York"])(
  "labels days in %s regardless of the device clock",
  async (timezone) => {
    // A browser instant that is already the next calendar day in Jakarta: labels follow the location.
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-10-13T20:30:00Z"));
    await view.render(
      <DailyForecast data={data(week, timezone, "2026-10-13T23:45")} />,
    );
    expect(row(0).textContent).toContain("Hari ini");
    expect(row(0).querySelector("time")?.textContent).toBe("13 Okt");
    expect(row(1).textContent).toContain("Besok");
    expect(row(1).querySelector("time")?.textContent).toBe("14 Okt");
    expect(row(3).textContent).toContain("Jumat");
    expect(view.container.textContent).toContain(timezone);
    vi.useRealTimers();
  },
);

it("has a safe fallback for missing rain, bounds, code and whole datasets", async () => {
  await view.render(
    <DailyForecast
      data={data([
        day(0, { rain: null, min: null, max: null, code: null }),
        day(1, { rain: 140 }),
      ])}
    />,
  );
  expect(row(0).textContent).toContain("Peluang hujan —");
  expect(row(0).querySelector(".rain-chance")?.getAttribute("aria-label")).toBe(
    "Peluang hujan tidak tersedia",
  );
  expect(row(1).querySelector(".rain-chance")?.getAttribute("aria-label")).toBe(
    "Peluang hujan tidak tersedia",
  );
  expect(row(0).querySelector(".daily-range")?.getAttribute("aria-label")).toBe(
    "Rentang suhu tidak tersedia",
  );
  expect(row(0).querySelector(".range-track--empty")).not.toBeNull();
  expect(row(0).querySelector(".range-track > div")).toBeNull();
  expect(row(0).textContent).toContain("Tidak diketahui");
  expect(row(0).querySelector(".weather-icon")).toBeNull();
  expect(view.container.innerHTML).not.toMatch(/NaN|Infinity|undefined/);
});

it("keeps a genuine zero probability and partial bounds", async () => {
  await view.render(
    <DailyForecast data={data([day(0, { rain: 0, max: 30, min: null })])} />,
  );
  expect(row(0).textContent).toContain("Peluang hujan 0%");
  expect(row(0).querySelector(".rain-chance")?.getAttribute("aria-label")).toBe(
    "Peluang hujan 0 persen",
  );
  expect(row(0).querySelector(".daily-range")?.getAttribute("aria-label")).toBe(
    "Minimum —, maksimum 30°",
  );
  expect(row(0).querySelector(".range-track--empty")).not.toBeNull();
});

it.each([[], null, undefined, {}, [null, {}, { date: "bad" }, { date: "2026-02-30" }]])(
  "shows an empty state instead of guessing for %j",
  async (daily) => {
    await view.render(
      <DailyForecast data={{ timezone: "Asia/Jakarta", daily: daily as Weather["daily"] }} />,
    );
    expect(rows()).toHaveLength(0);
    expect(view.container.querySelector('[role="status"]')?.textContent).toBe(
      "Prakiraan 7 hari belum tersedia.",
    );
  },
);

it("skips malformed entries but keeps their valid neighbours", async () => {
  await view.render(
    <DailyForecast
      data={data([{ date: "bad" } as unknown as Weather["daily"][number], day(2)])}
    />,
  );
  expect(rows()).toHaveLength(1);
  expect(row(0).textContent).toContain("15 Okt");
});

it("does not fall back to the browser timezone when the location timezone is invalid", async () => {
  await view.render(<DailyForecast data={data(week, "Not/AZone")} />);
  expect(rows()).toHaveLength(0);
  expect(view.container.querySelector('[role="status"]')).not.toBeNull();
});

it("exposes a named section with a semantic list", async () => {
  await view.render(<DailyForecast data={data()} />);
  const section = view.container.querySelector("section")!;
  const heading = document.getElementById(section.getAttribute("aria-labelledby")!);
  expect(heading?.textContent).toBe("PRAKIRAAN 7 HARI");
  expect(view.container.querySelectorAll("ol.daily-list > li.daily-row")).toHaveLength(7);
});

describe("current-day highlight", () => {
  it("never marks a day when the location date is unknown", async () => {
    await view.render(
      <DailyForecast
        data={{ timezone: "Asia/Jakarta", daily: week, current: { time: "" } as Weather["current"] }}
      />,
    );
    expect(view.container.querySelectorAll('[aria-current="date"]')).toHaveLength(0);
    expect(row(0).textContent).toContain("Selasa");
  });
});
