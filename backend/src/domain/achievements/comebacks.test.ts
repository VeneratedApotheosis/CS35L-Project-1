import { describe, expect, it } from "vitest";
import { check, fullMonth, habit, times } from "../../test/badgeHabits.js";

// The default habit is 3 times a week for 4 weeks from Mon 2 Nov 2026. Its
// weeks start on Nov 2, 9, 16 and 23, and its last day is Sun 29 Nov. Today
// is Tue 24 Nov unless a test says otherwise.

const week1 = times("2026-11-03", 3);
const week2 = times("2026-11-10", 3);
const week3 = times("2026-11-17", 3);
const week4 = times("2026-11-24", 3);
const after = "2026-12-05";

describe("Second Wind and Bounce Back", () => {
  it("earns Second Wind for a met week right after a missed one", () => {
    const result = check({ habits: [habit({ logs: [...week1, ...week3] })] });
    expect(result.earned.has("second-wind")).toBe(true);
    expect(result.progress.get("bounce-back")).toEqual({ count: 1, target: 3 });
  });

  it("counts the current period once it is met", () => {
    const result = check({ habits: [habit({ logs: week4 })] });
    expect(result.earned.has("second-wind")).toBe(true);
  });

  it("does not count a current period that is not met yet as a miss", () => {
    const result = check({
      habits: [habit({ logs: [...week1, ...week2, ...week3] })],
    });
    expect(result.earned.has("second-wind")).toBe(false);
  });

  it("earns Bounce Back for 3 met weeks right after a miss", () => {
    const result = check({
      today: after,
      habits: [habit({ logs: [...week2, ...week3, ...week4] })],
    });
    expect(result.earned.has("bounce-back")).toBe(true);
  });

  it("shows 2 of 3 for Bounce Back after two met weeks", () => {
    const result = check({
      today: after,
      habits: [habit({ logs: [...week3, ...week4] })],
    });
    expect(result.earned.has("bounce-back")).toBe(false);
    expect(result.progress.get("bounce-back")).toEqual({ count: 2, target: 3 });
  });
});

describe("Welcome Back", () => {
  const start = { start_date: "2026-10-26", num_periods: 5 };

  it("earns it after 14 days with no logs", () => {
    const result = check({
      habits: [habit({ ...start, logs: ["2026-11-01", "2026-11-16"] })],
    });
    expect(result.earned.has("welcome-back")).toBe(true);
  });

  it("does not earn it after 13 quiet days", () => {
    const result = check({
      habits: [habit({ ...start, logs: ["2026-11-01", "2026-11-15"] })],
    });
    expect(result.earned.has("welcome-back")).toBe(false);
  });

  it("counts logs on every habit, not one at a time", () => {
    const result = check({
      habits: [
        habit({ ...start, logs: ["2026-11-01", "2026-11-16"] }),
        habit({ ...start, logs: ["2026-11-08"] }),
      ],
    });
    expect(result.earned.has("welcome-back")).toBe(false);
  });
});

describe("Clutch", () => {
  it("earns it when the last day of a week meets the target", () => {
    const result = check({
      habits: [habit({ logs: [...times("2026-11-03", 2), "2026-11-08"] })],
    });
    expect(result.earned.has("clutch")).toBe(true);
  });

  it("does not earn it when the target was met earlier in the week", () => {
    const early = check({
      habits: [habit({ logs: [...times("2026-11-03", 2), "2026-11-07"] })],
    });
    const already = check({
      habits: [habit({ logs: [...times("2026-11-03", 3), "2026-11-08"] })],
    });
    expect(early.earned.has("clutch")).toBe(false);
    expect(already.earned.has("clutch")).toBe(false);
  });

  it("does not count one-day periods", () => {
    const daily = habit({
      interval_unit: "day",
      target_count: 1,
      num_periods: 3,
      logs: ["2026-11-02", "2026-11-03", "2026-11-04"],
    });
    expect(check({ habits: [daily] }).earned.has("clutch")).toBe(false);
  });
});

describe("Down to the Wire", () => {
  it("earns it when the last day's logs reach 100%", () => {
    const logs = [
      ...week1,
      ...week2,
      ...week3,
      ...times("2026-11-24", 2),
      "2026-11-29",
    ];
    const result = check({ today: after, habits: [habit({ logs })] });
    expect(result.earned.has("down-to-the-wire")).toBe(true);
  });

  it("does not earn it when the final week was met before the last day", () => {
    const result = check({
      today: after,
      habits: [habit({ logs: fullMonth })],
    });
    expect(result.earned.has("down-to-the-wire")).toBe(false);
  });

  it("does not earn it when 100% was already reached", () => {
    const logs = [
      ...times("2026-11-03", 4),
      ...times("2026-11-10", 4),
      ...times("2026-11-17", 4),
      ...times("2026-11-24", 2),
      "2026-11-29",
    ];
    const result = check({ today: after, habits: [habit({ logs })] });
    expect(result.earned.has("clutch")).toBe(true);
    expect(result.earned.has("down-to-the-wire")).toBe(false);
  });

  it("waits until the habit has finished", () => {
    const logs = [
      ...week1,
      ...week2,
      ...week3,
      ...times("2026-11-24", 2),
      "2026-11-29",
    ];
    const result = check({ today: "2026-11-29", habits: [habit({ logs })] });
    expect(result.earned.has("down-to-the-wire")).toBe(false);
  });
});

describe("comebacks that need the timeline", () => {
  it("are listed but not built yet", () => {
    const result = check({
      today: after,
      habits: [habit({ logs: fullMonth })],
    });
    for (const id of ["wilted-not-dead", "phoenix-plant", "resurrection"]) {
      expect(result.progress.has(id)).toBe(false);
    }
  });
});
