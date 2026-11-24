import { describe, expect, it } from "vitest";
import { check, fullMonth, habit } from "../../test/badgeHabits.js";
import { addDays } from "./facts.js";
import type { BadgeHabit } from "./types.js";

const after = "2026-12-05";

const everyDay = (from: string, n: number) =>
  Array.from({ length: n }, (_, i) => addDays(from, i));
const everyWeek = (from: string, n: number) =>
  Array.from({ length: n }, (_, i) => addDays(from, i * 7));

const gold = () => habit({ logs: fullMonth });

// Once a day for `days` days from `start`, logged every day: a Gold.
const dailyGold = (start: string, days = 3): BadgeHabit =>
  habit({
    interval_unit: "day",
    target_count: 1,
    num_periods: days,
    start_date: start,
    logs: everyDay(start, days),
  });

// Once a week for `weeks` weeks from `start` (a Monday), logged every week.
const weeklyGold = (start: string, weeks: number): BadgeHabit =>
  habit({
    target_count: 1,
    num_periods: weeks,
    start_date: start,
    logs: everyWeek(start, weeks),
  });

describe("Iron Routine", () => {
  it("earns it for 3 habits finished at 100% consistency", () => {
    const result = check({ today: after, habits: [gold(), gold(), gold()] });
    expect(result.earned.has("iron-routine")).toBe(true);
  });

  it("shows 2 of 3", () => {
    const result = check({ today: after, habits: [gold(), gold()] });
    expect(result.progress.get("iron-routine")).toEqual({
      count: 2,
      target: 3,
    });
  });
});

describe("The Hundred Days and Perfect Year", () => {
  const indefinite = (days: number) =>
    habit({
      interval_unit: "day",
      target_count: 1,
      num_periods: null,
      start_date: "2026-08-01",
      logs: everyDay("2026-08-01", days),
    });

  it("earns The Hundred Days for 100 days in a row", () => {
    const result = check({ habits: [indefinite(100)] });
    expect(result.earned.has("hundred-days")).toBe(true);
    expect(result.progress.get("perfect-year")).toEqual({
      count: 100,
      target: 365,
    });
  });

  it("shows 99 of 100 a day short", () => {
    const result = check({ habits: [indefinite(99)] });
    expect(result.earned.has("hundred-days")).toBe(false);
    expect(result.progress.get("hundred-days")).toEqual({
      count: 99,
      target: 100,
    });
  });

  it("joins days logged on different habits", () => {
    const a = habit({
      interval_unit: "day",
      target_count: 1,
      num_periods: null,
      start_date: "2026-08-01",
      logs: everyDay("2026-08-01", 50),
    });
    const b = habit({
      interval_unit: "day",
      target_count: 1,
      num_periods: null,
      start_date: "2026-08-01",
      logs: everyDay("2026-09-20", 50),
    });
    expect(check({ habits: [a, b] }).earned.has("hundred-days")).toBe(true);
  });
});

describe("Quit Quitting", () => {
  // Eight weeks from Mon 28 Sep 2026, so the last day is Sun 22 Nov.
  const eightWeeks = () => weeklyGold("2026-09-28", 8);

  it("earns it for 5 finished habits of 8 or more periods", () => {
    const habits = Array.from({ length: 5 }, eightWeeks);
    expect(check({ habits }).earned.has("quit-quitting")).toBe(true);
  });

  it("does not count a habit of 7 periods", () => {
    const habits = [
      ...Array.from({ length: 4 }, eightWeeks),
      weeklyGold("2026-10-05", 7),
    ];
    const result = check({ habits });
    expect(result.progress.get("quit-quitting")).toEqual({
      count: 4,
      target: 5,
    });
  });
});

describe("Grandmaster Gardener", () => {
  it("earns it for 25 Golds and shows 24 of 25 one short", () => {
    const habits = Array.from({ length: 25 }, gold);
    expect(check({ today: after, habits }).earned.has("grandmaster")).toBe(
      true,
    );
    expect(
      check({ today: after, habits: habits.slice(1) }).progress.get(
        "grandmaster",
      ),
    ).toEqual({ count: 24, target: 25 });
  });
});

describe("Four Seasons", () => {
  it("earns it for habits that end in every season of one year", () => {
    const habits = ["2026-01-10", "2026-04-10", "2026-07-10", "2026-10-10"].map(
      (start) => dailyGold(start),
    );
    expect(check({ habits }).earned.has("four-seasons")).toBe(true);
  });

  it("does not join seasons from different years", () => {
    const habits = ["2025-01-10", "2026-04-10", "2026-07-10", "2026-10-10"].map(
      (start) => dailyGold(start),
    );
    const result = check({ habits });
    expect(result.earned.has("four-seasons")).toBe(false);
    expect(result.progress.get("four-seasons")).toEqual({
      count: 3,
      target: 4,
    });
  });
});

describe("Year in Bloom", () => {
  it("earns it for a weekly habit that ran 52 weeks", () => {
    const result = check({ habits: [weeklyGold("2025-11-03", 52)] });
    expect(result.earned.has("year-in-bloom")).toBe(true);
  });

  it("does not earn it for 51 weeks", () => {
    const result = check({ habits: [weeklyGold("2025-11-10", 51)] });
    expect(result.earned.has("year-in-bloom")).toBe(false);
  });

  it("does not count a daily habit", () => {
    const result = check({ habits: [dailyGold("2025-11-01", 365)] });
    expect(result.earned.has("year-in-bloom")).toBe(false);
  });
});

describe("Triple Crown", () => {
  const monthly = habit({
    interval_unit: "month",
    target_count: 1,
    num_periods: 2,
    start_date: "2026-09-01",
    logs: ["2026-09-05", "2026-10-05"],
  });

  it("earns it for a Gold on a daily, a weekly and a monthly habit", () => {
    const result = check({
      today: after,
      habits: [dailyGold("2026-10-01"), gold(), monthly],
    });
    expect(result.earned.has("triple-crown")).toBe(true);
  });

  it("shows 2 of 3 without the monthly one", () => {
    const result = check({
      today: after,
      habits: [dailyGold("2026-10-01"), gold()],
    });
    expect(result.progress.get("triple-crown")).toEqual({
      count: 2,
      target: 3,
    });
  });
});
