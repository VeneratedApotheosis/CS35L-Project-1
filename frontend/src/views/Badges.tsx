"use client"

import { useMemo, useSyncExternalStore } from "react"
import { BadgeCollection } from "./badges/BadgeCollection"
import { buildGroups } from "./badges/groups"
import {
  placeholderChapters, placeholderSecretBadges,
  type PlaceholderAchievement, type PlaceholderChapter,
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

/**
 * The Badges page (#253). MOCK: it reads placeholder data from
 * ./badges/placeholderBadges.ts because the badges backend is not built.
 * Add ?demo=empty to the address to see the new-user state.
 */
export default function Badges() {
  // The address is read straight from the browser: on a statically built page Next only supplies the query string after the first render.
  const search = useSyncExternalStore(() => () => {}, () => window.location.search, () => null)
  const empty = new URLSearchParams(search ?? "").get("demo") === "empty"

  const groups = useMemo(() => {
    const secrets: PlaceholderAchievement[] = empty ? [] : placeholderSecretBadges
    return buildGroups(empty ? withNothingEarned(placeholderChapters) : placeholderChapters, secrets)
  }, [empty])

  return (
    <main className="stack-lg">
      <header className="stack-sm">
        <h1 className="text-h1">Badges</h1>
        <p className="text-body text-secondary">Everything you have earned by showing up for your habits.</p>
      </header>
      {search !== null && <BadgeCollection key={empty ? "empty" : "demo"} groups={groups} />}
    </main>
  )
}
