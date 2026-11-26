import { describe, expect, it } from "vitest";
import {
  check,
  fullMonth,
  habit,
  input,
  times,
} from "../../test/badgeHabits.js";
import { addDays, buildFacts } from "./facts.js";
import { replay } from "./timeline.js";
import type { BadgeHabit } from "./types.js";

// The badges that read past stage, health and streak from the timeline.
// Today is Tue 24 Nov 2026 unless a test says otherwise.

const everyDay = (from: string, n: number) =>
  Array.from({ length: n }, (_, i) => addDays(from, i));
const everyWeek = (from: string, n: number) =>
  Array.from({ length: n }, (_, i) => addDays(from, i * 7));

// Once a week for 8 weeks from Mon 5 Oct, logged in the first `logged` weeks.
const weekly = (logged: number, start = "2026-10-05"): BadgeHabit =>
  habit({
    target_count: 1,
    num_periods: 8,
    start_date: start,
    logs: everyWeek(start, logged),
  });

// Once a day with no end, logged every day from `from` up to today.
const daily = (start: string, from = start, today = "2026-11-24") =>
  habit({
    interval_unit: "day",
    target_count: 1,
    num_periods: null,
    start_date: start,
    logs: everyDay(
      from,
      Math.round((Date.parse(today) - Date.parse(from)) / 864e5) + 1,
    ),
  });

describe("Unbroken and Triple Threat Streak", () => {
  it("earns both for 3 habits on a streak of 8 at once", () => {
    const result = check({ habits: [weekly(8), weekly(8), weekly(8)] });
    expect(result.earned.has("unbroken")).toBe(true);
    expect(result.earned.has("triple-threat-streak")).toBe(true);
  });

  it("shows 2 of 3 when the third habit has no streak", () => {
    const result = check({ habits: [weekly(8), weekly(8), weekly(0)] });
    expect(result.progress.get("unbroken")).toEqual({ count: 2, target: 3 });
  });

  it("does not join streaks that happened at different times", () => {
    // Three 4-week habits one after another, each on a full streak.
    const habits = ["2026-09-07", "2026-10-05", "2026-11-02"].map((start) =>
      habit({
        target_count: 1,
        num_periods: 4,
        start_date: start,
        logs: everyWeek(start, 4),
      }),
    );
    const result = check({ today: "2026-12-05", habits });
    expect(result.progress.get("unbroken")).toEqual({ count: 1, target: 3 });
  });
});

describe("Greenhouse", () => {
  it("earns it for 6 plants at stage 4 at once", () => {
    const habits = Array.from({ length: 6 }, () => habit({ logs: fullMonth }));
    expect(check({ habits }).earned.has("greenhouse")).toBe(true);
  });

  it("shows 5 of 6", () => {
    const habits = Array.from({ length: 5 }, () => habit({ logs: fullMonth }));
    expect(check({ habits }).progress.get("greenhouse")).toEqual({
      count: 5,
      target: 6,
    });
  });
});

describe("Prize Winner", () => {
  it("earns it for 4 weeks at stage 4 and Healthy", () => {
    // Six logs on day one reach 75% of the 8 needed, so stage 4 at once.
    const front = habit({
      target_count: 1,
      num_periods: 8,
      start_date: "2026-10-05",
      logs: [...times("2026-10-05", 6), ...everyWeek("2026-10-12", 7)],
    });
    expect(check({ habits: [front] }).earned.has("prize-winner")).toBe(true);
  });

  it("counts only the weeks after the plant reached stage 4", () => {
    // Stage 4 with the sixth log on Nov 9: the weeks of Nov 9 and 16 count.
    const result = check({ habits: [weekly(8)] });
    expect(result.progress.get("prize-winner")).toEqual({
      count: 2,
      target: 4,
    });
  });
});

