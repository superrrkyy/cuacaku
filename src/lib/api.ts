export type ApiErrorCode = "NETWORK_ERROR" | "TIMEOUT" | "HTTP_ERROR" | "INVALID_RESPONSE" | "INVALID_COORDINATES" | "NOT_FOUND" | "ABORTED";

const messages: Record<ApiErrorCode, string> = {
  NETWORK_ERROR: "Tidak dapat terhubung ke layanan. Periksa koneksi internetmu.",
  TIMEOUT: "Layanan terlalu lama merespons. Coba lagi sebentar lagi.",
  HTTP_ERROR: "Layanan sedang bermasalah. Coba lagi sebentar lagi.",
  INVALID_RESPONSE: "Data dari layanan belum dapat dibaca. Coba lagi sebentar lagi.",
  INVALID_COORDINATES: "Koordinat lokasi tidak valid. Pilih kota atau cari lokasi lagi.",
  NOT_FOUND: "Lokasi tidak ditemukan. Coba kota lain.",
  ABORTED: "Permintaan dibatalkan.",
};

export class ApiError extends Error {
  readonly name = "ApiError";
  constructor(public readonly code: ApiErrorCode, public readonly status?: number) {
    super(messages[code]);
  }
}
export const errorMessage = (error: unknown): string => error instanceof ApiError ? error.message : "Terjadi kesalahan. Silakan coba lagi.";
export const isAbortError = (error: unknown): boolean => error instanceof ApiError && error.code === "ABORTED";
export interface RequestOptions { signal?: AbortSignal; timeoutMs?: number }

/**
 * Hanya pengembangan offline: `npm run dev:mock` menyajikan payload Open-Meteo
 * tiruan dari server Vite yang sama. `import.meta.env.DEV` selalu `false` pada
 * build produksi, sehingga cabang ini ikut terbuang (dead-code elimination) dan
 * aplikasi tetap memanggil penyedia cuaca yang sesungguhnya.
 */
export function endpoint(live: string, mockPath: string): string {
  if (import.meta.env.DEV && typeof sessionStorage !== "undefined") {
    try {
      // "1" = payload default; nilai lain diperlakukan sebagai nama skenario
      // (clear|cloud|rain|storm|snow|fog|night|partial).
      const mode = sessionStorage.getItem("cuacaku:mock");
      if (mode) {
        const scenario = mode === "1" ? "" : mode;
        return `${mockPath}${scenario ? `?scenario=${encodeURIComponent(scenario)}` : ""}`;
      }
    } catch {
      /* sessionStorage diblokir: pakai endpoint asli */
    }
  }
  return live;
}

/** Deadline covers both headers and body. Own controller never aborts the caller's signal. */
export async function requestJson(url: string, { signal, timeoutMs = 10000 }: RequestOptions = {}): Promise<unknown> {
  if (signal?.aborted) throw new ApiError("ABORTED");
  const controller = new AbortController();
  let timedOut = false;
  const abort = () => controller.abort();
  signal?.addEventListener("abort", abort, { once: true });
  const timer = setTimeout(() => { timedOut = true; controller.abort(); }, timeoutMs);
  let removeAbort = () => {};
  const cancelled = new Promise<never>((_, reject) => {
    const onAbort = () => reject(new ApiError(timedOut ? "TIMEOUT" : "ABORTED"));
    controller.signal.addEventListener("abort", onAbort, { once: true });
    removeAbort = () => controller.signal.removeEventListener("abort", onAbort);
  });
  try {
    return await Promise.race([
      (async () => {
        let res: Response;
        try { res = await fetch(url, { signal: controller.signal }); }
        catch { throw new ApiError("NETWORK_ERROR"); }
        if (!res.ok) throw new ApiError("HTTP_ERROR", res.status);
        try { return await res.json() as unknown; }
        catch (error) {
          // A body transfer can fail after headers have arrived.
          throw new ApiError(error instanceof SyntaxError ? "INVALID_RESPONSE" : "NETWORK_ERROR");
        }
      })(),
      cancelled,
    ]);
  } finally {
    clearTimeout(timer);
    signal?.removeEventListener("abort", abort);
    removeAbort();
  }
}
