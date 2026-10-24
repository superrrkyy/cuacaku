# Phase 2 — Premium UI & Weather Visualization

> Tabel "Validation executed" pada setiap bagian di bawah adalah **arsip pada saat fase itu
> selesai**. Kondisi repo terbaru (jumlah test, ukuran build, hasil audit, tooling) ada di
> bagian **Phase 2.6 — Repository cleanup** pada dokumen ini dan di `README.md`.

## Scope and architecture

React 18, TypeScript, Vite, Tailwind and the existing Open-Meteo API architecture remain in place. No backend, authentication, chart runtime, icon package, remote font, image asset or animation runtime was added. Existing storage keys, eight-city favorite limit, search debounce, request cancellation, error handling, offline recovery, geolocation-on-user-action and ten-minute selected-city refresh are retained.

### UI components

- `WeatherHero.tsx`: city/region, large Celsius temperature, weather description, feels-like, high/low, compact precipitation/humidity/wind/daily UV summary, favorite toggle and location-local update time.
- `WeatherBackground.tsx` + `WeatherIcon.tsx`: shared WMO-derived visual states, SVG weather icons, gradients and lightweight pseudo-element atmosphere. Rain/fog movement is intentionally slow; other states remain static. No flashing storm effect.
- `HourlyForecast.tsx`: keyboard-scrollable and swipeable 24-hour timeline, current-hour state, named icons and probability indicators.
- `DailyForecast.tsx`: seven-day forecast with location-local day names and dates, named icons, conditions, precipitation probability and a shared weekly temperature range bar. The current day is marked by date (text label + `aria-current="date"` + accent), not by list position, and missing min/max/probability fall back to "—" instead of invented values.
- `TemperatureChart.tsx`: one SVG chart component with two modes from the same loaded response — `mode="daily"` (7-day maximum/minimum trend, band, per-day text labels, warmest-day summary) and `mode="hourly"` (24-hour trend, unchanged behaviour). Dynamic scales, no chart library, no extra request.
- `WeatherDetails.tsx` (including `UVIndex`): six compact cards; 2/3/4 columns at mobile/tablet/desktop. UV categories use the existing semantic labels. UV is explicitly the **daily maximum**, not a fabricated current reading.
- `SunCycle.tsx`: sunrise/sunset times, local-time-aware daylight position and progress. Position is omitted for stale dates or unavailable/invalid intervals. A cleaned-up minute timer updates position.
- `FavoriteCities.tsx`: reuse selected weather and fetch missing saved-city previews through `getWeather`. Saved snapshots show their date/time, are bounded to saved cities plus the active city and have no individual polling timer. Select a city to fetch an updated full forecast. Individual removal and confirmed clear-all retain localStorage behavior.
- `Search.tsx`: restyled existing combobox, clear action, active-option scrolling, arrow keys/Enter/Escape, loading/empty/error states, and an explicitly triggered geolocation button with tooltip and disabled/loading states.

### Data extensions

- `weather.ts`: `weatherVisualState` extends the existing `info()` mapping; `temperatureRange` centralizes range positioning. Existing `icon`, `theme`, WMO labels and UV helpers remain compatible.
- `types/weather.ts`, `lib/validation.ts`, `weather.ts`: optional hourly `visibility` requested from the same forecast endpoint, validated and aligned to the current hour; missing/null values are displayed as unavailable rather than zero.
- `lib/dates.ts`: short local dates and sun progress, plus `localDate()`, `addDays()`, `weekdayName()` and `weekdayShort()` for timezone-safe weekly labels. Offset-free Open-Meteo wall times are not interpreted in the browser timezone.

## Validation executed

| Check | Result |
| --- | --- |
| `npm run typecheck` | Passed |
| `npm test` | 225 tests passed in 9 files; original suites retained |
| `npm run build` | Passed |
| `npm run test:browser` with sandbox Chromium | 16 Playwright checks passed |
| Timezone regressions | 61 tests passed in each of UTC, Asia/Jakarta, Asia/Tokyo, Europe/London and America/New_York |
| `git diff --check` | Passed |
| `npm audit --omit=dev` | 0 vulnerabilities |
| Lint | No lint script/config exists in the repository; not claimed as run |

Browser checks use deterministic intercepted Open-Meteo responses, not a runtime demo mode. Inspected widths: **320, 375, 390, 768, 1024, 1280, 1440px**. Full-page screenshots were manually reviewed at 320, 375, 768, 1024 and 1440px. The checks assert no horizontal page overflow, forecast counts, primary 44px touch targets, non-clipped search input, visible focus and zero axe violations for the selected WCAG A/AA rules. Additional scenarios cover keyboard search, persisted favorites, loading/error/retry, geolocation denial, all weather states and actual computed CSS under reduced motion.

