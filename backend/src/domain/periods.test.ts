import { describe, expect, it } from "vitest";
import {
  completedPeriodCount,
  displayPeriodIndex,
  endDate,
  habitState,
  periodBounds,
  periodCounts,
  periodIndexOf,
  periodStart,
  type PeriodHabit,
} from "./periods.js";

// 3 times a week for 4 weeks, starting Monday 2 November 2026.
// Periods start on 2, 9, 16 and 23 Nov. The habit ends on 30 Nov.
const weekly: PeriodHabit = {
  start_date: "2026-11-02",
  interval_count: 1,
  interval_unit: "week",
  num_periods: 4,
};

describe("periodStart and periodBounds", () => {
  it("steps by whole weeks", () => {
    expect(periodStart(weekly, 0)).toBe("2026-11-02");
    expect(periodStart(weekly, 1)).toBe("2026-11-09");
    expect(periodStart(weekly, 3)).toBe("2026-11-23");
  });

  it("steps by the interval count", () => {
    const everyTwoWeeks = { ...weekly, interval_count: 2 };
    expect(periodStart(everyTwoWeeks, 1)).toBe("2026-11-16");
    expect(periodStart(everyTwoWeeks, 2)).toBe("2026-11-30");
  });

  it("steps by days", () => {
    const everyThreeDays: PeriodHabit = {
      ...weekly,
      interval_count: 3,
      interval_unit: "day",
    };
    expect(periodStart(everyThreeDays, 2)).toBe("2026-11-08");
  });

  it("crosses a year end", () => {
    const habit: PeriodHabit = { ...weekly, start_date: "2026-12-28" };
    expect(periodStart(habit, 1)).toBe("2027-01-04");
  });

  it("returns a period's first day and the first day after it", () => {
    expect(periodBounds(weekly, 1)).toEqual({
      start: "2026-11-09",
      end: "2026-11-16",
    });
  });

  it("clamps month periods to the end of a shorter month without drifting", () => {
    const monthly: PeriodHabit = {
      start_date: "2026-01-31",
      interval_count: 1,
      interval_unit: "month",
      num_periods: 4,
    };
    expect(periodStart(monthly, 1)).toBe("2026-02-28");
    // Counted from the original start, so it is back on the 31st in March.
    expect(periodStart(monthly, 2)).toBe("2026-03-31");
    expect(periodStart(monthly, 3)).toBe("2026-04-30");
  });

  it("uses 29 February in a leap year", () => {
    const monthly: PeriodHabit = {
      start_date: "2028-01-31",
      interval_count: 1,
      interval_unit: "month",
      num_periods: 2,
    };
    expect(periodStart(monthly, 1)).toBe("2028-02-29");
  });

  it("rejects an unknown unit", () => {
    expect(() => periodStart({ ...weekly, interval_unit: "year" }, 1)).toThrow(
      RangeError,
    );
  });
});

describe("endDate", () => {
  it("is the first day after the last period", () => {
    expect(endDate(weekly)).toBe("2026-11-30");
  });

  it("is null for an indefinite habit", () => {
    expect(endDate({ ...weekly, num_periods: null })).toBeNull();
  });
});

describe("periodIndexOf", () => {
  it("finds the period of a date, on both edges of the period", () => {
    expect(periodIndexOf(weekly, "2026-11-02")).toBe(0);
    expect(periodIndexOf(weekly, "2026-11-08")).toBe(0);
    expect(periodIndexOf(weekly, "2026-11-09")).toBe(1);
    expect(periodIndexOf(weekly, "2026-11-29")).toBe(3);
  });

  it("counts a date before the start as the first period", () => {
    expect(periodIndexOf(weekly, "2026-10-01")).toBe(0);
  });

  it("gives num_periods for a date on or after the end", () => {
    expect(periodIndexOf(weekly, "2026-11-30")).toBe(4);
    expect(periodIndexOf(weekly, "2027-06-01")).toBe(4);
  });

  it("keeps counting for an indefinite habit", () => {
    const habit = { ...weekly, num_periods: null };
    expect(periodIndexOf(habit, "2027-01-04")).toBe(9);
  });

  it("finds month periods around month ends", () => {
    const monthly: PeriodHabit = {
      start_date: "2026-01-31",
      interval_count: 1,
      interval_unit: "month",
      num_periods: 4,
    };
    expect(periodIndexOf(monthly, "2026-02-27")).toBe(0);
    expect(periodIndexOf(monthly, "2026-02-28")).toBe(1);
    expect(periodIndexOf(monthly, "2026-03-30")).toBe(1);
    expect(periodIndexOf(monthly, "2026-03-31")).toBe(2);
    expect(periodIndexOf(monthly, "2026-04-29")).toBe(2);
    expect(periodIndexOf(monthly, "2026-04-30")).toBe(3);
  });

  it("finds periods that last several months", () => {
    const quarterly: PeriodHabit = {
      start_date: "2026-01-15",
      interval_count: 3,
      interval_unit: "month",
      num_periods: 4,
    };
    expect(periodIndexOf(quarterly, "2026-04-14")).toBe(0);
    expect(periodIndexOf(quarterly, "2026-04-15")).toBe(1);
    expect(periodIndexOf(quarterly, "2026-12-31")).toBe(3);
  });
});

describe("habitState", () => {
  it("is not started before the start date", () => {
    expect(habitState(weekly, "2026-11-01")).toBe("not_started");
  });

  it("is active from the start date to the last day", () => {
    expect(habitState(weekly, "2026-11-02")).toBe("active");
    expect(habitState(weekly, "2026-11-29")).toBe("active");
  });

  it("expires on the end date", () => {
    expect(habitState(weekly, "2026-11-30")).toBe("expired");
  });

  it("never expires when indefinite", () => {
    expect(habitState({ ...weekly, num_periods: null }, "2030-01-01")).toBe(
      "active",
    );
  });
});

describe("displayPeriodIndex and completedPeriodCount", () => {
  it("shows the first period before the start, with none completed", () => {
    expect(displayPeriodIndex(weekly, "2026-10-20")).toBe(0);
    expect(completedPeriodCount(weekly, "2026-10-20")).toBe(0);
  });

  it("shows the current period, with earlier ones completed", () => {
    expect(displayPeriodIndex(weekly, "2026-11-17")).toBe(2);
    expect(completedPeriodCount(weekly, "2026-11-17")).toBe(2);
  });

  it("shows the last period once expired, with all completed", () => {
    expect(displayPeriodIndex(weekly, "2026-12-15")).toBe(3);
    expect(completedPeriodCount(weekly, "2026-12-15")).toBe(4);
  });
});

describe("periodCounts", () => {
  it("counts logs in each period, with several on the same day", () => {
    const logs = [
      "2026-11-02",
      "2026-11-02",
      "2026-11-08",
      "2026-11-09",
      "2026-11-29",
    ];
    expect(periodCounts(weekly, logs, "2026-11-20")).toEqual([3, 1, 0, 1]);
  });

  it("counts a log before the start in the first period", () => {
    expect(periodCounts(weekly, ["2026-10-30"], "2026-10-30")).toEqual([
      1, 0, 0, 0,
    ]);
  });

  it("ignores a log on or after the end", () => {
    expect(periodCounts(weekly, ["2026-11-30"], "2026-12-05")).toEqual([
      0, 0, 0, 0,
    ]);
  });

  it("only goes up to the current period for an indefinite habit", () => {
    const habit = { ...weekly, num_periods: null };
    expect(periodCounts(habit, ["2026-11-10"], "2026-11-17")).toEqual([
      0, 1, 0,
    ]);
  });
});
