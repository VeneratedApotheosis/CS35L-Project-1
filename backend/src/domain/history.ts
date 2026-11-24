import { DateTime } from "luxon";
import { habitResult, type BadgeLevel } from "./badges.js";
import {
  growthStage,
  plantHealth,
  type GrowthStage,
  type PlantHealth,
} from "./growth.js";
import { endDate, habitState } from "./periods.js";
import {
  bestStreak,
  consistency,
  periodSummaries,
  type ProgressHabit,
} from "./progress.js";

// The history of finished habits, for the History tab. Pure: the caller loads
// the habits and logs and passes today's date. See
// docs/frontend/habit-history-plan.md.

export type HistorySourceHabit = ProgressHabit & {
  id: string;
  name: string;
  description: string | null;
  plant_type: string;
};

export type HistoryItem = { habit: HistorySourceHabit; logDates: string[] };

export type HistorySort = "newest" | "oldest" | "best";

export type HistoryHabit = {
  id: string;
  name: string;
  description: string | null;
  plant_type: string;
  target_count: number;
  interval_count: number;
  interval_unit: string;
  num_periods: number;
  start_date: string;
  // The first day after the last period, like `end_date` elsewhere.
  end_date: string;
  // The last day of the habit, for showing "Oct 27 – Nov 23".
  last_day: string;
  badge: BadgeLevel;
  // 0 to 1.
  final_progress: number;
  final_consistency: number | null;
  periods_met: number;
  periods_total: number;
  total_logs: number;
  // The longest run of met periods, in periods.
  best_streak: number;
  stage: GrowthStage;
  health: PlantHealth;
};

export type HistorySummary = {
  finished: number;
  by_level: Record<BadgeLevel, number>;
  total_logs: number;
  // The average final progress of every finished habit, or null with none.
  average_final_progress: number | null;
  // The soonest end date among habits still running, for the empty state.
  // The first day after the last period, or null when none will end.
  next_end_date: string | null;
};

export type History = { summary: HistorySummary; habits: HistoryHabit[] };

const LEVEL_RANK: Record<BadgeLevel, number> = {
  gold: 0,
  silver: 1,
  bronze: 2,
  none: 3,
};

const compareText = (a: string, b: string) => (a < b ? -1 : a > b ? 1 : 0);

function finishedHabit(
  habit: HistorySourceHabit,
  logDates: readonly string[],
  today: string,
): HistoryHabit {
  const result = habitResult(habit, logDates, today);
  const periods = periodSummaries(habit, logDates, today);
  const counted = consistency(habit, logDates, today);
  // An expired habit always has an end date, a number of periods and a result.
  const end = endDate(habit) as string;
  const progress = result.progress as number;
  return {
    id: habit.id,
    name: habit.name,
    description: habit.description,
    plant_type: habit.plant_type,
    target_count: habit.target_count,
    interval_count: habit.interval_count,
    interval_unit: habit.interval_unit,
    num_periods: habit.num_periods as number,
    start_date: habit.start_date,
    end_date: end,
    last_day: DateTime.fromISO(end).minus({ days: 1 }).toISODate() as string,
    badge: result.badge as BadgeLevel,
    final_progress: progress,
    final_consistency: result.consistency,
    periods_met: counted.successful,
    periods_total: counted.completed,
    total_logs: logDates.length,
    best_streak: bestStreak(periods),
    stage: growthStage(progress),
    health: plantHealth(habit, logDates, today),
  };
}

function sortHistory(habits: HistoryHabit[], sort: HistorySort): void {
  const newest = (a: HistoryHabit, b: HistoryHabit) =>
    compareText(b.end_date, a.end_date) || compareText(a.name, b.name);
  if (sort === "oldest") {
    habits.sort(
      (a, b) =>
        compareText(a.end_date, b.end_date) || compareText(a.name, b.name),
    );
  } else if (sort === "best") {
    habits.sort(
      (a, b) =>
        LEVEL_RANK[a.badge] - LEVEL_RANK[b.badge] ||
        b.final_progress - a.final_progress ||
        newest(a, b),
    );
  } else {
    habits.sort(newest);
  }
}

// Every finished habit, filtered by level and sorted. The summary always
// covers all finished habits, whatever the filter.
export function buildHistory(
  items: readonly HistoryItem[],
  today: string,
  options: { level?: BadgeLevel; sort?: HistorySort } = {},
): History {
  const finished: HistoryHabit[] = [];
  let nextEnd: string | null = null;

  for (const { habit, logDates } of items) {
    if (habitState(habit, today) === "expired") {
      finished.push(finishedHabit(habit, logDates, today));
      continue;
    }
    const end = endDate(habit);
    if (end !== null && (nextEnd === null || end < nextEnd)) nextEnd = end;
  }

  const byLevel: Record<BadgeLevel, number> = {
    gold: 0,
    silver: 0,
    bronze: 0,
    none: 0,
  };
  let totalLogs = 0;
  let progressSum = 0;
  for (const habit of finished) {
    byLevel[habit.badge] += 1;
    totalLogs += habit.total_logs;
    progressSum += habit.final_progress;
  }

  const shown = options.level
    ? finished.filter((habit) => habit.badge === options.level)
    : finished;
  sortHistory(shown, options.sort ?? "newest");

  return {
    summary: {
      finished: finished.length,
      by_level: byLevel,
      total_logs: totalLogs,
      average_final_progress:
        finished.length === 0 ? null : progressSum / finished.length,
      next_end_date: nextEnd,
    },
    habits: shown,
  };
}
