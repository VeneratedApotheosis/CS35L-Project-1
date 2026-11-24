import { shownState } from "@/components/AchievementBadge"
import type { PlaceholderAchievement, PlaceholderChapter } from "./placeholderBadges"

/** One badge in a group. */
export interface BadgeItem {
  id: string
  badge: PlaceholderAchievement
}

export interface BadgeGroup {
  id: string
  title: string
  items: BadgeItem[]
}

/**
 * The groups on the page, in order. The Secret group only exists once a secret
 * badge has been earned, so nothing hints that it is there.
 */
export function buildGroups(chapters: PlaceholderChapter[], secrets: PlaceholderAchievement[]): BadgeGroup[] {
  const groups: BadgeGroup[] = chapters.map((chapter) => ({
    id: chapter.id,
    title: chapter.title,
    items: chapter.badges.map((badge) => ({ id: badge.id, badge })),
  }))
  if (secrets.length > 0) {
    groups.push({ id: "secret", title: "Secret badges", items: secrets.map((badge) => ({ id: badge.id, badge })) })
  }
  return groups
}

export const isEarned = (item: BadgeItem): boolean => shownState(item.badge) === "earned"

/** Locked badges are the only ones that can be hidden. Earned and in-progress badges always show. */
export const isLocked = (item: BadgeItem): boolean => shownState(item.badge) === "locked"
