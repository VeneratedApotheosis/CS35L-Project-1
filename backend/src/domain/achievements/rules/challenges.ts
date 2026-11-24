import {
  countTo,
  daysBetween,
  logDays,
  longestDayRun,
  yesNo,
  type Badge,
  type BadgeFacts,
  type HabitFacts,
} from "../facts.js";

// Section 8 of docs/badges-ideas.md. Plans: docs/badges-steps-6-7-plan.md.
// Everything Everywhere and Untouchable need each plant's health on past
// days, so they wait for the timeline (step 6b). A badge with no `evaluate`
// shows as locked and is never awarded.

function finished(facts: BadgeFacts): HabitFacts[] {
  return facts.habits.filter((habit) => habit.finished);
}

function golds(facts: BadgeFacts): HabitFacts[] {
  return finished(facts).filter((habit) => habit.result.badge === "gold");
}

// Northern meteorological seasons, by month (1 to 12).
function season(month: number): string {
  if (month === 12 || month <= 2) return "winter";
  if (month <= 5) return "spring";
  if (month <= 8) return "summer";
  return "fall";
}

// The most seasons covered by finished habits whose last days fall in one
// calendar year. December counts as that year's winter.
function mostSeasonsInAYear(facts: BadgeFacts): number {
  const perYear = new Map<string, Set<string>>();
  for (const habit of finished(facts)) {
    const lastDay = habit.lastDay as string;
    const year = lastDay.slice(0, 4);
    const seasons = perYear.get(year) ?? new Set<string>();
    seasons.add(season(Number(lastDay.slice(5, 7))));
    perYear.set(year, seasons);
  }
  return Math.max(0, ...[...perYear.values()].map((seasons) => seasons.size));
}

// A weekly or monthly habit whose periods cover at least 364 days (52 weeks).
function ranAYear(habit: HabitFacts): boolean {
  const unit = habit.habit.interval_unit;
  if (unit !== "week" && unit !== "month") return false;
  return (
    habit.endDate !== null &&
    daysBetween(habit.habit.start_date, habit.endDate) >= 364
  );
}

const CROWN_UNITS = ["day", "week", "month"];

const base = { chapter: "challenges", secret: false } as const;

export const challengeBadges: Badge[] = [
  {
    ...base,
    id: "iron-routine",
    name: "Iron Routine",
    description: "Finish 3 habits at 100% consistency.",
    tier: "gold",
    evaluate: (facts) =>
      countTo(
        finished(facts).filter((habit) => habit.result.consistency === 1)
          .length,
        3,
      ),
  },
  {
    ...base,
    id: "perfect-year",
    name: "Perfect Year",
    description: "Log something on at least one habit every day for 365 days.",
    tier: "platinum",
    evaluate: (facts) => countTo(longestDayRun(logDays(facts)), 365),
  },
  {
    ...base,
    id: "hundred-days",
    name: "The Hundred Days",
    description: "Log something every day for 100 days.",
    tier: "gold",
    evaluate: (facts) => countTo(longestDayRun(logDays(facts)), 100),
  },
  {
    ...base,
    id: "quit-quitting",
    name: "Quit Quitting",
    description: "Finish 5 habits that each ran at least 8 periods.",
    tier: "gold",
    evaluate: (facts) =>
      countTo(
        finished(facts).filter((habit) => (habit.habit.num_periods ?? 0) >= 8)
          .length,
        5,
      ),
  },
  {
    ...base,
    id: "everything-everywhere",
    name: "Everything Everywhere",
    description: "Keep 5 active habits all Healthy for 8 weeks.",
    tier: "gold",
  },
  {
    ...base,
    id: "grandmaster",
    name: "Grandmaster Gardener",
    description: "Earn Gold on 25 habits.",
    tier: "platinum",
    evaluate: (facts) => countTo(golds(facts).length, 25),
  },
  {
    ...base,
    id: "four-seasons",
    name: "Four Seasons",
    description: "Finish a habit in each of the four seasons of a year.",
    tier: "gold",
    evaluate: (facts) => countTo(mostSeasonsInAYear(facts), 4),
  },
  {
    ...base,
    id: "year-in-bloom",
    name: "Year in Bloom",
    description: "Finish a habit that ran a full year (by months or weeks).",
    tier: "gold",
    evaluate: (facts) => yesNo(finished(facts).some(ranAYear)),
  },
  {
    ...base,
    id: "untouchable",
    name: "Untouchable",
    description: "Go a full year with no Wilted plants.",
    tier: "platinum",
  },
  {
    ...base,
    id: "triple-crown",
    name: "Triple Crown",
    description: "Earn a Gold on a daily, a weekly and a monthly habit.",
    tier: "gold",
    evaluate: (facts) =>
      countTo(
        CROWN_UNITS.filter((unit) =>
          golds(facts).some((habit) => habit.habit.interval_unit === unit),
        ).length,
        3,
      ),
  },
];
