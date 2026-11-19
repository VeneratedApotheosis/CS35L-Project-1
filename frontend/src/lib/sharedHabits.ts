import { api } from "./api"
import type { CreateHabitInput, Habit, IntervalUnit } from "./habits"

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

/** Default to the preceding calendar day, but never before the owner's today. */
export function defaultJoinBy(start: string, today: string): string {
  if (!start || !today) return ""
  const previous = new Date(`${start}T00:00:00Z`)
  previous.setUTCDate(previous.getUTCDate() - 1)
  return previous.toISOString().slice(0, 10) < today
    ? today
    : previous.toISOString().slice(0, 10)
}
