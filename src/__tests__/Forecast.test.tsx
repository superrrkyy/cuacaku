// @vitest-environment jsdom
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { act } from "react";
import HourlyForecast from "../components/HourlyForecast";
import DailyForecast from "../components/DailyForecast";
import TemperatureChart from "../components/TemperatureChart";
import WeatherDetails, { UVIndex } from "../components/WeatherDetails";
import SunCycle from "../components/SunCycle";
import WeatherHero from "../components/WeatherHero";
import WeatherBackground from "../components/WeatherBackground";
import { getWeather, type Weather } from "../weather";
import { fixture } from "./fixtures";
import { dom, click } from "./dom";
let view: ReturnType<typeof dom>, data: Weather;
beforeEach(async () => {
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  vi.stubGlobal(
    "fetch",
    vi.fn(async () => ({ ok: true, json: async () => fixture })),
  );
  data = await getWeather(0, 0);
  view = dom();
});
afterEach(async () => {
  await view.unmount();
  vi.useRealTimers();
  vi.unstubAllGlobals();
});
it("renders 24 forecast hours, current hour and rain probabilities with day/night icons", async () => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date("2026-10-13T00:15:00Z"));
  data.hourly[1] = { ...data.hourly[1], code: 0, isDay: false, rain: 70 };
  await view.render(<HourlyForecast data={data} />);
  expect(view.container.querySelectorAll("li")).toHaveLength(24);
  expect(
    view.container.querySelector('[aria-current="time"]')?.textContent,
  ).toContain("Kini");
  expect(
    view.container.querySelector('[aria-label="Cerah, malam"]'),
  ).not.toBeNull();
  expect(
    view.container.querySelector('[aria-label="Peluang hujan 70 persen"]'),
  ).not.toBeNull();
  expect(
    view.container.querySelector('[role="region"]')?.getAttribute("tabindex"),
  ).toBe("0");
});
it("shows date, condition, rain and temperature bounds for each day", async () => {
  data.daily = Array.from({ length: 7 }, (_, i) => ({
    ...data.daily[0],
    date: `2026-10-${13 + i}`,
    min: 20 + i,
    max: 29 + i,
  }));
  await view.render(<DailyForecast data={data} />);
  expect(view.container.querySelectorAll("li")).toHaveLength(7);
  expect(view.container.textContent).toContain("Hari ini");
  expect(view.container.textContent).toContain("Besok");
  expect(view.container.textContent).toContain("19 Okt");
  expect(view.container.textContent).toContain("Hujan Ringan");
  expect(view.container.textContent).toContain("Peluang hujan 80%");
  expect(
    view.container.querySelector('[aria-label="Minimum 20°, maksimum 29°"]'),
  ).not.toBeNull();
});
it("offers a 7-day chart summary and every exact daily value in a readable data table", async () => {
  data.daily = Array.from({ length: 7 }, (_, i) => ({
    ...data.daily[0],
    date: `2026-10-${13 + i}`,
    min: 20 + i,
    max: 29 + i,
  }));

  await view.render(<TemperatureChart data={data} />);

  expect(
    view.container
      .querySelector('[role="img"]')
      ?.getAttribute("aria-label"),
  ).toBe(
    "Grafik tren suhu minimum dan maksimum selama 7 hari",
  );

  expect(view.container.textContent).toContain(
    "Dalam 7 hari ke depan",
  );

  expect(view.container.textContent).toContain(
    "20 hingga 35 derajat Celsius",
  );

  expect(
    view.container.querySelectorAll("tbody tr"),
  ).toHaveLength(7);

  expect(
    view.container.querySelector("summary")?.textContent,
  ).toBe("Lihat data suhu harian");

  await act(async () => {
    view.container.querySelector("details")!.open = true;
  });

  expect(
    view.container.querySelector("table")?.textContent,
  ).toContain("2026-10-13");

  expect(
    view.container.querySelector("table")?.textContent,
  ).toContain("20°C");

  expect(
    view.container.querySelector("table")?.textContent,
  ).toContain("29°C");
});
it("handles constant, single-value and empty daily charts without invalid coordinates", async () => {
  data.daily = [
    {
      ...data.daily[0],
      min: 30,
      max: 30,
    },
  ];

  await view.render(<TemperatureChart data={data} />);

  expect(view.container.innerHTML).not.toMatch(
    /NaN|Infinity/,
  );

  data.daily = [
    {
      ...data.daily[0],
      min: 30,
      max: 30,
    },
    {
      ...data.daily[0],
      date: "2026-10-14",
      min: 30,
      max: 30,
    },
  ];

  await view.render(<TemperatureChart data={data} />);

  expect(view.container.innerHTML).not.toMatch(
    /NaN|Infinity/,
  );

  data.daily = [];

  await view.render(<TemperatureChart data={data} />);

  expect(
    view.container.querySelector("svg"),
  ).toBeNull();
});
it("visibility has a truthful unavailable fallback", async () => {
  await view.render(<WeatherDetails data={data} />);
  expect(view.container.querySelectorAll("article")).toHaveLength(6);
  expect(view.container.textContent).toContain("Data tidak tersedia");
  data.current.visibility = 12000;
  await view.render(<WeatherDetails data={data} />);
  expect(view.container.textContent).toContain("12 km");
});
it("renders sun times with location-local progress and cleans up its clock", async () => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date("2026-10-13T04:37:30Z"));
  await view.render(<SunCycle data={data} />);
  expect(view.container.textContent).toContain("05:30");
  expect(view.container.textContent).toContain("17:45");
  expect(
    view.container
      .querySelector('[role="progressbar"]')
      ?.getAttribute("aria-valuenow"),
  ).toBe("50");
  expect(view.container.textContent).toContain("Asia/Jakarta");
  await view.unmount();
  expect(vi.getTimerCount()).toBe(0);
});
it("hero exposes location, feels-like, high/low, weather meaning and favorite action", async () => {
  const onFavorite = vi.fn();
  await view.render(
    <WeatherHero
      place={{
        id: 1,
        name: "Jakarta",
        country: "Indonesia",
        latitude: 0,
        longitude: 0,
      }}
      data={data}
      favorite={false}
      onFavorite={onFavorite}
    />,
  );
  expect(view.container.querySelector("h2")?.textContent).toBe("Jakarta");
  for (const text of [
    "Indonesia",
    "32°",
    "Terasa seperti 34°",
    "↑ 32°",
    "↓ 25°",
    "0.4 mm",
    "70%",
    "12 km/j",
  ])
    expect(view.container.textContent).toContain(text);
  await click(view.container.querySelector('[aria-label="Tambah ke favorit"]'));
  expect(onFavorite).toHaveBeenCalledOnce();
});
it("switches clear day/night atmosphere without adding particle nodes", async () => {
  await view.render(<WeatherBackground code={0} isDay />);
  expect(view.container.querySelector(".atmosphere--clear-day")).not.toBeNull();
  await view.render(<WeatherBackground code={0} isDay={false} />);
  expect(
    view.container.querySelector(".atmosphere--clear-night"),
  ).not.toBeNull();
  expect(view.container.firstElementChild?.children).toHaveLength(0);
});
