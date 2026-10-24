import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { openMeteoMock } from "./dev/openMeteoMock";

/**
 * Mode pengembangan dengan data Open-Meteo tiruan (sama sekali tanpa jaringan).
 *   npm run dev:mock
 * Aplikasi dialihkan ke endpoint `/mock/*` di server yang sama (lihat
 * `lib/api.ts`), jadi preview tetap menampilkan dashboard penuh saat penyedia
 * cuaca tidak dapat dijangkau. Skenario cuaca dapat diganti lewat konsol:
 *   sessionStorage.setItem("cuacaku:mock", "storm") // clear|cloud|rain|storm|snow|fog|night|partial
 */
export default defineConfig({
  plugins: [react(), openMeteoMock()],
  base: "/cuacaku/",
  server: { host: "0.0.0.0", allowedHosts: [".e2b.app"], port: 5173 },
});
