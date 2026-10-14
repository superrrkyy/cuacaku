// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import WeatherBackground from "../components/WeatherBackground";
import WeatherHero from "../components/WeatherHero";
import {
  getWeather,
  weatherVisualState,
  type Place,
  type Weather,
} from "../weather";
import { click, dom } from "./dom";
import { fixture } from "./fixtures";

const place: Place = {
  id: 1,
  name: "Jakarta",
  admin1: "DKI Jakarta",
  country: "Indonesia",
  latitude: -6.2,
  longitude: 106.8,
};
const cases = [
  [0, true, "clear-day", "Cerah"],
  [0, false, "clear-night", "Cerah"],
  [3, true, "cloudy", "Berawan"],
  [61, true, "rain", "Hujan Ringan"],
  [95, false, "storm", "Badai Petir"],
  [71, true, "snow", "Salju Ringan"],
  [45, false, "fog", "Berkabut"],
  [999, false, "cloudy", "Tidak diketahui"],
] as const;
let view: ReturnType<typeof dom>, data: Weather;
beforeEach(async () => {
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  vi.stubGlobal(
    "fetch",
    vi.fn(async () => ({ ok: true, json: async () => fixture })),
  );
  data = await getWeather(place.latitude, place.longitude);
  vi.mocked(fetch).mockClear();
  view = dom();
});
afterEach(async () => {
  await view.unmount();
  vi.unstubAllGlobals();
});

describe("Phase 2.1 weather presentation", () => {
  it.each(cases)(
    "WMO %s / day=%s renders %s and its accessible meaning",
    async (code, isDay, state, label) => {
      data.current = { ...data.current, code, isDay };
      const normalized = weatherVisualState(code, isDay);
      expect(normalized).toBe(state);
      await view.render(
        <>
          <WeatherBackground state={normalized} />
          <WeatherHero
            place={place}
            data={data}
            favorite={false}
            onFavorite={() => {}}
          />
        </>,
      );
      const atmosphere = view.container.querySelector(".atmosphere")!;
      expect(atmosphere.classList.contains(`atmosphere--${state}`)).toBe(true);
      expect(atmosphere.getAttribute("aria-hidden")).toBe("true");
      expect(atmosphere.children).toHaveLength(0);
      expect(view.container.querySelector(".condition")?.textContent).toBe(
        label,
      );
      expect(
        view.container
          .querySelector('[role="img"]')
          ?.getAttribute("aria-label"),
      ).toBe(`${label}, ${isDay ? "siang" : "malam"}`);
      expect(fetch).not.toHaveBeenCalled();
    },
  );

  it("renders the city, region, Celsius temperature, condition, feels-like and today's bounds", async () => {
    await view.render(
      <WeatherHero
        place={place}
        data={data}
        favorite={false}
        onFavorite={() => {}}
      />,
    );
    expect(view.container.querySelector("h2")?.textContent).toBe("Jakarta");
    expect(view.container.querySelector(".hero-region")?.textContent).toBe(
      "DKI Jakarta, Indonesia",
    );
    expect(
      view.container.querySelector(".temperature")?.getAttribute("aria-label"),
    ).toBe("32 derajat Celsius");
    expect(view.container.querySelector(".condition")?.textContent).toBe(
      "Hujan Ringan",
    );
    expect(view.container.querySelector(".feels-like")?.textContent).toBe(
      "Terasa seperti 34°",
    );
    expect(view.container.querySelector(".high-low")?.textContent).toContain(
      "Tertinggi hari ini↑ 32°",
    );
    expect(view.container.querySelector(".high-low")?.textContent).toContain(
      "Terendah hari ini↓ 25°",
    );
    expect(
      view.container.querySelector(
        '[aria-label="Suhu tertinggi 32 derajat Celsius"]',
      ),
    ).not.toBeNull();
    expect(
      view.container.querySelector(
        '[aria-label="Suhu terendah 25 derajat Celsius"]',
      ),
    ).not.toBeNull();
  });

  it.each([
    [{ ...place, admin1: undefined }, "Indonesia"],
    [{ ...place, country: undefined }, "DKI Jakarta"],
    [{ ...place, admin1: undefined, country: undefined }, "Lokasi saat ini"],
  ])("handles optional region/country: %s", async (location, expected) => {
    await view.render(
      <WeatherHero
        place={location}
        data={data}
        favorite={false}
        onFavorite={() => {}}
      />,
    );
    expect(view.container.querySelector(".hero-region")?.textContent).toBe(
      expected,
    );
  });

  it("preserves zero and negative temperatures and the favorite action", async () => {
    data.current.temperature = -12.6;
    data.current.feelsLike = -18;
    data.daily[0] = { ...data.daily[0], max: 0, min: -20 };
    const onFavorite = vi.fn();
    await view.render(
      <WeatherHero
        place={place}
        data={data}
        favorite
        onFavorite={onFavorite}
      />,
    );
    expect(
      view.container.querySelector(".temperature")?.getAttribute("aria-label"),
    ).toBe("-13 derajat Celsius");
    expect(view.container.querySelector(".feels-like")?.textContent).toContain(
      "-18°",
    );
    expect(view.container.querySelector(".high-low")?.textContent).toContain(
      "↑ 0°",
    );
    expect(view.container.querySelector(".high-low")?.textContent).toContain(
      "↓ -20°",
    );
    const button = view.container.querySelector(
      '[aria-label="Hapus dari favorit"]',
    );
    expect(button?.getAttribute("aria-pressed")).toBe("true");
    await click(button);
    expect(onFavorite).toHaveBeenCalledOnce();
  });

  it("gives separate heroes unique accessible heading references", async () => {
    await view.render(
      <>
        {[place, { ...place, name: "Bandung" }].map((location) => (
          <WeatherHero
            key={location.name}
            place={location}
            data={data}
            favorite={false}
            onFavorite={() => {}}
          />
        ))}
      </>,
    );
    const sections = [...view.container.querySelectorAll("section")];
    expect(
      new Set(
        sections.map((section) => section.getAttribute("aria-labelledby")),
      ).size,
    ).toBe(2);
    for (const section of sections) {
      expect(section.getAttribute("aria-labelledby")).toBe(
        section.querySelector("h2")?.id,
      );
    }
  });
});
