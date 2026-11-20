"use client"

import { useState, type FormEvent } from "react"
import { Button } from "@/components/Button"
import { Modal } from "@/components/Modal"
import { ApiError } from "@/lib/api"
import { formatDate } from "@/lib/goal"
import type { HabitWithStats } from "@/lib/habits"

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
      <form className="form" onSubmit={submit} noValidate>
        <div className="field">
          <label className="field__label" htmlFor="garden-log-date">Day</label>
          <input id="garden-log-date" type="date" className="input" value={date} min={first} max={today}
            disabled={saving} onChange={(event) => { setDate(event.target.value); setError("") }} />
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
