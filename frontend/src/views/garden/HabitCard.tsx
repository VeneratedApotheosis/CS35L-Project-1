import { ArrowUpRight, Flame } from "lucide-react"
import { ProgressBar } from "@/components/ProgressBar"
import { formatDate } from "@/lib/goal"
import type { HabitWithStats } from "@/lib/habits"

/** Whole calendar days from one YYYY-MM-DD date to another. UTC avoids 23 and 25 hour days. */
export function daysBetween(from: string, to: string): number {
  return Math.round((Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / 86_400_000)
}

/** A short date without the year, e.g. "Nov 13". Falls back to the ISO string. */
export function shortDate(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number)
  if (!y || !m || !d) return iso
  return new Date(y, m - 1, d).toLocaleDateString(undefined, { month: "short", day: "numeric" })
}

/** "week" for a goal every week, and "period" for one every few weeks. */
export function unitWord(habit: HabitWithStats): string {
  return habit.interval_count === 1 ? habit.interval_unit : "period"
}

/** The grey line under the name: how long is left in this period, or the state of a habit that is not running. */
export function remainingLine(habit: HabitWithStats, today: string): string {
  const { state, current_period: period } = habit.stats
  if (state === "expired") return "Finished"
  if (state === "not_started") return `Starts ${formatDate(habit.start_date)}`
  if (!today) return ""
  const left = daysBetween(today, period.end)
  return left <= 0 ? "Ends today" : `${left} ${left === 1 ? "day" : "days"} left this ${unitWord(habit)}`
}

/** "Weekly progress" for a goal every week, day or month, and "Progress this period" otherwise. */
export function progressTitle(habit: HabitWithStats): string {
  if (habit.interval_count !== 1) return "Progress this period"
  return { day: "Daily progress", week: "Weekly progress", month: "Monthly progress" }[habit.interval_unit]
}

/** The line at the bottom of the card: how far from the goal, or what to do with a habit that is not running. */
export function encouragement(habit: HabitWithStats): string {
  const { state, current_period: period } = habit.stats
  if (state === "expired") return "See how it went"
  if (state === "not_started") return "Not started yet"
  const left = period.target - period.count
  if (left <= 0) return "Goal reached. Nice work!"
  return left === 1 ? "One more to reach your goal!" : `${left} more to reach your goal`
}

export interface HabitCardProps {
  habit: HabitWithStats
  today: string
  /** The streak in periods, once it has been fetched. */
  streak: number | undefined
}

/**
 * What shows beside a plant while the pointer is on it: the name and what is left, the streak, this
 * period's progress as pills, and a line on how far the goal is. The soft card behind it is drawn
 * by the parent, behind the plant; this is the writing on top.
 */
export function HabitCard({ habit, today, streak }: HabitCardProps) {
  const { count, target } = habit.stats.current_period
  const remaining = remainingLine(habit, today)
  return (
    <div className="garden-card__content">
      <div className="garden-card__header">
        <div className="garden-card__title">
          <h3 className="garden-card__name" title={habit.name}>{habit.name}</h3>
          {remaining && <p className="garden-card__sub">{remaining}</p>}
        </div>
        {streak !== undefined && streak > 0 && (
          <span className="garden-card__streak">
            <Flame size={16} aria-hidden="true" />
            {streak} {unitWord(habit)} streak
          </span>
        )}
      </div>
      <div className="garden-card__progress">
        <ProgressBar label={`${habit.name}: current period`} caption={progressTitle(habit)} count={count} target={target} />
        <p className="garden-card__foot">
          <span>{encouragement(habit)}</span>
          <ArrowUpRight size={16} aria-hidden="true" />
        </p>
      </div>
    </div>
  )
}
