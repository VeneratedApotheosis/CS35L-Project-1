import { api } from "./api"

export type IntervalUnit = "day" | "week" | "month"

/**
 * Limits for a habit. These mirror the database CHECK constraints
 * (see supabase/migrations) and the backend zod schema. Keep all three in sync.
 */
export const HABIT_LIMITS = {
  name: { min: 1, max: 100 },
  description: { max: 500 },
  targetCount: { min: 1, max: 50 },
  intervalCount: { min: 1, max: 365 },
  numPeriods: { min: 1, max: 52 },
} as const

/** The body sent to POST /habits. owner_id is never sent; the backend sets it. */
export interface CreateHabitInput {
  name: string
  description?: string
  plant_type: string
  target_count: number
  interval_count: number
  interval_unit: IntervalUnit
  num_periods: number
  /** Omit to let the backend default to today in the user's timezone. */
  start_date?: string
}

/** A habit row as returned by the backend, including the computed end_date. */
export interface Habit {
  id: string
  name: string
  description: string | null
  plant_type: string
  target_count: number
  interval_count: number
  interval_unit: IntervalUnit
  num_periods: number | null
  start_date: string
  end_date: string
  created_at: string
}

export function createHabit(input: CreateHabitInput): Promise<Habit> {
  return api.post<Habit>("/habits", input)
}
