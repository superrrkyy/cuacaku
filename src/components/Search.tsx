import { useEffect, useRef, useState } from "react";
import { Place, searchPlaces } from "../weather";

interface Props {
  onSelect: (p: Place) => void;
  onLocate: () => void;
}

export default function Search({ onSelect, onLocate }: Props) {
  const [q, setQ] = useState("");
  const [results, setResults] = useState<Place[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const box = useRef<HTMLDivElement>(null);

  // cari otomatis setelah berhenti mengetik (debounce)
  useEffect(() => {
    if (q.trim().length < 2) { setResults([]); return; }
    setLoading(true);
    const t = setTimeout(() => {
      searchPlaces(q.trim())
        .then(r => { setResults(r); setOpen(true); })
        .catch(() => setResults([]))
        .finally(() => setLoading(false));
    }, 400);
    return () => clearTimeout(t);
  }, [q]);

  useEffect(() => {
    const close = (e: MouseEvent) => { if (!box.current?.contains(e.target as Node)) setOpen(false); };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);

  const pick = (p: Place) => { onSelect(p); setQ(""); setResults([]); setOpen(false); };

  return (
    <div ref={box} className="relative z-30 flex gap-2">
      <div className="relative flex-1">
        <span className="absolute left-4 top-1/2 -translate-y-1/2 opacity-70">🔍</span>
        <input
          value={q}
          onChange={e => setQ(e.target.value)}
          onFocus={() => results.length && setOpen(true)}
          placeholder="Cari kota..."
          className="glass w-full !rounded-2xl py-3 pl-11 pr-10 text-white placeholder-white/60 outline-none focus:border-white/40"
        />
        {loading && <span className="absolute right-4 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />}
      </div>
      <button
        onClick={onLocate}
        title="Gunakan lokasiku"
        className="glass !rounded-2xl px-4 text-lg transition hover:bg-white/20 active:scale-95"
      >
        📍
      </button>

      {open && q.trim().length >= 2 && !loading && (
        <ul className="absolute left-0 right-0 top-full mt-2 overflow-hidden rounded-2xl border border-white/15 bg-indigo-950/95 shadow-2xl backdrop-blur-xl">
          {results.length === 0 && <li className="px-4 py-3 text-white/60">Kota tidak ditemukan 😅</li>}
          {results.map(p => (
            <li key={p.id}>
              <button onClick={() => pick(p)} className="w-full px-4 py-3 text-left text-white hover:bg-white/10">
                <div className="font-semibold">{p.name}</div>
                <div className="text-xs text-white/60">{[p.admin1, p.country].filter(Boolean).join(", ")}</div>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
