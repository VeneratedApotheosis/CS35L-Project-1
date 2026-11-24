import { PLANT_TYPES } from "../../plants.js";
import {
  countTo,
  mostActiveAtOnce,
  type Badge,
  type BadgeFacts,
  type HabitFacts,
} from "../facts.js";
import { momentsOf, mostAtOnce } from "../timeline.js";

// Section 5 of docs/badges-ideas.md. "At once" means active on the same day
// (started and not expired). Greenhouse and Prize Winner read each plant's
// past stage and health from the replay (timeline.ts).

function plantTypes(facts: BadgeFacts): Set<string> {
  return new Set(facts.habits.map((habit) => habit.habit.plant_type));
}

function mostOfOnePlant(facts: BadgeFacts): number {
  const perType = new Map<string, number>();
  for (const { habit } of facts.habits) {
    perType.set(habit.plant_type, (perType.get(habit.plant_type) ?? 0) + 1);
  }
  return Math.max(0, ...perType.values());
}

function activeAtOnce(facts: BadgeFacts, plant?: string): number {
  return mostActiveAtOnce(
    facts.habits,
    facts.input.today,
    plant === undefined
      ? undefined
      : (habit) => habit.habit.plant_type === plant,
  );
}

// The longest run of completed periods a plant spent wholly at stage 4 and
// Healthy. Health only changes when a period ends and stage never goes down,
// so the state on a period's first day holds for the whole period.
function prizeRun(facts: BadgeFacts, habit: HabitFacts): number {
  const byDay = new Map(
    momentsOf(facts, habit).map((moment) => [moment.from, moment]),
  );
  let best = 0;
  let run = 0;
  for (const period of habit.periods) {
    if (period.status !== "completed") break;
    const moment = byDay.get(period.start);
    if (moment?.stage === 4 && moment.health === "healthy") {
      run += 1;
      best = Math.max(best, run);
    } else {
      run = 0;
    }
  }
  return best;
}

const base = { chapter: "garden", secret: false } as const;

export const gardenBadges: Badge[] = [
  {
    ...base,
    id: "variety-pack",
    name: "Variety Pack",
    description: "Grow 3 different plant types.",
    tier: "bronze",
    evaluate: (facts) => countTo(plantTypes(facts).size, 3),
  },
  {
    ...base,
    id: "botanist",
    name: "Botanist",
    description: "Grow 6 different plant types.",
    tier: "silver",
    evaluate: (facts) => countTo(plantTypes(facts).size, 6),
  },
  {
    // Every plant type the app offers now. Adding a plant later raises the
    // target, and anyone who already earned it keeps it.
    ...base,
    id: "complete-collection",
    name: "Complete Collection",
    description: "Finish a habit with every plant type.",
    tier: "platinum",
    evaluate: (facts) => {
      const done = new Set(
        facts.habits
          .filter((habit) => habit.finished)
          .map((habit) => habit.habit.plant_type),
      );
      return countTo(
        PLANT_TYPES.filter((type) => done.has(type)).length,
        PLANT_TYPES.length,
      );
    },
  },
  {
    ...base,
    id: "rose-garden",
    name: "Rose Garden",
    description: "Have 3 roses in your garden at once.",
    tier: "silver",
    evaluate: (facts) => countTo(activeAtOnce(facts, "rose"), 3),
  },
  {
    ...base,
    id: "jungle",
    name: "Jungle",
    description: "Have 10 active plants at once.",
    tier: "gold",
    evaluate: (facts) => countTo(activeAtOnce(facts), 10),
  },
  {
    ...base,
    id: "greenhouse",
    name: "Greenhouse",
    description: "Have 6 plants at stage 4 at once.",
    tier: "gold",
    evaluate: (facts) =>
      countTo(
        mostAtOnce(facts, (moment) => moment.stage === 4),
        6,
      ),
  },
  {
    ...base,
    id: "prize-winner",
    name: "Prize Winner",
    description: "Have a plant at stage 4 and Healthy for 4 periods straight.",
    tier: "silver",
    evaluate: (facts) =>
      countTo(
        Math.max(0, ...facts.habits.map((habit) => prizeRun(facts, habit))),
        4,
      ),
  },
  {
    ...base,
    id: "matching-set",
    name: "Matching Set",
    description: "Have 3 habits using the same plant type.",
    tier: "bronze",
    evaluate: (facts) => countTo(mostOfOnePlant(facts), 3),
  },
  {
    // The shelf width depends on the screen, so a shelf is taken as 3 plants.
    ...base,
    id: "shelf-full",
    name: "Shelf Full",
    description: "Fill a shelf (3 plants side by side).",
    tier: "bronze",
    evaluate: (facts) => countTo(activeAtOnce(facts), 3),
  },
  {
    ...base,
    id: "second-floor",
    name: "Second Floor",
    description: "Need a second shelf in your garden.",
    tier: "bronze",
    evaluate: (facts) => countTo(activeAtOnce(facts), 4),
  },
  {
    ...base,
    id: "hall-of-fame",
    name: "Hall of Fame",
    description: "Have 5 finished habits on the Completed garden shelves.",
    tier: "silver",
    evaluate: (facts) =>
      countTo(facts.habits.filter((habit) => habit.result.expired).length, 5),
  },
];
