import { useEffect, useId, useRef, useState } from "react";
import { Place, searchPlaces } from "../weather";
import { errorMessage, isAbortError } from "../lib/api";

interface Props {
  onSelect: (p: Place) => void;
  onLocate: () => void;
  online?: boolean;
  locating?: boolean;
}

export default function Search({
  onSelect,
  onLocate,
  online = true,
  locating = false,
}: Props) {
  const [q, setQ] = useState("");
  const [results, setResults] = useState<Place[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const [retry, setRetry] = useState(0);
  const request = useRef<AbortController | null>(null);
  const focused = useRef(false);
  const input = useRef<HTMLInputElement>(null);
  const listId = useId();

  useEffect(() => {
    setResults([]);
    setError("");
    setActive(-1);
    setOpen(false);
    if (q.trim().length < 2 || !online || navigator.onLine === false) {
      setLoading(false);
      return;
    }
    const controller = new AbortController();
    request.current = controller;
    setLoading(true);
    const timer = setTimeout(() => {
      searchPlaces(q, { signal: controller.signal })
        .then((results) => {
          if (!controller.signal.aborted) {
            setResults(results);
            setOpen(focused.current);
          }
        })
        .catch((error) => {
          if (!controller.signal.aborted && !isAbortError(error)) {
            setError(errorMessage(error));
            setOpen(focused.current);
          }
        })
        .finally(() => {
          if (!controller.signal.aborted) setLoading(false);
        });
    }, 400);
    return () => {
      clearTimeout(timer);
      controller.abort();
      if (request.current === controller) request.current = null;
    };
  }, [q, online, retry]);

  useEffect(() => {
    if (active >= 0)
      document
        .getElementById(`${listId}-${active}`)
        ?.scrollIntoView?.({ block: "nearest" });
  }, [active, listId]);

  const pick = (place: Place) => {
    request.current?.abort();
    onSelect(place);
    setQ("");
    setResults([]);
    setOpen(false);
    setActive(-1);
    setLoading(false);
  };
  const expanded = open && !loading && online && q.trim().length >= 2;

  return (
    <div
      className="search-bar"
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) {
          focused.current = false;
          setOpen(false);
          setActive(-1);
        }
      }}
    >
      <div className="search-field">
        <span aria-hidden="true" className="search-symbol">
          ⌕
        </span>
        <input
          ref={input}
          value={q}
          aria-label="Cari kota"
          role="combobox"
          aria-autocomplete="list"
          aria-expanded={expanded && results.length > 0}
          aria-controls={expanded && results.length > 0 ? listId : undefined}
          aria-activedescendant={
            expanded && active >= 0 ? `${listId}-${active}` : undefined
          }
          aria-busy={loading}
          autoComplete="off"
          disabled={!online}
          onChange={(event) => {
            request.current?.abort(); // invalidate before the next render/effect
            focused.current = true;
            setQ(event.target.value);
            setOpen(false);
            setActive(-1);
          }}
          onFocus={() => {
            focused.current = true;
            if (q.trim().length >= 2) setOpen(true);
          }}
          onKeyDown={(event) => {
            if (event.key === "Escape") {
              focused.current = false;
              setOpen(false);
              setActive(-1);
            }
            if (
              (event.key === "ArrowDown" || event.key === "ArrowUp") &&
              results.length &&
              !loading
            ) {
              event.preventDefault();
              setOpen(true);
              setActive((i) =>
                event.key === "ArrowDown"
                  ? (i + 1) % results.length
                  : i <= 0
                    ? results.length - 1
                    : i - 1,
              );
            }
            if (
              event.key === "Enter" &&
              expanded &&
              active >= 0 &&
              results[active]
            ) {
              event.preventDefault();
              pick(results[active]);
            }
          }}
          placeholder="Cari kota atau tempat…"
          className="glass search-input"
        />
        {loading && (
          <span aria-hidden="true" className="search-loading spinner">
            ◌
          </span>
        )}
        {q && (
          <button
            className="search-clear icon-button"
            aria-label="Hapus pencarian"
            onClick={() => {
              request.current?.abort();
              setQ("");
              setResults([]);
              setOpen(false);
              setActive(-1);
              setLoading(false);
              setError("");
              input.current?.focus();
            }}
          >
            ×
          </button>
        )}
        <span role="status" className="sr-only">
          {loading
            ? "Mencari kota..."
            : expanded && !error
              ? `${results.length} kota ditemukan`
              : ""}
        </span>
      </div>
      <button
        onClick={onLocate}
        disabled={locating || !online}
        title="Gunakan lokasiku"
        aria-label="Gunakan lokasiku"
        className="glass locate-button"
        aria-busy={locating}
      >
        <span aria-hidden="true" className={locating ? "spinner" : ""}>
          {locating ? (
            "◌"
          ) : (
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
            >
              <circle cx="12" cy="12" r="7" />
              <circle cx="12" cy="12" r="2" />
              <path d="M12 1v4m0 14v4M1 12h4m14 0h4" />
            </svg>
          )}
        </span>
        <span className="locate-label">
          {locating ? "Mencari…" : "Lokasi saya"}
        </span>
      </button>

      {expanded && (
        <div className="search-dropdown">
          {error ? (
            <div className="px-4 py-3 text-sm">
              <p role="alert">{error}</p>
              <button
                onClick={() => {
                  input.current?.focus();
                  focused.current = true;
                  setRetry((n) => n + 1);
                }}
                className="text-button underline"
              >
                Coba cari lagi
              </button>
            </div>
          ) : results.length === 0 ? (
            <p className="px-4 py-3 text-white/60">
              Kota tidak ditemukan. Coba nama kota lain.
            </p>
          ) : (
            <ul id={listId} role="listbox" aria-label="Hasil pencarian kota">
              {results.map((place, i) => (
                <li
                  key={`${place.id}-${i}`}
                  id={`${listId}-${i}`}
                  role="option"
                  aria-selected={active === i}
                  onMouseDown={(event) => event.preventDefault()}
                  onMouseEnter={() => setActive(i)}
                  onClick={() => pick(place)}
                  className={`cursor-pointer px-4 py-3 text-left text-white hover:bg-white/10 ${active === i ? "bg-white/10" : ""}`}
                >
                  <div className="font-semibold">{place.name}</div>
                  <div className="text-xs text-white/60">
                    {[place.admin1, place.country].filter(Boolean).join(", ")}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
