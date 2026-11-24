import { DateTime } from "luxon";
import {
  countTo,
  yesNo,
  type Badge,
  type BadgeFacts,
  type HabitFacts,
} from "../facts.js";

// Section 3 of docs/badges-ideas.md, built on the per-habit results (rule 8.9).
// "Finish a habit" means it expired with a Bronze or better (`finished`).

function finished(facts: BadgeFacts): HabitFacts[] {
  return facts.habits.filter((habit) => habit.finished);
}

function golds(facts: BadgeFacts): number {
  return finished(facts).filter((habit) => habit.result.badge === "gold")
    .length;
}

function longestFinished(facts: BadgeFacts): number {
  return Math.max(
    0,
    ...finished(facts).map((habit) => habit.habit.num_periods ?? 0),
  );
}

// ISO week of a habit's last day, such as "2026-W48".
function weekOf(date: string): string {
  const day = DateTime.fromISO(date, { zone: "utc" });
  return `${day.weekYear}-W${day.weekNumber}`;
}

function mostFinishedInOneWeek(facts: BadgeFacts): number {
  const perWeek = new Map<string, number>();
  for (const habit of finished(facts)) {
    const week = weekOf(habit.lastDay as string);
    perWeek.set(week, (perWeek.get(week) ?? 0) + 1);
  }
  return Math.max(0, ...perWeek.values());
}

// A calendar month that has ended, in which at least 3 habits ended and every
// one of them earned Gold or Silver. Only ended months count, so a Bronze
// later in the same month cannot undo it.
function hadCleanSweep(facts: BadgeFacts): boolean {
  const thisMonth = facts.input.today.slice(0, 7);
  const perMonth = new Map<string, HabitFacts[]>();
  for (const habit of facts.habits) {
    if (!habit.result.expired || habit.lastDay === null) continue;
    const month = habit.lastDay.slice(0, 7);
    if (month >= thisMonth) continue;
    perMonth.set(month, [...(perMonth.get(month) ?? []), habit]);
  }
  return [...perMonth.values()].some(
    (habits) =>
      habits.length >= 3 &&
      habits.every(
        (habit) =>
          habit.result.badge === "gold" || habit.result.badge === "silver",
      ),
  );
}

const base = { chapter: "finishing", secret: false } as const;

export const finishingBadges: Badge[] = [
  {
    ...base,
    id: "first-harvest",
    name: "First Harvest",
    description: "Finish your first habit with any badge.",
    tier: "bronze",
    evaluate: (facts) => countTo(finished(facts).length, 1),
  },
  {
    ...base,
    id: "ten-harvests",
    name: "Ten Harvests",
    description: "Finish 10 habits with any badge.",
    tier: "silver",
    evaluate: (facts) => countTo(finished(facts).length, 10),
  },
  {
    ...base,
    id: "twenty-five-harvests",
    name: "Twenty-Five Crop Rotations",
    description: "Finish 25 habits with any badge.",
    tier: "gold",
    evaluate: (facts) => countTo(finished(facts).length, 25),
  },
  {
    ...base,
    id: "gold-standard",
    name: "Gold Standard",
    description: "Earn a Gold on a habit.",
    tier: "silver",
    evaluate: (facts) => countTo(golds(facts), 1),
  },
  {
    ...base,
    id: "triple-gold",
    name: "Triple Gold",
    description: "Earn Gold on 3 habits.",
    tier: "gold",
    evaluate: (facts) => countTo(golds(facts), 3),
  },
  {
    ...base,
    id: "gold-rush",
    name: "Gold Rush",
    description: "Earn Gold on 10 habits.",
    tier: "platinum",
    evaluate: (facts) => countTo(golds(facts), 10),
  },
  {
    ...base,
    id: "perfect-score",
    name: "Perfect Score",
    description: "Finish a habit at 100% progress and 100% consistency.",
    tier: "gold",
    evaluate: (facts) =>
      yesNo(
        finished(facts).some(
          (habit) =>
            habit.result.progress === 1 && habit.result.consistency === 1,
        ),
      ),
  },
  {
    ...base,
    id: "long-game",
    name: "Long Game",
    description: "Finish a habit that ran 12 or more periods.",
    tier: "silver",
    evaluate: (facts) => countTo(longestFinished(facts), 12),
  },
  {
    ...base,
    id: "marathon",
    name: "Marathon Gardener",
    description: "Finish a habit that ran 52 or more periods.",
    tier: "gold",
    evaluate: (facts) => countTo(longestFinished(facts), 52),
  },
  {
    ...base,
    id: "jack-of-all",
    name: "Jack of All Trades",
    description: "Finish habits with 3 different plant types.",
    tier: "silver",
    evaluate: (facts) =>
      countTo(
        new Set(finished(facts).map((habit) => habit.habit.plant_type)).size,
        3,
      ),
  },
  {
    ...base,
    id: "hat-trick",
    name: "Hat Trick",
    description: "Finish 3 habits in the same week.",
    tier: "silver",
    evaluate: (facts) => countTo(mostFinishedInOneWeek(facts), 3),
  },
  {
    ...base,
    id: "clean-sweep",
    name: "Clean Sweep",
    description:
      "Every habit you finished in a calendar month earned Gold or Silver (at least 3).",
    tier: "gold",
    evaluate: (facts) => yesNo(hadCleanSweep(facts)),
  },
];
