import {
  displayPeriodIndex,
  habitState,
  periodBounds,
  periodIndexOf,
  type PeriodHabit,
} from "./periods.js";

// Logging rules from docs/backend/design.md, section 8.1. Pure, like the rest
// of `domain/`: the caller passes today's date in the user's timezone.

// Returns why a log on `date` is not allowed, or null when it is.
//
// - An expired habit takes no logs.
// - A log is never in the future.
// - A habit that has not started yet can be logged for today only. The log
//   counts toward the first period.
// - Otherwise the date must fall in the current period, up to and including
//   today. Earlier periods are locked.
export function logDateProblem(
  habit: PeriodHabit,
  date: string,
  today: string,
): string | null {
  const state = habitState(habit, today);
  if (state === "expired") {
    return "This habit has ended and takes no new logs";
  }
  if (date > today) {
    return "occurred_on: cannot be in the future";
  }
  if (state === "not_started") {
    return date === today
      ? null
      : "occurred_on: a habit that has not started can only be logged for today";
  }

  const { start } = periodBounds(habit, displayPeriodIndex(habit, today));
  if (date < start) {
    return `occurred_on: must be in the current period, which started on ${start}`;
  }
  return null;
}

// A log can be deleted while it is in the period shown now. Logs in earlier
// periods are locked, and so is everything once the habit has expired.
export function isLogDeletable(
  habit: PeriodHabit,
  date: string,
  today: string,
): boolean {
  if (habitState(habit, today) === "expired") return false;
  return periodIndexOf(habit, date) === displayPeriodIndex(habit, today);
}
