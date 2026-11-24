import { shownState, type BadgeInfo } from "@/components/AchievementBadge"
import type { ApiBadge, BadgeBook } from "@/lib/badges"
import { badgeIcon } from "./badgeIcons"

/** One badge in a group. */
export interface BadgeItem {
  id: string
  badge: BadgeInfo
}

export interface BadgeGroup {
  id: string
  title: string
  items: BadgeItem[]
}

/** "Nov 21": the day a badge was earned, in the viewer's own timezone. */
export function formatEarnedOn(earnedAt: string): string {
  const date = new Date(earnedAt)
  if (Number.isNaN(date.getTime())) return ""
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric" })
}

/** The medal's view of a badge from the API, with its icon. */
export function toBadgeInfo(badge: ApiBadge): BadgeInfo {
  return {
    name: badge.name,
    description: badge.description,
    tier: badge.tier,
    state: badge.state,
    art: { icon: badgeIcon(badge.id) },
    secret: badge.secret || undefined,
    progress: badge.state === "in_progress" && badge.progress ? badge.progress : undefined,
    earnedOn: badge.earned_at ? formatEarnedOn(badge.earned_at) : undefined,
  }
}

/**
 * The groups on the page, one per chapter of the book, in the backend's order.
 * The backend leaves out the Secret chapter until a secret badge is earned, so
 * nothing hints that it is there.
 */
export function buildGroups(book: BadgeBook): BadgeGroup[] {
  return book.chapters.map((chapter) => ({
    id: chapter.id,
    title: chapter.title,
    items: chapter.badges.map((badge) => ({ id: badge.id, badge: toBadgeInfo(badge) })),
  }))
}

export const isEarned = (item: BadgeItem): boolean => shownState(item.badge) === "earned"

/** Locked badges are the only ones that can be hidden. Earned and in-progress badges always show. */
export const isLocked = (item: BadgeItem): boolean => shownState(item.badge) === "locked"
