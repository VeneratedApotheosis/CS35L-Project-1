"use client"

import { useState } from "react"
import { Leaf, Minus } from "lucide-react"
import { Button } from "@/components/Button"
import { formatDate } from "@/lib/goal"
import type { HabitDetail } from "@/lib/habits"
import { removableLogsOn } from "./habitLogs"

const LATEST = 4

/** The days that have activity, newest first: the date, and how many activities were logged on it. */
export function activityDays(habit: HabitDetail): { date: string; count: number }[] {
  return habit.stats.log_days
    .filter((day) => day.count > 0)
    .toSorted((a, b) => b.date.localeCompare(a.date))
}

export interface ActivityLogProps {
  habit: HabitDetail
  today: string | undefined
  /** A save is running, so removing waits. */
  busy: boolean
  /** Removes one log. A failure is shown by whoever owns the save, so this is not shown here. */
  onRemove: (logId: string) => Promise<void>
}

/**
 * A list of the days with activity, the latest few first, and the rest behind "Show all". A day of the
 * current period has a minus button that takes one activity off that day, the latest one. Earlier
 * periods are locked, so their days have no button.
 */
export function ActivityLog({ habit, today, busy, onRemove }: ActivityLogProps) {
  const [all, setAll] = useState(false)
  const days = activityDays(habit)
  const shown = all ? days : days.slice(0, LATEST)
  return (
    <section className="habit-card habit-log" aria-labelledby="habit-log-title">
      <h2 id="habit-log-title" className="habit-log__title">Activity log</h2>
      {days.length === 0 ? (
        <p className="habit-log__empty">Nothing logged yet.</p>
      ) : (
        <ol className="habit-log__list">
          {shown.map((day) => {
            const logs = removableLogsOn(habit, today, day.date)
            const last = logs.at(-1)
            return (
              <li key={day.date}>
                <Leaf size={18} aria-hidden="true" />
                <time dateTime={day.date}>{day.date === today ? "Today" : formatDate(day.date)}</time>
                <span className="habit-log__count">{day.count} {day.count === 1 ? "activity" : "activities"}</span>
                {last && (
                  <Button variant="secondary" size="sm" icon={Minus} disabled={busy}
                    aria-label={`Remove one activity on ${formatDate(day.date)}`}
                    onClick={() => { onRemove(last.id).catch(() => {}) }} />
                )}
              </li>
            )
          })}
        </ol>
      )}
      {days.length > LATEST && (
        <Button variant="ghost" size="sm" className="self-start" aria-expanded={all} onClick={() => setAll((open) => !open)}>
          {all ? "Show fewer" : `Show all ${days.length}`}
        </Button>
      )}
    </section>
  )
}
