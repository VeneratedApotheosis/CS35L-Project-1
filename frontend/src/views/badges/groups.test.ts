import { describe, expect, it } from "vitest"
import { Award, Sprout } from "lucide-react"
import type { ApiBadge } from "@/lib/badges"
import { buildGroups, isEarned, isLocked, toBadgeInfo } from "./groups"
import { emptyBadgeBook, sampleBadgeBook } from "./sampleBadgeBook"

const apiBadge = (patch: Partial<ApiBadge> = {}): ApiBadge => ({
  id: "seed-money", name: "Seed Money", description: "Create your first habit.", tier: "bronze", secret: false,
  state: "locked", progress: { count: 0, target: 1 }, earned_at: null, ...patch,
})

describe("buildGroups", () => {
  it("keeps the backend's chapters in order", () => {
    expect(buildGroups(sampleBadgeBook).map((group) => group.id)).toEqual(
      sampleBadgeBook.chapters.map((chapter) => chapter.id),
    )
  })

  it("has a Secret group only when the backend sends one", () => {
    expect(buildGroups(sampleBadgeBook).at(-1)?.id).toBe("secret")
    expect(buildGroups(emptyBadgeBook).some((group) => group.id === "secret")).toBe(false)
  })
})

describe("toBadgeInfo", () => {
  it("adds the badge's icon, and a fallback icon for an unknown id", () => {
    expect(toBadgeInfo(apiBadge()).art.icon).toBe(Sprout)
    expect(toBadgeInfo(apiBadge({ id: "brand-new-badge" })).art.icon).toBe(Award)
  })

  it("formats the earned date", () => {
    const info = toBadgeInfo(apiBadge({ state: "earned", earned_at: "2026-11-21T20:00:00Z" }))
    expect(info.earnedOn).toBe(new Date("2026-11-21T20:00:00Z").toLocaleDateString(undefined, { month: "short", day: "numeric" }))
  })

  it("keeps progress only for badges in progress", () => {
    expect(toBadgeInfo(apiBadge({ state: "in_progress", progress: { count: 7, target: 10 } })).progress).toEqual({ count: 7, target: 10 })
    expect(toBadgeInfo(apiBadge()).progress).toBeUndefined()
  })
})

describe("isLocked and isEarned", () => {
  const items = buildGroups(sampleBadgeBook).flatMap((group) => group.items)

  it("never treats a secret badge as locked", () => {
    expect(items.some(isLocked)).toBe(true)
    expect(items.filter((item) => item.badge.secret).some(isLocked)).toBe(false)
    expect(items.filter((item) => item.badge.secret).every(isEarned)).toBe(true)
  })
})
