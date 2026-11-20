import { CalendarDays, Check } from "lucide-react"
import { Button } from "@/components/Button"
import { ProgressBar } from "@/components/ProgressBar"
import { ProgressRing } from "@/components/ProgressRing"
import type { HabitDetail } from "@/lib/habits"
import { encouragement, unitWord } from "../garden/HabitCard"

/** "This week" for a goal every week, and "This period" for one every few weeks. */
export function periodTitle(habit: HabitDetail): string {
  if (habit.interval_count !== 1) return "This period"
  return { day: "Today", week: "This week", month: "This month" }[habit.interval_unit]
}

export interface ThisPeriodCardProps {
  habit: HabitDetail
  /** Today in the profile's time zone, once it is known. */
  today: string | undefined
  /** A save is running, so logging waits. */
  busy: boolean
  onLogToday: () => void
  onLogDate: () => void
}

/**
 * All of how the habit is going: this period's progress bar, the overall ring,
 * consistency and the streak, then the two ways to log: today, or another day of the period. The
 * numbers all come from the server.
 */
export function ThisPeriodCard({ habit, today, busy, onLogToday, onLogDate }: ThisPeriodCardProps) {
  const { stats } = habit
  const { count, target } = stats.current_period
  const rate = stats.consistency.rate
  const unit = unitWord(habit)
  const finished = stats.state === "expired"
  const canLog = !finished && Boolean(today) && !busy
  return (
    <section className="habit-card habit-period" aria-labelledby="habit-period-title">
      <h2 id="habit-period-title" className="habit-period__title">{periodTitle(habit)}</h2>

      <div className="habit-period__bar">
        <ProgressBar label={`${habit.name}: current period`} caption={encouragement(habit)} count={count} target={target} />
      </div>

      <dl className="habit-period__metrics">
        <div className="habit-period__overall">
          <dt>{stats.overall_progress === null ? "No total goal" : "Overall progress"}</dt>
          <dd><ProgressRing label="Overall progress" value={stats.overall_progress} /></dd>
        </div>
        <div>
          <dt>Consistency</dt>
          <dd>
            <span className="habit-period__value">{rate === null ? "—" : `${Math.round(rate * 100)}%`}</span>
            <span className="habit-period__sub">
              {rate === null ? "Available after your first completed period." : `${stats.consistency.successful} of ${stats.consistency.completed} completed periods met the goal.`}
            </span>
          </dd>
        </div>
        <div>
          <dt>Current streak</dt>
          <dd>
            <span className="habit-period__value">{stats.streak} {stats.streak === 1 ? unit : `${unit}s`}</span>
            <span className="habit-period__sub">Consecutive periods meeting your goal.</span>
          </dd>
        </div>
      </dl>

      <div className="habit-period__actions">
        <Button icon={Check} full disabled={!canLog} onClick={onLogToday}>Log today</Button>
        <Button variant="secondary" icon={CalendarDays} full disabled={!canLog} onClick={onLogDate}>Log date</Button>
      </div>
      {finished && <p className="habit-period__sub">This habit has finished, so its activity is locked.</p>}
    </section>
  )
}
