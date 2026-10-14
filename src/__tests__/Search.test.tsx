// @vitest-environment jsdom
import { act } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import Search from "../components/Search";
import { searchPlaces, type Place } from "../weather";
import { ApiError } from "../lib/api";
import { click, deferred, dom, key, tick, type } from "./dom";
vi.mock("../weather", async importOriginal => ({ ...await importOriginal<typeof import("../weather")>(), searchPlaces: vi.fn() }));
const search = vi.mocked(searchPlaces);
const jakarta: Place = { id: 1, name: "Jakarta", latitude: -6.2, longitude: 106.8 };
const bandung: Place = { ...jakarta, id: 2, name: "Bandung" };
let view: ReturnType<typeof dom>;
const onSelect = vi.fn();
beforeEach(() => {
  vi.useFakeTimers(); vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  search.mockReset(); onSelect.mockReset(); view = dom();
});
afterEach(async () => { await view.unmount(); vi.useRealTimers(); vi.unstubAllGlobals(); vi.restoreAllMocks(); });
async function mount(online = true) {
  await view.render(<Search onSelect={onSelect} onLocate={() => {}} online={online} />);
  return view.container.querySelector("input")!;
}
describe("search interactions", () => {
  it("debounces rapid query changes and selects via keyboard", async () => {
    search.mockResolvedValue([bandung]);
    const input = await mount();
    await type(input, "Jakarta"); await tick(200);
    await type(input, "Jakarta Selatan"); await tick(200);
    await type(input, "Bandung"); await tick(399);
    expect(search).not.toHaveBeenCalled(); await tick(1);
    expect(search).toHaveBeenCalledTimes(1); expect(search.mock.calls[0][0]).toBe("Bandung");
    expect(input.getAttribute("aria-expanded")).toBe("true");
    await key(input, "ArrowDown");
    expect(view.container.querySelector('[role="option"]')?.getAttribute("aria-selected")).toBe("true");
    await key(input, "Enter"); expect(onSelect).toHaveBeenCalledWith(bandung);
    expect(input.value).toBe(""); expect(document.activeElement).toBe(input);
    await tick(400); expect(search).toHaveBeenCalledTimes(1);
  });
  it("late stale success cannot replace the newest result or clear its loading state", async () => {
    const old = deferred<Place[]>(), latest = deferred<Place[]>();
    search.mockReturnValueOnce(old.promise).mockReturnValueOnce(latest.promise);
    const input = await mount(); await type(input, "Jakarta"); await tick(400);
    const signal = search.mock.calls[0][1]?.signal;
    await type(input, "Bandung"); await tick(400);
    expect(signal?.aborted).toBe(true);
    await act(async () => old.resolve([jakarta]));
    expect(input.getAttribute("aria-busy")).toBe("true");
    expect(view.container.textContent).not.toContain("Jakarta");
    await act(async () => latest.resolve([bandung]));
    expect(view.container.textContent).toContain("Bandung");
    expect(view.container.textContent).not.toContain("Jakarta");
  });
  it("late stale failure cannot overwrite successful results", async () => {
    const old = deferred<Place[]>(); search.mockReturnValueOnce(old.promise).mockResolvedValueOnce([bandung]);
    const input = await mount(); await type(input, "Jakarta"); await tick(400);
    await type(input, "Bandung"); await tick(400);
    await act(async () => old.reject(new ApiError("HTTP_ERROR", 500)));
    expect(view.container.textContent).toContain("Bandung"); expect(view.container.querySelector('[role="alert"]')).toBeNull();
  });
  it("clearing query aborts and resets spinner", async () => {
    const pending = deferred<Place[]>(); search.mockReturnValue(pending.promise);
    const input = await mount(); await type(input, "Jakarta"); await tick(400);
    await type(input, " "); expect(search.mock.calls[0][1]?.signal?.aborted).toBe(true);
    await act(async () => pending.resolve([jakarta]));
    expect(input.getAttribute("aria-busy")).toBe("false"); expect(input.getAttribute("aria-expanded")).toBe("false");
  });
  it("distinguishes no matches from API failure, supports retry", async () => {
    search.mockResolvedValueOnce([]).mockRejectedValueOnce(new ApiError("TIMEOUT")).mockResolvedValueOnce([bandung]);
    const input = await mount(); await type(input, "No match"); await tick(400);
    expect(view.container.textContent).toContain("Kota tidak ditemukan");
    await type(input, "Bandung"); await tick(400);
    expect(view.container.querySelector('[role="alert"]')?.textContent).toContain("terlalu lama");
    expect(view.container.textContent).not.toContain("Kota tidak ditemukan");
    await click(Array.from(view.container.querySelectorAll("button")).find(b => b.textContent === "Coba cari lagi") ?? null);
    await tick(400); expect(view.container.textContent).toContain("Bandung"); expect(document.activeElement).toBe(input);
  });
  it("supports ArrowUp, Escape, pointer selection and outside focus", async () => {
    search.mockResolvedValue([jakarta, bandung]);
    const input = await mount(); await type(input, "Ja"); await tick(400);
    await key(input, "ArrowUp"); expect(input.getAttribute("aria-activedescendant")).toMatch(/-1$/);
    await key(input, "Escape"); expect(input.getAttribute("aria-expanded")).toBe("false");
    await key(input, "ArrowDown"); await click(view.container.querySelectorAll('[role="option"]')[1]);
    expect(onSelect).toHaveBeenCalledWith(bandung);
    await type(input, "Ja"); await tick(400);
    await act(async () => input.blur()); expect(input.getAttribute("aria-expanded")).toBe("false");
  });
  it("Escape while pending does not reopen on completion", async () => {
    const pending = deferred<Place[]>(); search.mockReturnValue(pending.promise);
    const input = await mount(); await type(input, "Ja"); await tick(400); await key(input, "Escape");
    await act(async () => pending.resolve([jakarta])); expect(input.getAttribute("aria-expanded")).toBe("false");
  });
  it("offline cancels, skips requests and searches once after reconnect", async () => {
    const pending = deferred<Place[]>(); search.mockReturnValueOnce(pending.promise).mockResolvedValueOnce([jakarta]);
    const input = await mount(); await type(input, "Ja"); await tick(400);
    await mount(false); expect(search.mock.calls[0][1]?.signal?.aborted).toBe(true); expect(input.disabled).toBe(true);
    await tick(5000); expect(search).toHaveBeenCalledTimes(1);
    await mount(true); await tick(400); expect(search).toHaveBeenCalledTimes(2);
  });
  it("unmount clears debounce and aborts in-flight requests", async () => {
    const input = await mount(); await type(input, "Ja"); await view.unmount(); await tick(400); expect(search).not.toHaveBeenCalled();
    view = dom(); search.mockReturnValue(new Promise(() => {}));
    const next = await mount(); await type(next, "Ja"); await tick(400); await view.unmount();
    expect(search.mock.calls[0][1]?.signal?.aborted).toBe(true); expect(vi.getTimerCount()).toBe(0);
  });
});

it("clear button aborts pending results, resets input and restores focus", async () => {
  const pending = deferred<Place[]>(); search.mockReturnValue(pending.promise);
  const input = await mount(); await type(input, "Jakarta"); await tick(400);
  await click(view.container.querySelector('[aria-label="Hapus pencarian"]'));
  expect(input.value).toBe(""); expect(document.activeElement).toBe(input);
  expect(search.mock.calls[0][1]?.signal?.aborted).toBe(true);
  await act(async () => pending.resolve([jakarta]));
  expect(input.getAttribute("aria-expanded")).toBe("false");
  expect(input.getAttribute("aria-busy")).toBe("false");
});
it("cycles through options and selects the highlighted last option with Enter", async () => {
  search.mockResolvedValue([jakarta, bandung]);
  const input = await mount(); await type(input, "Ja"); await tick(400);
  await key(input, "ArrowUp"); await key(input, "Enter");
  expect(onSelect).toHaveBeenCalledWith(bandung);
});
