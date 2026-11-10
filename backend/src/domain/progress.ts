import {
  completedPeriodCount,
  displayPeriodIndex,
  habitState,
  periodBounds,
  periodCounts,
  type PeriodHabit,
} from "./periods.js";

// Progress, consistency and streak rules from docs/backend/design.md, sections
// 8.2 to 8.6. These are pure: they take a habit, the dates of its logs and
// today's date, and return numbers. Nothing is stored.

export type ProgressHabit = PeriodHabit & { target_count: number };

export type PeriodStatus = "completed" | "current" | "upcoming";

export type PeriodSummary = {
  // 1 for the first period.
  number: number;
  start: string;
  // First day of the next period. The period does not include this date.
  end: string;
  count: number;
  target: number;
  // True when the target was reached. The count can pass the target (4 of 3).
  met: boolean;
  status: PeriodStatus;
};

export type CurrentProgress = {
  number: number;
  start: string;
  end: string;
  count: number;
  target: number;
  // Count over target, capped at 1 for the progress bar.
  fraction: number;
};

export type Consistency = {
  successful: number;
  completed: number;
  // successful over completed, or null before any period has finished.
  rate: number | null;
};

// Every period with its count and whether its target was met. Periods that
// are over are "completed". The one in progress is "current", and a habit that
// has not started has only "upcoming" periods.
export function periodSummaries(
  habit: ProgressHabit,
  logDates: readonly string[],
  today: string,
): PeriodSummary[] {
  const counts = periodCounts(habit, logDates, today);
  const state = habitState(habit, today);
  const completed = completedPeriodCount(habit, today);

  return counts.map((count, index) => {
    const { start, end } = periodBounds(habit, index);
    let status: PeriodStatus = "upcoming";
    if (index < completed) status = "completed";
    else if (state === "active" && index === completed) status = "current";
    return {
      number: index + 1,
      start,
      end,
      count,
      target: habit.target_count,
      met: count >= habit.target_count,
      status,
    };
  });
}

// Rule 8.2: logs in the period shown now, over the target. Before the start
// this is the first period, and after the end it is the last one.
export function currentPeriodProgress(
  habit: ProgressHabit,
  logDates: readonly string[],
  today: string,
): CurrentProgress {
  const index = displayPeriodIndex(habit, today);
  const count = periodCounts(habit, logDates, today)[index] ?? 0;
  const { start, end } = periodBounds(habit, index);
  return {
    number: index + 1,
    start,
    end,
    count,
    target: habit.target_count,
    fraction: Math.min(1, count / habit.target_count),
  };
}

// Rule 8.3: all logs over the total target, capped at 1. Extra logs in one
// period make up for a shortfall in another. Null for an indefinite habit,
// which has no total target.
export function overallProgress(
  habit: ProgressHabit,
  logDates: readonly string[],
  today: string,
): number | null {
  if (habit.num_periods === null) return null;
  const total = periodCounts(habit, logDates, today).reduce(
    (sum, count) => sum + count,
    0,
  );
  return Math.min(1, total / (habit.target_count * habit.num_periods));
}

// Rule 8.4: successful completed periods over completed periods. The period in
// progress is left out.
export function consistency(
  habit: ProgressHabit,
  logDates: readonly string[],
  today: string,
): Consistency {
  const completed = periodSummaries(habit, logDates, today).filter(
    (period) => period.status === "completed",
  );
  const successful = completed.filter((period) => period.met).length;
  return {
    successful,
    completed: completed.length,
    rate: completed.length === 0 ? null : successful / completed.length,
  };
}

// Rule 8.6: consecutive successful periods, newest first. A miss ends the run.
// The period in progress counts once its target is met, and until then it does
// not break the run.
export function currentStreak(
  habit: ProgressHabit,
  logDates: readonly string[],
  today: string,
): number {
  const periods = periodSummaries(habit, logDates, today);
  let streak = 0;

  const current = periods.find((period) => period.status === "current");
  if (current?.met) streak += 1;

  const completed = periods.filter((period) => period.status === "completed");
  for (let i = completed.length - 1; i >= 0; i -= 1) {
    if (!completed[i]?.met) break;
    streak += 1;
  }
  return streak;
}

// Rule 8.5 for several habits: the average of each habit's consistency, leaving
// out habits that have not finished a period. Null when none has.
export function averageConsistency(
  rates: readonly (number | null)[],
): number | null {
  const present = rates.filter((rate): rate is number => rate !== null);
  if (present.length === 0) return null;
  return present.reduce((sum, rate) => sum + rate, 0) / present.length;
}
