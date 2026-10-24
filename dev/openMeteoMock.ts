import type { Plugin } from "vite";

/**
 * Mock Open-Meteo/Nominatim untuk pengembangan offline (`npm run dev:mock`).
 *
 * Payload dibuat relatif terhadap waktu **sekarang di Asia/Jakarta** sehingga
 * lolos dari validasi fail-closed di `lib/validation.ts` dan `getWeather()`
 * (jam current harus ada di hourly, sisa ≥ 24 jam, daily[0] = tanggal current).
 *
 * Skenario: `localStorage.setItem("cuacaku:mock", "storm")` lalu muat ulang.
 * Nilai yang didukung: clear · cloud · rain (default) · storm · snow · fog ·
 * night · partial (sebagian nilai null, untuk menguji keadaan "—").
 */

type Scenario = "clear" | "cloud" | "rain" | "storm" | "snow" | "fog" | "night" | "partial";

const CODES: Record<Exclude<Scenario, "night" | "partial">, number[]> = {
  clear: [0, 1, 0, 1],
  cloud: [3, 2, 3, 2],
  rain: [61, 63, 80, 51],
  storm: [95, 96, 82, 95],
  snow: [71, 73, 85, 75],
  fog: [45, 48, 45, 48],
};

const pad = (value: number) => String(value).padStart(2, "0");

/** Waktu "wall time" Jakarta tanpa offset, persis seperti balasan Open-Meteo. */
function jakartaParts(date = new Date()) {
  const shifted = new Date(date.getTime() + 7 * 3_600_000);
  return {
    year: shifted.getUTCFullYear(),
    month: shifted.getUTCMonth() + 1,
    day: shifted.getUTCDate(),
    hour: shifted.getUTCHours(),
    minute: shifted.getUTCMinutes(),
  };
}

const dateOf = (parts: ReturnType<typeof jakartaParts>) =>
  `${parts.year}-${pad(parts.month)}-${pad(parts.day)}`;

function shiftDays(parts: ReturnType<typeof jakartaParts>, days: number) {
  const base = Date.UTC(parts.year, parts.month - 1, parts.day) + days * 86_400_000;
  const date = new Date(base);
  return `${date.getUTCFullYear()}-${pad(date.getUTCMonth() + 1)}-${pad(date.getUTCDate())}`;
}

function forecastPayload(scenario: Scenario) {
  const now = jakartaParts();
  const today = dateOf(now);
  const base: Exclude<Scenario, "night" | "partial"> =
    scenario === "night" ? "clear" : scenario === "partial" ? "cloud" : scenario;
  const codes = CODES[base];
  const night = scenario === "night";
  const partial = scenario === "partial";

  // 48 jam mulai 00:00 hari ini di Jakarta.
  const hours = Array.from({ length: 48 }, (_, index) => ({
    time: `${today}T${pad(index % 24)}:00`.replace(
      `${today}T`,
      index < 24 ? `${today}T` : `${shiftDays(now, 1)}T`,
    ),
    isDay: night ? 0 : index % 24 >= 6 && index % 24 < 18 ? 1 : 0,
  }));

  const dates = Array.from({ length: 7 }, (_, index) => shiftDays(now, index));
  const dailyCode = [codes[0], 3, 0, 2, codes[1], 95, 3];

  return {
    latitude: -6.2146,
    longitude: 106.8451,
    generationtime_ms: 0.4,
    timezone: "Asia/Jakarta",
    timezone_abbreviation: "WIB",
    utc_offset_seconds: 25200,
    current: {
      time: `${today}T${pad(now.hour)}:${pad(now.minute)}`,
      interval: 900,
      temperature_2m: 31.4,
      apparent_temperature: 35.2,
      relative_humidity_2m: 74,
      wind_speed_10m: 12.6,
      wind_direction_10m: 96,
      surface_pressure: 1009.2,
      weather_code: codes[0],
      is_day: night ? 0 : now.hour >= 6 && now.hour < 18 ? 1 : 0,
      precipitation: 0.4,
    },
    hourly: {
      time: hours.map((entry) => entry.time),
      temperature_2m: hours.map(
        (entry) => Math.round((27 + Math.sin(((entry.isDay ? 1 : -1) * Number(entry.time.slice(11, 13))) / 3.8) * 4) * 10) / 10,
      ),
      weather_code: hours.map((_, index) => codes[index % codes.length]),
      precipitation_probability: hours.map((_, index) =>
        partial && index % 7 === 3 ? null : [70, 60, 45, 25, 15, 10, 20, 40][index % 8],
      ),
      is_day: hours.map((entry) => entry.isDay),
      visibility: hours.map(() => (base === "fog" ? 900 : 24140)),
    },
    daily: {
      time: dates,
      weather_code: dailyCode,
      temperature_2m_max: [33.1, 32.4, 34.2, 33, 31.2, 30.1, 32.2],
      temperature_2m_min: [25.2, 24.1, 25.4, 26, 24.3, 23.2, 24.4],
      precipitation_probability_max: partial
        ? [80, null, 10, 20, 70, 90, null]
        : [80, 40, 10, 20, 70, 90, 40],
      sunrise: dates.map((date) => `${date}T05:32`),
      sunset: dates.map((date) => `${date}T17:48`),
      uv_index_max: partial ? [7.5, null, 8, 7, 5, 4, 6] : [7.5, 6, 8, 7, 5, 4, 6],
    },
  };
}