Initial browser inspection caught tablet intrinsic-grid overflow and incorrect input padding. Both were fixed and the browser suite rerun successfully. Screenshots are generated under ignored `test-results/`; these are inspection artifacts, **not** committed pixel-diff baselines. Automated axe checks do not replace assistive-technology user testing.

### Reproduce locally

```sh
npm ci
npm run typecheck
npm test
npm run build
npx playwright install --with-deps chromium
npm run test:browser
```

Playwright starts Vite automatically (or reuses port 5173 locally). CI also installs Chromium and runs these browser checks. This restricted sandbox used an external Chromium binary via `CHROMIUM_PATH=/tmp/chromium` and `LD_LIBRARY_PATH=/tmp/al2023/lib`; browser binaries are not committed or shipped to users. Vite accepts `.e2b.app` preview hosts and preserves the `/cuacaku/` GitHub Pages base.

## Accessibility and performance considerations

- Semantic headings, lists, definition lists, named SVG icons, labelled combobox/listbox, explicit rain/UV meanings and visible focus styles.
- Reduced-motion media query removes all animation and transitions while keeping the static atmospheric background.
- No random per-frame work, particle DOM collections, canvas or chart library. SVG and CSS handle the visuals. Only the search dropdown uses backdrop blur.
- Build output: **180.86 kB JS (58.20 kB gzip)** and **29.52 kB CSS (7.09 kB gzip)**. These are measured bundle sizes, not a claim of improved runtime performance. No before/after Lighthouse or field-metric comparison was performed.

## Phase 2.3 — Daily forecast & temperature visualization

### What changed

- `DailyForecast.tsx`: date-derived "Hari ini / Besok" labels, current-day state that survives midnight and stale data, precipitation probability with a genuine unknown state, one shared weekly temperature scale per row (values always visible beside the bar), empty/malformed-data fallbacks and a restrained staggered entrance.
- `TemperatureChart.tsx`: rewritten as a single SVG chart supporting `mode="daily"` (7-day max/min trend) and `mode="hourly"` (existing 24-hour trend). Band scale keeps every point inside the plot area, identical readings get a ±1° window, missing values break the line instead of producing `NaN`, and axis labels are positioned from the same scale as the points.
- `App.tsx`: the 7-day trend panel is rendered after the daily list from the already-loaded weather state; the 24-hour chart keeps its place.
- `weather.ts` / `types/weather.ts`: daily `precipitation_probability_max` stays `null` when Open-Meteo has no value, so the UI shows "—" rather than an invented 0%.
- `index.css`: chart frame (capped width, fluid height, no distortion), daily-row states, range bar end caps, legend and mobile stacking order.

### Validation executed

| Check | Result |
| --- | --- |
| `npm run typecheck` | Passed |
| `npm test` | 317 tests passed in 12 files; every pre-existing suite retained |
| `npm run build` | Passed (187.77 kB JS / 60.76 kB gzip, 31.72 kB CSS / 7.54 kB gzip) |
| `npm run test:browser` | Passed in CI (real Chromium): no page overflow, 7 daily rows, 24 hourly cards, 44px touch targets, zero axe violations for wcag2a/2aa/wcag21aa at **320, 375, 390, 768, 1024, 1280, 1440px**, plus the new 7-day-chart checks and reduced-motion computed styles |
| Timezone regression | Unit coverage for Asia/Jakarta, Asia/Tokyo, Europe/London and America/New_York; CI runs `dates`, `weather`, `visuals`, `DailyForecast` and `TemperatureChart` suites under all five `TZ` values (110 tests each) |
| Lint | No lint script/config exists in the repository; not claimed as run |

The browser suite was extended for this phase: the 7-day chart must render its single `role="img"` SVG, 7 axis labels, a data table with 7 rows and the generated "terhangat pada hari …" summary; the chart frame and its axis cells must stay inside the panel (checked against bounding boxes at 320px and 1440px); the daily list must mark exactly one day with `aria-current="date"`; and reduced motion must report `animationName: none` for `.chart-frame` and `.daily-row`.

The browser suite could not be executed inside this sandbox (no Chromium binary, and browser downloads are network-restricted), so it was verified through the GitHub Actions run on this branch instead.

### Accessibility notes

