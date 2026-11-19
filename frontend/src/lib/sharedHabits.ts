import { api } from "./api"
import type { CreateHabitInput, Habit } from "./habits"

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

/** Default to the preceding calendar day, but never before the owner's today. */
export function defaultJoinBy(start: string, today: string): string {
  if (!start || !today) return ""
  const previous = new Date(`${start}T00:00:00Z`)
  previous.setUTCDate(previous.getUTCDate() - 1)
  return previous.toISOString().slice(0, 10) < today
    ? today
    : previous.toISOString().slice(0, 10)
}
