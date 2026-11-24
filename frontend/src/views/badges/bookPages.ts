import { shownState } from "@/components/AchievementBadge"
import type { PlaceholderAchievement, PlaceholderChapter, PlaceholderHabitBadge } from "./placeholderBadges"

/** Slots on one page. A chapter with more badges than this continues on the next page. */
export const SLOTS_PER_PAGE = 12

export type BookItem =
  | { kind: "badge"; id: string; badge: PlaceholderAchievement }
  | { kind: "habit"; id: string; habit: PlaceholderHabitBadge }

export interface BookChapter {
  id: string
  title: string
  items: BookItem[]
  /** Shown on an empty chapter in place of its badges. */
  emptyNote?: string
}

export interface BookPage {
  /** Starts at 1. */
  number: number
  chapterId: string
  chapterTitle: string
  /** True for the second and later pages of a chapter. */
  continued: boolean
  items: BookItem[]
  emptyNote?: string
}

/**
 * The chapters of the book, in order. The Secret chapter only exists once a
 * secret badge has been earned, so nothing hints that it is there. The Finished
 * habits chapter is always there, even when empty.
 */
export function buildChapters(chapters: PlaceholderChapter[], secrets: PlaceholderAchievement[], habits: PlaceholderHabitBadge[]): BookChapter[] {
  const result: BookChapter[] = chapters.map((chapter) => ({
    id: chapter.id,
    title: chapter.title,
    items: chapter.badges.map((badge) => ({ kind: "badge" as const, id: badge.id, badge })),
  }))
  result.push({
    id: "finished-habits",
    title: "Finished habits",
    items: habits.map((habit) => ({ kind: "habit" as const, id: habit.id, habit })),
    emptyNote: "When a habit ends with at least 60% of its goal done, it earns a Bronze, Silver or Gold badge and is kept here.",
  })
  if (secrets.length > 0) {
    result.push({
      id: "secret",
      title: "Secret badges",
      items: secrets.map((badge) => ({ kind: "badge" as const, id: badge.id, badge })),
    })
  }
  return result
}

/** Each chapter starts on a new page. A chapter with no badges still gets one page. */
export function buildPages(chapters: BookChapter[]): BookPage[] {
  const pages: BookPage[] = []
  for (const chapter of chapters) {
    const count = Math.max(1, Math.ceil(chapter.items.length / SLOTS_PER_PAGE))
    for (let index = 0; index < count; index += 1) {
      pages.push({
        number: pages.length + 1,
        chapterId: chapter.id,
        chapterTitle: chapter.title,
        continued: index > 0,
        items: chapter.items.slice(index * SLOTS_PER_PAGE, (index + 1) * SLOTS_PER_PAGE),
        emptyNote: chapter.items.length === 0 ? chapter.emptyNote : undefined,
      })
    }
  }
  return pages
}

export const isEarned = (item: BookItem): boolean => (item.kind === "habit" ? true : shownState(item.badge) === "earned")

/** The year the placeholder dates ("Nov 12") belong to. */
const PLACEHOLDER_YEAR = 2026

/** The most recently earned achievement badges, newest first. */
export function latestEarned(chapters: BookChapter[], count: number): Extract<BookItem, { kind: "badge" }>[] {
  const earned = chapters.flatMap((chapter) => chapter.items)
    .filter((item): item is Extract<BookItem, { kind: "badge" }> => item.kind === "badge" && isEarned(item) && Boolean(item.badge.earnedOn))
  const time = (item: (typeof earned)[number]) => Date.parse(`${item.badge.earnedOn} ${PLACEHOLDER_YEAR}`) || 0
  return earned.map((item, order) => ({ item, order })).sort((a, b) => time(b.item) - time(a.item) || b.order - a.order).slice(0, count).map(({ item }) => item)
}

/** The index of the page an item is on, or -1. */
export function pageOf(pages: BookPage[], itemId: string): number {
  return pages.findIndex((page) => page.items.some((item) => item.id === itemId))
}

/** The index of the first page of a chapter, or -1. */
export function chapterStart(pages: BookPage[], chapterId: string): number {
  return pages.findIndex((page) => page.chapterId === chapterId)
}