const PLACES = [
  { id: 1642911, name: "Jakarta", admin1: "DKI Jakarta", country: "Indonesia", latitude: -6.2146, longitude: 106.8451 },
  { id: 1650357, name: "Bandung", admin1: "Jawa Barat", country: "Indonesia", latitude: -6.9147, longitude: 107.6098 },
  { id: 1645528, name: "Yogyakarta", admin1: "Daerah Istimewa Yogyakarta", country: "Indonesia", latitude: -7.8014, longitude: 110.3644 },
  { id: 1214800, name: "Banda Aceh", admin1: "Aceh", country: "Indonesia", latitude: 5.5577, longitude: 95.3222 },
  { id: 1819729, name: "City of London", admin1: "England", country: "United Kingdom", latitude: 51.5128, longitude: -0.0911 },
  { id: 1850147, name: "Tokyo", admin1: "Tokyo", country: "Japan", latitude: 35.6895, longitude: 139.6917 },
];

function send(response: { statusCode: number; setHeader: (k: string, v: string) => void; end: (body: string) => void }, body: unknown, status = 200) {
  response.statusCode = status;
  response.setHeader("Content-Type", "application/json; charset=utf-8");
  response.setHeader("Cache-Control", "no-store");
  response.end(JSON.stringify(body));
}

/** Skrip kecil yang menyalakan mode mock di tab browser sebelum aplikasi dimuat. */
const ENABLE_MOCK = `try { sessionStorage.setItem("cuacaku:mock", "1"); } catch {}
try { window.CUACAKU_MOCK_SCENARIO = (name) => sessionStorage.setItem("cuacaku:mock", name); } catch {}
`;

export function openMeteoMock(): Plugin {
  // `base` (mis. "/cuacaku/") harus ikut ditempelkan pada URL skrip mock.
  let base = "/";
  return {
    name: "cuacaku:open-meteo-mock",
    config(config) {
      base = config.base ?? "/";
    },
    transformIndexHtml(html) {
      const marker = /<script type="module" src="[^"]*\/src\/main\.tsx"><\/script>/;
      if (!marker.test(html)) return html;
      return html.replace(
        marker,
        (entry) => `<script type="module" src="${base}@cuacaku-mock.js"></script>\n    ${entry}`,
      );
    },
    configureServer(server) {
      server.middlewares.use((request, response, next) => {
        // Middleware plugin berjalan sebelum Vite menghapus prefiks `base`,
        // jadi cocokkan keduanya: "/@cuacaku-mock.js" dan "/cuacaku/@cuacaku-mock.js".
        const path = (request.url ?? "").split("?")[0];
        if (path === "/@cuacaku-mock.js" || path === `${base}@cuacaku-mock.js`) {
          response.statusCode = 200;
          response.setHeader("Content-Type", "application/javascript; charset=utf-8");
          response.setHeader("Cache-Control", "no-store");
          response.end(ENABLE_MOCK);
          return;
        }
        const url = new URL(request.url ?? "/", "http://localhost");
        const scenario = (url.searchParams.get("scenario") as Scenario) || "rain";

        if (url.hostname.endsWith("api.open-meteo.com") || url.pathname.startsWith("/mock/forecast")) {
          send(response, forecastPayload(scenario));
          return;
        }
        if (url.hostname.startsWith("geocoding-api") || url.pathname.startsWith("/mock/geocoding")) {
          const query = (url.searchParams.get("name") ?? "").trim().toLowerCase();
          const results = query
            ? PLACES.filter((place) => place.name.toLowerCase().includes(query))
            : PLACES.slice(0, 6);
          send(response, results.length ? { results, generationtime_ms: 0.2 } : { generationtime_ms: 0.2 });
          return;
        }
        if (url.hostname.startsWith("nominatim") || url.pathname.startsWith("/mock/reverse")) {
          send(response, { address: { city: "Jakarta", state: "DKI Jakarta", country: "Indonesia" } });
          return;
        }
        next();
      });
    },
  };
}

export default openMeteoMock;
