import { describe, expect, it } from "vitest"
import { buildGroups, isLocked, latestEarned } from "./groups"
import { placeholderChapters, placeholderHabitBadges, placeholderSecretBadges } from "./placeholderBadges"

describe("buildGroups", () => {
  it("adds Finished habits, and a Secret group only when a secret badge is earned", () => {
    const without = buildGroups(placeholderChapters, [], [])
    expect(without.at(-1)?.id).toBe("finished-habits")
    expect(without.at(-1)?.emptyNote).toMatch(/Bronze, Silver or Gold/)
    expect(without.some((group) => group.id === "secret")).toBe(false)
    const withSecrets = buildGroups(placeholderChapters, placeholderSecretBadges, placeholderHabitBadges)
    expect(withSecrets.map((group) => group.id).slice(-2)).toEqual(["finished-habits", "secret"])
  })
})

describe("latestEarned", () => {
  const groups = buildGroups(placeholderChapters, placeholderSecretBadges, placeholderHabitBadges)

  it("lists the newest earned badges first, never locked ones", () => {
    const latest = latestEarned(groups, 8)
    expect(latest).toHaveLength(8)
    expect(latest.every((item) => item.badge.state === "earned")).toBe(true)
    const times = latest.map((item) => Date.parse(`${item.badge.earnedOn} 2026`))
    expect([...times].sort((a, b) => b - a)).toEqual(times)
  })
})

describe("isLocked", () => {
  it("is true only for locked achievement badges", () => {
    const groups = buildGroups(placeholderChapters, placeholderSecretBadges, placeholderHabitBadges)
    const items = groups.flatMap((group) => group.items)
    expect(items.some(isLocked)).toBe(true)
    expect(items.filter((item) => item.kind === "habit").some(isLocked)).toBe(false)
    expect(items.filter((item) => item.kind === "badge" && item.badge.secret).some(isLocked)).toBe(false)
  })
})
