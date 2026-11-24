import { durationPhrase, periodPhrase } from "@/lib/goal"
import type { HistoryHabit, HistoryLevel, HistorySort } from "@/lib/history"

export const levelLabels: Record<HistoryLevel, string> = {
  gold: "Gold",
  silver: "Silver",
  bronze: "Bronze",
  none: "No badge",
}

export const LEVELS: readonly HistoryLevel[] = ["gold", "silver", "bronze", "none"]

export const sortLabels: Record<HistorySort, string> = {
  newest: "Newest first",
  oldest: "Oldest first",
  best: "Best result first",
}

export function isLevel(value: string | null): value is HistoryLevel {
  return value !== null && (LEVELS as readonly string[]).includes(value)
}

export function isSort(value: string | null): value is HistorySort {
  return value === "newest" || value === "oldest" || value === "best"
}

function parse(iso: string): Date {
  const [y, m, d] = iso.split("-").map(Number)
  return new Date(y ?? 1970, (m ?? 1) - 1, d ?? 1)
}

/** "Oct 27", with the year only when it is not `currentYear`. */
export function shortDate(iso: string, currentYear: number): string {
  const date = parse(iso)
  return date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    ...(date.getFullYear() === currentYear ? {} : { year: "numeric" }),
  })
}

/** "Oct 27 – Nov 23": first to last day. */
export function dateRange(habit: Pick<HistoryHabit, "start_date" | "last_day">, currentYear: number): string {
  return `${shortDate(habit.start_date, currentYear)} – ${shortDate(habit.last_day, currentYear)}`
}

/** "3 times every week for 4 weeks". */
export function goalPhrase(habit: Pick<HistoryHabit, "target_count" | "interval_count" | "interval_unit" | "num_periods">): string {
  const times = `${habit.target_count} ${habit.target_count === 1 ? "time" : "times"}`
  return `${times} ${periodPhrase(habit.interval_count, habit.interval_unit)} ${durationPhrase(habit.interval_count, habit.interval_unit, habit.num_periods)}`
}

/** "4 weeks", or "4 periods" when a period is more than one unit. */
export function streakText(habit: Pick<HistoryHabit, "best_streak" | "interval_count" | "interval_unit">): string {
  const n = habit.best_streak
  const unit = habit.interval_count === 1 ? habit.interval_unit : "period"
  return `${n} ${unit}${n === 1 ? "" : "s"}`
}

export const percent = (rate: number | null): string => rate === null ? "—" : `${Math.round(rate * 100)}%`

/** "November 2026", the heading a habit is grouped under (by its last day). */
export function monthHeading(iso: string): string {
  return parse(iso).toLocaleDateString(undefined, { month: "long", year: "numeric" })
}

/** Habits in their given order, split into runs that end in the same month. */
export function groupByMonth(habits: readonly HistoryHabit[]): { month: string; habits: HistoryHabit[] }[] {
  const groups: { month: string; habits: HistoryHabit[] }[] = []
  for (const habit of habits) {
    const month = monthHeading(habit.last_day)
    const last = groups[groups.length - 1]
    if (last && last.month === month) last.habits.push(habit)
    else groups.push({ month, habits: [habit] })
  }
  return groups
}
