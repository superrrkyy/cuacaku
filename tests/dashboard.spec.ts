import { expect, test, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

const place = {
  id: 1650357,
  name: "Bandung",
  admin1: "Jawa Barat",
  country: "Indonesia",
  latitude: -6.9,
  longitude: 107.6,
};
function weather(code = 61, isDay = 1) {
  const hours = Array.from({ length: 168 }, (_, i) =>
    new Date(Date.UTC(2026, 9, 14, i)).toISOString().slice(0, 16),
  );
  const dates = Array.from({ length: 7 }, (_, i) => `2026-10-${14 + i}`);
  return {
    timezone: "Asia/Jakarta",
    current: {
      time: "2026-10-14T07:15",
      temperature_2m: 31,
      apparent_temperature: 34,
      relative_humidity_2m: 78,
      wind_speed_10m: 12,
      wind_direction_10m: 90,
      surface_pressure: 1008,
      weather_code: code,
      is_day: isDay,
      precipitation: 0.4,
    },
    hourly: {
      time: hours,
      temperature_2m: hours.map(
        (_, i) => Math.round((28 + Math.sin((i - 8) / 4) * 4) * 10) / 10,
      ),
      weather_code: hours.map((_, i) => [61, 61, 3, 2, 0, 0, 3, 3][i % 8]),
      precipitation_probability: hours.map(
        (_, i) => [70, 60, 50, 20, 10, 5, 10, 40][i % 8],
      ),
      is_day: hours.map((_, i) => (i % 24 >= 6 && i % 24 < 18 ? 1 : 0)),
      visibility: hours.map(() => 12000),
    },
    daily: {
      time: dates,
      weather_code: [61, 3, 0, 2, 61, 95, 3],
      temperature_2m_max: [33, 32, 34, 33, 31, 30, 32],
      temperature_2m_min: [25, 24, 25, 26, 24, 23, 24],
      precipitation_probability_max: [80, 40, 10, 20, 70, 90, 40],
      sunrise: dates.map((d) => `${d}T05:30`),
      sunset: dates.map((d) => `${d}T17:45`),
      uv_index_max: [7.5, 6, 8, 7, 5, 4, 6],
    },
  };
}
async function mockWeather(page: Page, code = 61, isDay = 1) {
  await page.route("https://api.open-meteo.com/**", (route) =>
    route.fulfill({ json: weather(code, isDay) }),
  );
  await page.route("https://geocoding-api.open-meteo.com/**", (route) =>
    route.fulfill({ json: { results: [place] } }),
  );
  await page.clock.install({ time: new Date("2026-10-14T03:30:00Z") });
}
async function noPageOverflow(page: Page) {
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
}
for (const width of [320, 375, 390, 768, 1024, 1280, 1440]) {
  test(`dashboard readable, accessible and contained at ${width}px`, async ({
    page,
  }, testInfo) => {
    await page.setViewportSize({ width, height: 1000 });
    await mockWeather(page);
    await page.goto("./");
    await expect(
      page.getByRole("heading", { name: "Jakarta", exact: true }),
    ).toBeVisible();
    await page.clock.runFor(400);
    await noPageOverflow(page);
    expect(
      await page.getByRole("combobox").evaluate((el) => {
        const css = getComputedStyle(el);
        return (
          parseFloat(css.paddingTop) +
            parseFloat(css.paddingBottom) +
            parseFloat(css.lineHeight) <=
          el.clientHeight
        );
      }),
    ).toBe(true);
    await expect(page.locator(".daily-list > li")).toHaveCount(7);
    await expect(page.locator(".hourly-list > li")).toHaveCount(24);
    expect(
      await page
        .locator(".temperature")
        .evaluate((el) => parseFloat(getComputedStyle(el).fontSize)),
    ).toBeGreaterThanOrEqual(88);
    for (const locator of [
      page.getByRole("button", { name: "Tambah ke favorit" }),
      page.getByRole("button", { name: "Gunakan lokasiku" }),
      page.getByRole("button", { name: "Muat ulang cuaca" }),
    ]) {
      const box = await locator.boundingBox();
      expect(box!.height).toBeGreaterThanOrEqual(44);
      expect(box!.width).toBeGreaterThanOrEqual(44);
    }
    const hourly = page.getByRole("region", { name: /Prakiraan per jam/ });
    await hourly.focus();
    await page.keyboard.press("ArrowRight");
    await page.clock.runFor(200);
    expect(await hourly.evaluate((el) => el.scrollWidth > el.clientWidth)).toBe(
      true,
    );
    await page.getByRole("combobox").focus();
    expect(
      await page
        .getByRole("combobox")
        .evaluate((el) => getComputedStyle(el).outlineStyle),
    ).not.toBe("none");
    const accessibility = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
      .analyze();
    expect(accessibility.violations).toEqual([]);
    await page.getByRole("combobox").blur();
    await hourly.evaluate((el) => {
      el.scrollLeft = 0;
    });
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.screenshot({
      path: testInfo.outputPath(`dashboard-${width}.png`),
      fullPage: true,
    });
  });
}
for (const width of [320, 1440]) {
  test(`7-day trend chart readable and contained at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 1000 });
    await mockWeather(page);
    await page.goto("./");
    const chart = page.locator(".chart-panel--daily");
    await expect(
      chart.getByRole("heading", { name: "TREN SUHU 7 HARI" }),
    ).toBeVisible();
    // The SVG is never the only source: summary, axis labels and table repeat every value.
    await expect(chart.locator("svg[role=img]")).toHaveCount(1);
    await expect(chart.locator(".chart-axis > div")).toHaveCount(7);
    await expect(
      chart.getByText(/Suhu berkisar 23° hingga 34° selama 7 hari ke depan, terhangat pada hari/),
    ).toBeVisible();
    await chart.locator("summary").click();
    await expect(chart.locator("tbody tr")).toHaveCount(7);
    // Current day is marked by state, not by list position.
    await expect(page.locator('.daily-row[aria-current="date"]')).toHaveCount(1);
    // Chart and its labels stay inside the panel, so nothing can push the page sideways.
    const panel = (await chart.boundingBox())!;
    const frame = (await chart.locator(".chart-frame").boundingBox())!;
    expect(frame.x).toBeGreaterThanOrEqual(panel.x - 0.5);
    expect(frame.x + frame.width).toBeLessThanOrEqual(panel.x + panel.width + 0.5);
    const cells = await chart.locator(".chart-axis > div").evaluateAll((nodes) =>
      nodes.map((node) => {
        const box = node.getBoundingClientRect();
        return { left: box.left, right: box.right };
      }),
    );
    expect(cells[0].left).toBeGreaterThanOrEqual(frame.x - 0.5);
    expect(cells[cells.length - 1].right).toBeLessThanOrEqual(frame.x + frame.width + 0.5);
    for (let i = 1; i < cells.length; i += 1)
      expect(cells[i].left).toBeGreaterThan(cells[i - 1].left);
    await noPageOverflow(page);
  });
}

test("keyboard search, favorite selection/removal/clear and persistence", async ({
  page,
}) => {
  await mockWeather(page);
  await page.goto("./");
  await page.getByRole("button", { name: "Tambah ke favorit" }).click();
  await page.getByRole("combobox").fill("Bandung");
  await page.clock.runFor(450);
  await page.getByRole("option").waitFor();
  await page.keyboard.press("ArrowUp");
  await page.keyboard.press("Escape");
  await expect(page.getByRole("combobox")).toHaveAttribute(
    "aria-expanded",
    "false",
  );
  await page.keyboard.press("ArrowDown");
  await page.keyboard.press("Enter");
  await expect(
    page.getByRole("heading", { name: "Bandung", exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Tambah ke favorit" }).click();
  await page.getByRole("button", { name: "Lihat cuaca Jakarta" }).click();
  await expect(
    page.getByRole("heading", { name: "Jakarta", exact: true }),
  ).toBeVisible();
  await page.reload();
  await expect(
    page.getByRole("button", { name: "Lihat cuaca Bandung" }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Hapus Bandung dari favorit" })
    .click();
  await page.getByRole("button", { name: "Bersihkan favorit" }).click();
  await page.getByRole("button", { name: "Ya, hapus" }).click();
  await expect(
    page.getByText("Simpan kota favorit untuk melihat cuacanya sekilas."),
  ).toBeVisible();
});
test("reduced motion freezes atmosphere, reveal, spinner and skeleton", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await mockWeather(page);
  await page.goto("./");
  await expect(page.locator("main")).toBeVisible();
  expect(
    await page
      .locator(".atmosphere")
      .evaluate((el) => getComputedStyle(el, "::after").animationName),
  ).toBe("none");
  expect(
    await page
      .locator("main")
      .evaluate((el) => getComputedStyle(el).animationName),
  ).toBe("none");
  expect(
    await page
      .getByRole("combobox")
      .evaluate((el) => getComputedStyle(el).transitionDuration),
  ).toBe("0s");
  expect(
    await page
      .locator(".chart-frame")
      .first()
      .evaluate((el) => getComputedStyle(el).animationName),
  ).toBe("none");
  expect(
    await page
      .locator(".daily-row")
      .first()
      .evaluate((el) => getComputedStyle(el).animationName),
  ).toBe("none");
  await page.route("https://api.open-meteo.com/**", () => {});
  await page.getByRole("button", { name: "Muat ulang cuaca" }).click();
  await expect(page.getByText("Memuat cuaca Jakarta...")).toBeVisible();
  expect(
    await page
      .locator(".spinner")
      .first()
      .evaluate((el) => getComputedStyle(el).animationName),
  ).toBe("none");
  expect(
    await page
      .locator(".skeleton")
      .first()
      .evaluate((el) => getComputedStyle(el).animationName),
  ).toBe("none");
});
test("loading/error/retry, search empty/error and geolocation denial at 320px", async ({
  page,
}, testInfo) => {
  await page.setViewportSize({ width: 320, height: 900 });
  await mockWeather(page);
  await page.route("https://api.open-meteo.com/**", () => {});
  await page.goto("./");
  await expect(page.getByText("Memuat cuaca Jakarta...")).toBeVisible();
  await noPageOverflow(page);
  await page.screenshot({
    path: testInfo.outputPath("loading-320.png"),
    fullPage: true,
  });
  await page.unroute("https://api.open-meteo.com/**");
  await page.route("https://api.open-meteo.com/**", (route) =>
    route.fulfill({ status: 503, json: {} }),
  );
  await page.reload();
  await expect(
    page.getByRole("button", { name: "Coba lagi", exact: true }),
  ).toBeVisible();
  await noPageOverflow(page);
  await page.screenshot({
    path: testInfo.outputPath("error-320.png"),
    fullPage: true,
  });
  await page.unroute("https://api.open-meteo.com/**");
  await page.route("https://api.open-meteo.com/**", (route) =>
    route.fulfill({ json: weather() }),
  );
  await page.getByRole("button", { name: "Coba lagi", exact: true }).click();
  await expect(page.locator("main")).toBeVisible();
  await page.route("https://geocoding-api.open-meteo.com/**", (route) =>
    route.fulfill({ json: {} }),
  );
  await page.getByRole("combobox").fill("Tidak ada");
  await page.clock.runFor(450);
  await expect(
    page.getByText("Kota tidak ditemukan. Coba nama kota lain."),
  ).toBeVisible();
  await page.route("https://geocoding-api.open-meteo.com/**", (route) =>
    route.fulfill({ status: 503, json: {} }),
  );
  await page.getByRole("combobox").fill("Bandung");
  await page.clock.runFor(450);
  await expect(
    page.getByRole("button", { name: "Coba cari lagi" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Hapus pencarian" }).click();
  await page.evaluate(() =>
    Object.defineProperty(navigator, "geolocation", {
      configurable: true,
      value: {
        getCurrentPosition: (
          _success: unknown,
          error: (value: { code: number }) => void,
        ) => error({ code: 1 }),
      },
    }),
  );
  await page.getByRole("button", { name: "Gunakan lokasiku" }).click();
  await expect(page.getByRole("alert")).toContainText("Izin lokasi ditolak");
  await noPageOverflow(page);
});
for (const [code, day, state] of [
  [0, 1, "clear-day"],
  [0, 0, "clear-night"],
  [3, 0, "cloudy"],
  [95, 1, "storm"],
  [71, 1, "snow"],
  [45, 1, "fog"],
] as const) {
  test(`weather atmosphere ${state}`, async ({ page }) => {
    await mockWeather(page, code, day);
    await page.goto("./");
    await expect(page.locator(`.atmosphere--${state}`)).toHaveCount(1);
    await expect(page.locator(".hero-symbol [role=img]")).toHaveAttribute(
      "aria-label",
      new RegExp(day ? "siang" : "malam"),
    );
  });
}
