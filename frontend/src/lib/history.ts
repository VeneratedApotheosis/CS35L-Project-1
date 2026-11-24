import { api } from "./api"
import { habitKeys } from "./habits"

export type HistoryLevel = "gold" | "silver" | "bronze" | "none"
export type HistorySort = "newest" | "oldest" | "best"

/** One finished habit as GET /me/history returns it. */
export interface HistoryHabit {
  id: string
  name: string
  description: string | null
  plant_type: string
  target_count: number
  interval_count: number
  interval_unit: "day" | "week" | "month"
  num_periods: number
  start_date: string
  /** The first day after the last period. */
  end_date: string
  /** The habit's last day. */
  last_day: string
  badge: HistoryLevel
  /** 0 to 1. */
  final_progress: number
  final_consistency: number | null
  periods_met: number
  periods_total: number
  total_logs: number
  /** The longest run of met periods. */
  best_streak: number
  stage: 1 | 2 | 3 | 4
  health: "healthy" | "slightly_wilted" | "wilted"
}

/** Across every finished habit, whatever the filter. */
export interface HistorySummary {
  finished: number
  by_level: Record<HistoryLevel, number>
  total_logs: number
  average_final_progress: number | null
  /** The first day after the soonest-ending running habit, or null. */
  next_end_date: string | null
}

export interface HistoryPage {
  summary: HistorySummary
  habits: HistoryHabit[]
  /** Habits matching the filter. */
  total: number
  limit: number
  offset: number
}

export interface HistoryFilter {
  level: HistoryLevel | null
  sort: HistorySort
}

export const HISTORY_PAGE_SIZE = 20

// Under the habit prefix, so logging, creating or deleting a habit refreshes it.
export const historyKeys = {
  all: (userId: string) => [...habitKeys.all(userId), "history"] as const,
  list: (userId: string, filter: HistoryFilter) => [...historyKeys.all(userId), filter.level ?? "all", filter.sort] as const,
}

export function getHistory(filter: HistoryFilter, offset: number): Promise<HistoryPage> {
  const params = new URLSearchParams({ limit: String(HISTORY_PAGE_SIZE), offset: String(offset), sort: filter.sort })
  if (filter.level) params.set("level", filter.level)
  return api.get<HistoryPage>(`/me/history?${params.toString()}`)
}
