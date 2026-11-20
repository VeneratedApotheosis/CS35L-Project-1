"use client"

import { useState } from "react"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { Button } from "@/components/Button"
import { Modal } from "@/components/Modal"
import { computeEndDate, formatDate } from "@/lib/goal"
import type { HabitDetail } from "@/lib/habits"
import { removableLogsOn } from "./habitLogs"

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]

function monthDate(month: string, offset = 0) {
  const [year, number] = month.split("-").map(Number)
  return new Date(Date.UTC(year, number - 1 + offset, 1))
}

export interface ActivityCalendarProps {
  habit: HabitDetail
  /** Today in the profile's time zone, once it is known. */
  today: string | undefined
  /** A save is running, so removing waits. */
  busy: boolean
  /** Removes one log. It resolves when the log is gone, and the calendar then closes its dialog. */
  onRemove: (logId: string) => Promise<void>
}

/**
 * The month's activity: a cell for every day with its date. A day with a log is filled green (and shows
 * the count when there are more than one). Behind the days a soft band joins the days of each period: green
 * once its goal was met (light), grey if it was missed, a darker green for the current one, and none for periods yet to come. Days outside the habit's run (before it starts,
 * and from its end) have no fill, only an outline. The band's ends are concentric with the day circles:
 * a circle sits as far from its band's edge on every side, so the band's radius is the circle's plus that gap. Days in the current period that have logs are buttons: one
 * opens a dialog listing that day's logs, each with Remove. Earlier periods are locked. Which days and logs there are comes from the server.
 */
export function ActivityCalendar({ habit, today, busy, onRemove }: ActivityCalendarProps) {
  const { stats } = habit
  const [selectedMonth, setSelectedMonth] = useState<string | null>(null)
  const [openDate, setOpenDate] = useState<string | null>(null)
  const month = selectedMonth ?? (today ?? habit.start_date).slice(0, 7)
  const start = monthDate(month)
  const label = start.toLocaleDateString(undefined, { month: "long", year: "numeric", timeZone: "UTC" })
  const days = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth() + 1, 0)).getUTCDate()
  const offset = start.getUTCDay()
  const counts = new Map(stats.log_days.map((day) => [day.date, day.count]))
  const cells = Array.from({ length: Math.ceil((offset + days) / 7) * 7 }, (_, index) => {
    const day = index - offset + 1
    return day > 0 && day <= days ? `${month}-${String(day).padStart(2, "0")}` : null
  })

  const logsOn = (date: string) => removableLogsOn(habit, today, date)
  const openLogs = openDate ? logsOn(openDate) : []
  // The habit's run: from its start to its end, which is exclusive. An ongoing habit has no end.
  const runEnd = habit.num_periods === null ? null
    : computeEndDate(habit.start_date, habit.interval_unit, habit.interval_count, habit.num_periods)
  const outside = (date: string) => date < habit.start_date || (runEnd !== null && date >= runEnd)
  const periodOf = (date: string | null) => date === null ? undefined : stats.periods.find((period) => date >= period.start && date < period.end)

  async function remove(logId: string) {
    try {
      await onRemove(logId)
      setOpenDate(null)
    } catch {
      // The failure is shown as a toast. The dialog stays open to try again.
    }
  }

  return (
    <section className="habit-card habit-calendar" aria-labelledby="habit-activity-title">
      <div className="habit-calendar__head">
        <h2 id="habit-activity-title" className="habit-calendar__title">Activity</h2>
        <div className="habit-calendar__nav">
          <Button variant="ghost" size="sm" icon={ChevronLeft} aria-label="Previous month"
            onClick={() => setSelectedMonth(monthDate(month, -1).toISOString().slice(0, 7))} />
          <h3 className="habit-calendar__month" aria-live="polite">{label}</h3>
          <Button variant="ghost" size="sm" icon={ChevronRight} aria-label="Next month"
            onClick={() => setSelectedMonth(monthDate(month, 1).toISOString().slice(0, 7))} />
        </div>
      </div>

      <table className="habit-calendar__grid" aria-label={`Activity calendar for ${label}`}>
        <thead><tr>{WEEKDAYS.map((day) => <th scope="col" key={day} abbr={day}><span aria-hidden="true">{day[0]}</span><span className="sr-only">{day}</span></th>)}</tr></thead>
        <tbody>{Array.from({ length: cells.length / 7 }, (_, week) => (
          <tr key={week}>{cells.slice(week * 7, week * 7 + 7).map((date, index, row) => {
            if (!date) return <td key={`blank-${index}`} />
            const period = periodOf(date)
            // A band is one piece in a row: it starts where the period does, or at the row's first day.
            const joinsBefore = Boolean(period && periodOf(row[index - 1] ?? null)?.number === period.number)
            const joinsAfter = Boolean(period && periodOf(row[index + 1] ?? null)?.number === period.number)
            const band = !period ? undefined : joinsBefore ? (joinsAfter ? "middle" : "end") : joinsAfter ? "start" : "single"
            const result = !period ? undefined : period.status === "current" ? "current" : period.status === "upcoming" ? "upcoming" : period.met ? "met" : "missed"
            const count = counts.get(date) ?? 0
            const name = `${formatDate(date)}: ${count} ${count === 1 ? "activity" : "activities"}${date === today ? ", today" : ""}`
            const face = (
              <>
                <time dateTime={date}>{Number(date.slice(-2))}</time>
                {count > 1 && <span className="habit-day__count" aria-hidden="true">×{count}</span>}
              </>
            )
            const shared = { "data-outside": outside(date), "data-logged": count > 0, "data-today": date === today, "data-past": Boolean(today && date < today) }
            return (
              <td key={date} data-band={band} data-period={result}>
                {logsOn(date).length > 0
                  ? <button type="button" className="habit-day" aria-label={`${name}. Manage`} {...shared}
                    onClick={() => setOpenDate(date)}>{face}</button>
                  : <div className="habit-day" aria-label={name} aria-current={date === today ? "date" : undefined} {...shared}>{face}</div>}
              </td>
            )
          })}</tr>
        ))}</tbody>
      </table>

      <Modal open={openDate !== null && openLogs.length > 0} onClose={() => setOpenDate(null)}
        title={openDate ? formatDate(openDate) : "Activity"} description="Remove an activity logged on this day.">
        <ul className="habit-calendar__logs">
          {openLogs.map((log, index) => (
            <li key={log.id}>
              <span>Activity {index + 1}</span>
              <Button variant="secondary" size="sm" disabled={busy}
                aria-label={`Remove activity ${index + 1} on ${formatDate(log.occurred_on)}`}
                onClick={() => { void remove(log.id) }}>Remove</Button>
            </li>
          ))}
        </ul>
      </Modal>
    </section>
  )
}
