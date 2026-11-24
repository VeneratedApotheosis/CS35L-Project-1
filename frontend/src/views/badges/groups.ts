import { shownState } from "@/components/AchievementBadge"
import type { PlaceholderAchievement, PlaceholderChapter, PlaceholderHabitBadge } from "./placeholderBadges"

/** One thing in a group: an achievement badge, or the badge of a finished habit. */
export type BadgeItem =
  | { kind: "badge"; id: string; badge: PlaceholderAchievement }
  | { kind: "habit"; id: string; habit: PlaceholderHabitBadge }

export interface BadgeGroup {
  id: string
  title: string
  items: BadgeItem[]
  /** Shown on an empty group in place of its badges. */
  emptyNote?: string
}

/**
 * The groups on the page, in order. The Secret group only exists once a secret
 * badge has been earned, so nothing hints that it is there. The Finished
 * habits group is always there, even when empty.
 */
export function buildGroups(chapters: PlaceholderChapter[], secrets: PlaceholderAchievement[], habits: PlaceholderHabitBadge[]): BadgeGroup[] {
  const groups: BadgeGroup[] = chapters.map((chapter) => ({
    id: chapter.id,
    title: chapter.title,
    items: chapter.badges.map((badge) => ({ kind: "badge" as const, id: badge.id, badge })),
  }))
  groups.push({
    id: "finished-habits",
    title: "Finished habits",
    items: habits.map((habit) => ({ kind: "habit" as const, id: habit.id, habit })),
    emptyNote: "When a habit ends with at least 60% of its goal done, it earns a Bronze, Silver or Gold badge and is kept here.",
  })
  if (secrets.length > 0) {
    groups.push({
      id: "secret",
      title: "Secret badges",
      items: secrets.map((badge) => ({ kind: "badge" as const, id: badge.id, badge })),
    })
  }
  return groups
}

export const isEarned = (item: BadgeItem): boolean => (item.kind === "habit" ? true : shownState(item.badge) === "earned")

/** Locked badges are the only ones that can be hidden. Earned and in-progress badges always show. */
export const isLocked = (item: BadgeItem): boolean => item.kind === "badge" && shownState(item.badge) === "locked"

/** The year the placeholder dates ("Nov 12") belong to. */
const PLACEHOLDER_YEAR = 2026

/** The most recently earned achievement badges, newest first. */
export function latestEarned(groups: BadgeGroup[], count: number): Extract<BadgeItem, { kind: "badge" }>[] {
  const earned = groups.flatMap((group) => group.items)
    .filter((item): item is Extract<BadgeItem, { kind: "badge" }> => item.kind === "badge" && isEarned(item) && Boolean(item.badge.earnedOn))
  const time = (item: (typeof earned)[number]) => Date.parse(`${item.badge.earnedOn} ${PLACEHOLDER_YEAR}`) || 0
  return earned.map((item, order) => ({ item, order })).sort((a, b) => time(b.item) - time(a.item) || b.order - a.order).slice(0, count).map(({ item }) => item)
}
