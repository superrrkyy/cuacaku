// @vitest-environment jsdom
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import WeatherBackground from "../components/WeatherBackground";
import { dom, tick } from "./dom";

let view: ReturnType<typeof dom>;
const classes = () => view.container.querySelector(".atmosphere")?.className ?? "";

beforeEach(() => {
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  view = dom();
});
afterEach(async () => {
  await view.unmount();
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

it("derives the day part from the location timezone, not the device clock", async () => {
  vi.useFakeTimers();
  // 22:00Z → 05:00 WIB (dawn) while a UTC device would still read night.
  vi.setSystemTime(new Date("2026-10-14T22:00:00Z"));
  await view.render(<WeatherBackground code={0} isDay={false} timezone="Asia/Jakarta" />);
  expect(classes()).toContain("atmosphere--clear-night");
  expect(classes()).toContain("atmosphere--dawn");
  expect(classes()).not.toContain("atmosphere--night");
});

it.each([
  ["2026-10-14T22:30:00Z", "atmosphere--dawn"],
  ["2026-10-15T03:00:00Z", "atmosphere--day"],
  ["2026-10-15T10:30:00Z", "atmosphere--dusk"],
  ["2026-10-15T13:00:00Z", "atmosphere--night"],
])("maps %s in Jakarta to %s", async (instant, expected) => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date(instant));
  await view.render(<WeatherBackground code={3} isDay timezone="Asia/Jakarta" />);
  expect(classes()).toContain(expected);
});

it("re-evaluates on its minute timer and clears it on unmount", async () => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date("2026-10-14T22:30:00Z")); // 05:30 WIB → dawn
  const spy = vi.spyOn(window, "setInterval");
  await view.render(<WeatherBackground code={0} isDay timezone="Asia/Jakarta" />);
  expect(classes()).toContain("atmosphere--dawn");
  expect(spy).toHaveBeenCalledWith(expect.any(Function), 60_000);

  await tick(60_000 * 90); // 2026-10-15T00:00Z → 07:00 WIB
  expect(classes()).toContain("atmosphere--day");
  expect(classes()).not.toContain("atmosphere--dawn");
  await tick(60_000 * 630); // 2026-10-15T10:30Z → 17:30 WIB
  expect(classes()).toContain("atmosphere--dusk");
  await tick(60_000 * 150); // 2026-10-15T13:00Z → 20:00 WIB
  expect(classes()).toContain("atmosphere--night");

  await view.unmount();
  view = dom();
  expect(vi.getTimerCount()).toBe(0);
});

it("keeps the isDay fallback and starts no timer without a timezone", async () => {
  vi.useFakeTimers();
  const spy = vi.spyOn(window, "setInterval");
  await view.render(<WeatherBackground code={0} isDay />);
  expect(spy).not.toHaveBeenCalled();
  expect(classes()).toContain("atmosphere--day");
  expect(classes()).not.toContain("atmosphere--night");

  await view.render(<WeatherBackground code={0} isDay={false} />);
  expect(classes()).toContain("atmosphere--night");
});

it("treats an invalid timezone as night instead of throwing", async () => {
  await view.render(<WeatherBackground code={0} isDay timezone="Not/A/Timezone" />);
  expect(classes()).toContain("atmosphere--night");
});

it("renders exactly one decorative orb and horizon", async () => {
  await view.render(<WeatherBackground code={61} isDay timezone="Asia/Jakarta" />);
  expect(view.container.querySelectorAll(".atmosphere-orb")).toHaveLength(1);
  expect(view.container.querySelectorAll(".atmosphere-horizon")).toHaveLength(1);
});
