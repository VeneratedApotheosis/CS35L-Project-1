import { describe, expect, it } from "vitest";
import { habit, input } from "../../test/badgeHabits.js";
import { growthStage, plantHealth } from "../growth.js";
import { currentStreak, overallProgress } from "../progress.js";
import { addDays, buildFacts } from "./facts.js";
import { habitTimeline, sweep, type HabitMoment } from "./timeline.js";
import type { BadgeHabit } from "./types.js";

const today = "2026-11-24";

function timelineOf(h: BadgeHabit, day = today): HabitMoment[] {
  const facts = buildFacts(input({ today: day, habits: [h] }));
  return habitTimeline(facts.habits[0]!, day);
}

// Every day from the habit's start up to today or its end, compared with the
// rules the rest of the app uses, run as if that day were today.
function expectMatchesDomain(h: BadgeHabit) {
  const moments = timelineOf(h);
  expect(moments.length).toBeGreaterThan(0);
  expect(moments[0]?.from).toBe(h.start_date);
  for (const moment of moments) {
    for (let day = moment.from; day < moment.to; day = addDays(day, 1)) {
      const dates = h.logs
        .map((log) => log.occurred_on)
        .filter((date) => date <= day)
        .sort();
      expect({ day, ...moment, from: undefined, to: undefined }).toEqual({
        day,
        from: undefined,
        to: undefined,
        stage: growthStage(overallProgress(h, dates, day)),
        health: plantHealth(h, dates, day),
        streak: currentStreak(h, dates, day),
      });
    }
  }
}

describe("habitTimeline", () => {
  it("matches the domain rules on every day of a weekly habit", () => {
    // Met, missed, met, current week part done.
    expectMatchesDomain(
      habit({
        start_date: "2026-10-05",
        num_periods: 12,
        logs: [
          "2026-10-05",
          "2026-10-06",
          "2026-10-07",
          "2026-10-15",
          ...Array<string>(3).fill("2026-10-20"),
          ...Array<string>(4).fill("2026-11-01"),
          "2026-11-23",
        ],
      }),
    );
  });

  it("matches the domain rules for a daily habit that wilts and recovers", () => {
    const logs = [
      "2026-10-01",
      "2026-10-02",
      // Five days missed, then every day again.
      ...Array.from({ length: 10 }, (_, i) => addDays("2026-10-08", i)),
    ];
    expectMatchesDomain(
      habit({
        interval_unit: "day",
        target_count: 1,
        num_periods: 30,
        start_date: "2026-10-01",
        logs,
      }),
    );
  });

  it("matches the domain rules for a monthly habit that has expired", () => {
    expectMatchesDomain(
      habit({
        interval_unit: "month",
        target_count: 2,
        num_periods: 3,
        start_date: "2026-07-31",
        logs: ["2026-08-01", "2026-08-30", "2026-09-29", "2026-10-30"],
      }),
    );
  });

  it("matches the domain rules for an indefinite habit with a log before its start", () => {
    expectMatchesDomain(
      habit({
        interval_count: 2,
        interval_unit: "day",
        target_count: 1,
        num_periods: null,
        start_date: "2026-11-02",
        created_at: "2026-10-30T12:00:00Z",
        logs: ["2026-10-31", "2026-11-05", "2026-11-06", "2026-11-12"],
      }),
    );
  });

  it("ends on the end date, or the day after today while it runs", () => {
    const ended = timelineOf(habit({ start_date: "2026-10-05" }));
    expect(ended.at(-1)?.to).toBe("2026-11-02");
    const running = timelineOf(habit());
    expect(running.at(-1)?.to).toBe("2026-11-25");
  });

  it("is empty for a habit that has not started", () => {
    expect(timelineOf(habit({ start_date: "2026-12-07" }))).toEqual([]);
  });

  it("changes health only when a period ends", () => {
    const moments = timelineOf(
      habit({ start_date: "2026-10-05", num_periods: 8, logs: [] }),
    );
    const changes = moments.filter(
      (moment, i) => i > 0 && moment.health !== moments[i - 1]?.health,
    );
    // The week of Oct 5 ends missed on Oct 12, so it wilts then and stays so.
    expect(changes.map((moment) => [moment.from, moment.health])).toEqual([
      ["2026-10-12", "wilted"],
    ]);
  });
});

describe("sweep", () => {
  const moment = (from: string, to: string, streak = 0): HabitMoment => ({
    from,
    to,
    stage: 1,
    health: "healthy",
    streak,
  });

  it("lines up habits whose changes fall on different days", () => {
    const stretches = sweep(
      new Map([
        [
          "a",
          [
            moment("2026-11-01", "2026-11-05", 1),
            moment("2026-11-05", "2026-11-09", 2),
          ],
        ],
        ["b", [moment("2026-11-03", "2026-11-07", 5)]],
      ]),
    );
    expect(
      stretches.map((s) => [
        s.from,
        s.to,
        [...s.habits].map(([id, m]) => `${id}${m.streak}`).join(","),
      ]),
    ).toEqual([
      ["2026-11-01", "2026-11-03", "a1"],
      ["2026-11-03", "2026-11-05", "a1,b5"],
      ["2026-11-05", "2026-11-07", "a2,b5"],
      ["2026-11-07", "2026-11-09", "a2"],
    ]);
  });

  it("keeps a gap with no active habits as an empty stretch", () => {
    const stretches = sweep(
      new Map([
        ["a", [moment("2026-11-01", "2026-11-03")]],
        ["b", [moment("2026-11-10", "2026-11-12")]],
      ]),
    );
    expect(stretches.map((s) => [s.from, s.to, s.habits.size])).toEqual([
      ["2026-11-01", "2026-11-03", 1],
      ["2026-11-03", "2026-11-10", 0],
      ["2026-11-10", "2026-11-12", 1],
    ]);
  });
});
