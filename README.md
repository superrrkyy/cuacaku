<div align="center">

<img src="./public/README/weather-cycle.svg" width="180" alt="Animasi siklus matahari dan bulan" />

<img
  src="https://readme-typing-svg.demolab.com?font=Fira+Code&weight=700&size=26&duration=3000&pause=800&color=FDE047&center=true&vCenter=true&width=340&lines=%E2%9B%85+CuacaKu;Cuaca+Real-time;Prakiraan+7+Hari"
  alt="CuacaKu"
/>

**Aplikasi cuaca real-time berbahasa Indonesia** — cek cuaca sekarang, per jam, dan 7 hari ke depan untuk kota mana pun di dunia.

<a href="https://superrrkyy.github.io/cuacaku/">
<img src="https://img.shields.io/badge/🌦️_Buka_Aplikasi-7c3aed?style=for-the-badge" alt="Demo" />
</a>

<img src="https://img.shields.io/badge/React_18-20232A?style=flat-square&logo=react&logoColor=61DAFB" />
<img src="https://img.shields.io/badge/TypeScript-3178C6?style=flat-square&logo=typescript&logoColor=white" />
<img src="https://img.shields.io/badge/Vite_6-646CFF?style=flat-square&logo=vite&logoColor=white" />
<img src="https://img.shields.io/badge/Vitest_5-6E9F18?style=flat-square&logo=vitest&logoColor=white" />
<img src="https://img.shields.io/badge/ESLint_10-4B32C3?style=flat-square&logo=eslint&logoColor=white" />
<img src="https://img.shields.io/badge/License-MIT-22d3ee?style=flat-square" />

</div>

---

## ✨ Fitur

- 🌡️ **Cuaca sekarang** — suhu, terasa seperti, kondisi, min/maks, visibilitas
- 🕐 **Prakiraan 24 jam** dengan peluang hujan
- 📅 **Prakiraan 7 hari** + grafik rentang suhu dan tren suhu 7 hari
- 💧 **Detail lengkap** — kelembapan, angin, UV maksimum, tekanan, matahari terbit & terbenam
- 🕰️ **Jam lokal lokasi** — memakai timezone kota yang dipilih, bukan timezone perangkat
- 🌗 **Latar adaptif** — state cuaca (cerah/berawan/hujan/badai/salju/kabut) **dan** fase hari lokasi (fajar/siang/senja/malam)
- 🔍 **Cari kota** di seluruh dunia (otomatis saat mengetik, navigasi keyboard penuh)
- 📍 **Lokasi otomatis** pakai GPS (hanya atas aksi pengguna)
- ⭐ **Kota favorit** (maks. 8) tersimpan di perangkat
- 🔄 **Auto-refresh** setiap 10 menit, tanpa request bertumpuk
- ♿ **Aksesibel** — landmark semantik, label ARIA, fokus terlihat, menghormati `prefers-reduced-motion`
- 📱 Didesain untuk HP (diuji 320–1440 px)

## 🛠️ Teknologi

