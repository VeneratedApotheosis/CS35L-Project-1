import { describe, expect, it } from "vitest";
import { BADGES, BADGES_BY_ID, CHAPTERS } from "./catalog.js";
import { evaluateBadges } from "./engine.js";
import {
  bestStreak,
  buildFacts,
  localDate,
  longestDayRun,
  mostActiveAtOnce,
} from "./facts.js";
import {
  check,
  fullMonth,
  habit,
  input,
  times,
} from "../../test/badgeHabits.js";

describe("catalog", () => {
  it("has unique ids that fit the database check", () => {
    const ids = BADGES.map((badge) => badge.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const id of ids) expect(id).toMatch(/^[a-z0-9-]{1,64}$/);
  });

  it("puts every badge in a known chapter", () => {
    const chapters = new Set(CHAPTERS.map((chapter) => chapter.id));
    for (const badge of BADGES) expect(chapters.has(badge.chapter)).toBe(true);
  });

  it("covers the non-secret badges of badges-ideas.md", () => {
    // 8 + 10 + 12 + 11 + 11 + 8 + 10 + 6, sections 1 to 6, 8 and 10.
    expect(BADGES.filter((badge) => !badge.secret)).toHaveLength(76);
  });
});

describe("helpers", () => {
  it("bestStreak keeps the longest run after a miss", () => {
    const period = (met: boolean, status = "completed") =>
      ({ met, status }) as Parameters<typeof bestStreak>[0][number];
    expect(
      bestStreak([
        period(true),
        period(true),
        period(true),
        period(false),
        period(true),
        period(false, "current"),
        period(false, "upcoming"),
      ]),
    ).toBe(3);
  });

  it("bestStreak counts a met current period", () => {
    const met = { met: true, status: "current" } as Parameters<
      typeof bestStreak
    >[0][number];
    expect(bestStreak([met])).toBe(1);
  });

  it("longestDayRun ignores repeats and finds the longest run", () => {
    expect(
      longestDayRun([
        "2026-11-01",
        "2026-11-02",
        "2026-11-02",
        "2026-11-03",
        "2026-11-05",
      ]),
    ).toBe(3);
    expect(longestDayRun([])).toBe(0);
  });

  it("mostActiveAtOnce does not overlap a habit that expires the day another starts", () => {
    const first = habit({ start_date: "2026-11-02" }); // ends 30 Nov
    const second = habit({ start_date: "2026-11-30" });
    const facts = buildFacts(
      input({ today: "2026-12-01", habits: [first, second] }),
    );
    expect(mostActiveAtOnce(facts.habits, "2026-12-01")).toBe(1);
  });

  it("mostActiveAtOnce leaves out habits that have not started", () => {
    const facts = buildFacts(
      input({
        habits: [habit(), habit({ start_date: "2026-12-01" })],
      }),
    );
    expect(mostActiveAtOnce(facts.habits, "2026-11-24")).toBe(1);
  });

  it("localDate uses the profile timezone", () => {
    expect(localDate("2026-11-24T03:00:00Z", "America/Los_Angeles")).toBe(
      "2026-11-23",
    );
    expect(localDate("2026-11-24T03:00:00Z", null)).toBe("2026-11-24");
  });
});

describe("getting started", () => {
  it("earns nothing for a new user", () => {
    expect(check().newlyEarned).toEqual([]);
  });

  it("earns Seed Money for a first habit, and First Drop for a first log", () => {
    expect(check({ habits: [habit()] }).newlyEarned).toEqual(["seed-money"]);
    expect(
      check({ habits: [habit({ logs: ["2026-11-24"] })] }).newlyEarned,
    ).toEqual(expect.arrayContaining(["seed-money", "first-drop"]));
  });

  it("earns the stage badges as overall progress grows", () => {
    // 6 of 12 logs is 50%, stage 3.
    const result = check({
      habits: [
        habit({ logs: [...times("2026-11-03", 3), ...times("2026-11-10", 3)] }),
      ],
    });
    expect(result.earned.has("green-thumb")).toBe(true);
    expect(result.earned.has("sapling-season")).toBe(true);
    expect(result.earned.has("full-bloom")).toBe(false);
  });

  it("earns Backdated for a log saved on a later local day", () => {
    const late = habit({
      logs: [{ occurred_on: "2026-11-23", created_at: "2026-11-24T20:00:00Z" }],
    });
    expect(check({ habits: [late] }).earned.has("backdated")).toBe(true);
  });

  it("does not count a log saved the same local day as backdated", () => {
    // 03:00 UTC on 24 Nov is still 23 Nov in Los Angeles.
    const sameDay = habit({
      logs: [{ occurred_on: "2026-11-23", created_at: "2026-11-24T03:00:00Z" }],
    });
    const result = check({
      habits: [sameDay],
      timezone: "America/Los_Angeles",
    });
    expect(result.earned.has("backdated")).toBe(false);
  });

  it("earns Personal Touch only when the request sets the name", () => {
    expect(check().earned.has("personal-touch")).toBe(false);
    expect(check({ displayNameSet: true }).newlyEarned).toEqual([
      "personal-touch",
    ]);
  });

  it("shows progress toward Roots Down", () => {
    const result = check({ habits: [habit(), habit()] });
    expect(result.progress.get("roots-down")).toEqual({ count: 2, target: 3 });
  });
});

