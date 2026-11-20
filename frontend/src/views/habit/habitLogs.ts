import type { HabitDetail } from "@/lib/habits"

/** The day before an exclusive end date: a period's or a habit's last day. UTC avoids 23 and 25 hour days. */
export function lastDay(exclusiveEnd: string): string {
  const date = new Date(`${exclusiveEnd}T00:00:00Z`)
  date.setUTCDate(date.getUTCDate() - 1)
  return date.toISOString().slice(0, 10)
}

/** Only the current period can be edited, and not once the habit has finished or before today's date is known. */
export function canEditLogs(habit: HabitDetail, today: string | undefined): boolean {
  const { stats } = habit
  return Boolean(today && stats.state !== "expired" &&
    (stats.state === "not_started" || (today >= stats.current_period.start && today < stats.current_period.end)))
}

/** The logs on one day that can be removed: none outside the current period. */
export function removableLogsOn(habit: HabitDetail, today: string | undefined, date: string) {
  return canEditLogs(habit, today) ? habit.stats.current_period_logs.filter((log) => log.occurred_on === date) : []
}
