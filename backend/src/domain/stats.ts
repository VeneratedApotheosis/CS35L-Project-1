import {
  growthStage,
  plantHealth,
  type GrowthStage,
  type PlantHealth,
} from "./growth.js";
import { isLogDeletable } from "./logging.js";
import { endDate, habitState, type HabitState } from "./periods.js";
import {
  consistency,
  currentPeriodProgress,
  currentStreak,
  overallProgress,
  periodSummaries,
  type Consistency,
  type PeriodSummary,
  type ProgressHabit,
} from "./progress.js";

// The numbers the screens show, put together from the rules in `domain/`.
// Pure: the caller loads the logs and passes today's date.

export type StatsHabit = ProgressHabit;

export type LogEntry = { id: string; occurred_on: string };

// What the Garden needs for each plant.
export type ShortStats = {
  state: HabitState;
  // The period shown as "this period": the first one before the start, the
  // last one after the end.
  current_period: {
    number: number;
    // Null for an indefinite habit.
    total: number | null;
    start: string;
    end: string;
    count: number;
    target: number;
  };
  // 0 to 1, or null for an indefinite habit.
  overall_progress: number | null;
  stage: GrowthStage;
  health: PlantHealth;
};

// What the Habit Details page needs.
export type FullStats = ShortStats & {
  // The first day after the last period, or null when indefinite.
  end_date: string | null;
  consistency: Consistency;
  streak: number;
  periods: PeriodSummary[];
  // One entry per day that has logs, oldest first, for the calendar.
  log_days: { date: string; count: number }[];
  // Logs in the period shown now, which can be deleted. Empty once expired,
  // because an expired habit is locked.
  current_period_logs: LogEntry[];
};

export function shortStats(
  habit: StatsHabit,
  logDates: readonly string[],
  today: string,
): ShortStats {
  const period = currentPeriodProgress(habit, logDates, today);
  const overall = overallProgress(habit, logDates, today);
  return {
    state: habitState(habit, today),
    current_period: {
      number: period.number,
      total: habit.num_periods,
      start: period.start,
      end: period.end,
      count: period.count,
      target: period.target,
    },
    overall_progress: overall,
    stage: growthStage(overall),
    health: plantHealth(habit, logDates, today),
  };
}

export function fullStats(
  habit: StatsHabit,
  logs: readonly LogEntry[],
  today: string,
): FullStats {
  const dates = logs.map((log) => log.occurred_on);

  const perDay = new Map<string, number>();
  for (const date of dates) perDay.set(date, (perDay.get(date) ?? 0) + 1);
  const logDays = [...perDay.entries()]
    .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
    .map(([date, count]) => ({ date, count }));

  const deletable = logs.filter((log) =>
    isLogDeletable(habit, log.occurred_on, today),
  );

  return {
    ...shortStats(habit, dates, today),
    end_date: endDate(habit),
    consistency: consistency(habit, dates, today),
    streak: currentStreak(habit, dates, today),
    periods: periodSummaries(habit, dates, today),
    log_days: logDays,
    current_period_logs: deletable.map(({ id, occurred_on }) => ({
      id,
      occurred_on,
    })),
  };
}
