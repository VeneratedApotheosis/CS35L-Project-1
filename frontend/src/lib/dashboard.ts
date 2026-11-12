import { api } from "./api"
import { habitKeys } from "./habits"

/** The portion of GET /dashboard displayed by issue #213. */
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
}

// Share the existing habit invalidation prefix, so creation and timezone
// changes refresh this summary as well as the Garden and habit detail queries.
export const dashboardKey = (userId: string) => [...habitKeys.all(userId), "dashboard"] as const

export function getDashboard(): Promise<DashboardSummary> {
  return api.get<DashboardSummary>("/dashboard")
}
