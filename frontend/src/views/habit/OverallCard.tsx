import { computeEndDate, periodPhrase } from "@/lib/goal"
import type { HabitDetail } from "@/lib/habits"
import { daysBetween, shortDate } from "../garden/HabitCard"
import { lastDay } from "./habitLogs"

const days = (n: number) => `${n} ${n === 1 ? "day" : "days"}`

export interface Figure {
  value: string
  /** Grey lines under the figure. */
  notes: string[]
}

/** The goal, the period the habit is in, and the days left in that period, with its dates and when the whole habit ends. */
export function runFigures(habit: HabitDetail, today: string | undefined): { goal: Figure; period: Figure; left: Figure } {
  const { stats } = habit
  const current = stats.current_period
  const periodLast = lastDay(current.end)
  const range = current.start === periodLast ? shortDate(periodLast) : `${shortDate(current.start)} – ${shortDate(periodLast)}`
  const end = habit.num_periods === null ? null : computeEndDate(
    habit.start_date, habit.interval_unit, habit.interval_count, habit.num_periods,
  )
  const endsOn = end === null ? "No end date" : `Habit ends ${shortDate(lastDay(end))}`
  const done = current.number - 1

  let left: Figure
  if (stats.state === "expired" || (today && end !== null && today >= end)) {
    left = { value: "Done", notes: [`Finished ${shortDate(lastDay(end ?? current.end))}`] }
  } else if (!today) {
    left = { value: "—", notes: [range, endsOn] }
  } else if (stats.state === "not_started" || today < current.start) {
    left = { value: days(daysBetween(today, current.start)), notes: ["until it starts", range, endsOn] }
  } else {
    const n = daysBetween(today, current.end)
    left = { value: n <= 0 ? "Ends today" : days(n), notes: [range, endsOn] }
  }
  return {
    goal: { value: `${habit.target_count}×`, notes: [`${periodPhrase(habit.interval_count, habit.interval_unit)}, from ${shortDate(habit.start_date)}`] },
    period: {
      value: current.total === null ? `${current.number}` : `${current.number} of ${current.total}`,
      notes: [`${done} ${done === 1 ? "period" : "periods"} done`],
    },
    left,
  }
}

export interface OverallCardProps {
  habit: HabitDetail
  today: string | undefined
  /** Set for a shared habit: how many members it has, out of the most it allows. */
  members?: { count: number; max: number }
}

/** The goal, which period the habit is in, and the days left in it, in one row. A shared habit adds its member count under them. */
export function OverallCard({ habit, today, members }: OverallCardProps) {
  const figures = runFigures(habit, today)
  const items = [
    ["Goal", figures.goal],
    ["Period", figures.period],
    ["Days left", figures.left],
  ] as const
  return (
    <section className="habit-card habit-overall" aria-labelledby="habit-overall-title">
      <h2 id="habit-overall-title" className="habit-overall__title">Overall</h2>
      <dl className="habit-overall__figures">
        {items.map(([name, figure]) => (
          <div key={name}>
            <dt>{name}</dt>
            <dd>
              <span className="habit-overall__value">{figure.value}</span>
              {figure.notes.map((note) => <span key={note} className="habit-overall__note">{note}</span>)}
            </dd>
          </div>
        ))}
      </dl>
      {members && (
        <p className="habit-overall__members">
          <span>Members</span>
          <strong>{members.count} of {members.max}</strong>
        </p>
      )}
    </section>
  )
}
