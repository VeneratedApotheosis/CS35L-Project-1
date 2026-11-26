import {
  bestStreak,
  countTo,
  longestDayRun,
  weekday,
  yesNo,
  type Badge,
  type BadgeFacts,
  type HabitFacts,
} from "../facts.js";
import { mostAtOnce } from "../timeline.js";

// Section 4 of docs/badges-ideas.md. A streak is consecutive met periods on
// one habit (8.6). Rules use the best streak a habit ever had, so a streak
// still counts after it breaks.

function isEvery(habit: HabitFacts, unit: "day" | "week"): boolean {
  return habit.habit.interval_unit === unit && habit.habit.interval_count === 1;
}

function longestStreak(
  facts: BadgeFacts,
  include: (habit: HabitFacts) => boolean = () => true,
): number {
  return Math.max(
    0,
    ...facts.habits.filter(include).map((habit) => habit.bestStreak),
  );
}

// A weekly habit's longest run of met weeks in which every log was on a
// Saturday or Sunday.
function weekendRun(habit: HabitFacts): number {
  const weekendOnly = habit.periods.map((period) => {
    if (!period.met) return { ...period, met: false };
    const inPeriod = habit.dates.filter(
      (date) => date >= period.start && date < period.end,
    );
    return { ...period, met: inPeriod.every((date) => weekday(date) >= 6) };
  });
  return bestStreak(weekendOnly);
}

const base = { chapter: "streaks", secret: false } as const;

function streakOf(
  id: string,
  name: string,
  target: number,
  tier: Badge["tier"],
): Badge {
  return {
    ...base,
    id,
    name,
    description: `Reach a streak of ${target}.`,
    tier,
    evaluate: (facts) => countTo(longestStreak(facts), target),
  };
}

export const streakBadges: Badge[] = [
  streakOf("two-in-a-row", "Two in a Row", 2, "bronze"),
  streakOf("habit-forming", "Habit Forming", 4, "bronze"),
  streakOf("eight-is-great", "Eight Is Great", 8, "silver"),
  {
    ...base,
    id: "quarter-year",
    name: "Quarter Year",
    description: "Reach a streak of 13 weeks on a weekly habit.",
    tier: "silver",
    evaluate: (facts) =>
      countTo(
        longestStreak(facts, (habit) => isEvery(habit, "week")),
        13,
      ),
  },
  streakOf("half-year", "Half-Year Hero", 26, "gold"),
  streakOf("evergreen", "Evergreen", 52, "platinum"),
  {
    ...base,
    id: "no-misses",
    name: "No Misses",
    description: "Finish a habit of 4 or more periods with 100% consistency.",
    tier: "silver",
    evaluate: (facts) =>
      yesNo(
        facts.habits.some(
          (habit) =>
            habit.finished &&
            (habit.habit.num_periods ?? 0) >= 4 &&
            habit.result.consistency === 1,
        ),
      ),
  },
  {
    // The streak each habit had on the same past day (timeline.ts).
    ...base,
    id: "unbroken",
    name: "Unbroken",
    description: "Have 3 habits with a streak of 4 or more at once.",
    tier: "silver",
    evaluate: (facts) =>
      countTo(
        mostAtOnce(facts, (moment) => moment.streak >= 4),
        3,
      ),
  },
  {
    ...base,
    id: "triple-threat-streak",
    name: "Triple Threat Streak",
    description: "Have streaks of 8 or more on 3 habits at once.",
    tier: "gold",
    evaluate: (facts) =>
      countTo(
        mostAtOnce(facts, (moment) => moment.streak >= 8),
        3,
      ),
  },
  {
    ...base,
    id: "daily-devotion",
    name: "Daily Devotion",
    description: "Log a daily habit 30 days in a row.",
    tier: "gold",
    evaluate: (facts) =>
      countTo(
        Math.max(
          0,
          ...facts.habits
            .filter((habit) => isEvery(habit, "day"))
            .map((habit) => longestDayRun(habit.dates)),
        ),
        30,
      ),
  },
  {
    ...base,
    id: "weekend-warrior",
    name: "Weekend Warrior",
    description:
      "Meet a weekly goal using only Saturday and Sunday logs, 4 weeks in a row.",
    tier: "silver",
    evaluate: (facts) =>
      countTo(
        Math.max(
          0,
          ...facts.habits
            .filter((habit) => isEvery(habit, "week"))
            .map(weekendRun),
        ),
        4,
      ),
  },
];
