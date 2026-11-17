import { describe, expect, it } from "vitest";
import { sharedHabitStats, type SharedGoal } from "./sharedHabits.js";

const goal: SharedGoal = {
  start_date: "2026-11-01",
  interval_count: 1,
  interval_unit: "day",
  num_periods: 4,
  target_count: 1,
};
const now = new Date("2026-11-05T12:00:00Z");
const member = (logDates: string[], timezone = "UTC") => ({
  logDates,
  timezone,
});

describe("sharedHabitStats", () => {
  it("calculates one member's progress, health and stage", () => {
    expect(
      sharedHabitStats(goal, [member(["2026-11-01", "2026-11-02"])], now),
    ).toEqual({
      today: "2026-11-05",
      state: "expired",
      overall_progress: 0.5,
      stage: 3,
      health_rate: 0.5,
      health: "slightly_wilted",
    });
  });

  it("caps each member before averaging and includes members with no logs", () => {
    const result = sharedHabitStats(
      goal,
      [
        member(Array(8).fill("2026-11-01")),
        member([]),
        member(["2026-11-01", "2026-11-02"]),
      ],
      now,
    );
    expect(result.overall_progress).toBe(0.5);
    expect(result.health_rate).toBe(0.25);
    expect(result.health).toBe("wilted");
  });

  it("keeps the full shared target for a member joining later on the start date", () => {
    // Joining later than the owner does not start a separate schedule.
    const result = sharedHabitStats(
      goal,
      [
        member(["2026-11-01", "2026-11-02", "2026-11-03", "2026-11-04"]),
        member(["2026-11-02"]),
      ],
      now,
    );
    expect(result.overall_progress).toBe(0.625);
    expect(result.health_rate).toBe(0.625);
  });

  it("waits for the earliest local date before completing a period", () => {
    const members = [
      member(["2026-11-01"], "Asia/Tokyo"),
      member([], "America/Los_Angeles"),
    ];
    const result = sharedHabitStats(
      goal,
      members,
      new Date("2026-11-02T02:00:00Z"),
    );
    expect(result.today).toBe("2026-11-01");
    expect(result.health_rate).toBe(1);
    expect(
      sharedHabitStats(goal, members, new Date("2026-11-02T08:00:00Z"))
        .health_rate,
    ).toBe(0.5);
  });

  it("waits for all members to reach the end date before expiry", () => {
    const members = [
      member([], "Asia/Tokyo"),
      member([], "America/Los_Angeles"),
    ];
    expect(
      sharedHabitStats(goal, members, new Date("2026-11-05T02:00:00Z")).state,
    ).toBe("active");
    expect(sharedHabitStats(goal, members, now).state).toBe("expired");
  });

  it("uses only the last four completed periods for health", () => {
    const result = sharedHabitStats(
      { ...goal, num_periods: 6 },
      [member(["2026-11-03", "2026-11-04", "2026-11-05", "2026-11-06"])],
      new Date("2026-11-07T12:00:00Z"),
    );
    expect(result.health_rate).toBe(1);
    expect(result.overall_progress).toBeCloseTo(4 / 6);
  });

  it("recalculates averages when the caller removes a departed member", () => {
    const active = member([
      "2026-11-01",
      "2026-11-02",
      "2026-11-03",
      "2026-11-04",
    ]);
    expect(sharedHabitStats(goal, [active, member([])], now).stage).toBe(3);
    expect(sharedHabitStats(goal, [active], now).stage).toBe(4);
  });

  it("starts healthy and ignores pre-start logs", () => {
    const result = sharedHabitStats(
      goal,
      [member(["2026-10-31"])],
      new Date("2026-10-31T12:00:00Z"),
    );
    expect(result.state).toBe("not_started");
    expect(result.overall_progress).toBe(0);
    expect(result.health).toBe("healthy");
  });

  it("rejects an empty group and an invalid finite goal", () => {
    expect(() => sharedHabitStats(goal, [], now)).toThrow(RangeError);
    expect(() =>
      sharedHabitStats({ ...goal, num_periods: 0 }, [member([])], now),
    ).toThrow(RangeError);
  });
});
