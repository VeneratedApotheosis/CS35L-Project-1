import { api } from "./api"
import type { HabitStats } from "./habits"

export interface ActivityLog {
  id: string
  habit_id: string
  occurred_on: string
}

export interface AddLogResult {
  log: ActivityLog
  stats: HabitStats
}

export function addActivity(habitId: string, occurredOn: string): Promise<AddLogResult> {
  return api.post<AddLogResult>(`/habits/${encodeURIComponent(habitId)}/logs`, { occurred_on: occurredOn })
}

export function deleteActivity(habitId: string, logId: string): Promise<{ stats: HabitStats }> {
  return api.delete(`/habits/${encodeURIComponent(habitId)}/logs/${encodeURIComponent(logId)}`)
}
