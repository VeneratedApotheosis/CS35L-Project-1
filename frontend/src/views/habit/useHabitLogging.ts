"use client"

import { useRef, useState } from "react"
import { useQueryClient } from "@tanstack/react-query"
import { useAuth } from "@/auth/useAuth"
import { ApiError } from "@/lib/api"
import { formatDate } from "@/lib/goal"
import { habitKeys } from "@/lib/habits"
import { addActivity, deleteActivity } from "@/lib/logs"
import { addSharedActivity, deleteSharedActivity, sharedHabitKeys, type SharedHabitDetail, type SharedLogStats } from "@/lib/sharedHabits"

export interface LoggingNotice {
  message: string
  error?: boolean
  undo?: () => void
}

/** What a save changed in the caller's own logs, so the shared page can show it before the refetch lands. */
interface LogEdit {
  added?: { id: string; occurred_on: string }
  removedId?: string
}

function adjustDays(days: { date: string; count: number }[], date: string, by: 1 | -1) {
  const next = days.some((day) => day.date === date)
    ? days.map((day) => day.date === date ? { ...day, count: day.count + by } : day)
    : [...days, { date, count: by }]
  return next.filter((day) => day.count > 0)
}

/**
 * Logging from the habit's page: today, or another day, with the same Undo toast as the Garden. Every
 * save refetches the habit, so the page shows the saved state. Only one write runs at a time.
 *
 * With `shared`, the habit is a shared habit and the logs are the caller's own (`today` is their `own_today`).
 * The response's group stats, own stats and member row are put into the cache first, so a failed refetch
 * cannot make a saved log look unsaved.
 */
export function useHabitLogging(habitId: string, today: string | undefined, shared = false) {
  const { user } = useAuth()
  const client = useQueryClient()
  const writing = useRef(false)
  const [busy, setBusy] = useState(false)
  const [noticeId, setNoticeId] = useState(0)
  const [notice, setNotice] = useState<LoggingNotice | null>(null)

  function refresh(result: SharedLogStats | null, edit: LogEdit) {
    if (!user) return
    if (shared && result) {
      client.setQueryData<SharedHabitDetail>(sharedHabitKeys.detail(user.id, habitId), (old) => {
        if (!old) return old
        const own = old.own_stats
        const samePeriod = own.current_period.start === result.own_stats.current_period.start
        const logs = samePeriod ? own.current_period_logs : []
        const removed = edit.removedId ? own.current_period_logs.find((log) => log.id === edit.removedId) : undefined
        const logDays = edit.added ? adjustDays(own.log_days, edit.added.occurred_on, 1)
          : removed ? adjustDays(own.log_days, removed.occurred_on, -1) : own.log_days
        return {
          ...old, stats: result.stats, own_today: result.own_today,
          own_stats: { ...own, ...result.own_stats, log_days: logDays,
            current_period_logs: result.own_stats.state === "expired" ? []
              : edit.added ? [...logs, edit.added] : logs.filter((log) => log.id !== edit.removedId) },
          members: old.members.map((member) => member.user_id === user.id ? {
            ...member, overall_progress: result.own_stats.overall_progress,
            current_period_count: result.own_stats.current_period.count,
            health: result.own_stats.health, streak: result.own_stats.streak,
          } : member),
        }
      })
    }
    void client.invalidateQueries({ queryKey: shared ? sharedHabitKeys.all(user.id) : habitKeys.all(user.id) })
  }

  async function removeRemote(logId: string) {
    if (user && shared) await client.cancelQueries({ queryKey: sharedHabitKeys.detail(user.id, habitId) })
    if (shared) {
      refresh(await deleteSharedActivity(habitId, logId), { removedId: logId })
    } else {
      await deleteActivity(habitId, logId)
      refresh(null, { removedId: logId })
    }
  }

  async function undo(logId: string) {
    if (writing.current || !user) return
    writing.current = true
    setNoticeId((id) => id + 1)
    setBusy(true)
    try {
      await removeRemote(logId)
      setNotice({ message: "Activity removed." })
    } catch {
      setNotice({ message: "Couldn't undo activity. Try again in a moment.", error: true })
    } finally { writing.current = false; setBusy(false) }
  }

  async function save(date: string) {
    // The cache is written from the response, so a refetch that started before the write must not land over it.
    if (user && shared) await client.cancelQueries({ queryKey: sharedHabitKeys.detail(user.id, habitId) })
    let log: { id: string; occurred_on: string }
    if (shared) {
      const result = await addSharedActivity(habitId, date)
      log = { id: result.log.id, occurred_on: result.log.occurred_on }
      refresh(result, { added: log })
    } else {
      const result = await addActivity(habitId, date)
      log = { id: result.log.id, occurred_on: result.log.occurred_on }
      refresh(null, { added: log })
    }
    setNoticeId((id) => id + 1)
    setNotice({
      message: date === today ? "Activity logged for today." : `Activity logged for ${formatDate(date)}.`,
      undo: () => { void undo(log.id) },
    })
  }

  /** Log today. A failure is shown in the toast. */
  async function logToday() {
    if (writing.current || !user || !today) return
    writing.current = true
    setBusy(true)
    try {
      await save(today)
    } catch (error) {
      setNoticeId((id) => id + 1)
      setNotice({
        message: error instanceof ApiError && error.status === 401
          ? "Your session expired. Sign in again to log activity."
          : "Couldn't log activity. Check your connection and try again.",
        error: true,
      })
    } finally { writing.current = false; setBusy(false) }
  }

  /** Log another day. The dialog shows a failure, so this throws. */
  async function logOn(_habitId: string, date: string) {
    if (writing.current || !user) throw new Error("busy")
    writing.current = true
    setBusy(true)
    try {
      await save(date)
    } finally { writing.current = false; setBusy(false) }
  }

  /** Remove one log from the calendar. It resolves when the log is gone, and throws if it could not be removed. */
  async function removeLog(logId: string) {
    if (writing.current || !user) throw new Error("busy")
    writing.current = true
    setNoticeId((id) => id + 1)
    setBusy(true)
    try {
      await removeRemote(logId)
      setNotice({ message: "Activity removed." })
    } catch (error) {
      setNotice({
        message: error instanceof ApiError && error.status === 401
          ? "Your session expired. Sign in again to change your activity."
          : "Couldn't remove the activity. Check your connection and try again.",
        error: true,
      })
      throw error
    } finally { writing.current = false; setBusy(false) }
  }

  return { busy, notice, noticeId, dismiss: () => setNotice(null), logToday, logOn, removeLog }
}
