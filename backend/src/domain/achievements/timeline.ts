import {
  growthStage,
  healthFromRate,
  HEALTH_WINDOW,
  type GrowthStage,
  type PlantHealth,
} from "../growth.js";
import {
  addDays,
  daysBetween,
  type BadgeFacts,
  type HabitFacts,
} from "./facts.js";

// The replay from docs/badges-steps-6-7-plan.md, section 2: each habit's
// stage, health and streak on every past day, for the badges that ask what was
// true "at once" or "at some point". Pure, like the rest of `domain/`.
//
// A habit's state only changes on a checkpoint: its start, a period boundary
// or a log date. So each habit becomes a list of moments, one per checkpoint,
// and the state holds until the next one. The numbers match `overallProgress`,
// `plantHealth` and `currentStreak` called with `today` set to that day and
// only the logs up to it (timeline.test.ts checks this), but are worked out in
// one pass instead of calling those per day.

export type HabitMoment = {
  // First day of this state.
  from: string;
  // First day of the next state, the end date, or the day after today.
  to: string;
  stage: GrowthStage;
  health: PlantHealth;
  streak: number;
};

// A stretch of days in which no habit changes, with the state of every habit
// that is active during it. A stretch with no active habits has an empty map.
export type Stretch = {
  from: string;
  to: string;
  habits: ReadonlyMap<string, HabitMoment>;
};

export type Replay = {
  timelines: ReadonlyMap<string, readonly HabitMoment[]>;
  stretches: readonly Stretch[];
};

function earlier(a: string, b: string): string {
  return a < b ? a : b;
}

// One habit's states from its start date to its end date (or today, while it
// runs), oldest first. Empty for a habit that has not started.
export function habitTimeline(facts: HabitFacts, today: string): HabitMoment[] {
  const { habit, periods, dates } = facts;
  if (habit.start_date > today || periods.length === 0) return [];

  const tomorrow = addDays(today, 1);
  const stop =
    facts.endDate === null ? tomorrow : earlier(facts.endDate, tomorrow);
  const target = habit.target_count;
  const total = habit.num_periods === null ? null : target * habit.num_periods;

  // The period a log counts toward, like `periodIndexOf`: a log before the
  // start counts toward the first period, and one past every period counts
  // toward none (-1).
  const periodOf = (date: string): number => {
    if (date < habit.start_date) return 0;
    let low = 0;
    let high = periods.length - 1;
    while (low < high) {
      const mid = Math.ceil((low + high) / 2);
      if ((periods[mid] as (typeof periods)[number]).start <= date) low = mid;
      else high = mid - 1;
    }
    return date < (periods[low] as (typeof periods)[number]).end ? low : -1;
  };

  const checkpoints = [
    ...new Set([
      habit.start_date,
      ...periods.map((period) => period.start),
      ...dates,
    ]),
  ]
    .filter((date) => date >= habit.start_date && date < stop)
    .sort();

  const counts = new Array<number>(periods.length).fill(0);
  const met = (index: number) => (counts[index] ?? 0) >= target;
  let nextLog = 0;
  let logged = 0;
  let completed = 0;
  const moments: HabitMoment[] = [];

  checkpoints.forEach((day, i) => {
    while (nextLog < dates.length && (dates[nextLog] as string) <= day) {
      const index = periodOf(dates[nextLog] as string);
      if (index >= 0) {
        counts[index] = (counts[index] ?? 0) + 1;
        logged += 1;
      }
      nextLog += 1;
    }
    while (
      completed < periods.length &&
      (periods[completed] as (typeof periods)[number]).end <= day
    ) {
      completed += 1;
    }

    // Rule 8.8: met share of the last four completed periods.
    const window = Math.min(HEALTH_WINDOW, completed);
    let metInWindow = 0;
    for (let j = completed - window; j < completed; j += 1) {
      if (met(j)) metInWindow += 1;
    }
    const rate = window === 0 ? 1 : metInWindow / window;

    // Rule 8.6: the current period once met, then met completed periods.
    let streak = completed < periods.length && met(completed) ? 1 : 0;
    for (let j = completed - 1; j >= 0 && met(j); j -= 1) streak += 1;

    moments.push({
      from: day,
      to: checkpoints[i + 1] ?? stop,
      stage: growthStage(total === null ? null : Math.min(1, logged / total)),
      health: healthFromRate(rate),
      streak,
    });
  });
  return moments;
}

// Lines every habit's moments up into stretches where nothing changes.
export function sweep(
  timelines: ReadonlyMap<string, readonly HabitMoment[]>,
): Stretch[] {
  const bounds = new Set<string>();
  for (const moments of timelines.values()) {
    for (const moment of moments) {
      bounds.add(moment.from);
      bounds.add(moment.to);
    }
  }
  const days = [...bounds].sort();
  const next = new Map<string, number>();
  const stretches: Stretch[] = [];

  for (let i = 0; i + 1 < days.length; i += 1) {
    const from = days[i] as string;
    const habits = new Map<string, HabitMoment>();
    for (const [id, moments] of timelines) {
      let index = next.get(id) ?? 0;
      while (index < moments.length && (moments[index]?.to as string) <= from) {
        index += 1;
      }
      next.set(id, index);
      const moment = moments[index];
      if (moment && moment.from <= from) habits.set(id, moment);
    }
    stretches.push({ from, to: days[i + 1] as string, habits });
  }
  return stretches;
}

const cache = new WeakMap<BadgeFacts, Replay>();

// The replay for one check, worked out the first time a rule asks for it.
export function replay(facts: BadgeFacts): Replay {
  const cached = cache.get(facts);
  if (cached) return cached;
  const timelines = new Map(
    facts.habits.map((habit) => [
      habit.habit.id,
      habitTimeline(habit, facts.input.today),
    ]),
  );
  const result = { timelines, stretches: sweep(timelines) };
  cache.set(facts, result);
  return result;
}

// The most habits for which `test` held on the same day.
export function mostAtOnce(
  facts: BadgeFacts,
  test: (moment: HabitMoment) => boolean,
): number {
  let most = 0;
  for (const stretch of replay(facts).stretches) {
    let count = 0;
    for (const moment of stretch.habits.values()) if (test(moment)) count += 1;
    most = Math.max(most, count);
  }
  return most;
}

// The most days in a row on which `test` held for the whole garden.
export function longestRun(
  facts: BadgeFacts,
  test: (habits: readonly HabitMoment[]) => boolean,
): number {
  let best = 0;
  let run = 0;
  for (const stretch of replay(facts).stretches) {
    if (test([...stretch.habits.values()])) {
      run += daysBetween(stretch.from, stretch.to);
      best = Math.max(best, run);
    } else {
      run = 0;
    }
  }
  return best;
}

// One habit's moments, or none.
export function momentsOf(
  facts: BadgeFacts,
  habit: HabitFacts,
): readonly HabitMoment[] {
  return replay(facts).timelines.get(habit.habit.id) ?? [];
}
