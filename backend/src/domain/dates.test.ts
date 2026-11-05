import { describe, expect, it } from "vitest";
import { isBeforeDate, todayInZone } from "./dates.js";

describe("todayInZone", () => {
  const now = new Date("2026-11-05T03:00:00Z");

  it("uses the local date in a zone behind UTC", () => {
    expect(todayInZone("America/Los_Angeles", now)).toBe("2026-11-04");
  });

  it("uses the UTC date for UTC", () => {
    expect(todayInZone("UTC", now)).toBe("2026-11-05");
  });

  it("falls back to UTC for a null zone", () => {
    expect(todayInZone(null, now)).toBe("2026-11-05");
  });

  it("falls back to UTC for an invalid zone", () => {
    expect(todayInZone("Not/AZone", now)).toBe("2026-11-05");
  });

  it("is ahead of UTC across the date line", () => {
    const noonUtc = new Date("2026-11-04T12:00:00Z");
    expect(todayInZone("Pacific/Kiritimati", noonUtc)).toBe("2026-11-05");
    expect(todayInZone("UTC", noonUtc)).toBe("2026-11-04");
  });
});

describe("isBeforeDate", () => {
  it("is true when the first date is earlier", () => {
    expect(isBeforeDate("2026-11-04", "2026-11-05")).toBe(true);
  });

  it("is false when the first date is later", () => {
    expect(isBeforeDate("2026-11-06", "2026-11-05")).toBe(false);
  });

  it("is false for equal dates", () => {
    expect(isBeforeDate("2026-11-05", "2026-11-05")).toBe(false);
  });
});
