import { DateTime } from "luxon";
import { habitResult, type HabitResult } from "../badges.js";
import { growthStage, type GrowthStage } from "../growth.js";
import { endDate, habitState, type HabitState } from "../periods.js";
import {
  overallProgress,
  periodSummaries,
  type PeriodSummary,
} from "../progress.js";
import type { BadgeDef, BadgeHabit, BadgeInput, Progress } from "./types.js";

// Numbers worked out once per check and shared by every rule, so each rule
// stays short. Pure: nothing here reads the clock or the database.

export type HabitFacts = {
  habit: BadgeHabit;
  // occurred_on of every log, oldest first.
  dates: string[];
  state: HabitState;
  periods: PeriodSummary[];
  // The first day after the last period (when it expires), or null.
  endDate: string | null;
  // The habit's last day, the day before `endDate`.
  lastDay: string | null;
  result: HabitResult;
  // Stage follows overall progress, which only grows as logs are added.
  stage: GrowthStage;
  // The longest run of met periods the habit ever had. See `bestStreak`.
  bestStreak: number;
  // Expired with a Bronze or better. This is what "finish a habit" means in
  // the badge list. A habit that ended below 60% does not count.
  finished: boolean;
};

export type DayFacts = { count: number; habitIds: Set<string> };

export type BadgeFacts = {
  input: BadgeInput;
  habits: HabitFacts[];
  totalLogs: number;
  // Logs per local date, across every habit.
  days: Map<string, DayFacts>;
  // Earned ids, including ones earned earlier in this same check. The engine
  // adds to it, so meta badges see the latest count.
  earned: Set<string>;
};

// A badge whose rule reads BadgeFacts.
export type Badge = BadgeDef<BadgeFacts>;

// Progress toward a count, such as 7 of 10 logs.
export function countTo(count: number, target: number): Progress {
  return { count, target };
}

// Progress for a yes or no badge.
export function yesNo(done: boolean): Progress {
  return { count: done ? 1 : 0, target: 1 };
}

export function addDays(date: string, days: number): string {
  return DateTime.fromISO(date, { zone: "utc" })
    .plus({ days })
    .toISODate() as string;
}

export function daysBetween(from: string, to: string): number {
  return DateTime.fromISO(to, { zone: "utc" })
    .diff(DateTime.fromISO(from, { zone: "utc" }), "days")
    .as("days");
}

// The local date of a timestamp in the profile timezone (UTC when unset).
export function localDate(timestamp: string, zone: string | null): string {
  const local = DateTime.fromISO(timestamp).setZone(zone ?? "utc");
  const date = local.isValid
    ? local
    : DateTime.fromISO(timestamp).setZone("utc");
  return date.toISODate() as string;
}

// 1 is Monday, 7 is Sunday.
export function weekday(date: string): number {
  return DateTime.fromISO(date, { zone: "utc" }).weekday;
}

// The longest run of periods whose target was met. A completed miss ends a
// run. The current period counts once met, like the current streak (8.6).
// This is the best streak ever, not the current one, so a check that runs
// late still sees a streak that has since been broken.
export function bestStreak(periods: readonly PeriodSummary[]): number {
  let best = 0;
  let run = 0;
  for (const period of periods) {
    if (period.status === "upcoming") break;
    if (period.met) {
      run += 1;
      best = Math.max(best, run);
    } else {
      run = 0;
    }
  }
  return best;
}

// The longest run of consecutive calendar dates in a sorted list.
export function longestDayRun(dates: readonly string[]): number {
  const unique = [...new Set(dates)].sort();
  let best = 0;
  let run = 0;
  let previous: string | null = null;
  for (const date of unique) {
    run = previous !== null && addDays(previous, 1) === date ? run + 1 : 1;
    best = Math.max(best, run);
    previous = date;
  }
  return best;
}

// The most habits active on any one day, up to today. Active means started
// and not yet expired (start_date <= day < end date). Deleted habits are gone
// from the data, so they cannot count, but badges earned earlier are kept.
export function mostActiveAtOnce(
  habits: readonly HabitFacts[],
  today: string,
  include: (habit: HabitFacts) => boolean = () => true,
): number {
  const events: [string, number][] = [];
  for (const facts of habits) {
    if (!include(facts) || facts.habit.start_date > today) continue;
    events.push([facts.habit.start_date, 1]);
    if (facts.endDate !== null) events.push([facts.endDate, -1]);
  }
  // On the same date, an expiry comes before a start: the day a habit expires
  // it is no longer active.
  events.sort(([a, x], [b, y]) => (a < b ? -1 : a > b ? 1 : x - y));
  let active = 0;
  let most = 0;
  for (const [, change] of events) {
    active += change;
    most = Math.max(most, active);
  }
  return most;
}

// True when the habit is active on the given date.
export function isActiveOn(facts: HabitFacts, date: string): boolean {
  if (date < facts.habit.start_date) return false;
  return facts.endDate === null || date < facts.endDate;
}

function habitFacts(habit: BadgeHabit, today: string): HabitFacts {
  const dates = habit.logs.map((log) => log.occurred_on).sort();
  const periods = periodSummaries(habit, dates, today);
  const end = endDate(habit);
  const result = habitResult(habit, dates, today);
  return {
    habit,
    dates,
    state: habitState(habit, today),
    periods,
    endDate: end,
    lastDay: end === null ? null : addDays(end, -1),
    result,
    stage: growthStage(overallProgress(habit, dates, today)),
    bestStreak: bestStreak(periods),
    finished:
      result.expired && result.badge !== null && result.badge !== "none",
  };
}

export function buildFacts(input: BadgeInput): BadgeFacts {
  const habits = input.habits.map((habit) => habitFacts(habit, input.today));
  const days = new Map<string, DayFacts>();
  let totalLogs = 0;
  for (const habit of input.habits) {
    for (const log of habit.logs) {
      totalLogs += 1;
      const day = days.get(log.occurred_on) ?? {
        count: 0,
        habitIds: new Set<string>(),
      };
      day.count += 1;
      day.habitIds.add(habit.id);
      days.set(log.occurred_on, day);
    }
  }
  return { input, habits, totalLogs, days, earned: new Set(input.earned) };
}
