import { describe, expect, it } from "vitest";
import { dayName, hour, longDate } from "../weather";
import { addDays, isLocalDate, isLocalTime, localDate, weekdayName, weekdayShort } from "../lib/dates";

describe.each(["Asia/Jakarta", "Asia/Tokyo", "Europe/London", "America/New_York"])("location wall time: %s", timezone => {
  it("preserves current, hourly, sunrise and sunset local times", () => {
    for (const time of ["00:00", "01:30", "05:30", "17:45", "23:59"]) {
      expect(hour(`2026-10-14T${time}`, timezone)).toBe(time);
      expect(longDate(`2026-10-14T${time}`, timezone)).toBe("Rabu, 14 Okt 2026");
    }
    expect(dayName("2026-10-14", 2, timezone)).toBe("Rabu");
  });
  it("handles DST boundary wall dates without device conversion", () => {
    expect(hour("2026-03-08T02:30", timezone)).toBe("02:30");
    expect(longDate("2026-11-01T01:30", timezone)).toBe("Minggu, 1 Nov 2026");
  });
});
it.each([
  ["Asia/Jakarta", "06:30", "Kamis, 15 Okt 2026"],
  ["Asia/Tokyo", "08:30", "Kamis, 15 Okt 2026"],
  ["Europe/London", "00:30", "Kamis, 15 Okt 2026"],
  ["America/New_York", "19:30", "Rabu, 14 Okt 2026"],
])("formats absolute instant in explicit %s", (zone, time, date) => {
  expect(hour("2026-10-14T23:30:00Z", zone)).toBe(time);
  expect(longDate("2026-10-14T23:30:00Z", zone)).toBe(date);
});
it("validates calendar and timestamps", () => {
  expect(isLocalDate("2024-02-29")).toBe(true);
  expect(isLocalDate("2026-02-29")).toBe(false);
  expect(isLocalTime("2026-10-14T23:60")).toBe(false);
  expect(isLocalTime("2026-10-14T23:59:60")).toBe(false);
  expect(isLocalTime("2026-10-14T07:30:15")).toBe(true);
  expect(hour("bad")).toBe("—"); expect(longDate("bad")).toBe("—");
});

describe("weekly forecast labels", () => {
  it("resolves the location calendar date, weekday and day shifts", () => {
    expect(localDate("2026-10-14T23:59", "Asia/Jakarta")).toBe("2026-10-14");
    expect(localDate("2026-10-14T23:00:00Z", "Asia/Tokyo")).toBe("2026-10-15");
    expect(weekdayName("2026-10-14", "Asia/Jakarta")).toBe("Rabu");
    expect(weekdayShort("2026-10-14", "Europe/London")).toBe("Rab");
    expect(addDays("2026-10-31", 1)).toBe("2026-11-01");
    expect(addDays("2024-02-28", 1)).toBe("2024-02-29");
    expect(addDays("2026-02-28", 1)).toBe("2026-03-01");
    expect(addDays("2026-12-31", 1)).toBe("2027-01-01");
  });
  it.each([
    ["Asia/Jakarta", "Kamis"],
    ["Asia/Tokyo", "Kamis"],
    ["Europe/London", "Kamis"], // 23:30Z is already 00:30 on 15 Oct in London (BST)
    ["America/New_York", "Rabu"], // ...and still 19:30 on 14 Oct in New York
  ])("resolves the weekday of one instant in %s", (zone, day) =>
    expect(weekdayName("2026-10-14T23:30:00Z", zone)).toBe(day));
  it.each([["bad", "Asia/Jakarta"], ["2026-10-14", "Not/AZone"], ["2026-10-14T25:00", "Asia/Jakarta"]])(
    "has an empty fallback for %s in %s",
    (value, zone) => {
      expect(localDate(value, zone)).toBe("");
      expect(weekdayName(value, zone)).toBe("—");
      expect(weekdayShort(value, zone)).toBe("—");
    },
  );
  it.each([["2026-02-30", 1], ["2026-10-14", 1.5], ["2026-10-14", NaN]])(
    "rejects an invalid day shift %s + %s",
    (date, days) => expect(addDays(date, days)).toBe(""),
  );
});
