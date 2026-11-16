import type { PlantTypeId } from "@/pottedPlant/plants/plantTypes"
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
  plant_type: PlantTypeId
  target_count: number
  interval_count: number
  interval_unit: IntervalUnit
  num_periods: number
  /** Omit to let the backend default to today in the user's timezone. */
  start_date?: string
}

/** What the create-habit form collects, after the numbers are parsed. */
export interface CreateHabitForm {
  name: string
  description: string
  plantType: PlantTypeId
  targetCount: number
  intervalCount: number
  intervalUnit: IntervalUnit
  numPeriods: number
  /** YYYY-MM-DD the user picked. Leave undefined for the default (today). */
  startDate?: string
}

/**
 * Builds the POST /habits body. The backend rejects unknown keys, so every key
 * here must exist in its schema. Empty optional fields are left out, not sent
 * as empty strings.
 */
export function buildCreateHabitPayload(
  form: CreateHabitForm,
): CreateHabitInput {
  const description = form.description.trim()
  return {
    name: form.name.trim(),
    ...(description ? { description } : {}),
    plant_type: form.plantType,
    target_count: form.targetCount,
    interval_count: form.intervalCount,
    interval_unit: form.intervalUnit,
    num_periods: form.numPeriods,
    ...(form.startDate ? { start_date: form.startDate } : {}),
  }
}

/**
 * Parses a whole-number field. Returns NaN for anything that is not plain
 * digits (empty, "3.5", "1e1", "-2"), so bad input is reported, not altered.
 */
export function parseWholeNumber(value: string): number {
  const trimmed = value.trim()
  return /^\d+$/.test(trimmed) ? Number(trimmed) : Number.NaN
}

/** A habit row as returned by the backend (POST /habits). */
export interface Habit {
  id: string
  owner_id: string
  name: string
  description: string | null
  plant_type: PlantTypeId
  target_count: number
  interval_count: number
  interval_unit: IntervalUnit
  num_periods: number | null
  start_date: string
  created_at: string
}

export function createHabit(input: CreateHabitInput): Promise<Habit> {
  return api.post<Habit>("/habits", input)
}

/** Read-model stats supplied by GET /habits and GET /habits/:id. */
export interface HabitStats {
  state: "not_started" | "active" | "expired"
  current_period: { number: number; total: number | null; start: string; end: string; count: number; target: number }
  overall_progress: number | null
  stage: 1 | 2 | 3 | 4
  health: "healthy" | "slightly_wilted" | "wilted"
}

export interface HabitWithStats extends Habit {
  stats: HabitStats
}

export interface HabitPage {
  habits: HabitWithStats[]
  total: number
  limit: number
  offset: number
}

export const habitKeys = {
  all: (userId: string) => ["habits", userId] as const,
  detail: (userId: string, id: string) => ["habits", userId, "detail", id] as const,
}

export function listHabits(offset = 0): Promise<HabitPage> {
  return api.get<HabitPage>(`/habits?limit=50&offset=${offset}`)
}

/** Progress fields from the full stats returned by GET /habits/:id. */
export interface HabitProgressStats {
  state: "not_started" | "active" | "expired"
  current_period: {
    number: number
    total: number | null
    start: string
    end: string
    count: number
    target: number
  }
  overall_progress: number | null
  consistency: { successful: number; completed: number; rate: number | null }
  streak: number
}

export interface HabitPeriod {
  number: number
  start: string
  /** Exclusive end date, as returned by the backend. */
  end: string
  count: number
  target: number
  met: boolean
  status: "completed" | "current" | "upcoming"
}

export interface HabitDetail extends HabitWithStats {
  stats: HabitStats & HabitProgressStats & {
    end_date: string | null
    periods: HabitPeriod[]
    log_days: { date: string; count: number }[]
    current_period_logs: { id: string; occurred_on: string }[]
  }
}

export function getHabit(id: string): Promise<HabitDetail> {
  return api.get<HabitDetail>(`/habits/${encodeURIComponent(id)}`)
}
