export type DayPart = "dawn" | "day" | "dusk" | "night";

/** Returns the local day phase for an IANA timezone.
 * Uses the selected weather location timezone, never the device timezone.
 */
export function localHour(timezone: string, date = new Date()): number | null {
  try {
    const parts = new Intl.DateTimeFormat("en-US", {
      timeZone: timezone,
      hour: "2-digit",
      hourCycle: "h23",
    }).formatToParts(date);
    const value = parts.find((p) => p.type === "hour")?.value;
    const hour = Number(value);
    return Number.isInteger(hour) && hour >= 0 && hour <= 23 ? hour : null;
  } catch {
    return null;
  }
}

export function getDayPart(timezone: string, date = new Date()): DayPart {
  const h = localHour(timezone, date);
  if (h === null) return "night";
  if (h >= 5 && h < 7) return "dawn";
  if (h >= 7 && h < 17) return "day";
  if (h >= 17 && h < 19) return "dusk";
  return "night";
}
