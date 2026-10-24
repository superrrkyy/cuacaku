import { describe, expect, it } from "vitest";
import {
  formatLocalClock,
  formatLocalTimeZone,
  isValidTimeZone,
  localClockDateTime,
} from "../lib/localClock";

const instant = new Date("2026-10-14T13:00:00.000Z");

describe("Phase 2.4 — local clock", () => {
  it("formats Jakarta time from the supplied timezone", () => {
    expect(formatLocalClock(instant, "Asia/Jakarta", "en-US")).toBe("20:00:00");
  });

  it("formats Tokyo time from the supplied timezone", () => {
    expect(formatLocalClock(instant, "Asia/Tokyo", "en-US")).toBe("22:00:00");
  });

  it("formats London time from the supplied timezone", () => {
    expect(formatLocalClock(instant, "Europe/London", "en-US")).toBe("14:00:00");
  });

  it("formats New York time from the supplied timezone", () => {
    expect(formatLocalClock(instant, "America/New_York", "en-US")).toBe("09:00:00");
  });

  it("handles DST using the IANA timezone", () => {
    const summer = new Date("2026-07-01T12:00:00.000Z");
    const winter = new Date("2026-01-01T12:00:00.000Z");

    expect(formatLocalClock(summer, "America/New_York", "en-US")).toBe("08:00:00");
    expect(formatLocalClock(winter, "America/New_York", "en-US")).toBe("07:00:00");
  });

  it("does not use the device timezone as the source of truth", () => {
    expect(formatLocalClock(instant, "Asia/Tokyo", "en-US")).toBe("22:00:00");
  });

  it("rejects an invalid timezone safely", () => {
    expect(isValidTimeZone("Not/A/Timezone")).toBe(false);
    expect(formatLocalClock(instant, "Not/A/Timezone", "en-US")).toBe("--:--:--");
  });

  it("returns a readable timezone label", () => {
    expect(formatLocalTimeZone(instant, "Asia/Jakarta", "en-US")).toBe("GMT+7");
  });

  it("always renders hh:mm:ss, whatever separator the locale uses", () => {
    // CLDR memberi id-ID pemisah titik ("20.00.00"); jam ini harus tetap konsisten.
    expect(formatLocalClock(instant, "Asia/Jakarta", "id-ID")).toBe("20:00:00");
    expect(formatLocalClock(instant, "Asia/Jakarta")).toBe("20:00:00");
  });

  it("builds a valid datetime timestamp for <time>", () => {
    expect(localClockDateTime(instant, "Asia/Jakarta", "id-ID")).toBe("2026-10-14T20:00:00");
    expect(localClockDateTime(instant, "America/New_York", "en-US")).toBe("2026-10-14T09:00:00");
    expect(localClockDateTime(instant, "Not/A/Timezone")).toBeUndefined();
  });
});
