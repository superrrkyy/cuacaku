import { describe, expect, it } from "vitest";
import { getDayPart, localHour } from "../lib/daylight";

describe("Phase 2.5 — local day parts", () => {
  const instant = new Date("2026-10-14T00:00:00.000Z");

  it("uses the selected location timezone", () => {
    expect(localHour("Asia/Jakarta", instant)).toBe(7);
    expect(localHour("Asia/Tokyo", instant)).toBe(9);
    expect(localHour("America/New_York", instant)).toBe(20);
  });

  it("classifies dawn, day, dusk and night", () => {
    expect(getDayPart("Asia/Jakarta", new Date("2026-10-14T00:00:00Z"))).toBe("dawn");
    expect(getDayPart("Asia/Jakarta", new Date("2026-10-14T03:00:00Z"))).toBe("day");
    expect(getDayPart("Asia/Jakarta", new Date("2026-10-14T11:00:00Z"))).toBe("dusk");
    expect(getDayPart("Asia/Jakarta", new Date("2026-10-14T13:00:00Z"))).toBe("night");
  });

  it("fails safely for an invalid timezone", () => {
    expect(localHour("Invalid/Zone", instant)).toBeNull();
    expect(getDayPart("Invalid/Zone", instant)).toBe("night");
  });
});
