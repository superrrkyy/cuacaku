import { useEffect, useRef, useState } from "react";
import {
  formatLocalClock,
  formatLocalTimeZone,
  localClockDateTime,
} from "../lib/localClock";

export interface LocalClockState {
  time: string;
  /** Valid `YYYY-MM-DDThh:mm:ss` timestamp in the location timezone, or undefined. */
  dateTime?: string;
  zoneLabel: string;
}

const FALLBACK: LocalClockState = {
  time: "--:--:--",
  dateTime: undefined,
  zoneLabel: "Waktu lokal",
};

function read(instant: Date, timezone: string | undefined, locale: string): LocalClockState {
  if (!timezone) return FALLBACK;
  return {
    time: formatLocalClock(instant, timezone, locale),
    dateTime: localClockDateTime(instant, timezone, locale),
    zoneLabel: formatLocalTimeZone(instant, timezone, locale),
  };
}

/**
 * Keeps a local clock ticking without making network requests.
 * `timezone` must be the IANA timezone from the active weather location.
 * `now` is injectable so tests can pin the instant; when it is set, no interval
 * is started because a pinned instant has nothing to tick.
 */
export function useLocalClock(
  timezone: string | undefined,
  locale = "id-ID",
  now?: Date,
): LocalClockState {
  const pinned = useRef(now);
  pinned.current = now;
  const [clock, setClock] = useState<LocalClockState>(() =>
    read(now ?? new Date(), timezone, locale),
  );

  useEffect(() => {
    if (!timezone) {
      setClock(FALLBACK);
      return;
    }
    // Render immediately when the selected location/timezone changes.
    setClock(read(pinned.current ?? new Date(), timezone, locale));
    if (pinned.current) return;
    const intervalId = window.setInterval(() => {
      setClock(read(new Date(), timezone, locale));
    }, 1000);
    return () => {
      window.clearInterval(intervalId);
    };
  }, [timezone, locale]);

  return clock;
}
