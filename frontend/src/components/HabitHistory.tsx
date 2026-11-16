"use client"

import { useState } from "react"
import type { HabitDetail } from "@/lib/habits"
import { formatDate } from "@/lib/goal"
import { Button } from "./Button"
import { Card } from "./Card"

function monthDate(month: string, offset = 0) {
  const [year, number] = month.split("-").map(Number)
  return new Date(Date.UTC(year, number - 1 + offset, 1))
}
function previousDate(iso: string) {
  const date = new Date(`${iso}T00:00:00Z`)
  date.setUTCDate(date.getUTCDate() - 1)
  return date.toISOString().slice(0, 10)
}

export function HabitHistory({ habit, today }: { habit: HabitDetail; today?: string }) {
  const { stats } = habit
  const [selectedMonth, setSelectedMonth] = useState<string | null>(null)
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
  const deletable = Boolean(today && stats.state !== "expired" &&
    (stats.state === "not_started" || (today >= stats.current_period.start && today < stats.current_period.end)))

  return (
    <section className="stack-md" aria-labelledby="habit-history-heading">
      <div className="history-layout">
      <Card className="stack-md history-calendar-panel">
        <h2 id="habit-history-heading" className="text-h2">Activity history</h2>
        <div className="history-calendar-header">
          <Button variant="ghost" size="sm" aria-label="Previous month" onClick={() => setSelectedMonth(monthDate(month, -1).toISOString().slice(0, 7))}>←</Button>
          <h3 className="text-h3" aria-live="polite">{label}</h3>
          <Button variant="ghost" size="sm" aria-label="Next month" onClick={() => setSelectedMonth(monthDate(month, 1).toISOString().slice(0, 7))}>→</Button>
        </div>
        <table className="history-calendar" aria-label={`Activity calendar for ${label}`}>
          <thead><tr>{["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => <th scope="col" key={day}>{day}</th>)}</tr></thead>
          <tbody>{Array.from({ length: cells.length / 7 }, (_, week) => (
            <tr key={week}>{cells.slice(week * 7, week * 7 + 7).map((date, index) => {
              const count = date ? counts.get(date) ?? 0 : 0
              return <td key={date ?? `blank-${index}`}>
                {date && <div className="history-day" data-logged={count > 0} data-past={Boolean(today && date < today)} aria-current={date === today ? "date" : undefined}
                  aria-label={`${formatDate(date)}: ${count} ${count === 1 ? "activity" : "activities"}${date === today ? ", today" : ""}`}>
                  <time dateTime={date}>{Number(date.slice(-2))}</time>
                  {count > 0 && <span className="history-day-count" aria-hidden="true">×{count}</span>}
                </div>}
              </td>
            })}</tr>
          ))}</tbody>
        </table>
        <p className="text-body-sm text-secondary">Highlighted dates show the number of activities logged. Goals are assessed per period, not per day.</p>
        {!stats.log_days.some((day) => day.date.startsWith(month) && day.count > 0) && <p className="text-body-sm">No activities logged this month.</p>}
      </Card>
      <Card className="stack-md history-period-panel" role="region" aria-labelledby="period-history-heading">
        <details className="habit-disclosure" open>
        <summary><h2 id="period-history-heading" className="text-h2">Period history</h2></summary>
        <ol className="history-periods">
          {stats.periods.map((period) => {
            const current = period.status === "current"
            const result = period.status === "completed" ? period.met ? "✓ Goal met" : "− Goal missed" : current ? period.met ? "Current · Goal met" : "Current · In progress" : "Upcoming"
            const logs = period.number === stats.current_period.number && deletable ? stats.current_period_logs : []
            return <li key={period.number} className="history-period stack-sm" aria-current={current ? "step" : undefined}>
              <div className="history-period-heading">
                <h4 className="text-h3">Period {period.number}</h4>
                <span className="history-period-count text-body-sm">{period.count}/{period.target} activities</span>
              </div>
              <p className="text-body-sm text-secondary">{result}</p>
              <p className="text-body-sm text-secondary"><time dateTime={period.start}>{formatDate(period.start)}</time> – <time dateTime={previousDate(period.end)}>{formatDate(previousDate(period.end))}</time></p>
              {period.status === "completed" && <p className="text-body-sm text-secondary">Locked</p>}
              {logs.length > 0 && <ul className="history-log-links">{logs.map((log, index) => <li key={log.id}>
                <a className="garden-link" onClick={() => {
                  const disclosure = document.getElementById(`delete-log-${encodeURIComponent(log.id)}`)?.closest("details")
                  if (disclosure) disclosure.open = true
                }} href={`#delete-log-${encodeURIComponent(log.id)}`}>Manage activity {index + 1} · {formatDate(log.occurred_on)}</a>
              </li>)}</ul>}
            </li>
          })}
        </ol>
        </details>
      </Card>
      </div>
    </section>
  )
}
