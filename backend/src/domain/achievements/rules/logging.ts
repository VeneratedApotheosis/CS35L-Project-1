import {
  countTo,
  isActiveOn,
  yesNo,
  type Badge,
  type BadgeFacts,
} from "../facts.js";

// Section 2 of docs/badges-ideas.md: counted over the whole account.

// The highest count over target in any period that has started, such as 2 for
// 6 logs against a target of 3.
function bestPeriodRatio(facts: BadgeFacts): number {
  let best = 0;
  for (const habit of facts.habits) {
    for (const period of habit.periods) {
      if (period.status === "upcoming") continue;
      best = Math.max(best, period.count / period.target);
    }
  }
  return best;
}

function mostLogsInOneDay(facts: BadgeFacts): number {
  return Math.max(0, ...[...facts.days.values()].map((day) => day.count));
}

function mostHabitsInOneDay(facts: BadgeFacts): number {
  return Math.max(0, ...[...facts.days.values()].map((d) => d.habitIds.size));
}

// A day on which every habit active that day has a log, with at least 4
// active habits.
function hadFullGardenDay(facts: BadgeFacts): boolean {
  for (const [date, day] of facts.days) {
    const active = facts.habits.filter((habit) => isActiveOn(habit, date));
    if (
      active.length >= 4 &&
      active.every((habit) => day.habitIds.has(habit.habit.id))
    ) {
      return true;
    }
  }
  return false;
}

const base = { chapter: "logging", secret: false } as const;

function totalLogs(
  id: string,
  name: string,
  target: number,
  tier: Badge["tier"],
): Badge {
  return {
    ...base,
    id,
    name,
    description: `Log ${target.toLocaleString("en-US")} activities in total.`,
    tier,
    evaluate: (facts) => countTo(facts.totalLogs, target),
  };
}

export const loggingBadges: Badge[] = [
  totalLogs("ten-taps", "Ten Taps", 10, "bronze"),
  totalLogs("fifty-strong", "Fifty Strong", 50, "bronze"),
  totalLogs("century-club", "Century Club", 100, "silver"),
  totalLogs("five-hundred", "Five Hundred Fold", 500, "gold"),
  totalLogs("thousand-petal", "Thousand-Petal Rose", 1000, "platinum"),
  {
    ...base,
    id: "overachiever",
    name: "Overachiever",
    description:
      "Log more than the target in a single period (for example 6/3).",
    tier: "bronze",
    evaluate: (facts) => yesNo(bestPeriodRatio(facts) > 1),
  },
  {
    ...base,
    id: "double-time",
    name: "Double Time",
    description: "Log at least twice the target in a single period.",
    tier: "silver",
    evaluate: (facts) => yesNo(bestPeriodRatio(facts) >= 2),
  },
  {
    ...base,
    id: "busy-day",
    name: "Busy Day",
    description: "Log 5 activities on the same day.",
    tier: "silver",
    evaluate: (facts) => countTo(mostLogsInOneDay(facts), 5),
  },
  {
    ...base,
    id: "every-hand",
    name: "Every Hand on Deck",
    description: "Log on 3 different habits in one day.",
    tier: "bronze",
    evaluate: (facts) => countTo(mostHabitsInOneDay(facts), 3),
  },
  {
    ...base,
    id: "full-garden-day",
    name: "Full Garden Day",
    description:
      "Log every active habit in one day (at least 4 active habits).",
    tier: "silver",
    evaluate: (facts) => yesNo(hadFullGardenDay(facts)),
  },
];
