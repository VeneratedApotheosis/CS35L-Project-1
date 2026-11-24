import { evaluateBadges } from "../domain/achievements/engine.js";
import type {
  BadgeHabit,
  BadgeInput,
  BadgeLog,
} from "../domain/achievements/types.js";

// Builders for the achievement badge tests.

let nextId = 0;

// A habit with sensible defaults: 3 times a week for 4 weeks from Monday
// 2 Nov 2026 (it expires on 30 Nov). Logs are dates, saved at noon UTC that
// day unless given in full.
export function habit(
  over: Partial<Omit<BadgeHabit, "logs">> & {
    logs?: (string | BadgeLog)[];
  } = {},
): BadgeHabit {
  nextId += 1;
  const { logs = [], ...rest } = over;
  return {
    id: `habit-${nextId}`,
    plant_type: "pothos",
    target_count: 3,
    interval_count: 1,
    interval_unit: "week",
    num_periods: 4,
    start_date: "2026-11-02",
    created_at: "2026-11-02T12:00:00Z",
    ...rest,
    logs: logs.map((log) =>
      typeof log === "string"
        ? { occurred_on: log, created_at: `${log}T12:00:00Z` }
        : log,
    ),
  };
}

export function input(over: Partial<BadgeInput> = {}): BadgeInput {
  return {
    today: "2026-11-24",
    timezone: null,
    habits: [],
    earned: new Set(),
    ...over,
  };
}

export const times = (date: string, n: number) => Array<string>(n).fill(date);

// Three logs in each of the 4 weeks: 100% progress and consistency.
export const fullMonth = [
  ...times("2026-11-03", 3),
  ...times("2026-11-10", 3),
  ...times("2026-11-17", 3),
  ...times("2026-11-24", 3),
];

export function check(over: Partial<BadgeInput> = {}) {
  return evaluateBadges(input(over));
}