- The SVG is never the only source of information: a generated summary ("Suhu berkisar 20° hingga 36° selama 7 hari ke depan, terhangat pada hari Senin.") is linked through `aria-describedby`, every plotted value is repeated as text under the axis and in an expandable table.
- Current day is marked by text and `aria-current`, not colour alone; the range bar uses one mint accent (no colour-encoded severity).
- `prefers-reduced-motion` removes the chart and row entrance animations through the existing global rule.

### Branch state note

While this branch was open, a competing Phase 2.3 implementation (`f45020e`, `d335809`, `3ddecb2`, `4f40845`, `fe2ee91`, `d8a9087`) was pushed straight to `main`. It renamed the daily heading to "Prakiraan 7 Hari", reworded the range `aria-label`, made the chart daily by default and rewrote `Forecast.test.tsx` — which removed the UV test and the hourly-chart coverage and left `main` red on `Unit test`. This branch keeps the original strings, keeps every pre-existing test, and adds the 7-day chart as `mode="daily"`; `main` was merged in twice and the conflicting files resolved in favour of this branch, so merging this PR restores green CI. Two small ideas from those commits were kept: ellipsis truncation for long condition labels and `tabular-nums` on the temperature range.

### Remaining limitations

- No screenshot review was performed by a human in this phase (CI only asserts the automated checks; screenshots stay in ignored `test-results/`). A visual pass in a real browser is still recommended.
- The 7-day chart plots daily min/max only; a combined hourly + daily view would need a deliberate UX decision (deferred, not part of this phase).

## Phase 2.6 — Repository cleanup (Oktober 2026)

Audit repo menemukan beberapa fitur yang sudah di-merge tetapi belum benar-benar tersambung,
dokumentasi yang basi, dan toolchain yang menyisakan advisory. Fase ini membersihkannya tanpa
mengubah arsitektur data.

### Yang diperbaiki

- **`WeatherBackground` kini menerima timezone lokasi.** `App.tsx` sebelumnya hanya meneruskan
  `code`/`isDay`, sehingga `getDayPart()` (Phase 2.5) tidak pernah berjalan di produksi.
  Sekarang `timezone={data?.timezone}` diteruskan, fase hari dihitung per menit dari timezone
  lokasi, dan fallback `isDay` tetap dipakai sebelum data tersedia.
- **CSS untuk fase hari akhirnya ada.** `.atmosphere--dawn|day|dusk|night` sebelumnya tidak
  memiliki aturan apa pun (kelas mati). Ditambahkan sebagai penyesuaian halus **di atas** state
  cuaca — state cuaca tetap menentukan identitas latar — plus `.atmosphere-orb` dan
  `.atmosphere-horizon` yang sebelumnya dirender tanpa styling sama sekali. Keduanya
  disembunyikan pada `prefers-reduced-motion`.
- **Jam lokal (Phase 2.4) dirapikan.** `.hero-footer`, `.local-clock`, `.local-clock-time`,
  `.local-clock-meta`, `.local-clock-dot` kini punya CSS sendiri (sebelumnya hanya bergantung
  pada utility Tailwind). `aria-label` pada `<div>` tanpa role diganti teks `sr-only`
  (pembaca layar dapat kalimat konteks, angka tetap `aria-hidden` agar tidak ganda),
  `<time datetime>` kini membawa tanggal + jam yang valid, dan `Intl.DateTimeFormat` di-cache
  per locale/timezone (sebelumnya dua formatter dibuat setiap detik).
- **Bug format jam `id-ID`.** CLDR memformat `id-ID` sebagai `20.00.00` (titik). Jam hero
  dirakit dari `formatToParts` sehingga selalu `hh:mm:ss` di lingkungan/versi ICU mana pun;
  ada test yang menguncinya.
- **Tailwind CSS 3 dilepas.** Hanya ±10 utility yang dipakai, sementara seluruh tampilan berasal
  dari 1.700+ baris CSS manual. Utility itu diganti kelas semantik (`.search-option`,
  `.search-message`, `.text-button--link`), `.sr-only` ditulis sendiri, dan **reset dasar
  pengganti preflight** ditambahkan eksplisit (`box-sizing`, margin heading, `list-style` untuk
  `ul/ol`, `display: block` untuk `svg/img`, `font: inherit` untuk form control, placeholder)
  agar tampilan tidak berubah. `tailwind.config.js`, `postcss.config.js`, `tailwindcss`,
  `postcss`, dan `autoprefixer` dihapus. Hasil: `npm audit` **0 vulnerability** (sebelumnya
  3 moderate dari rantai `postcss-selector-parser`) dan CSS build turun dari 32,68 kB ke
  24,58 kB.
