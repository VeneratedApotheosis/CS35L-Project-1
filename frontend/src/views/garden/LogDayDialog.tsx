"use client"

import { useState, type FormEvent } from "react"
import { Button } from "@/components/Button"
import { Modal } from "@/components/Modal"
import { ApiError } from "@/lib/api"
import { formatDate } from "@/lib/goal"
import type { HabitWithStats } from "@/lib/habits"
import { DayPicker } from "react-day-picker"

/** Convert date-only values without passing through UTC or the browser's current date. */
function calendarDate(iso: string): Date {
  const [year, month, day] = iso.split("-").map(Number)
  return new Date(year, month - 1, day, 12)
}

function dateOnly(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`
}

export interface LogDayDialogProps {
  habit: HabitWithStats | null
  today: string
  /** Saves the log. It throws if that fails. */
  onSave: (habitId: string, date: string) => Promise<void>
  onClose: () => void
}

/** Log an activity on another day of the current period. The days that are allowed are the ones the backend allows. */
export function LogDayDialog({ habit, today, onSave, onClose }: LogDayDialogProps) {
  const [date, setDate] = useState("")
  const [error, setError] = useState("")
  const [saving, setSaving] = useState(false)

  // Before the start only today counts toward the first period. After it, any day of the current period up to today.
  const first = habit ? (habit.stats.state === "not_started" ? today : habit.stats.current_period.start) : today

  function close() {
    if (saving) return
    setDate("")
    setError("")
    onClose()
  }

  async function submit(event: FormEvent) {
    event.preventDefault()
    if (!habit || saving) return
    if (!date || date < first || date > today) {
      setError(`Choose a day from ${formatDate(first)} to ${formatDate(today)}.`)
      return
    }
    setSaving(true)
    setError("")
    try {
      await onSave(habit.id, date)
      setDate("")
      onClose()
    } catch (failure) {
      setError(
        failure instanceof ApiError && failure.status === 401 ? "Your session has expired. Sign in again to continue."
          : failure instanceof ApiError && failure.status === 400 ? "That day can't be logged for this habit."
            : "Couldn't log activity. Check your connection and try again.",
      )
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal open={habit !== null} onClose={close} title="Log another day"
      description={habit ? `Add an activity to “${habit.name}” on a day this period.` : undefined}>
      <form className="form log-day-form" onSubmit={submit} noValidate>
        <div className="field">
          <div className="log-day-form__label-row">
            <span className="field__label" id="garden-log-date-label">Day</span>
            <span className="log-day-form__selected-date">{date ? calendarDate(date).toLocaleDateString(undefined, {
              year: "numeric", month: "long", day: "numeric",
            }) : "No date selected"}</span>
          </div>
          {habit && first && today && <div role="group" aria-labelledby="garden-log-date-label"><DayPicker
            className="log-date-calendar"
            mode="single"
            selected={date ? calendarDate(date) : undefined}
            onSelect={(selected) => { setDate(selected ? dateOnly(selected) : ""); setError("") }}
            defaultMonth={calendarDate(today)}
            startMonth={calendarDate(first)}
            endMonth={calendarDate(today)}
            today={calendarDate(today)}
            disabled={saving ? true : [{ before: calendarDate(first) }, { after: calendarDate(today) }]}
            footer={date ? `Selected ${formatDate(date)}` : "Choose a day to log."}
          /></div>}
        </div>
        {error && <p role="alert" className="form-error">{error}</p>}
        <div className="flex flex-wrap justify-end gap-3">
          <Button variant="secondary" onClick={close} disabled={saving}>Cancel</Button>
          <Button type="submit" disabled={saving}>{saving ? "Saving…" : "Log activity"}</Button>
        </div>
      </form>
    </Modal>
  )
}
