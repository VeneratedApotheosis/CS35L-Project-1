import { describe, expect, it } from "vitest";
import {
  buildDashboard,
  type DashboardHabit,
  type DashboardItem,
} from "./dashboard.js";

// Habits that meet a target of 1 a week unless a log is missing. "Today" is
// Monday 30 Nov 2026, so a habit that started on 2 Nov is in its 5th week.
const today = "2026-11-30";

const habit = (
  id: string,
  name: string,
  overrides: Partial<DashboardHabit> = {},
): DashboardHabit => ({
  id,
  name,
  plant_type: "pothos",
  start_date: "2026-11-02",
  interval_count: 1,
  interval_unit: "week",
  num_periods: 10,
  target_count: 1,
  ...overrides,
});

// A log in each of these weeks of a habit that started on 2 Nov (0 is the first).
const WEEKS = [
  "2026-11-02",
  "2026-11-09",
  "2026-11-16",
  "2026-11-23",
  "2026-11-30",
];
const inWeeks = (...weeks: number[]) => weeks.map((w) => WEEKS[w] as string);

const item = (h: DashboardHabit, logDates: string[] = []): DashboardItem => ({
  habit: h,
  logDates,
});

describe("buildDashboard", () => {
  it("is empty for a user with no habits", () => {
    expect(buildDashboard([], today)).toEqual({
      active_count: 0,
      overall_consistency: null,
      best_streak: null,
      habits: [],
      needs_attention: [],
      finished: [],
    });
  });

  it("counts habits that are not expired, including ones not started", () => {
    const dashboard = buildDashboard(
      [
        item(habit("a", "Read"), inWeeks(0, 1, 2, 3)),
        item(habit("b", "Run", { start_date: "2026-12-14" })),
        item(habit("c", "Old", { start_date: "2026-09-01", num_periods: 4 })),
      ],
      today,
    );
    expect(dashboard.active_count).toBe(2);
    expect(dashboard.habits.map((h) => [h.name, h.state])).toEqual([
      ["Read", "active"],
      ["Run", "not_started"],
    ]);
  });

  it("averages consistency over habits that finished a period (rule 8.5)", () => {
    const dashboard = buildDashboard(
      [
        // 4 of 4 completed weeks met: 100%.
        item(habit("a", "Read"), inWeeks(0, 1, 2, 3)),
        // 2 of 4 met: 50%.
        item(habit("b", "Run"), inWeeks(0, 2)),
        // Not started: no completed period, left out of the average.
        item(habit("c", "Swim", { start_date: "2026-12-14" })),
      ],
      today,
    );
    expect(dashboard.overall_consistency).toBe(0.75);
  });

  it("has no overall consistency until a period has finished", () => {
    const dashboard = buildDashboard(
      [item(habit("a", "Read", { start_date: "2026-11-30" }))],
      today,
    );
    expect(dashboard.overall_consistency).toBeNull();
  });

  it("lists each active habit's streak, longest first, and names the best", () => {
    const dashboard = buildDashboard(
      [
        item(habit("a", "Run"), inWeeks(2, 3)), // streak 2 (week 5 not met yet)
        item(habit("b", "Read"), inWeeks(0, 1, 2, 3, 4)), // streak 5
        item(habit("c", "Swim")), // streak 0
      ],
      today,
    );
    expect(dashboard.habits.map((h) => [h.name, h.streak])).toEqual([
      ["Read", 5],
      ["Run", 2],
      ["Swim", 0],
    ]);
    expect(dashboard.best_streak).toEqual({ id: "b", name: "Read", streak: 5 });
  });

  it("has no best streak when every streak is 0", () => {
    const dashboard = buildDashboard([item(habit("a", "Run"))], today);
    expect(dashboard.best_streak).toBeNull();
  });

  it("needs attention for plants that are not healthy, wilted first", () => {
    const dashboard = buildDashboard(
      [
        item(habit("a", "Read"), inWeeks(0, 1, 2, 3)), // healthy
        item(habit("b", "Run"), inWeeks(0, 1, 3)), // 3 of 4: slightly wilted
        item(habit("c", "Swim"), inWeeks(3)), // 1 of 4: wilted
      ],
      today,
    );
    expect(dashboard.needs_attention.map((h) => [h.name, h.health])).toEqual([
      ["Swim", "wilted"],
      ["Run", "slightly_wilted"],
    ]);
  });

  it("includes a habit whose last completed period was missed", () => {
    // Met weeks 1 to 3, missed week 4: 3 of 4, so slightly wilted.
    const dashboard = buildDashboard(
      [item(habit("a", "Read"), inWeeks(0, 1, 2))],
      today,
    );
    expect(dashboard.needs_attention.map((h) => h.name)).toEqual(["Read"]);
  });

  it("does not flag a habit that has not finished a period", () => {
    const dashboard = buildDashboard(
      [item(habit("a", "Read", { start_date: "2026-11-30" }))],
      today,
    );
    expect(dashboard.needs_attention).toEqual([]);
  });

  describe("finished habits", () => {
    // 3 times a week for 4 weeks, from 2 Nov: ended 30 Nov, so expired today.
    const gym = (id: string, name: string, extra = {}) =>
      habit(id, name, {
        num_periods: 4,
        target_count: 3,
        plant_type: "rose",
        ...extra,
      });
    const week = (date: string, n: number) => Array<string>(n).fill(date);

    it("lists expired habits with their badge", () => {
      const all = [
        ...week("2026-11-03", 3),
        ...week("2026-11-10", 3),
        ...week("2026-11-17", 3),
        ...week("2026-11-24", 3),
      ];
      const dashboard = buildDashboard([item(gym("g", "Gym"), all)], today);
      expect(dashboard.finished).toEqual([
        {
          id: "g",
          name: "Gym",
          plant_type: "rose",
          end_date: "2026-11-30",
          progress: 1,
          consistency: 1,
          badge: "gold",
        },
      ]);
      expect(dashboard.active_count).toBe(0);
    });

    it("marks a failed habit with the none badge", () => {
      const dashboard = buildDashboard(
        [item(gym("g", "Gym"), week("2026-11-03", 3))],
        today,
      );
      expect(dashboard.finished[0]).toMatchObject({
        progress: 0.25,
        badge: "none",
      });
    });

    it("sorts the most recently ended first", () => {
      const dashboard = buildDashboard(
        [
          item(gym("a", "Older", { start_date: "2026-10-05" })), // ended 2 Nov
          item(gym("b", "Newer")), // ended 30 Nov
        ],
        today,
      );
      expect(dashboard.finished.map((h) => h.name)).toEqual(["Newer", "Older"]);
    });

    it("keeps finished habits out of the active list and the average", () => {
      const dashboard = buildDashboard([item(gym("g", "Gym"))], today);
      expect(dashboard.habits).toEqual([]);
      expect(dashboard.overall_consistency).toBeNull();
      expect(dashboard.needs_attention).toEqual([]);
    });
  });
});
