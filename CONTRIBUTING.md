# Panduan Kontribusi

Terima kasih ingin berkontribusi! Repo ini dikelola seorang diri, jadi
kontribusi kecil pun sangat berarti. 🙌

## Cara Berkontribusi

1. **Buka issue lebih dulu** untuk perubahan besar, agar tidak ada kerja ganda.
2. **Fork** repo, lalu buat branch dengan nama yang jelas:
   - `feat/nama-fitur` untuk fitur baru
   - `fix/nama-bug` untuk perbaikan
   - `docs/apa-yang-diubah` untuk dokumentasi
3. **Kerjakan satu hal per branch** — jangan campur fitur dengan perbaikan.
4. **Jalankan pemeriksaan lokal** sebelum push:

   ```bash
   npm ci
   npm run lint        # ESLint — wajib 0 error/0 warning
   npm run typecheck   # src/ (app) + tests/, config, dev/ (e2e)
   npm test            # Vitest
   npm run build       # typecheck + vite build
   npm run test:browser  # opsional: butuh Chromium (npx playwright install --with-deps chromium)
   ```

5. **Buat Pull Request** dengan deskripsi: apa yang diubah, mengapa, dan bagaimana cara mengujinya.

## Standar Commit

Gunakan [Conventional Commits](https://www.conventionalcommits.org/):

```
feat: tambah prakiraan 10 hari di CuacaKu
fix: perbaiki jam lokal yang memakai timezone perangkat
docs: jelaskan cara menjalankan dev:mock
test: tambah test untuk grafik suhu 7 hari
chore: perbarui dependensi
```

## Standar Kode

- **TypeScript/React**: ikuti gaya yang sudah ada di repo (2 spasi, komentar bahasa Indonesia).
- **Wajib lulus di CI**: `lint`, `typecheck`, `test`, regresi timezone, `build`, `npm audit --omit=dev`, dan `test:browser`.
- **Format**: Prettier tersedia (`npm run format`), tetapi tidak dipaksakan pada file lama;
  rapikan file yang kamu sentuh, jangan memformat seluruh repo dalam satu commit.
- **Styling**: CSS ditulis manual di `src/index.css` (tanpa Tailwind/framework). Tambahkan
  aturan baru di dekat komponen terkait, dan pastikan tetap lolos `prefers-reduced-motion`.
- **Test**: jika menambah logika baru, sertakan minimal satu test.
- **Wajib dihindari**: menaruh API key/token di kode, commit file `node_modules/`, `dist/`, atau `.env`.

## Pelaporan Bug

Sertakan: langkah reproduksi, yang diharapkan, yang terjadi, serta versi browser/node.
Untuk masalah keamanan, ikuti [SECURITY.md](SECURITY.md) — **jangan** buat issue publik.

## Kode Etik

Bersikap sopan, sabar, dan konstruktif. Kami mengikuti
[Contributor Covenant](https://www.contributor-covenant.org/version/2/1/code_of_conduct/).
