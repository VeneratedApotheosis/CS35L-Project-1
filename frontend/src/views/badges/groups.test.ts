import { describe, expect, it } from "vitest"
import { buildGroups, isEarned, isLocked } from "./groups"
import { placeholderChapters, placeholderSecretBadges } from "./placeholderBadges"

describe("buildGroups", () => {
  it("adds a Secret group last, and only when a secret badge is earned", () => {
    expect(buildGroups(placeholderChapters, []).some((group) => group.id === "secret")).toBe(false)
    expect(buildGroups(placeholderChapters, placeholderSecretBadges).at(-1)?.id).toBe("secret")
  })
})

describe("isLocked and isEarned", () => {
  const items = buildGroups(placeholderChapters, placeholderSecretBadges).flatMap((group) => group.items)

  it("never treats a secret badge as locked", () => {
    expect(items.some(isLocked)).toBe(true)
    expect(items.filter((item) => item.badge.secret).some(isLocked)).toBe(false)
    expect(items.filter((item) => item.badge.secret).every(isEarned)).toBe(true)
  })
})