describe("logging milestones", () => {
  it("counts every log toward the totals", () => {
    const result = check({
      habits: [
        habit({ logs: times("2026-11-24", 4) }),
        habit({ logs: times("2026-11-23", 3) }),
      ],
    });
    expect(result.progress.get("ten-taps")).toEqual({ count: 7, target: 10 });
    expect(result.earned.has("ten-taps")).toBe(false);
  });

  it("earns Overachiever above the target, and Double Time at twice it", () => {
    const four = check({ habits: [habit({ logs: times("2026-11-24", 4) })] });
    expect(four.earned.has("overachiever")).toBe(true);
    expect(four.earned.has("double-time")).toBe(false);
    const six = check({ habits: [habit({ logs: times("2026-11-24", 6) })] });
    expect(six.earned.has("double-time")).toBe(true);
  });

  it("earns Busy Day and Every Hand on Deck from one day's logs", () => {
    const result = check({
      habits: [
        habit({ logs: times("2026-11-24", 3) }),
        habit({ logs: ["2026-11-24"] }),
        habit({ logs: ["2026-11-24"] }),
      ],
    });
    expect(result.earned.has("busy-day")).toBe(true);
    expect(result.earned.has("every-hand")).toBe(true);
  });

  it("earns Full Garden Day only with at least 4 active habits all logged", () => {
    const logged = () => habit({ logs: ["2026-11-24"] });
    expect(
      check({ habits: [logged(), logged(), logged()] }).earned.has(
        "full-garden-day",
      ),
    ).toBe(false);
    expect(
      check({ habits: [logged(), logged(), logged(), logged()] }).earned.has(
        "full-garden-day",
      ),
    ).toBe(true);
    expect(
      check({
        habits: [logged(), logged(), logged(), logged(), habit()],
      }).earned.has("full-garden-day"),
    ).toBe(false);
  });
});

describe("finishing habits", () => {
  const after = "2026-12-05";

  it("earns nothing before the habit expires", () => {
    const result = check({ habits: [habit({ logs: fullMonth })] });
    expect(result.earned.has("first-harvest")).toBe(false);
  });

  it("earns the finishing badges for a perfect habit", () => {
    const result = check({
      today: after,
      habits: [habit({ logs: fullMonth })],
    });
    for (const id of [
      "first-harvest",
      "gold-standard",
      "perfect-score",
      "no-misses",
    ]) {
      expect(result.earned.has(id)).toBe(true);
    }
  });

  it("does not count a habit that ended below 60% as finished", () => {
    const result = check({
      today: after,
      habits: [habit({ logs: times("2026-11-03", 3) })],
    });
    expect(result.earned.has("first-harvest")).toBe(false);
    // It is still on the Completed shelves.
    expect(result.progress.get("hall-of-fame")).toEqual({
      count: 1,
      target: 5,
    });
  });

  it("earns Hat Trick for 3 habits that end in the same week", () => {
    const result = check({
      today: after,
      habits: [
        habit({ logs: fullMonth }),
        habit({ logs: fullMonth }),
        habit({ logs: fullMonth }),
      ],
    });
    expect(result.earned.has("hat-trick")).toBe(true);
    expect(result.earned.has("triple-gold")).toBe(true);
  });

  it("earns Clean Sweep only once the month has ended", () => {
    const three = [
      habit({ logs: fullMonth }),
      habit({ logs: fullMonth }),
      habit({ logs: fullMonth }),
    ];
    // The habits' last day is 29 Nov.
    expect(
      check({ today: "2026-11-30", habits: three }).earned.has("clean-sweep"),
    ).toBe(false);
    expect(
      check({ today: after, habits: three }).earned.has("clean-sweep"),
    ).toBe(true);
  });

  it("does not earn Clean Sweep when one habit that month got Bronze", () => {
    const bronze = habit({ logs: fullMonth.slice(0, 9) });
    const result = check({
      today: after,
      habits: [
        habit({ logs: fullMonth }),
        habit({ logs: fullMonth }),
        habit({ logs: fullMonth }),
        bronze,
      ],
    });
    expect(result.earned.has("clean-sweep")).toBe(false);
  });
});

