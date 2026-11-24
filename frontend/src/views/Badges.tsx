"use client"

import { useMemo, useSyncExternalStore } from "react"
import { BadgeBook } from "./badges/BadgeBook"
import { buildChapters, isEarned } from "./badges/bookPages"
import {
  placeholderChapters, placeholderHabitBadges, placeholderSecretBadges,
  type PlaceholderAchievement, type PlaceholderChapter, type PlaceholderHabitBadge,
} from "./badges/placeholderBadges"

/** The same list with every badge set back to locked, for the new-user look. */
function withNothingEarned(chapters: PlaceholderChapter[]): PlaceholderChapter[] {
  return chapters.map((chapter) => ({
    ...chapter,
    badges: chapter.badges.map((badge): PlaceholderAchievement => ({
      ...badge, state: "locked", earnedOn: undefined, progress: undefined,
    })),
  }))
}

/** Keeps the page in the address (?page=3, the 1-based page on the left) without adding history entries. */
function writePage(page: number | null) {
  const url = new URL(window.location.href)
  if (page === null) url.searchParams.delete("page")
  else url.searchParams.set("page", String(page + 1))
  window.history.replaceState(window.history.state, "", url)
}

/**
 * The Badges page (#253). MOCK: it reads placeholder data from
 * ./badges/placeholderBadges.ts because the badges backend is not built.
 * Add ?demo=empty to the address to see the new-user state, and ?page=3 to
 * open the book at a page. See docs/frontend/badges-book.md for the design.
 */
export default function Badges() {
  // The address is read straight from the browser: on a statically built page Next only supplies the query string after the first render.
  const search = useSyncExternalStore(() => () => {}, () => window.location.search, () => null)
  const params = new URLSearchParams(search ?? "")
  const empty = params.get("demo") === "empty"
  const pageParam = Number.parseInt(params.get("page") ?? "", 10)
  const initialPage = Number.isInteger(pageParam) && pageParam >= 1 ? pageParam - 1 : null

  const chapters = useMemo(() => {
    const secrets: PlaceholderAchievement[] = empty ? [] : placeholderSecretBadges
    const habits: PlaceholderHabitBadge[] = empty ? [] : placeholderHabitBadges
    return buildChapters(empty ? withNothingEarned(placeholderChapters) : placeholderChapters, secrets, habits)
  }, [empty])

  // Unfound secret badges are never counted, so the total only grows when one is found.
  const badges = chapters.flatMap((chapter) => chapter.items).flatMap((item) => (item.kind === "badge" ? [item.badge] : []))
  const earned = badges.filter((badge) => isEarned({ kind: "badge", id: badge.id, badge })).length

  return (
    <main className="stack-lg">
      <header className="stack-sm">
        <h1 className="text-h1">Badges</h1>
        <p className="text-body text-secondary">{earned} of {badges.length} earned. Every badge you earn stays yours.</p>
      </header>
      {/* A new key resets the book when the demo data changes. */}
      {search !== null && <BadgeBook key={empty ? "empty" : "demo"} chapters={chapters} initialPage={initialPage} onPageChange={writePage} />}
    </main>
  )
}
