// @vitest-environment jsdom
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { act } from "react";
import HourlyForecast from "../components/HourlyForecast";
import type { Weather } from "../weather";
import { dom, tick } from "./dom";

type Data = Pick<Weather, "hourly" | "timezone">;
let view: ReturnType<typeof dom>;
const reading = { time: "2026-10-14T14:00", temp: 30.6, code: 61, rain: 70, isDay: true };
const data = (hourly = [reading], timezone = "Asia/Jakarta"): Data => ({ hourly, timezone });
const cards = () => view.container.querySelectorAll(".hour-card");
const current = () => view.container.querySelector('[aria-current="time"]');

beforeEach(() => {
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  vi.useFakeTimers();
  vi.setSystemTime(new Date("2026-10-14T07:30:00Z"));
  view = dom();
});
afterEach(async () => {
  await view.unmount();
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

it("renders normalized hours, rounded Celsius, condition and probability with context", async () => {
  const fetchSpy = vi.fn();
  vi.stubGlobal("fetch", fetchSpy);
  await view.render(<HourlyForecast data={data()} />);
  expect(cards()).toHaveLength(1);
  expect(cards()[0].querySelector("time")?.textContent).toBe("14:00");
  expect(cards()[0].querySelector("strong")?.textContent).toBe("31°");
  expect(cards()[0].querySelector(".rain-chance")?.textContent).toBe("70%");
  expect(cards()[0].getAttribute("aria-label")).toBe(
    "14 Okt, 14:00, Kini, Hujan Ringan, 31 derajat Celsius, Peluang hujan 70 persen.",
  );
  expect(cards()[0].querySelector('[aria-label="Hujan Ringan, siang"]')).not.toBeNull();
  expect(cards()[0].querySelector('[aria-label="Peluang hujan 70 persen"]')).not.toBeNull();
  expect(fetchSpy).not.toHaveBeenCalled();
});

it.each([-5.6, 0, 31.4])("renders temperature %s without changing its meaning", async (temp) => {
  await view.render(<HourlyForecast data={data([{ ...reading, temp }])} />);
  expect(cards()[0].querySelector("strong")?.textContent).toBe(`${Math.round(temp)}°`);
});

it("identifies the location hour rather than marking the first item", async () => {
  await view.render(<HourlyForecast data={data([
    { ...reading, time: "2026-10-14T13:00" }, reading,
    { ...reading, time: "2026-10-14T15:00" },
  ])} />);
  expect(cards()[0].hasAttribute("aria-current")).toBe(false);
  expect(current()).toBe(cards()[1]);
  expect(current()?.querySelector(".now-marker")?.textContent).toBe("Kini");
});

it("does not mark stale data or a same-numbered hour on another date as current", async () => {
  await view.render(<HourlyForecast data={data([{ ...reading, time: "2026-10-13T14:00" }])} />);
  expect(current()).toBeNull();
});

it.each([
  ["Asia/Jakarta", "2026-10-15T06:00", "06:00"],
  ["Asia/Tokyo", "2026-10-15T08:00", "08:00"],
  ["Europe/London", "2026-10-15T00:00", "00:00"],
  ["America/New_York", "2026-10-14T19:00", "19:00"],
])("preserves local API timestamps and converts current instant for %s", async (zone, time, label) => {
  vi.setSystemTime(new Date("2026-10-14T23:30:00Z"));
  await view.render(<HourlyForecast data={data([{ ...reading, time }], zone)} />);
  expect(current()).toBe(cards()[0]);
  expect(cards()[0].querySelector("time")?.textContent).toBe(label);
  expect(view.container.textContent).toContain(zone);
});

it.each([
  ["Asia/Jakarta", "06:00"], ["Asia/Tokyo", "08:00"],
  ["Europe/London", "00:00"], ["America/New_York", "19:00"],
])("formats offset-bearing forecast instants explicitly in %s", async (zone, label) => {
  vi.setSystemTime(new Date("2026-10-14T23:30:00Z"));
  await view.render(<HourlyForecast data={data([{ ...reading, time: "2026-10-14T23:00:00Z" }], zone)} />);
  expect(current()).toBe(cards()[0]);
  expect(cards()[0].querySelector("time")?.textContent).toBe(label);
});

it.each([
  ["2026-03-08T06:30:00Z", "2026-03-08T01:00"],
  ["2026-03-08T07:30:00Z", "2026-03-08T03:00"],
  ["2026-11-01T05:30:00Z", "2026-11-01T01:00"],
  ["2026-11-01T06:30:00Z", "2026-11-01T01:00"],
])("uses the location's DST offset at %s", async (now, time) => {
  vi.setSystemTime(new Date(now));
  await view.render(<HourlyForecast data={data([{ ...reading, time }], "America/New_York")} />);
  expect(current()).toBe(cards()[0]);
});

it("marks at most one repeated offset-free DST hour", async () => {
  vi.setSystemTime(new Date("2026-11-01T06:30:00Z"));
  const hour = { ...reading, time: "2026-11-01T01:00" };
  await view.render(<HourlyForecast data={data([hour, hour], "America/New_York")} />);
  expect(view.container.querySelectorAll('[aria-current="time"]')).toHaveLength(1);
});

it.each([null, undefined, NaN, Infinity, -1, 101, "70"])("does not invent probability for %s", async (rain) => {
  const malformed = data([{ ...reading, rain } as typeof reading]);
  await view.render(<HourlyForecast data={malformed} />);
  expect(cards()[0].querySelector(".rain-chance")?.textContent).toBe("—");
  expect(cards()[0].querySelector(".rain-chance")?.getAttribute("aria-label")).toBe("Peluang hujan tidak tersedia");
  expect(cards()[0].querySelector(".rain-track")).toBeNull();
  expect(cards()[0].textContent).not.toContain("0%");
});

it.each([0, 100])("keeps a valid %s percent probability", async (rain) => {
  await view.render(<HourlyForecast data={data([{ ...reading, rain }])} />);
  expect(cards()[0].querySelector(".rain-chance")?.textContent).toBe(`${rain}%`);
  expect(cards()[0].querySelector<HTMLElement>(".rain-track span")?.style.width).toBe(`${rain}%`);
});

it.each([[], null, undefined, {}, [null, {}, { time: "bad" }]])("has a safe fallback for missing/malformed hourly data: %j", async (hourly) => {
  await view.render(<HourlyForecast data={{ timezone: "Asia/Jakarta", hourly } as Data} />);
  expect(cards()).toHaveLength(0);
  expect(view.container.querySelector('[role="status"]')?.textContent).toBe("Prakiraan per jam belum tersedia.");
  expect(view.container.querySelector('[role="region"]')).toBeNull();
});

it.each(["bad", "2026-02-30T14:00", "2026-02-30T14:00:00Z", "2026-10-14T24:00", "2026-10-14"])("skips invalid timestamps %s, retaining valid neighbors", async (time) => {
  await view.render(<HourlyForecast data={data([{ ...reading, time }, reading])} />);
  expect(cards()).toHaveLength(1);
  expect(current()).toBe(cards()[0]);
});

it("handles invalid timezone without browser-local guessing", async () => {
  await view.render(<HourlyForecast data={data([reading], "Not/AZone")} />);
  expect(cards()).toHaveLength(0);
  expect(current()).toBeNull();
});

it("uses truthful fallbacks for invalid temperature, code and day flag", async () => {
  await view.render(<HourlyForecast data={data([{ ...reading, temp: NaN, code: 999, isDay: null } as unknown as typeof reading])} />);
  expect(cards()[0].getAttribute("aria-label")).toContain("Tidak diketahui, Suhu tidak tersedia");
  expect(cards()[0].querySelector("strong")?.textContent).toBe("—");
  expect(cards()[0].querySelector('[aria-label="Tidak diketahui"]')).not.toBeNull();
  expect(view.container.innerHTML).not.toMatch(/NaN|Infinity/);
});

it("provides a named section, semantic list, one keyboard scroll stop and instructions", async () => {
  await view.render(<HourlyForecast data={data()} />);
  const section = view.container.querySelector("section")!;
  expect(document.getElementById(section.getAttribute("aria-labelledby")!)?.textContent).toBe("24 JAM KE DEPAN");
  expect(view.container.querySelector("ol.hourly-list > li.hour-card")).not.toBeNull();
  const region = view.container.querySelector<HTMLElement>(".hourly-scroll")!;
  expect(region.tabIndex).toBe(0);
  region.focus();
  expect(document.activeElement).toBe(region);
  expect(document.getElementById(region.getAttribute("aria-describedby")!)?.textContent).toContain("tombol panah");
  expect(view.container.querySelectorAll("[tabindex]")).toHaveLength(1);
});

it("caps the timeline at 24 items, updates hourly highlighting with one clock and cleans up", async () => {
  vi.setSystemTime(new Date("2026-10-14T07:59:30Z"));
  const hourly = Array.from({ length: 48 }, (_, i) => ({
    ...reading, time: new Date(Date.UTC(2026, 9, 14, 14 + i)).toISOString().slice(0, 16),
  }));
  await view.render(<HourlyForecast data={data(hourly)} />);
  expect(cards()).toHaveLength(24);
  expect(vi.getTimerCount()).toBe(1);
  expect(current()).toBe(cards()[0]);
  await tick(60000);
  expect(current()).toBe(cards()[1]);
  vi.setSystemTime(new Date("2026-10-14T09:01:00Z"));
  await act(async () => { document.dispatchEvent(new Event("visibilitychange")); });
  expect(current()).toBe(cards()[2]);
  await view.unmount();
  expect(vi.getTimerCount()).toBe(0);
});

it("re-derives when switching locations without leaking the previous city's highlight", async () => {
  await view.render(<HourlyForecast data={data()} />);
  expect(current()).not.toBeNull();
  await view.render(<HourlyForecast data={data([{ ...reading, time: "2026-10-14T16:00", isDay: false, code: 0 }], "Asia/Tokyo")} />);
  expect(current()?.querySelector("time")?.textContent).toBe("16:00");
  expect(view.container.querySelector('[aria-label="Cerah, malam"]')).not.toBeNull();
});