| Bagian | Teknologi |
|---|---|
| UI | React 18 + TypeScript (`strict`) |
| Styling | CSS tulisan sendiri di `src/index.css` — tanpa framework CSS |
| Build | Vite 6 |
| Data | [Open-Meteo](https://open-meteo.com) (gratis, tanpa API key) |
| Test | Vitest 5 (unit + interaksi React) · Playwright + axe-core (browser) |
| Kualitas | ESLint 10 (`typescript-eslint`, `react-hooks`) · Prettier |
| Deploy | GitHub Actions → Pages |

> **Catatan:** Tailwind CSS 3 dipakai sampai Oktober 2026 dan sudah dilepas. Hanya ±10
> utility yang benar-benar dipakai, sementara seluruh tampilan berasal dari CSS manual;
> rantai dependensi Tailwind juga satu-satunya sumber advisory `npm audit`. Reset dasar
> (yang sebelumnya datang dari Tailwind *preflight*) sekarang ditulis eksplisit di
> `src/index.css`, dan `.sr-only` dipertahankan sebagai satu-satunya utility.

## 📂 Struktur

```
cuacaku/
├── .github/workflows/       # ci.yml (lint→typecheck→test→build→browser), deploy.yml (Pages)
├── dev/openMeteoMock.ts     # payload Open-Meteo tiruan untuk `npm run dev:mock`
├── public/                  # favicon, og-image, aset gambar README
├── src/
│   ├── components/          # hero, latar, ikon, per jam, 7 hari, grafik, detail, matahari,
│   │                        # favorit, pencarian, jam lokal
│   ├── hooks/               # useWeather, useOnline, useLocalClock
│   ├── lib/                 # api, validation, dates, daylight, geolocation, localClock,
│   │                        # place, storage
│   ├── types/weather.ts     # model internal (diekspor ulang dari weather.ts)
│   ├── __tests__/           # 16 file test (unit + interaksi React)
│   ├── App.tsx · weather.ts · main.tsx · index.css
├── tests/dashboard.spec.ts  # 19 test Playwright (responsif 320–1440 px, axe, interaksi, jam lokal)
├── eslint.config.js · .prettierrc.json
├── tsconfig.base.json · tsconfig.app.json · tsconfig.e2e.json
├── vite.config.ts · vite.mock.config.ts · vitest.config.ts · playwright.config.ts
└── index.html · package.json
```

## 🚀 Jalankan Lokal

```bash
npm ci
npm run dev          # http://localhost:5173/cuacaku/ — data Open-Meteo sungguhan
```

Tanpa jaringan (atau untuk meninjau tampilan tanpa menyentuh API publik):

```bash
npm run dev:mock     # payload tiruan dari server Vite yang sama
```

Mode mock menyetel `sessionStorage["cuacaku:mock"]` di tab itu. Ganti skenario cuaca dari
konsol browser, lalu muat ulang:

```js
CUACAKU_MOCK_SCENARIO("storm");   // clear | cloud | rain | storm | snow | fog | night | partial
```

`partial` menghasilkan sebagian nilai `null` (UV / peluang hujan) untuk melihat keadaan "—".
Jalur mock hanya aktif pada `import.meta.env.DEV`, sehingga build produksi tetap memanggil
Open-Meteo sungguhan.

## 🧪 Pemeriksaan Kualitas

```bash
npm ci
npm run lint          # ESLint (0 error, 0 warning)
npm run typecheck     # tsc: src/ (app) + tests/, config, dev/ (e2e)
npm test              # Vitest
npm run build         # typecheck + vite build
npm run test:browser  # Playwright (butuh Chromium)
npm audit             # 0 vulnerability (dev maupun runtime)
```

Format kode disediakan Prettier tetapi **tidak** dipaksakan pada file lama:

```bash
npm run format        # tulis format
npm run format:check  # periksa saja
```

Chromium untuk browser checks:

```bash
npx playwright install --with-deps chromium
npm run test:browser
```

Uji timezone perangkat (juga dijalankan CI pada 5 zona):

```bash
for zone in UTC Asia/Jakarta Asia/Tokyo Europe/London America/New_York; do
  TZ="$zone" npx vitest run \
    src/__tests__/dates.test.ts src/__tests__/weather.test.ts src/__tests__/visuals.test.ts \
    src/__tests__/daylight.test.ts src/__tests__/localClock.test.ts src/__tests__/LocalClock.test.tsx \
    src/__tests__/WeatherBackground.test.tsx src/__tests__/DailyForecast.test.tsx \
    src/__tests__/TemperatureChart.test.tsx || exit 1
done
```

## 🛡️ Phase 1 — Hardening

### Layanan & error handling

- Tetap frontend-only: **Open-Meteo forecast dan geocoding**, tanpa API key/backend.
  Nama kota untuk GPS tetap memakai **Nominatim** secara opsional; jika gagal,
  koordinat tetap dipakai dengan label “Lokasiku”. Penyedia eksternal dapat mengalami
  rate limit, downtime, atau perubahan schema; status HTTP 200 bukan jaminan data valid.
- Semua fetch melalui `lib/api.ts`: timeout default **10 detik**, mencakup response body,
  `AbortSignal`, serta `ApiError.code` (`NETWORK_ERROR`, `TIMEOUT`, `HTTP_ERROR`,
  `INVALID_RESPONSE`, `INVALID_COORDINATES`, `NOT_FOUND`, `ABORTED`). HTTP error menyimpan
  status untuk kode pemanggil; UI hanya menampilkan pesan aman, bukan body/detail server.
  `NOT_FOUND` tersedia untuk pemanggil; pencarian valid tanpa hasil tetap mengembalikan `[]`.
- Type guard memeriksa timezone, current/hourly/daily, array wajib dan panjangnya,
  angka finite/range, kode WMO, tanggal kalender, dan koordinat. Forecast harus memuat
  jam current beserta 24 entri ke depan serta daily pertama pada tanggal current.
  Array kosong/tidak konsisten ditolak. Nilai yang hilang atau bertipe lain selalu ditolak.
  Untuk kompatibilitas model existing, `null` pada `uv_index_max` (harian) dan peluang hujan
  per jam dipetakan ke `0`; sebaliknya `precipitation_probability_max` harian dibiarkan `null`
  agar UI menampilkan "—", bukan 0% karangan.
- `getWeather(lat, lon, { signal, timeoutMs })` dan
  `searchPlaces(query, { signal, timeoutMs })` tetap kompatibel dengan pemanggilan lama.
  Query ditrim, minimal 2 karakter, diencode dengan `URLSearchParams`, debounce **400 ms**.
  Query/kota lama dibatalkan; hasil maupun error yang terlambat tidak boleh memperbarui UI.
- Lifecycle cuaca: idle → loading → success/error. Data lama disembunyikan saat refresh
  atau pindah kota, sehingga tidak diklaim sebagai data terbaru saat gagal. Tersedia retry,
  status loading untuk screen reader, dan tombol refresh yang disabled selama request.
  Search mendukung ↑/↓, Enter, Escape, Tab, serta pemilihan pointer.
- Auto-refresh tetap **10 menit**, tanpa overlap request. `navigator.onLine` hanya indikator:
  saat offline request cuaca/search dilewati, saat reconnect satu refresh lokasi aktif
  dilakukan (bukan loop retry). Kegagalan API tetap ditangani walaupun browser online.
- GPS menangani unsupported browser, permission denied, position unavailable, timeout,
  dan koordinat invalid. Timeout GPS 10 detik, lookup nama 5 detik. API browser GPS tidak
  menyediakan abort native; callback terlambat diabaikan setelah pembatalan/unmount.

### Timezone

`timezone=auto` Open-Meteo adalah sumber waktu lokasi. Timestamp tanpa offset dari API
adalah **wall time lokasi**, bukan instant di timezone browser. Formatter menjaga bagian
jam/tanggal tersebut; perhitungan hari memakai UTC sebagai pembawa kalender saja, bukan
mengonversi lokasi ke UTC. Jika input mengandung `Z`/offset, formatter memakai
`Intl.DateTimeFormat` dengan timezone eksplisit. UI selalu meneruskan `weather.timezone`,
termasuk current, hourly, daily, sunrise, sunset, jam lokal hero, dan fase hari pada latar.
Test mencakup Jakarta, Tokyo, London, New York, pergantian tanggal, dan tanggal transisi DST.

### Penyimpanan & privasi

`cuacaku_place` (lokasi terakhir) dan `cuacaku_favs` (maksimal 8 favorit) tetap disimpan
lokal di perangkat, berisi nama/koordinat lokasi sesuai fitur existing. JSON dan struktur
Place divalidasi saat dibaca. Value rusak dihapus sebisa mungkin lalu kembali ke Jakarta/
array kosong. Jika storage diblokir, quota habis, atau akses melempar exception, aplikasi
melanjutkan dengan state in-memory dan memberi pemberitahuan saat gagal menyimpan.
Tidak ada token, password, atau data sensitif tambahan yang disimpan. Pencarian/koordinat
hanya dikirim ke layanan terkait untuk permintaan yang diperlukan; tidak ada telemetry baru.
External text dirender melalui escaping React; tidak menggunakan `dangerouslySetInnerHTML`.

### Testing & quality gates

Vitest dipakai untuk unit dan interaksi React; `jsdom` 26 hanya dev dependency, dan
komponen test mengaktifkannya per file lewat `// @vitest-environment jsdom`. Playwright +
`@axe-core/playwright` menjalankan pemeriksaan responsif/aksesibilitas/interaksi di CI.
Semua API/GPS pada test dimock; test tidak membuktikan availability layanan live.
Lint kini tersedia: `npm run lint` (ESLint flat config) dan `npm run format` (Prettier).

### Batasan & tindak lanjut keamanan

`npm audit` **bersih (0 vulnerability)** baik penuh maupun `--omit=dev` sejak Tailwind 3
dilepas (sebelumnya 7 temuan dev-only, lalu 3 moderate, semuanya dari rantai
`postcss-selector-parser` → `tailwindcss`). `npm audit --omit=dev --audit-level=moderate`
dijalankan sebagai langkah CI, jadi regresi dependensi runtime akan menggagalkan build.

Schema sengaja fail-closed: payload forecast parsial (termasuk sunrise/sunset tidak tersedia
pada kondisi polar) ditampilkan sebagai error yang dapat di-retry, bukan angka/jam palsu.
Dukungan tampilan data parsial untuk UV/probabilitas hujan sudah tersedia sebagai "—"
(`daily.rain`, `daily.uv`), tetapi kasus polar (sunrise/sunset tidak ada) tetap ditolak
sepenuhnya — kandidat perbaikan berikutnya. Uji browser nyata untuk GPS, screen reader, dan
kontrak API live masih diperlukan di lingkungan yang mengizinkan akses penyedia tersebut.

---

## Phase 2 — Premium weather experience

Dashboard memakai hero cuaca, atmosfer adaptif, timeline 24 jam, prakiraan 7 hari dengan
rentang suhu, grafik SVG (mode `hourly` dan `daily`), detail cuaca, indeks UV, siklus
matahari, dan jam lokal — semuanya berbasis timezone lokasi. Pencarian keyboard, geolokasi,
favorit lokal, error handling, dan refresh Phase 1 tetap tersedia.

Lihat [catatan implementasi dan validasi Phase 2](PHASE2.md) untuk struktur komponen,
batasan data, hasil pemeriksaan, dan langkah menjalankan browser checks.

---

<div align="center">

Dibuat dengan 💜 oleh [**AXRYZURE**](https://github.com/superrrkyy) • 🇮🇩

⭐ Beri bintang jika bermanfaat!

</div>
