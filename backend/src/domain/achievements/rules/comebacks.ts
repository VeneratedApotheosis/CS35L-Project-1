import {
  addDays,
  countBetween,
  logDays,
  longestQuietSpell,
  yesNo,
  countTo,
  type Badge,
  type BadgeFacts,
  type HabitFacts,
} from "../facts.js";
import type { PeriodSummary } from "../../progress.js";
import { momentsOf } from "../timeline.js";

// Section 6 of docs/badges-ideas.md. Plans: docs/badges-steps-6-7-plan.md.
// Wilted but Not Dead, Phoenix Plant and Resurrection read each plant's past
// health from the replay (timeline.ts).

// Periods that are over, plus the current one once it is met. A current
// period that is not met yet has not failed, so it is left out.
function settled(habit: HabitFacts): PeriodSummary[] {
  return habit.periods.filter(
    (period) =>
      period.status === "completed" ||
      (period.status === "current" && period.met),
  );
}

// The longest run of met periods that starts right after a completed miss.
function longestRunAfterMiss(habit: HabitFacts): number {
  const periods = settled(habit);
  let best = 0;
  let run = 0;
  let afterMiss = false;
  for (const period of periods) {
    if (!period.met) {
      afterMiss = true;
      run = 0;
    } else if (afterMiss) {
      run += 1;
      best = Math.max(best, run);
    }
  }
  return best;
}

function bestRunAfterMiss(facts: BadgeFacts): number {
  return Math.max(0, ...facts.habits.map(longestRunAfterMiss));
}

// The period's target was reached on its last day: not met with the logs
// before that day, met with them. One-day periods are left out, because every
// met day would count.
function metOnLastDay(habit: HabitFacts, period: PeriodSummary): boolean {
  const lastDay = addDays(period.end, -1);
  if (lastDay === period.start || !period.met) return false;
  if (!habit.dates.includes(lastDay)) return false;
  return countBetween(habit.dates, period.start, lastDay) < period.target;
}

function hadClutch(facts: BadgeFacts): boolean {
  return facts.habits.some((habit) =>
    settled(habit).some((period) => metOnLastDay(habit, period)),
  );
}

// A habit that finished at 100% only because of its last day's logs, which
// also met the final period's target.
function wonOnLastDay(habit: HabitFacts): boolean {
  const final = habit.periods.at(-1);
  if (!habit.finished || habit.result.progress !== 1) return false;
  if (!final || habit.lastDay === null) return false;
  if (!final.met || !habit.dates.includes(habit.lastDay)) return false;
  const total = habit.habit.target_count * (habit.habit.num_periods ?? 0);
  const before = countBetween(
    habit.dates,
    habit.habit.start_date,
    habit.lastDay,
  );
  const finalBefore = countBetween(habit.dates, final.start, habit.lastDay);
  return before < total && finalBefore < final.target;
}

function wasWilted(facts: BadgeFacts, habit: HabitFacts): boolean {
  return momentsOf(facts, habit).some((moment) => moment.health === "wilted");
}

// Wilted at some point, and Healthy again later.
function recovered(facts: BadgeFacts, habit: HabitFacts): boolean {
  const moments = momentsOf(facts, habit);
  const wilted = moments.findIndex((moment) => moment.health === "wilted");
  return (
    wilted >= 0 &&
    moments.slice(wilted + 1).some((moment) => moment.health === "healthy")
  );
}

const base = { chapter: "comebacks", secret: false } as const;

export const comebackBadges: Badge[] = [
  {
    ...base,
    id: "wilted-not-dead",
    name: "Wilted but Not Dead",
    description: "Have a plant reach Wilted health and recover to Healthy.",
    tier: "bronze",
    evaluate: (facts) =>
      yesNo(facts.habits.some((habit) => recovered(facts, habit))),
  },
  {
    ...base,
    id: "second-wind",
    name: "Second Wind",
    description: "Meet your goal the period right after missing one.",
    tier: "bronze",
    evaluate: (facts) => countTo(bestRunAfterMiss(facts), 1),
  },
  {
    ...base,
    id: "phoenix-plant",
    name: "Phoenix Plant",
    description:
      "Recover a Wilted plant to Healthy and finish the habit with a Silver or Gold.",
    tier: "silver",
    evaluate: (facts) =>
      yesNo(
        facts.habits.some(
          (habit) =>
            habit.finished &&
            (habit.result.badge === "silver" ||
              habit.result.badge === "gold") &&
            recovered(facts, habit),
        ),
      ),
  },
  {
    ...base,
    id: "bounce-back",
    name: "Bounce Back",
    description: "Meet a goal 3 periods in a row right after a miss.",
    tier: "silver",
    evaluate: (facts) => countTo(bestRunAfterMiss(facts), 3),
  },
  {
    ...base,
    id: "welcome-back",
    name: "Welcome Back",
    description: "Log an activity after 14 or more days with no logs at all.",
    tier: "silver",
    evaluate: (facts) => yesNo(longestQuietSpell(logDays(facts)) >= 14),
  },
  {
    ...base,
    id: "clutch",
    name: "Clutch",
    description: "Meet a period's target on the last day of that period.",
    tier: "bronze",
    evaluate: (facts) => yesNo(hadClutch(facts)),
  },
  {
    ...base,
    id: "down-to-the-wire",
    name: "Down to the Wire",
    description:
      "Meet the final period's target on the habit's last day to reach 100%.",
    tier: "silver",
    evaluate: (facts) => yesNo(facts.habits.some(wonOnLastDay)),
  },
  {
    ...base,
    id: "resurrection",
    name: "Resurrection",
    description: "Reach Gold on a habit that was Wilted at some point.",
    tier: "gold",
    evaluate: (facts) =>
      yesNo(
        facts.habits.some(
          (habit) =>
            habit.finished &&
            habit.result.badge === "gold" &&
            wasWilted(facts, habit),
        ),
      ),
  },
];
