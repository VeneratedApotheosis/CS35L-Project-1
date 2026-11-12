import { DateTime } from "luxon";

// Period rules from docs/backend/design.md, section 8.1. Everything here works
// on local calendar dates (YYYY-MM-DD) and never reads the clock: the caller
// passes "today" (see `todayInZone`). That keeps every rule easy to test.

// The part of a habit these rules need.
export type PeriodHabit = {
  start_date: string;
  interval_count: number;
  interval_unit: string;
  num_periods: number | null;
};

export type HabitState = "not_started" | "active" | "expired";

export type PeriodBounds = {
  // First day of the period.
  start: string;
  // First day of the next period. The period does not include this date.
  end: string;
};

const UNIT_KEYS = { day: "days", week: "weeks", month: "months" } as const;

function unitKey(unit: string): "days" | "weeks" | "months" {
  const key = UNIT_KEYS[unit as keyof typeof UNIT_KEYS];
  if (!key) throw new RangeError(`Unknown interval unit: ${unit}`);
  return key;
}

function parse(date: string): DateTime {
  return DateTime.fromISO(date, { zone: "utc" });
}

// The first day of period `index` (0 is the first period). Months always
// count from the original start date, so the day is clamped to the end of a
// shorter month without drifting: 31 Jan, 28 Feb, 31 Mar.
export function periodStart(habit: PeriodHabit, index: number): string {
  const key = unitKey(habit.interval_unit);
  return parse(habit.start_date)
    .plus({ [key]: index * habit.interval_count })
    .toISODate() as string;
}

export function periodBounds(habit: PeriodHabit, index: number): PeriodBounds {
  return {
    start: periodStart(habit, index),
    end: periodStart(habit, index + 1),
  };
}

// The first day after the last period, or null for an indefinite habit. A
// habit expires on this date.
export function endDate(habit: PeriodHabit): string | null {
  return habit.num_periods === null
    ? null
    : periodStart(habit, habit.num_periods);
}

export function habitState(habit: PeriodHabit, today: string): HabitState {
  if (today < habit.start_date) return "not_started";
  const end = endDate(habit);
  if (end !== null && today >= end) return "expired";
  return "active";
}

// Which period a date falls in. A date before the start date counts as the
// first period, so a habit that has not started can still be logged. A date on
// or after the end date gives `num_periods`, which is one past the last period.
export function periodIndexOf(habit: PeriodHabit, date: string): number {
  if (date < habit.start_date) return 0;

  const key = unitKey(habit.interval_unit);
  const elapsed = parse(date).diff(parse(habit.start_date), key).as(key);
  let index = Math.floor(elapsed / habit.interval_count);
  // The estimate can be off by one around month ends, so correct it.
  while (index > 0 && date < periodStart(habit, index)) index -= 1;
  while (date >= periodStart(habit, index + 1)) index += 1;

  return habit.num_periods === null
    ? index
    : Math.min(index, habit.num_periods);
}

// The period shown as "this period". Before the start it is the first period,
// and after the end it is the last one.
export function displayPeriodIndex(habit: PeriodHabit, today: string): number {
  const state = habitState(habit, today);
  if (state === "not_started") return 0;
  if (state === "expired") return (habit.num_periods as number) - 1;
  return periodIndexOf(habit, today);
}

// How many periods are over. They are locked and final. A habit that has not
// started has none, and an expired one has all of them.
export function completedPeriodCount(
  habit: PeriodHabit,
  today: string,
): number {
  const state = habitState(habit, today);
  if (state === "not_started") return 0;
  if (state === "expired") return habit.num_periods as number;
  return periodIndexOf(habit, today);
}

// Logs per period, from the first period up to the one shown now (or all of
// them for a habit with an end). Logs outside every period are ignored.
export function periodCounts(
  habit: PeriodHabit,
  logDates: readonly string[],
  today: string,
): number[] {
  const length = habit.num_periods ?? displayPeriodIndex(habit, today) + 1;
  const counts = new Array<number>(length).fill(0);
  for (const date of logDates) {
    const index = periodIndexOf(habit, date);
    if (index < length) counts[index] = (counts[index] ?? 0) + 1;
  }
  return counts;
}
