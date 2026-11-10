import { describe, expect, it } from "vitest";
import { fullStats, shortStats, type StatsHabit } from "./stats.js";

// Gym 3 times a week for 4 weeks from Monday 2 Nov 2026. Ends on 30 Nov.
const gym: StatsHabit = {
  start_date: "2026-11-02",
  interval_count: 1,
  interval_unit: "week",
  num_periods: 4,
  target_count: 3,
};
const entry = (id: string, occurred_on: string) => ({ id, occurred_on });

describe("shortStats", () => {
  it("describes a new habit with no logs", () => {
    expect(shortStats(gym, [], "2026-11-04")).toEqual({
      state: "active",
      current_period: {
        number: 1,
        total: 4,
        start: "2026-11-02",
        end: "2026-11-09",
        count: 0,
        target: 3,
      },
      overall_progress: 0,
      stage: 1,
      health: "healthy",
    });
  });

  it("reports the count, progress, stage and health from the logs", () => {
    // Week 1: 3 logs (met). Week 2 so far: 3 logs. 6 of 12 is 50%.
    const dates = [
      ...Array<string>(3).fill("2026-11-03"),
      ...Array<string>(3).fill("2026-11-10"),
    ];
    const stats = shortStats(gym, dates, "2026-11-11");
    expect(stats.current_period).toMatchObject({ number: 2, count: 3 });
    expect(stats.overall_progress).toBe(0.5);
    expect(stats.stage).toBe(3);
    expect(stats.health).toBe("healthy");
  });

  it("shows the first period, with its logs, for a habit not started yet", () => {
    const stats = shortStats(gym, ["2026-10-30"], "2026-10-30");
    expect(stats.state).toBe("not_started");
    expect(stats.current_period).toMatchObject({ number: 1, count: 1 });
  });

  it("is expired with the last period shown after the end", () => {
    const stats = shortStats(gym, [], "2026-12-01");
    expect(stats.state).toBe("expired");
    expect(stats.current_period.number).toBe(4);
    expect(stats.health).toBe("wilted");
  });

  it("has a null total and progress for an indefinite habit", () => {
    const stats = shortStats({ ...gym, num_periods: null }, [], "2026-11-04");
    expect(stats.current_period.total).toBeNull();
    expect(stats.overall_progress).toBeNull();
    expect(stats.stage).toBe(1);
  });
});

describe("fullStats", () => {
  const logs = [
    entry("a", "2026-11-10"),
    entry("b", "2026-11-03"),
    entry("c", "2026-11-03"),
    entry("d", "2026-11-04"),
  ];

  it("includes everything in the short stats", () => {
    const dates = logs.map((log) => log.occurred_on);
    const full = fullStats(gym, logs, "2026-11-11");
    expect(full).toMatchObject(shortStats(gym, dates, "2026-11-11"));
  });

  it("adds the end date, consistency and streak", () => {
    const full = fullStats(gym, logs, "2026-11-11");
    expect(full.end_date).toBe("2026-11-30");
    // Week 1 has 3 logs, so it was met.
    expect(full.consistency).toEqual({ successful: 1, completed: 1, rate: 1 });
    expect(full.streak).toBe(1);
  });

  it("lists every period", () => {
    const full = fullStats(gym, logs, "2026-11-11");
    expect(full.periods.map((p) => [p.number, p.count, p.status])).toEqual([
      [1, 3, "completed"],
      [2, 1, "current"],
      [3, 0, "upcoming"],
      [4, 0, "upcoming"],
    ]);
  });

  it("counts logs per day, oldest day first", () => {
    const full = fullStats(gym, logs, "2026-11-11");
    expect(full.log_days).toEqual([
      { date: "2026-11-03", count: 2 },
      { date: "2026-11-04", count: 1 },
      { date: "2026-11-10", count: 1 },
    ]);
  });

  it("lists only the current period's logs for deleting, with their ids", () => {
    const full = fullStats(gym, logs, "2026-11-11");
    expect(full.current_period_logs).toEqual([entry("a", "2026-11-10")]);
  });

  it("lists no deletable logs once the habit has expired", () => {
    const full = fullStats(gym, logs, "2026-12-01");
    expect(full.current_period_logs).toEqual([]);
    expect(full.log_days).toHaveLength(3);
  });

  it("lets a log made before the start be deleted", () => {
    const early = [entry("e", "2026-10-30")];
    const full = fullStats(gym, early, "2026-10-30");
    expect(full.current_period_logs).toEqual(early);
  });

  it("has a null end date for an indefinite habit", () => {
    expect(
      fullStats({ ...gym, num_periods: null }, [], "2026-11-04").end_date,
    ).toBeNull();
  });
});
