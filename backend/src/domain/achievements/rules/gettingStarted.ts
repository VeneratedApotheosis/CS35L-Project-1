import {
  countTo,
  localDate,
  mostActiveAtOnce,
  yesNo,
  type Badge,
  type BadgeFacts,
} from "../facts.js";

// Section 1 of docs/badges-ideas.md: easy wins that teach the app.

function bestStage(facts: BadgeFacts): number {
  return Math.max(1, ...facts.habits.map((habit) => habit.stage));
}

// A log saved on a later local day than the day it is for. The backend only
// allows earlier days inside the current period, so that part is already true.
function hasBackdatedLog(facts: BadgeFacts): boolean {
  const zone = facts.input.timezone;
  return facts.habits.some(({ habit }) =>
    habit.logs.some((log) => log.occurred_on < localDate(log.created_at, zone)),
  );
}

const base = { chapter: "getting-started", secret: false } as const;

export const gettingStartedBadges: Badge[] = [
  {
    ...base,
    id: "seed-money",
    name: "Seed Money",
    description: "Create your first habit.",
    tier: "bronze",
    evaluate: (facts) => countTo(facts.habits.length, 1),
  },
  {
    ...base,
    id: "first-drop",
    name: "First Drop of Water",
    description: "Log your first activity.",
    tier: "bronze",
    evaluate: (facts) => countTo(facts.totalLogs, 1),
  },
  {
    ...base,
    id: "green-thumb",
    name: "Green Thumb",
    description: "Reach plant stage 2 on any habit.",
    tier: "bronze",
    evaluate: (facts) => yesNo(bestStage(facts) >= 2),
  },
  {
    ...base,
    id: "sapling-season",
    name: "Sapling Season",
    description: "Reach plant stage 3 on any habit.",
    tier: "bronze",
    evaluate: (facts) => yesNo(bestStage(facts) >= 3),
  },
  {
    ...base,
    id: "full-bloom",
    name: "Full Bloom",
    description: "Reach plant stage 4 on any habit.",
    tier: "bronze",
    evaluate: (facts) => yesNo(bestStage(facts) >= 4),
  },
  {
    ...base,
    id: "backdated",
    name: "Backdated",
    description: "Log an activity for an earlier day in the current period.",
    tier: "bronze",
    evaluate: (facts) => yesNo(hasBackdatedLog(facts)),
  },
  {
    ...base,
    id: "personal-touch",
    name: "Personal Touch",
    description: "Set your display name.",
    tier: "bronze",
    // Awarded by the request that changes the name (see BadgeInput).
    evaluate: (facts) => yesNo(facts.input.displayNameSet === true),
  },
  {
    ...base,
    id: "roots-down",
    name: "Roots Down",
    description: "Have 3 active habits at once.",
    tier: "bronze",
    evaluate: (facts) =>
      countTo(mostActiveAtOnce(facts.habits, facts.input.today), 3),
  },
];
