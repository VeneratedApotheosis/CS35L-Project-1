import { describe, expect, it } from "vitest";
import { growthStage, HEALTH_WINDOW, plantHealth } from "./growth.js";
import type { ProgressHabit } from "./progress.js";

describe("growthStage (rule 8.7)", () => {
  it("is stage 1 from 0 to 24%", () => {
    expect(growthStage(0)).toBe(1);
    expect(growthStage(0.24)).toBe(1);
    expect(growthStage(0.2499)).toBe(1);
  });

  it("is stage 2 from 25 to 49%", () => {
    expect(growthStage(0.25)).toBe(2);
    expect(growthStage(0.49)).toBe(2);
  });

  it("is stage 3 from 50 to 74%", () => {
    expect(growthStage(0.5)).toBe(3);
    expect(growthStage(0.74)).toBe(3);
  });

  it("is stage 4 from 75 to 100%", () => {
    expect(growthStage(0.75)).toBe(4);
    expect(growthStage(1)).toBe(4);
  });

  it("stays at stage 1 for an indefinite habit", () => {
    expect(growthStage(null)).toBe(1);
  });

  it("reaches stage 4 well before the end date", () => {
    // 10 of 12 logs after one week is 83%, so the plant is already at stage 4.
    expect(growthStage(10 / 12)).toBe(4);
  });
});

// 1 time a week for 10 weeks, from Monday 2 Nov 2026. Periods start on
// 2, 9, 16, 23 and 30 Nov, 7, 14, 21 and 28 Dec, and 4 Jan.
const weekly: ProgressHabit = {
  start_date: "2026-11-02",
  interval_count: 1,
  interval_unit: "week",
  num_periods: 10,
  target_count: 1,
};
const weekStarts = [
  "2026-11-02",
  "2026-11-09",
  "2026-11-16",
  "2026-11-23",
  "2026-11-30",
  "2026-12-07",
  "2026-12-14",
];

// A log in each listed week (0 is the first).
const metWeeks = (...weeks: number[]) =>
  weeks.map((w) => weekStarts[w] as string);

describe("plantHealth (rule 8.8)", () => {
  it("is healthy before the first period ends", () => {
    expect(plantHealth(weekly, [], "2026-11-04")).toBe("healthy");
    expect(plantHealth(weekly, [], "2026-10-20")).toBe("healthy");
  });

  it("is wilted after the first period is missed", () => {
    expect(plantHealth(weekly, [], "2026-11-10")).toBe("wilted");
  });

  it("is healthy when the only completed period was met", () => {
    expect(plantHealth(weekly, metWeeks(0), "2026-11-10")).toBe("healthy");
  });

  it("is slightly wilted at 50% of two periods", () => {
    expect(plantHealth(weekly, metWeeks(0), "2026-11-17")).toBe(
      "slightly_wilted",
    );
  });

  it("is slightly wilted with one miss in four periods (75%)", () => {
    // Weeks 1, 3 and 4 met, week 2 missed, now in week 5.
    expect(plantHealth(weekly, metWeeks(0, 2, 3), "2026-11-30")).toBe(
      "slightly_wilted",
    );
  });

  it("is healthy with all four of four met", () => {
    expect(plantHealth(weekly, metWeeks(0, 1, 2, 3), "2026-11-30")).toBe(
      "healthy",
    );
  });

  it("is wilted below 50%", () => {
    // One of four met (25%).
    expect(plantHealth(weekly, metWeeks(3), "2026-11-30")).toBe("wilted");
  });

  it("recovers as old misses leave the window of four", () => {
    expect(HEALTH_WINDOW).toBe(4);
    // Week 1 missed, weeks 2 to 5 met. In week 6 the window is weeks 2 to 5.
    const logs = metWeeks(1, 2, 3, 4);
    expect(plantHealth(weekly, logs, "2026-12-07")).toBe("healthy");
    // One week earlier the miss is still inside the window (3 of 4).
    expect(plantHealth(weekly, logs, "2026-11-30")).toBe("slightly_wilted");
  });

  it("does not count the period in progress", () => {
    // Week 1 met, week 2 in progress with no logs yet.
    expect(plantHealth(weekly, metWeeks(0), "2026-11-12")).toBe("healthy");
  });
});
