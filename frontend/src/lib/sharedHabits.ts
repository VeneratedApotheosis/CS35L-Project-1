import { api } from "./api"
import type { CreateHabitInput, Habit, HabitDetail, HabitStats, IntervalUnit } from "./habits"

// Mirrors the shared-habit route schema and database constraint.
export const SHARED_MEMBER_LIMITS = { min: 2, max: 50 } as const

export interface CreateSharedHabitInput extends CreateHabitInput {
  join_by: string
  max_members: number
}

export interface SharedHabit extends Habit {
  num_periods: number
  join_by: string
  max_members: number
  join_code: string | null
}

export function createSharedHabit(input: CreateSharedHabitInput): Promise<SharedHabit> {
  return api.post<SharedHabit>("/shared-habits", input)
}

export interface SharedInvitePreview {
  name: string
  description: string | null
  plant_type: string
  target_count: number
  interval_count: number
  interval_unit: IntervalUnit
  num_periods: number
  start_date: string
  join_by: string
  owner_display_name: string | null
  member_count: number
  max_members: number
  places_left: number
}

export function previewSharedInvite(code: string): Promise<SharedInvitePreview> {
  return api.get<SharedInvitePreview>(`/shared-habits/join/${encodeURIComponent(code)}`)
}

export function joinSharedInvite(code: string): Promise<{ id: string }> {
  return api.post<{ id: string }>(`/shared-habits/join/${encodeURIComponent(code)}`, {})
}

export interface SharedGroupStats extends HabitStats {
  today: string
  end_date: string
  overall_progress: number
  health_rate: number
}

export interface SharedMemberSummary {
  user_id: string
  display_name: string | null
  avatar_url: string | null
  is_owner: boolean
  overall_progress: number | null
  current_period_count: number
  streak: number
  health: HabitStats["health"]
}

export interface SharedHabitDetail extends SharedHabit {
  stats: SharedGroupStats
  members: SharedMemberSummary[]
  own_stats: HabitDetail["stats"]
  /** Server date in the caller's saved membership timezone, not their profile. */
  own_today: string
}

export interface SharedGardenHabit extends SharedHabit {
  stats: SharedGroupStats
  member_count: number
  own_stats: HabitStats
  own_today: string
}

export interface SharedHabitPage {
  habits: SharedGardenHabit[]
  total: number
  limit: number
  offset: number
}

export function listSharedHabits(offset = 0): Promise<SharedHabitPage> {
  return api.get(`/shared-habits?limit=50&offset=${offset}`)
}

export interface SharedLogStats {
  stats: SharedGroupStats
  own_stats: HabitStats & { streak: number }
  own_today: string
}

export interface SharedActivityLog {
  id: string
  shared_habit_id: string
  user_id: string
  occurred_on: string
}

export function addSharedActivity(id: string, occurredOn: string): Promise<SharedLogStats & { log: SharedActivityLog }> {
  return api.post(`/shared-habits/${encodeURIComponent(id)}/logs`, { occurred_on: occurredOn })
}

export function deleteSharedActivity(id: string, logId: string): Promise<SharedLogStats> {
  return api.delete(`/shared-habits/${encodeURIComponent(id)}/logs/${encodeURIComponent(logId)}`)
}

export const sharedHabitKeys = {
  all: (userId: string) => ["shared-habits", userId] as const,
  list: (userId: string) => ["shared-habits", userId, "list"] as const,
  detail: (userId: string, id: string) => ["shared-habits", userId, "detail", id] as const,
}

export function getSharedHabit(id: string): Promise<SharedHabitDetail> {
  return api.get<SharedHabitDetail>(`/shared-habits/${encodeURIComponent(id)}`)
}

export function leaveSharedHabit(id: string): Promise<void> {
  return api.delete(`/shared-habits/${encodeURIComponent(id)}/members/me`)
}

export function removeSharedMember(id: string, userId: string): Promise<void> {
  return api.delete(`/shared-habits/${encodeURIComponent(id)}/members/${encodeURIComponent(userId)}`)
}

export function transferSharedOwnership(id: string, userId: string): Promise<void> {
  return api.post(`/shared-habits/${encodeURIComponent(id)}/transfer`, { user_id: userId })
}

export function regenerateSharedInvite(id: string): Promise<{ join_code: string }> {
  return api.post(`/shared-habits/${encodeURIComponent(id)}/code`, {})
}

export function closeSharedJoining(id: string): Promise<void> {
  return api.delete(`/shared-habits/${encodeURIComponent(id)}/code`)
}

export function deleteSharedHabit(id: string): Promise<void> {
  return api.delete(`/shared-habits/${encodeURIComponent(id)}`)
}

/** Default to the preceding calendar day, but never before the owner's today. */
export function defaultJoinBy(start: string, today: string): string {
  if (!start || !today) return ""
  const previous = new Date(`${start}T00:00:00Z`)
  previous.setUTCDate(previous.getUTCDate() - 1)
  return previous.toISOString().slice(0, 10) < today
    ? today
    : previous.toISOString().slice(0, 10)
}

/** The next calendar date, independent of the browser's timezone. */
export function defaultSharedStart(today: string): string {
  if (!today) return ""
  const date = new Date(`${today}T00:00:00Z`)
  if (Number.isNaN(date.getTime())) return ""
  date.setUTCDate(date.getUTCDate() + 1)
  return date.toISOString().slice(0, 10)
}
