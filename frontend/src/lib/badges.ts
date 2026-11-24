import type { BadgeState, BadgeTier } from "@/components/AchievementBadge"
import { api } from "./api"
import { habitKeys } from "./habits"

/** One achievement badge as GET /me/badges returns it. Icons come from `views/badges/badgeIcons.ts`. */
export interface ApiBadge {
  id: string
  name: string
  /** The rule: how to earn it. */
  description: string
  tier: BadgeTier
  secret: boolean
  state: BadgeState
  /** Capped at the target. Null while the backend has not built the badge's rule. */
  progress: { count: number; target: number } | null
  /** ISO timestamp, or null when not earned. */
  earned_at: string | null
}

export interface BadgeChapter {
  id: string
  title: string
  badges: ApiBadge[]
}

/** GET /me/badges. Secret badges and their chapter only appear once earned. */
export interface BadgeBook {
  earned_count: number
  visible_count: number
  chapters: BadgeChapter[]
  /** Earned badge ids whose "Badge earned" moment has not been shown yet. */
  unseen: string[]
}

// Under the habit prefix, like the dashboard, so logging, creating or deleting
// a habit also refreshes the badges.
export const badgeKeys = {
  book: (userId: string) => [...habitKeys.all(userId), "badges"] as const,
}

export function getBadgeBook(): Promise<BadgeBook> {
  return api.get<BadgeBook>("/me/badges")
}

export function getUnseenBadges(): Promise<{ badges: ApiBadge[] }> {
  return api.get<{ badges: ApiBadge[] }>("/me/badges/unseen")
}

export function markBadgesSeen(ids: string[]): Promise<void> {
  return api.post<void>("/me/badges/seen", { ids })
}