describe("Wilted but Not Dead, Phoenix Plant and Resurrection", () => {
  // Daily for 30 days from 1 Oct (last day 30 Oct). Logged on Oct 1 and 2,
  // then missed `gap` days, then every day to the end, with extra logs on the
  // last day to reach 100%.
  const comeback = (gap: number) => {
    const back = addDays("2026-10-03", gap);
    const logs = ["2026-10-01", "2026-10-02", ...everyDay(back, 28 - gap)];
    return habit({
      interval_unit: "day",
      target_count: 1,
      num_periods: 30,
      start_date: "2026-10-01",
      logs: [...logs, ...times("2026-10-30", 30 - logs.length)],
    });
  };

  it("earns all three for a Gold after the plant wilted and recovered", () => {
    const result = check({ habits: [comeback(5)] });
    expect(result.earned.has("wilted-not-dead")).toBe(true);
    expect(result.earned.has("phoenix-plant")).toBe(true);
    expect(result.earned.has("resurrection")).toBe(true);
  });

  it("earns Phoenix Plant but not Resurrection for a Silver", () => {
    // Eight missed days leave consistency at 22 of 30, below Gold.
    const result = check({ habits: [comeback(8)] });
    expect(result.earned.has("phoenix-plant")).toBe(true);
    expect(result.earned.has("resurrection")).toBe(false);
  });

  it("does not earn them for a plant that never wilted", () => {
    const result = check({
      today: "2026-12-05",
      habits: [habit({ logs: fullMonth })],
    });
    expect(result.earned.has("wilted-not-dead")).toBe(false);
    expect(result.earned.has("resurrection")).toBe(false);
  });

  it("does not earn Wilted but Not Dead while the plant is still wilted", () => {
    const result = check({ habits: [weekly(0)] });
    expect(result.earned.has("wilted-not-dead")).toBe(false);
  });
});

describe("Everything Everywhere", () => {
  it("earns it for 5 Healthy plants over 56 days", () => {
    const habits = Array.from({ length: 5 }, () => daily("2026-09-30"));
    expect(check({ habits }).earned.has("everything-everywhere")).toBe(true);
  });

  it("shows 55 of 56 a day short", () => {
    const habits = Array.from({ length: 5 }, () => daily("2026-10-01"));
    expect(check({ habits }).progress.get("everything-everywhere")).toEqual({
      count: 55,
      target: 56,
    });
  });

  it("needs 5 active plants", () => {
    const habits = Array.from({ length: 4 }, () => daily("2026-09-01"));
    expect(check({ habits }).progress.get("everything-everywhere")).toEqual({
      count: 0,
      target: 56,
    });
  });

  it("breaks when one plant wilts", () => {
    const habits = [
      ...Array.from({ length: 4 }, () => daily("2026-09-01")),
      // Stops logging on Oct 31, so it wilts in early November.
      daily("2026-09-01", "2026-09-01", "2026-10-31"),
    ];
    const result = check({ habits });
    const count = result.progress.get("everything-everywhere")?.count ?? 0;
    expect(count).toBeGreaterThan(56);
    expect(count).toBeLessThan(70);
  });
});

describe("Untouchable", () => {
  it("earns it for a year with no Wilted plants", () => {
    const result = check({ habits: [daily("2025-11-25")] });
    expect(result.earned.has("untouchable")).toBe(true);
  });

  it("shows 364 of 365 a day short", () => {
    const result = check({ habits: [daily("2025-11-26")] });
    expect(result.progress.get("untouchable")).toEqual({
      count: 364,
      target: 365,
    });
  });

  it("needs at least one active plant", () => {
    expect(check().progress.get("untouchable")).toEqual({
      count: 0,
      target: 365,
    });
  });
});

describe("replay speed", () => {
  // Only the replay: the per-habit stats before it (buildFacts) have their
  // own cost, which this branch does not change.
  it("replays 20 daily habits with a year of logs quickly", () => {
    const habits = Array.from({ length: 20 }, () => daily("2025-11-25"));
    const facts = buildFacts(input({ habits }));
    const started = performance.now();
    replay(facts);
    expect(performance.now() - started).toBeLessThan(100);
  });
});
