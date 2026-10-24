// @vitest-environment jsdom
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import LocalClock from "../components/LocalClock";
import { dom, tick } from "./dom";
import { localClockDateTime } from "../lib/localClock";

const instant = new Date("2026-10-14T13:00:00.000Z");
let view: ReturnType<typeof dom>;
const time = () => view.container.querySelector(".local-clock-time");
const srText = () => view.container.querySelector(".sr-only")?.textContent ?? "";
const datetime = () => time()?.getAttribute("datetime") ?? null;

beforeEach(() => {
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  view = dom();
});
afterEach(async () => {
  await view.unmount();
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

it("shows the location timezone, never the device timezone", async () => {
  await view.render(<LocalClock timezone="Asia/Tokyo" locationName="Tokyo" now={instant} />);
  expect(time()?.textContent).toBe("22:00:00");
  expect(view.container.textContent).toContain("Tokyo");
  expect(srText()).toContain("22:00:00");
  expect(srText()).toContain("Waktu lokal di Tokyo");
});

it("carries a valid datetime (date + time), not a bare clock", async () => {
  await view.render(<LocalClock timezone="Asia/Jakarta" locationName="Jakarta" now={instant} />);
  expect(datetime()).toBe("2026-10-14T20:00:00");
  expect(localClockDateTime(instant, "Europe/London", "en-US")).toBe("2026-10-14T14:00:00");
});

it("falls back safely without a timezone or with an invalid one", async () => {
  await view.render(<LocalClock locationName="Lokasiku" now={instant} />);
  expect(time()?.textContent).toBe("--:--:--");
  expect(time()?.hasAttribute("datetime")).toBe(false);
  expect(srText()).toBe("Waktu lokal tidak tersedia.");

  await view.render(<LocalClock timezone="Not/A/Timezone" now={instant} />);
  expect(time()?.textContent).toBe("--:--:--");
  expect(view.container.textContent).toContain("Waktu lokal");
});

it("ticks every second and stops the interval on unmount", async () => {
  vi.useFakeTimers();
  vi.setSystemTime(instant);
  const spy = vi.spyOn(window, "setInterval");
  await view.render(<LocalClock timezone="Asia/Jakarta" locationName="Jakarta" />);
  expect(time()?.textContent).toBe("20:00:00");
  expect(spy).toHaveBeenCalledWith(expect.any(Function), 1000);

  await tick(2000);
  expect(time()?.textContent).toBe("20:00:02");
  expect(datetime()).toBe("2026-10-14T20:00:02");

  await view.unmount();
  view = dom();
  expect(vi.getTimerCount()).toBe(0);
});

it("does not start an interval for a pinned instant", async () => {
  vi.useFakeTimers();
  vi.setSystemTime(instant);
  const spy = vi.spyOn(window, "setInterval");
  await view.render(<LocalClock timezone="Asia/Jakarta" now={instant} />);
  expect(spy).not.toHaveBeenCalled();
});
