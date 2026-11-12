import { Card } from "./Card"
import { ProgressBar } from "./ProgressBar"
import { ProgressRing } from "./ProgressRing"
import type { HabitProgressStats } from "@/lib/habits"

/** Displays server-calculated values; no log or streak calculations live here. */
export function HabitProgress({ stats }: { stats: HabitProgressStats }) {
  const period = stats.current_period
  const label = stats.state === "not_started" ? "First period" : stats.state === "expired" ? "Final period" : "Current period"
  const rate = stats.consistency.rate
  return (
    <section className="stack-md" aria-labelledby="habit-progress-heading">
      <h2 id="habit-progress-heading" className="text-h2">Progress</h2>
      <Card className="stack-lg">
        <div className="stack-sm">
          <ProgressBar label={label} count={period.count} target={period.target} />
          <p className="text-body-sm text-secondary">
            Period {period.number}{period.total !== null && ` of ${period.total}`}
          </p>
        </div>
        <div className="habit-progress-summary">
          <div className="stack-sm">
            <h3 className="text-h3">Overall progress</h3>
            <ProgressRing label="Overall progress" value={stats.overall_progress} />
            {stats.overall_progress === null && <p className="text-body-sm text-secondary">No total goal for an ongoing habit.</p>}
          </div>
          <dl className="habit-progress-metrics">
            <div className="stack-sm">
              <dt className="text-h3">Consistency</dt>
              <dd className="stack-sm">
                <span className="text-h2">{rate === null ? "—" : `${Math.round(rate * 100)}%`}</span>
                <span className="text-body-sm text-secondary">{rate === null ? "Available after your first completed period." : `${stats.consistency.successful} of ${stats.consistency.completed} completed periods met the goal.`}</span>
              </dd>
            </div>
            <div className="stack-sm">
              <dt className="text-h3">Current streak</dt>
              <dd className="stack-sm">
                <span className="text-h2">{stats.streak} {stats.streak === 1 ? "period" : "periods"}</span>
                <span className="text-body-sm text-secondary">Consecutive periods meeting your goal.</span>
              </dd>
            </div>
          </dl>
        </div>
      </Card>
    </section>
  )
}