- **`placeKey` dipindah** dari `components/FavoriteCities.tsx` ke `lib/place.ts` agar satu file
  komponen tidak mengekspor fungsi (fast refresh) dan `App` tidak mengimpor dari komponen.
- **Lint tersedia.** ESLint 10 flat config (`@eslint/js`, `typescript-eslint`,
  `eslint-plugin-react-hooks`, `eslint-plugin-react-refresh`, `eslint-config-prettier`) plus
  Prettier. `npm run lint` bersih 0 error/0 warning. Rule compiler React dari
  `eslint-plugin-react-hooks` v7 (`set-state-in-effect`, `purity`, `immutability`, …) **sengaja
  tidak diaktifkan**: rule itu menandai pola "sinkronkan state saat mount/loading" di
  `useWeather`, `useLocalClock`, `Search`, dan `FavoriteCities`, dan memenuhinya berarti refactor
  besar yang berisiko regresi — dicatat sebagai pekerjaan terpisah.
- **Typecheck mencakup config & E2E.** `tsconfig.json` dipecah menjadi `tsconfig.base.json` +
  `tsconfig.app.json` (`src/`) + `tsconfig.e2e.json` (`tests/`, `dev/`, `playwright.config.ts`,
  `vite.config.ts`, `vite.mock.config.ts`, `vitest.config.ts`, `eslint.config.js`). Sebelumnya
  hanya `src/` yang diperiksa.
- **Mode pengembangan offline.** `npm run dev:mock` menyajikan payload Open-Meteo/Nominatim
  tiruan dari server Vite yang sama (`dev/openMeteoMock.ts`), dengan skenario
  `clear|cloud|rain|storm|snow|fog|night|partial` melalui `sessionStorage["cuacaku:mock"]`.
  Payload dibuat relatif terhadap jam Jakarta sekarang sehingga lolos validasi fail-closed.
  Cabang ini dijaga `import.meta.env.DEV` dan tereliminasi dari build produksi
  (fungsi `endpoint()` ter-minify menjadi `return live`).
- **Regresi yang ditangkap browser checks.** Reset pengganti preflight semula meniru Tailwind
  dengan `svg { display: block }` secara global. Run CI pertama pada branch ini **gagal** di
  langkah browser checks: ikon tetes hujan di `.rain-chance` (HourlyForecast/DailyForecast)
  turun ke baris sendiri sehingga tinggi kartu berubah. Aturan itu dipersempit menjadi
  `max-width: 100%` saja — SVG level blok (`.weather-icon`, `.sun-arc`, `.temperature-chart`)
  sudah mengatur `display` sendiri, dan SVG di `.locate-button` diblockify oleh flex. Run
  berikutnya hijau penuh. Ini alasan `test:browser` tidak boleh dilewati meski unit test lulus.
- **CI/CD**: `ci.yml` menambah langkah `npm run lint` dan `npm audit --omit=dev
  --audit-level=moderate`, serta memperluas regresi timezone ke suite `daylight`, `localClock`,
  `LocalClock`, dan `WeatherBackground`. `deploy.yml` memakai `npm ci` + cache npm (sebelumnya
  `npm install`, yang bisa menyimpang dari lockfile). Ditambah satu langkah diagnostik: bila
  browser checks gagal, 180 baris terakhir output-nya diposting ke PR lewat `api.github.com`
  karena log job Actions tersimpan di host blob yang tidak selalu dapat diakses dari sandbox.
- **Dokumentasi**: README ditulis ulang agar sesuai kondisi repo (Tailwind dilepas, lint/format,
  jumlah test, dev:mock, audit bersih), `CONTRIBUTING.md` dibersihkan dari sisa template proyek
  lain (`pip install -r requirements.txt`, contoh commit "CryptoKu"/"API key YouTube",
  "TypeScript/Python"), `SECURITY.md` tidak lagi menyebut layanan yang tidak dipakai proyek.

### Test baru

| Suite | Cakupan |
| --- | --- |
| `src/__tests__/LocalClock.test.tsx` (5) | Jam hero: timezone lokasi (bukan perangkat), `datetime` valid, fallback tanpa/invalid timezone, tick 1 detik + interval dibersihkan saat unmount, tidak ada interval untuk instant yang dipatok |
| `src/__tests__/WeatherBackground.test.tsx` (9) | Fase hari dari timezone lokasi (fajar/siang/senja/malam), evaluasi ulang per menit + pembersihan interval, fallback `isDay` tanpa timezone, timezone invalid → malam, tepat satu orb/horizon dekoratif |
| `src/__tests__/localClock.test.ts` (+2) | Format `hh:mm:ss` untuk locale dengan pemisah titik, `localClockDateTime` untuk `<time>` |
| `src/__tests__/App.test.tsx` (+1) | App benar-benar meneruskan `data.timezone` ke latar (`.atmosphere--dawn`) dan jam lokal tampil di `.hero-footer` |

