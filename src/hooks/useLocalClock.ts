import { useEffect, useState } from "react";
import { formatLocalClock, formatLocalTimeZone } from "../lib/localClock";

export interface LocalClockState {
  time: string;
  zoneLabel: string;
}

/**
 * Keeps a local clock ticking without making network requests.
 * `timezone` must be the IANA timezone from the active weather location.
 */
export function useLocalClock(
  timezone: string | undefined,
  locale = "id-ID",
): LocalClockState {
  const getState = (): LocalClockState => {
    if (!timezone) {
      return { time: "--:--:--", zoneLabel: "Waktu lokal" };
    }

    const now = new Date();

    return {
      time: formatLocalClock(now, timezone, locale),
      zoneLabel: formatLocalTimeZone(now, timezone, locale),
    };
  };

  const [clock, setClock] = useState<LocalClockState>(getState);

  useEffect(() => {
    if (!timezone) {
      setClock({ time: "--:--:--", zoneLabel: "Waktu lokal" });
      return;
    }

    // Render immediately when the selected location/timezone changes.
    setClock(getState());

    const intervalId = window.setInterval(() => {
      setClock(getState());
    }, 1000);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [timezone, locale]);

  return clock;
}
