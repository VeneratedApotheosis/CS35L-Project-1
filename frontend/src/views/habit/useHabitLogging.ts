"use client"

import { useRef, useState } from "react"
import { useQueryClient } from "@tanstack/react-query"
import { useAuth } from "@/auth/useAuth"
import { ApiError } from "@/lib/api"
import { formatDate } from "@/lib/goal"
import { habitKeys } from "@/lib/habits"
import { addActivity, deleteActivity } from "@/lib/logs"

export interface LoggingNotice {
  message: string
  error?: boolean
  undo?: () => void
}

/**
 * Logging from the habit's page: today, or another day, with the same Undo toast as the Garden. Every
 * save refetches the habit, so the page shows the saved state. Only one write runs at a time.
 */
export function useHabitLogging(habitId: string, today: string | undefined) {
  const { user } = useAuth()
  const client = useQueryClient()
  const writing = useRef(false)
  const [busy, setBusy] = useState(false)
  const [noticeId, setNoticeId] = useState(0)
  const [notice, setNotice] = useState<LoggingNotice | null>(null)

  function refresh() {
    if (user) void client.invalidateQueries({ queryKey: habitKeys.all(user.id) })
  }

  async function undo(logId: string) {
    if (writing.current || !user) return
    writing.current = true
    setNoticeId((id) => id + 1)
    setBusy(true)
    try {
      await deleteActivity(habitId, logId)
      refresh()
      setNotice({ message: "Activity removed." })
    } catch {
      setNotice({ message: "Couldn't undo activity. Try again in a moment.", error: true })
    } finally { writing.current = false; setBusy(false) }
  }

  async function save(date: string) {
    const result = await addActivity(habitId, date)
    refresh()
    setNoticeId((id) => id + 1)
    setNotice({
      message: date === today ? "Activity logged for today." : `Activity logged for ${formatDate(date)}.`,
      undo: () => { void undo(result.log.id) },
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
      await deleteActivity(habitId, logId)
      refresh()
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
