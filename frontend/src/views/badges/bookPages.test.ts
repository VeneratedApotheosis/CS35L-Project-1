import { describe, expect, it } from "vitest"
import { buildChapters, buildPages, chapterStart, latestEarned, pageOf, SLOTS_PER_PAGE, type BookChapter } from "./bookPages"
import { placeholderChapters, placeholderHabitBadges, placeholderSecretBadges, type PlaceholderChapter } from "./placeholderBadges"

const many = (count: number): PlaceholderChapter => ({
  id: "many", title: "Many",
  badges: Array.from({ length: count }, (_, index) => ({
    id: `b${index}`, name: `Badge ${index}`, description: "", tier: "bronze" as const, state: "locked" as const, art: { icon: (() => null) as never },
  })),
})

describe("buildChapters", () => {
  it("adds Finished habits last, and a Secret chapter only when a secret badge is earned", () => {
    const without = buildChapters(placeholderChapters, [], [])
    expect(without.at(-1)?.id).toBe("finished-habits")
    expect(without.some((chapter) => chapter.id === "secret")).toBe(false)
    const withSecrets = buildChapters(placeholderChapters, placeholderSecretBadges, placeholderHabitBadges)
    expect(withSecrets.map((chapter) => chapter.id).slice(-2)).toEqual(["finished-habits", "secret"])
  })
})

describe("buildPages", () => {
  it("starts every chapter on a new page and numbers pages from 1", () => {
    const pages = buildPages(buildChapters(placeholderChapters, placeholderSecretBadges, placeholderHabitBadges))
    expect(pages.map((page) => page.number)).toEqual(pages.map((_, index) => index + 1))
    const firsts = pages.filter((page) => !page.continued).map((page) => page.chapterId)
    expect(new Set(firsts).size).toBe(firsts.length)
  })

  it("continues a long chapter on the next page, with at most one page of slots each", () => {
    const chapters: BookChapter[] = buildChapters([many(SLOTS_PER_PAGE * 2 + 1)], [], [])
    const pages = buildPages(chapters).filter((page) => page.chapterId === "many")
    expect(pages.map((page) => page.items.length)).toEqual([SLOTS_PER_PAGE, SLOTS_PER_PAGE, 1])
    expect(pages.map((page) => page.continued)).toEqual([false, true, true])
  })

  it("gives an empty chapter one page with its note", () => {
    const pages = buildPages(buildChapters([], [], []))
    expect(pages).toHaveLength(1)
    expect(pages[0].items).toHaveLength(0)
    expect(pages[0].emptyNote).toMatch(/Bronze, Silver or Gold/)
  })
})

describe("finding things", () => {
  const chapters = buildChapters(placeholderChapters, placeholderSecretBadges, placeholderHabitBadges)
  const pages = buildPages(chapters)

  it("lists the newest earned badges first, never locked ones", () => {
    const latest = latestEarned(chapters, 5)
    expect(latest).toHaveLength(5)
    expect(latest.every((item) => item.badge.state === "earned")).toBe(true)
    const times = latest.map((item) => Date.parse(`${item.badge.earnedOn} 2026`))
    expect([...times].sort((a, b) => b - a)).toEqual(times)
  })

  it("finds the page of a badge and the start of a chapter", () => {
    expect(pageOf(pages, "seed-money")).toBe(0)
    expect(chapterStart(pages, "logging")).toBe(1)
    expect(pageOf(pages, "nope")).toBe(-1)
    expect(chapterStart(pages, "nope")).toBe(-1)
  })
})
