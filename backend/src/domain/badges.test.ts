import { describe, expect, it } from "vitest";
import { badgeLevel, habitResult } from "./badges.js";
import type { ProgressHabit } from "./progress.js";

describe("badgeLevel (rule 8.9)", () => {
  it("is gold at 100% progress with consistency of at least 80%", () => {
    expect(badgeLevel(1, 0.8)).toBe("gold");
    expect(badgeLevel(1, 1)).toBe("gold");
  });

  it("is silver at 100% progress with lower consistency", () => {
    expect(badgeLevel(1, 0.75)).toBe("silver");
    expect(badgeLevel(1, 0)).toBe("silver");
  });

  it("is bronze from 60% progress", () => {
    expect(badgeLevel(0.6, 1)).toBe("bronze");
    expect(badgeLevel(0.99, 1)).toBe("bronze");
  });

  it("is none below 60%", () => {
    expect(badgeLevel(0.59, 1)).toBe("none");
    expect(badgeLevel(0, null)).toBe("none");
  });

  it("is not gold when consistency is unknown", () => {
    expect(badgeLevel(1, null)).toBe("silver");
  });
});

// 3 times a week for 4 weeks from Monday 2 Nov 2026. It ends on 30 Nov.
const gym: ProgressHabit = {
  start_date: "2026-11-02",
  interval_count: 1,
  interval_unit: "week",
  num_periods: 4,
  target_count: 3,
};
const logs = (date: string, n: number) => Array<string>(n).fill(date);
const weeks = ["2026-11-03", "2026-11-10", "2026-11-17", "2026-11-24"];
const afterEnd = "2026-12-01";

describe("habitResult", () => {
  it("has no badge yet while the habit is active", () => {
    const result = habitResult(gym, logs(weeks[0] as string, 12), "2026-11-04");
    expect(result.expired).toBe(false);
    expect(result.badge).toBeNull();
  });

  it("has no badge before the habit starts", () => {
    expect(habitResult(gym, [], "2026-10-30")).toMatchObject({
      expired: false,
      badge: null,
    });
  });

  it("gives gold to an expired habit with every goal met", () => {
    const all = weeks.flatMap((week) => logs(week, 3));
    expect(habitResult(gym, all, afterEnd)).toEqual({
      expired: true,
      progress: 1,
      consistency: 1,
      badge: "gold",
    });
  });

  it("gives silver for 100% progress with a missed period (the design example)", () => {
    // 5 + 1 + 4 + 2 logs: 12 of 12, with 2 of 4 periods met (50%).
    const all = [
      ...logs(weeks[0] as string, 5),
      ...logs(weeks[1] as string, 1),
      ...logs(weeks[2] as string, 4),
      ...logs(weeks[3] as string, 2),
    ];
    expect(habitResult(gym, all, afterEnd)).toMatchObject({
      progress: 1,
      consistency: 0.5,
      badge: "silver",
    });
  });

  it("gives bronze to an expired habit at 75% progress", () => {
    const all = [
      ...logs(weeks[0] as string, 3),
      ...logs(weeks[1] as string, 3),
      ...logs(weeks[2] as string, 3),
    ];
    expect(habitResult(gym, all, afterEnd)).toMatchObject({
      progress: 0.75,
      badge: "bronze",
    });
  });

  it("gives none to an expired habit under 60% (a failed habit)", () => {
    const result = habitResult(gym, logs(weeks[0] as string, 3), afterEnd);
    expect(result).toMatchObject({
      progress: 0.25,
      badge: "none",
      expired: true,
    });
  });

  it("has no badge for an indefinite habit", () => {
    const result = habitResult({ ...gym, num_periods: null }, [], afterEnd);
    expect(result).toEqual({
      expired: false,
      progress: null,
      consistency: 0,
      badge: null,
    });
  });
});
