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
<img src="https://img.shields.io/badge/Tailwind-06B6D4?style=flat-square&logo=tailwindcss&logoColor=white" />
<img src="https://img.shields.io/badge/Vite_6-646CFF?style=flat-square&logo=vite&logoColor=white" />
<img src="https://img.shields.io/badge/License-MIT-22d3ee?style=flat-square" />

</div>

---

## ✨ Fitur

- 🌡️ **Cuaca sekarang** — suhu, terasa seperti, kondisi, min/maks
- 🕐 **Prakiraan 24 jam** dengan peluang hujan
- 📅 **Prakiraan 7 hari** + grafik rentang suhu
- 💧 **Detail lengkap** — kelembapan, angin, UV, tekanan, matahari terbit & terbenam
- 🔍 **Cari kota** di seluruh dunia (otomatis saat mengetik)
- 📍 **Lokasi otomatis** pakai GPS
- ⭐ **Kota favorit** tersimpan di perangkat
- 🎨 **Latar dinamis** sesuai cuaca & siang/malam, plus efek hujan 🌧️ dan bintang ✨
- 🔄 **Auto-refresh** setiap 10 menit
- 📱 Didesain untuk HP

## 🛠️ Teknologi

| Bagian | Teknologi |
|---|---|
| UI | React 18 + TypeScript |
| Styling | Tailwind CSS 3 |
| Build | Vite 6 |
| Data | [Open-Meteo](https://open-meteo.com) (gratis, tanpa API key) |
| Deploy | GitHub Actions → Pages |

## 📂 Struktur

```
cuacaku/
├── .github/workflows/deploy.yml
├── public/favicon.svg
├── src/
│   ├── components/Search.tsx
│   ├── hooks/           # konektivitas dan lifecycle request cuaca
│   ├── lib/             # HTTP, validasi, tanggal, storage, geolocation
│   ├── types/weather.ts # model internal (juga diekspor dari weather.ts)
│   ├── __tests__/       # unit & interaksi React
│   ├── App.tsx
│   ├── weather.ts
│   ├── main.tsx
│   └── index.css
├── index.html
├── package.json
├── vite.config.ts
├── tailwind.config.js
├── postcss.config.js
└── tsconfig.json
```

## 🚀 Jalankan Lokal

```bash
npm install
npm run dev
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
  Array kosong/tidak konsisten ditolak. Untuk kompatibilitas model existing, nilai `null`
  pada probabilitas hujan/UV tetap dipetakan ke `0`; nilai yang hilang atau tipe lain ditolak.
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
termasuk current, hourly, daily, sunrise, sunset. Test mencakup Jakarta, Tokyo, London,
New York, pergantian tanggal, dan tanggal transisi DST.

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

```bash
npm install
npm run typecheck
npm test
npm run build
npm audit
npm audit --omit=dev
```

Vitest tetap digunakan; `jsdom` 26 ditambahkan **hanya sebagai dev dependency** untuk test
interaksi React memakai `act`/ReactDOM yang sudah ada. Versi ini kompatibel dengan Node 20
pada CI. Tidak ada framework E2E atau library validasi runtime baru. Semua API/GPS pada
test dimock; test tidak membuktikan availability layanan live. Tidak ada script lint di repo.

Uji timezone perangkat terpisah (juga dijalankan di CI):

```bash
for zone in UTC Asia/Jakarta Asia/Tokyo Europe/London America/New_York; do
  TZ="$zone" npx vitest run src/__tests__/dates.test.ts src/__tests__/weather.test.ts || exit 1
done
```

### Batasan & tindak lanjut keamanan

Audit dependency pada implementasi Phase 1 masih melaporkan **7 temuan dev-only**
(5 high, 2 moderate), melalui toolchain Tailwind 3 (`braces`, `postcss-selector-parser`,
dan dependency transitifnya). `npm audit fix` non-breaking tidak menyelesaikannya;
perbaikan yang ditawarkan npm memerlukan Tailwind 4. Upgrade major tersebut **tidak**
dipaksakan pada Phase 1 untuk menghindari migrasi styling/regression. `npm audit --omit=dev`
saat validasi tidak menemukan vulnerability runtime. Hindari memproses CSS/glob dari input
untrusted di build; jadwalkan evaluasi patch upstream/migrasi toolchain secara terpisah.

Schema sengaja fail-closed: payload forecast parsial (termasuk sunrise/sunset tidak tersedia
pada kondisi polar) ditampilkan sebagai error yang dapat di-retry, bukan angka/jam palsu.
Dukungan tampilan data parsial dan representasi “tidak tersedia” untuk UV/probabilitas hujan
adalah kandidat Phase 2. Uji browser nyata untuk GPS, screen reader, dan kontrak API live
masih diperlukan di lingkungan yang mengizinkan akses penyedia tersebut.

---

<div align="center">

Dibuat dengan 💜 oleh [**AXRYZURE**](https://github.com/superrrkyy) • 🇮🇩

⭐ Beri bintang jika bermanfaat!

</div>

## Phase 2 — Premium weather experience

Dashboard kini memakai hero cuaca, atmosfer adaptif, timeline 24 jam, prakiraan
7 hari dengan rentang suhu, grafik SVG, detail cuaca, indeks UV dan siklus
matahari berbasis timezone lokasi. Pencarian keyboard, geolokasi, favorit lokal,
error handling dan refresh Phase 1 tetap tersedia.

Lihat [catatan implementasi dan validasi Phase 2](PHASE2.md) untuk struktur
komponen, batasan data, hasil pemeriksaan dan langkah menjalankan browser checks:

```bash
npx playwright install --with-deps chromium
npm run test:browser
```
