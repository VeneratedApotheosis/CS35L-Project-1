import { describe, expect, it } from "vitest";
import { buildHistory, type HistorySourceHabit } from "./history.js";

const TODAY = "2026-11-30";

// Weekly, once a week, 4 weeks from Mon Oct 5: runs Oct 5 to Nov 1, ends Nov 2.
const habit = (
  id: string,
  extra: Partial<HistorySourceHabit> = {},
): HistorySourceHabit => ({
  id,
  name: id,
  description: null,
  plant_type: "pothos",
  target_count: 1,
  interval_count: 1,
  interval_unit: "week",
  num_periods: 4,
  start_date: "2026-10-05",
  ...extra,
});

const WEEKS = ["2026-10-05", "2026-10-12", "2026-10-19", "2026-10-26"];

describe("buildHistory", () => {
  it("returns an empty history with no habits", () => {
    expect(buildHistory([], TODAY)).toEqual({
      summary: {
        finished: 0,
        by_level: { gold: 0, silver: 0, bronze: 0, none: 0 },
        total_logs: 0,
        average_final_progress: null,
        next_end_date: null,
      },
      habits: [],
    });
  });

  it("gives a finished habit its final numbers", () => {
    const { habits } = buildHistory(
      [{ habit: habit("run"), logDates: [...WEEKS, "2026-10-06"] }],
      TODAY,
    );
    expect(habits).toEqual([
      expect.objectContaining({
        id: "run",
        end_date: "2026-11-02",
        last_day: "2026-11-01",
        badge: "gold",
        final_progress: 1,
        final_consistency: 1,
        periods_met: 4,
        periods_total: 4,
        total_logs: 5,
        best_streak: 4,
        stage: 4,
      }),
    ]);
  });

  it("keeps the longest streak, not the last one", () => {
    const { habits } = buildHistory(
      [{ habit: habit("read"), logDates: [WEEKS[0]!, WEEKS[1]!, WEEKS[3]!] }],
      TODAY,
    );
    expect(habits[0]).toMatchObject({
      badge: "bronze",
      periods_met: 3,
      best_streak: 2,
    });
  });

  it("leaves out running habits but uses them for the next end date", () => {
    const history = buildHistory(
      [
        { habit: habit("done"), logDates: [] },
        { habit: habit("soon", { start_date: "2026-11-23" }), logDates: [] },
        { habit: habit("later", { start_date: "2026-12-07" }), logDates: [] },
        {
          habit: habit("forever", {
            num_periods: null,
            start_date: "2026-11-02",
          }),
          logDates: [],
        },
      ],
      TODAY,
    );
    expect(history.habits.map((h) => h.id)).toEqual(["done"]);
    expect(history.summary.next_end_date).toBe("2026-12-21");
  });

  it("summarizes every finished habit whatever the filter", () => {
    const history = buildHistory(
      [
        { habit: habit("gold"), logDates: WEEKS },
        { habit: habit("none"), logDates: [WEEKS[0]!] },
      ],
      TODAY,
      { level: "gold" },
    );
    expect(history.habits.map((h) => h.id)).toEqual(["gold"]);
    expect(history.summary).toMatchObject({
      finished: 2,
      by_level: { gold: 1, silver: 0, bronze: 0, none: 1 },
      total_logs: 5,
      average_final_progress: 0.625,
    });
  });

  it("sorts newest first by default, oldest first, or best result first", () => {
    const items = [
      { habit: habit("older-gold"), logDates: WEEKS },
      {
        habit: habit("newer-bronze", { start_date: "2026-10-12" }),
        logDates: ["2026-10-12", "2026-10-19", "2026-10-26"],
      },
      {
        habit: habit("newest-none", { start_date: "2026-10-19" }),
        logDates: [],
      },
    ];
    const ids = (sort?: "newest" | "oldest" | "best") =>
      buildHistory(items, TODAY, { sort }).habits.map((h) => h.id);
    expect(ids()).toEqual(["newest-none", "newer-bronze", "older-gold"]);
    expect(ids("oldest")).toEqual([
      "older-gold",
      "newer-bronze",
      "newest-none",
    ]);
    expect(ids("best")).toEqual(["older-gold", "newer-bronze", "newest-none"]);
  });
});
