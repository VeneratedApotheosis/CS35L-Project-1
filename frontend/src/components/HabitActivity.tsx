"use client"

import { useRef, useState, type FormEvent } from "react"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { useAuth } from "@/auth/useAuth"
import { ApiError } from "@/lib/api"
import { habitKeys, type HabitDetail, type HabitStats } from "@/lib/habits"
import { addActivity, deleteActivity, type ActivityLog } from "@/lib/logs"
import { formatDate } from "@/lib/goal"
import { Button } from "./Button"
import { Card } from "./Card"
import { Toast } from "./Toast"

/** Details-page logging (#203), followed by Undo and current-period deletion (#204). */
export function HabitActivity({ habit, today }: { habit: HabitDetail; today?: string }) {
  const { user, signOut } = useAuth()
  const client = useQueryClient()
  const [chosenDate, setChosenDate] = useState<string | null>(null)
  const [validationError, setValidationError] = useState("")
  const [lastLogged, setLastLogged] = useState<ActivityLog | null>(null)
  const [confirmation, setConfirmation] = useState("")
  // Block duplicate submits synchronously, including before React re-renders.
  const writing = useRef(false)
  const key = habitKeys.detail(user?.id ?? "signed-out", habit.id)
  const period = habit.stats.current_period
  const expired = habit.stats.state === "expired" || Boolean(today && habit.stats.end_date && today >= habit.stats.end_date)
  const notStarted = habit.stats.state === "not_started"
  const minimum = notStarted ? today : period.start
  const date = chosenDate ?? today ?? ""
  const current = Boolean(today && !expired && (notStarted || (today >= period.start && today < period.end)))

  function applyStats(stats: HabitStats, updateLogs: (logs: HabitDetail["stats"]["current_period_logs"]) => HabitDetail["stats"]["current_period_logs"]) {
    client.setQueryData<HabitDetail>(key, (old) => old ? {
      ...old,
      stats: { ...old.stats, ...stats, current_period_logs: updateLogs(old.stats.current_period_logs ?? []) },
    } : old)
    // Short response stats update the count and plant immediately. Refetch the
    // full details for consistency/streak/history, plus Garden and Dashboard.
    // A refresh failure must never cause an already-saved log to be resubmitted.
    if (user) void client.invalidateQueries({ queryKey: habitKeys.all(user.id) })
  }

  const add = useMutation({
    mutationFn: (occurredOn: string) => addActivity(habit.id, occurredOn),
    retry: false,
    onMutate: () => client.cancelQueries({ queryKey: key }),
    onSuccess: (result) => {
      applyStats(result.stats, (logs) => [...logs, { id: result.log.id, occurred_on: result.log.occurred_on }])
      setLastLogged(result.log)
      setChosenDate(null)
    },
    onSettled: () => { writing.current = false },
  })
  const remove = useMutation({
    mutationFn: (logId: string) => deleteActivity(habit.id, logId),
    retry: false,
    onMutate: () => client.cancelQueries({ queryKey: key }),
    onSuccess: (result, logId) => {
      applyStats(result.stats, (logs) => logs.filter((log) => log.id !== logId))
      setLastLogged((log) => log?.id === logId ? null : log)
      setConfirmation("Activity removed.")
    },
    onSettled: () => { writing.current = false },
  })
  const busy = add.isPending || remove.isPending
  const error = add.error ?? remove.error
  const unauthorized = error instanceof ApiError && error.status === 401

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (writing.current || !current || !user || !today || !minimum) return
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || date < minimum || date > today) {
      setValidationError(`Choose a date from ${formatDate(minimum)} through ${formatDate(today)}.`)
      return
    }
    writing.current = true
    setValidationError("")
    setConfirmation("")
    remove.reset()
    add.mutate(date)
  }

  function deleteLog(logId: string) {
    if (writing.current || !current || !user) return
    writing.current = true
    setValidationError("")
    setConfirmation("")
    add.reset()
    remove.mutate(logId)
  }

  return (
    <section className="stack-md" aria-labelledby="habit-activity-heading">
      <Card className="stack-lg">
        <h2 className="text-h2" id="habit-activity-heading">Activity</h2>
        <form className="form" onSubmit={submit} noValidate>
          <div className="field">
            <label htmlFor="activity-date" className="field__label">Activity date</label>
            <input id="activity-date" className="input" type="date" required
              value={date} min={minimum} max={today}
              disabled={!current || busy || unauthorized}
              aria-invalid={Boolean(validationError)}
              aria-describedby={`activity-date-help${validationError ? " activity-date-error" : ""}`}
              onChange={(event) => { setChosenDate(event.target.value); setValidationError(""); add.reset(); remove.reset() }} />
            <p id="activity-date-help" className="text-body-sm text-secondary">
              {expired ? "This habit has ended. Its activity is locked."
                : !today ? "Loading your timezone and today's date…"
                  : !current ? "Refreshing the current period. Try again shortly."
                    : notStarted ? "This habit hasn't started yet. You can log today toward its first period."
                      : `Choose a date from ${formatDate(period.start)} through today. Earlier periods are locked.`}
            </p>
            {validationError && <p id="activity-date-error" role="alert" className="field__error">{validationError}</p>}
          </div>
          <Button type="submit" className="self-start" disabled={!current || busy || unauthorized}>
            {add.isPending ? "Logging…" : "Log activity"}
          </Button>
        </form>

        {error && (
          <div role="alert" className="stack-sm">
            <p className="form-error">{unauthorized ? "Your session has expired. Sign in again to continue."
              : error instanceof ApiError && error.status === 400 ? error.message
                : remove.isError ? "Couldn't remove the activity. Check your connection and try again."
                  : "Couldn't log the activity. Check your connection and try again."}</p>
            {unauthorized && <Button className="self-start" onClick={() => void signOut()}>Sign in again</Button>}
          </div>
        )}
        {confirmation && <p className="text-body-sm" role="status">{confirmation}</p>}

        <details className="habit-disclosure" open>
          <summary><h3 className="text-h3" id="current-logs-heading">Activities this period</h3></summary>
          {!expired && (habit.stats.current_period_logs ?? []).length > 0 ? (
            <ul className="habit-activity-list">
              {habit.stats.current_period_logs.map((log) => (
                <li key={log.id} className="habit-activity-row">
                  <time dateTime={log.occurred_on}>{formatDate(log.occurred_on)}</time>
                  {current && <Button id={`delete-log-${encodeURIComponent(log.id)}`} variant="ghost" size="sm" disabled={busy || unauthorized}
                    aria-label={`Delete activity on ${formatDate(log.occurred_on)}`}
                    onClick={() => deleteLog(log.id)}>
                    {remove.isPending && remove.variables === log.id ? "Deleting…" : "Delete activity"}
                  </Button>}
                </li>
              ))}
            </ul>
          ) : <p className="text-body-sm text-secondary">{expired ? "Earlier activity is locked." : "No activities logged in this period yet."}</p>}
        </details>
      </Card>
      {lastLogged && <Toast key={lastLogged.id} message="Activity logged." duration={5000}
        onDismiss={() => setLastLogged(null)}
        action={current && !busy ? { label: "Undo", onClick: () => deleteLog(lastLogged.id) } : undefined} />}
    </section>
  )
}
