import { describe, expect, it } from "vitest";
import {
  averageConsistency,
  consistency,
  currentPeriodProgress,
  currentStreak,
  overallProgress,
  periodSummaries,
  type ProgressHabit,
} from "./progress.js";

// Gym 3 times a week for 4 weeks, starting Monday 2 Nov 2026. The periods
// start on 2, 9, 16 and 23 Nov, and the habit ends on 30 Nov.
const gym: ProgressHabit = {
  start_date: "2026-11-02",
  interval_count: 1,
  interval_unit: "week",
  num_periods: 4,
  target_count: 3,
};

// n logs, all on one day.
const logs = (date: string, n: number) => Array<string>(n).fill(date);

// The example in the design doc: 5 + 1 + 4 + 2 logs, giving 12 of 12.
const designExample = [
  ...logs("2026-11-03", 5),
  ...logs("2026-11-10", 1),
  ...logs("2026-11-17", 4),
  ...logs("2026-11-24", 2),
];
const afterEnd = "2026-12-01";

describe("periodSummaries", () => {
  it("lists every period with its count, whether it was met and its status", () => {
    const summaries = periodSummaries(gym, designExample, "2026-11-18");
    expect(summaries.map((p) => [p.number, p.count, p.met, p.status])).toEqual([
      [1, 5, true, "completed"],
      [2, 1, false, "completed"],
      [3, 4, true, "current"],
      [4, 2, false, "upcoming"],
    ]);
    expect(summaries[0]).toMatchObject({
      start: "2026-11-02",
      end: "2026-11-09",
      target: 3,
    });
  });

  it("marks every period upcoming before the start", () => {
    const statuses = periodSummaries(gym, [], "2026-10-30").map(
      (p) => p.status,
    );
    expect(statuses).toEqual(["upcoming", "upcoming", "upcoming", "upcoming"]);
  });

  it("marks every period completed once the habit has expired", () => {
    const statuses = periodSummaries(gym, [], afterEnd).map((p) => p.status);
    expect(statuses).toEqual([
      "completed",
      "completed",
      "completed",
      "completed",
    ]);
  });
});

describe("currentPeriodProgress (rule 8.2)", () => {
  it("is the count over the target", () => {
    const progress = currentPeriodProgress(
      gym,
      logs("2026-11-10", 2),
      "2026-11-11",
    );
    expect(progress).toMatchObject({
      number: 2,
      start: "2026-11-09",
      end: "2026-11-16",
      count: 2,
      target: 3,
    });
    expect(progress.fraction).toBeCloseTo(2 / 3);
  });

  it("caps the bar at 100% while the count can pass the target", () => {
    const progress = currentPeriodProgress(
      gym,
      logs("2026-11-10", 4),
      "2026-11-11",
    );
    expect(progress.count).toBe(4);
    expect(progress.fraction).toBe(1);
  });

  it("shows the first period, with its logs, before the start", () => {
    const progress = currentPeriodProgress(gym, ["2026-10-30"], "2026-10-30");
    expect(progress).toMatchObject({
      number: 1,
      count: 1,
      start: "2026-11-02",
    });
  });

  it("shows the last period after the end", () => {
    const progress = currentPeriodProgress(gym, designExample, afterEnd);
    expect(progress).toMatchObject({ number: 4, count: 2 });
  });
});

describe("overallProgress (rule 8.3)", () => {
  it("lets extra logs make up for a shortfall: 5 + 1 + 4 + 2 of 12 is 100%", () => {
    expect(overallProgress(gym, designExample, afterEnd)).toBe(1);
  });

  it("is a share of the total target", () => {
    // 3 logs of a total target of 12.
    expect(overallProgress(gym, logs("2026-11-03", 3), "2026-11-04")).toBe(
      0.25,
    );
  });

  it("is 0 with no logs", () => {
    expect(overallProgress(gym, [], "2026-11-04")).toBe(0);
  });

  it("caps at 100%", () => {
    expect(overallProgress(gym, logs("2026-11-03", 20), "2026-11-04")).toBe(1);
  });

  it("is null for an indefinite habit", () => {
    expect(
      overallProgress({ ...gym, num_periods: null }, [], "2026-11-04"),
    ).toBeNull();
  });
});

describe("consistency (rules 8.4)", () => {
  it("is successful completed periods over completed periods: 2 of 4 is 50%", () => {
    expect(consistency(gym, designExample, afterEnd)).toEqual({
      successful: 2,
      completed: 4,
      rate: 0.5,
    });
  });

  it("leaves out the period in progress", () => {
    // Week 1 is done and met. Week 2 is in progress with 0 logs.
    expect(consistency(gym, logs("2026-11-03", 3), "2026-11-10")).toEqual({
      successful: 1,
      completed: 1,
      rate: 1,
    });
  });

  it("is null before any period has finished", () => {
    expect(consistency(gym, [], "2026-11-04")).toEqual({
      successful: 0,
      completed: 0,
      rate: null,
    });
  });
});

describe("currentStreak (rule 8.6)", () => {
  const met = (date: string) => logs(date, 3);

  it("counts consecutive met periods", () => {
    const all = [
      ...met("2026-11-03"),
      ...met("2026-11-10"),
      ...met("2026-11-17"),
    ];
    expect(currentStreak(gym, all, "2026-11-24")).toBe(3);
  });

  it("resets to 0 on a miss, and counts only the periods after it", () => {
    // Week 1 met, week 2 missed, week 3 met, now in week 4 with 0 logs.
    const all = [
      ...met("2026-11-03"),
      ...logs("2026-11-10", 1),
      ...met("2026-11-17"),
    ];
    expect(currentStreak(gym, all, "2026-11-24")).toBe(1);
    // Add the miss at the end: nothing after the miss was met.
    expect(currentStreak(gym, all.slice(0, 4), "2026-11-24")).toBe(0);
  });

  it("does not break the streak while the current period is unmet", () => {
    const all = [...met("2026-11-03"), ...met("2026-11-10")];
    // In week 3 with no logs yet: the two met weeks still count.
    expect(currentStreak(gym, all, "2026-11-17")).toBe(2);
  });

  it("counts the current period once its target is met", () => {
    const all = [
      ...met("2026-11-03"),
      ...met("2026-11-10"),
      ...met("2026-11-17"),
    ];
    expect(currentStreak(gym, all, "2026-11-18")).toBe(3);
  });

  it("is 1 for a met current period after a missed one", () => {
    const all = [...logs("2026-11-03", 1), ...met("2026-11-10")];
    expect(currentStreak(gym, all, "2026-11-11")).toBe(1);
  });

  it("is 0 before the start, even with a log", () => {
    expect(currentStreak(gym, met("2026-10-30"), "2026-10-30")).toBe(0);
  });

  it("uses the final run once the habit has expired", () => {
    const all = [...met("2026-11-17"), ...met("2026-11-24")];
    expect(currentStreak(gym, all, afterEnd)).toBe(2);
  });
});

describe("averageConsistency (rule 8.5)", () => {
  it("averages the rates", () => {
    expect(averageConsistency([1, 0.5, 0])).toBe(0.5);
  });

  it("leaves out habits that have not finished a period", () => {
    expect(averageConsistency([1, null, 0.5])).toBe(0.75);
  });

  it("is null when no habit has finished a period", () => {
    expect(averageConsistency([null, null])).toBeNull();
    expect(averageConsistency([])).toBeNull();
  });
});