describe("streaks", () => {
  it("keeps the best streak after it is broken", () => {
    const result = check({
      today: "2026-12-05",
      habits: [habit({ logs: fullMonth.slice(0, 6) })],
    });
    expect(result.earned.has("two-in-a-row")).toBe(true);
    expect(result.progress.get("habit-forming")).toEqual({
      count: 2,
      target: 4,
    });
  });

  it("earns Daily Devotion for 30 days in a row on a daily habit", () => {
    const days = Array.from({ length: 30 }, (_, i) => {
      const date = new Date(Date.UTC(2026, 9, 1 + i));
      return date.toISOString().slice(0, 10);
    });
    const daily = habit({
      interval_unit: "day",
      target_count: 1,
      num_periods: 52,
      start_date: "2026-10-01",
      logs: days,
    });
    expect(check({ habits: [daily] }).earned.has("daily-devotion")).toBe(true);
  });

  it("earns Weekend Warrior only when every log is on a weekend", () => {
    // Saturdays and Sundays of the 4 weeks from 2 Nov.
    const weekends = [
      "2026-11-07",
      "2026-11-08",
      "2026-11-08",
      "2026-11-14",
      "2026-11-15",
      "2026-11-15",
      "2026-11-21",
      "2026-11-21",
      "2026-11-22",
      "2026-11-28",
      "2026-11-29",
      "2026-11-29",
    ];
    const today = "2026-12-01";
    expect(
      check({ today, habits: [habit({ logs: weekends })] }).earned.has(
        "weekend-warrior",
      ),
    ).toBe(true);
    const oneWeekday = [...weekends.slice(0, 11), "2026-11-27"];
    expect(
      check({ today, habits: [habit({ logs: oneWeekday })] }).progress.get(
        "weekend-warrior",
      ),
    ).toEqual({ count: 3, target: 4 });
  });
});

describe("garden", () => {
  it("counts roses that are active at the same time", () => {
    const rose = () => habit({ plant_type: "rose" });
    const result = check({ habits: [rose(), rose(), rose()] });
    expect(result.earned.has("rose-garden")).toBe(true);
    expect(result.earned.has("matching-set")).toBe(true);
    expect(result.earned.has("shelf-full")).toBe(true);
  });

  it("counts different plant types toward Variety Pack", () => {
    const result = check({
      habits: [habit({ plant_type: "rose" }), habit({ plant_type: "lotus" })],
    });
    expect(result.progress.get("variety-pack")).toEqual({
      count: 2,
      target: 3,
    });
  });
});

describe("meta badges and the engine", () => {
  it("earns Trophy Case in the same check as its fifth badge", () => {
    const result = check({
      habits: [habit({ logs: times("2026-11-24", 4) }), habit(), habit()],
    });
    expect(result.earned.size).toBeGreaterThanOrEqual(6);
    expect(result.newlyEarned).toContain("trophy-case");
  });

  it("keeps earned badges and does not report them as new", () => {
    const result = check({ earned: new Set(["seed-money", "ten-taps"]) });
    expect(result.earned.has("ten-taps")).toBe(true);
    expect(result.newlyEarned).toEqual([]);
  });

  it("does not count unknown stored ids toward meta badges", () => {
    const earned = new Set(["seed-money", "old-1", "old-2", "old-3", "old-4"]);
    expect(check({ earned }).earned.has("trophy-case")).toBe(false);
  });

  it("has a rule for every non-secret badge", () => {
    const missing = BADGES.filter((badge) => !badge.secret && !badge.evaluate);
    expect(missing.map((badge) => badge.id)).toEqual([]);
  });

  it("never awards a badge whose rule is not built", () => {
    const unbuilt = { ...BADGES_BY_ID.get("unbroken")!, evaluate: undefined };
    const result = evaluateBadges(input(), [unbuilt]);
    expect(result.progress.has("unbroken")).toBe(false);
    expect(result.newlyEarned).toEqual([]);
  });

  it("reports progress for Completionist over every other non-secret badge", () => {
    const total = BADGES.filter((badge) => !badge.secret).length - 1;
    expect(check().progress.get("completionist")).toEqual({
      count: 0,
      target: total,
    });
  });
});
