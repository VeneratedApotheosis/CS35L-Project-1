import { describe, expect, it } from "vitest";
import { isLogDeletable, logDateProblem } from "./logging.js";
import type { PeriodHabit } from "./periods.js";

// 3 times a week for 4 weeks from Monday 2 Nov 2026. Periods start on
// 2, 9, 16 and 23 Nov, and the habit ends on 30 Nov.
const habit: PeriodHabit = {
  start_date: "2026-11-02",
  interval_count: 1,
  interval_unit: "week",
  num_periods: 4,
};

describe("logDateProblem", () => {
  it("allows today", () => {
    expect(logDateProblem(habit, "2026-11-11", "2026-11-11")).toBeNull();
  });

  it("allows an earlier day in the current period", () => {
    expect(logDateProblem(habit, "2026-11-09", "2026-11-11")).toBeNull();
  });

  it("allows the first day of the habit", () => {
    expect(logDateProblem(habit, "2026-11-02", "2026-11-02")).toBeNull();
  });

  it("rejects a future date", () => {
    expect(logDateProblem(habit, "2026-11-12", "2026-11-11")).toBe(
      "occurred_on: cannot be in the future",
    );
  });

  it("rejects a date in an earlier, locked period", () => {
    expect(logDateProblem(habit, "2026-11-08", "2026-11-11")).toContain(
      "must be in the current period, which started on 2026-11-09",
    );
  });

  it("rejects a date before the habit started once it is active", () => {
    expect(logDateProblem(habit, "2026-10-30", "2026-11-03")).toContain(
      "must be in the current period",
    );
  });

  it("rejects any log on an expired habit", () => {
    expect(logDateProblem(habit, "2026-11-29", "2026-11-30")).toBe(
      "This habit has ended and takes no new logs",
    );
  });

  it("allows today on a habit that has not started", () => {
    expect(logDateProblem(habit, "2026-10-30", "2026-10-30")).toBeNull();
  });

  it("rejects a past day on a habit that has not started", () => {
    expect(logDateProblem(habit, "2026-10-29", "2026-10-30")).toContain(
      "can only be logged for today",
    );
  });

  it("rejects a future day on a habit that has not started", () => {
    expect(logDateProblem(habit, "2026-11-02", "2026-10-30")).toBe(
      "occurred_on: cannot be in the future",
    );
  });
});

describe("isLogDeletable", () => {
  it("is true for a log in the current period", () => {
    expect(isLogDeletable(habit, "2026-11-10", "2026-11-11")).toBe(true);
  });

  it("is false for a log in an earlier period", () => {
    expect(isLogDeletable(habit, "2026-11-03", "2026-11-11")).toBe(false);
  });

  it("is false for every log once the habit has expired", () => {
    expect(isLogDeletable(habit, "2026-11-24", "2026-12-01")).toBe(false);
  });

  it("is true for a log made before the habit started", () => {
    expect(isLogDeletable(habit, "2026-10-30", "2026-10-30")).toBe(true);
  });
});
