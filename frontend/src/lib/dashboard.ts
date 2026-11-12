import { api } from "./api"
import { habitKeys } from "./habits"

/** Final results supplied by GET /dashboard; badge eligibility stays in the backend. */
export interface FinishedHabit {
  id: string
  name: string
  end_date: string
  progress: number | null
  consistency: number | null
  badge: "gold" | "silver" | "bronze" | "none"
}

/** The portion of GET /dashboard displayed by issues #213, #214 and #215. */
export interface DashboardSummary {
  active_count: number
  overall_consistency: number | null
  best_streak: { id: string; name: string; streak: number } | null
  habits: {
    id: string
    name: string
    state: "not_started" | "active" | "expired"
    streak: number
  }[]
  needs_attention: {
    id: string
    name: string
    health: "healthy" | "slightly_wilted" | "wilted"
  }[]
  finished: FinishedHabit[]
}

// Share the existing habit invalidation prefix, so creation and timezone
// changes refresh this summary as well as the Garden and habit detail queries.
export const dashboardKey = (userId: string) => [...habitKeys.all(userId), "dashboard"] as const

export function getDashboard(): Promise<DashboardSummary> {
  return api.get<DashboardSummary>("/dashboard")
}