### Validasi dijalankan (lokal, Node 22 / ICU 78.2)

| Pemeriksaan | Hasil |
| --- | --- |
| `npm run lint` | 0 error, 0 warning |
| `npm run typecheck` (app + e2e) | Lulus |
| `npm test` | **345 test lulus di 16 file** (sebelumnya 328/14) |
| `npm run build` | Lulus — **191,29 kB JS (61,81 kB gzip)**, **24,58 kB CSS (6,27 kB gzip)** |
| `npm audit` | **0 vulnerability** |
| `npm audit --omit=dev` | **0 vulnerability** |
| `npm run dev:mock` | Payload mock lolos validasi `getWeather()` (current ∈ hourly, sisa ≥ 24 jam, `daily[0]` = tanggal current) |
| `npm run test:browser` | ✅ **lulus di CI (Chromium nyata)** pada PR #23 — run `40091546308`, seluruh 12 langkah `success`: tanpa overflow halaman, 7 baris harian, 24 kartu per jam, target sentuh 44 px, fokus terlihat, **0 axe violation** (wcag2a/2aa/21aa) pada 320/375/390/768/1024/1280/1440 px, grafik 7 hari, reduced motion. Tidak dapat dijalankan di sandbox (tanpa binary Chromium, unduhan browser diblokir) |

Regresi timezone dijalankan ulang secara lokal untuk 9 suite (`dates`, `weather`, `visuals`,
`daylight`, `localClock`, `LocalClock`, `WeatherBackground`, `DailyForecast`,
`TemperatureChart`): **137 test lulus pada masing-masing dari 5 zona** (`UTC`, `Asia/Jakarta`,
`Asia/Tokyo`, `Europe/London`, `America/New_York`). Daftar suite yang sama dipakai langkah CI.
Test jam/fase hari baru memakai instant yang dipatok + timezone eksplisit, jadi hasilnya tidak
bergantung pada `TZ` runner.

### Yang masih perlu ditinjau manusia

- Browser checks **sudah** lulus di Chromium nyata, tetapi yang mereka assert adalah metrik
  (overflow, jumlah baris/kartu, target sentuh, fokus, axe) — bukan kesan visual. Nuansa
  `.atmosphere--dawn/dusk/night` dan proporsi `.hero-footer` + jam lokal tetap perlu dilihat
  mata manusia; `npm run dev:mock` disediakan untuk itu (tanpa jaringan).
- Playwright belum punya assertion khusus untuk jam lokal/fase hari (mis. jam hero tampil dan
  mengikuti timezone lokasi). Unit test menutup logikanya; menambahkan cek DOM di browser suite
  adalah langkah lanjut yang murah.
- Screenshot Playwright tetap artefak di `test-results/` yang di-ignore, bukan baseline pixel-diff.

## Remaining limitations / Phase 3

- Live Open-Meteo requests were not validated from this network-restricted sandbox; unit and browser checks mock API responses (`npm run dev:mock` menyediakan mock yang sama untuk pengembangan). Real-browser live data, Safari/Firefox and real screen-reader/device testing remain recommended.
- ~~Full `npm audit` reports 7 development-toolchain advisories~~ → **selesai di Phase 2.6**: Tailwind 3 dilepas, `npm audit` sekarang 0 vulnerability (dev maupun runtime) dan dijaga langkah CI `npm audit --omit=dev --audit-level=moderate`.
- Favorite previews are timestamped session snapshots, not independently auto-refreshed forecasts.
- Polar edge case: saat Open-Meteo tidak mengembalikan sunrise/sunset (lintang ekstrem), seluruh payload tetap ditolak (`INVALID_RESPONSE`). Representasi "tidak tersedia" untuk kasus ini belum dibuat.
- Rule compiler `eslint-plugin-react-hooks` v7 belum diaktifkan (lihat Phase 2.6); mengaktifkannya berarti refactor `useWeather`/`useLocalClock`/`Search`/`FavoriteCities`.
- Recommended Phase 3: measured Lighthouse/Web Vitals budgets, cross-browser and screen-reader checks, reviewed pixel-diff baselines, perluasan browser checks untuk jam lokal & fase hari, dan deliberate cache/stale-data UX. Consider PWA/offline snapshots only with clear freshness labels and user consent for any new notification feature.
