import { readFileSync } from "node:fs"
import postcss from "postcss"
import { describe, expect, it } from "vitest"

// A touch device can be wider than a phone. Keep the card and fixed panel in
// the same media rule so they cannot accidentally appear together again.
describe("garden touch panel styles", () => {
  it("hides the hover card wherever the panel becomes fixed", () => {
    const css = postcss.parse(readFileSync("src/styles/components/garden.css", "utf8"))
    let checked = false
    css.walkAtRules("media", (media) => {
      let fixedPanel = false
      let hiddenCard = false
      let hiddenSurface = false
      media.walkRules((rule) => {
        if (rule.selectors.includes(".garden-pop")) {
          rule.walkDecls("position", (decl) => { if (decl.value === "fixed") fixedPanel = true })
        }
        if (rule.selectors.includes(".garden-card") || rule.selectors.includes(".garden-card__surface")) {
          rule.walkDecls("display", (decl) => {
            if (decl.value !== "none") return
            hiddenCard ||= rule.selectors.includes(".garden-card")
            hiddenSurface ||= rule.selectors.includes(".garden-card__surface")
          })
        }
      })
      if (!fixedPanel) return
      checked = true
      expect(media.params).toContain("(max-width: 40rem)")
      expect(media.params).toContain("(hover: none)")
      expect(media.params).toContain("(pointer: coarse)")
      expect(hiddenCard && hiddenSurface).toBe(true)
    })
    expect(checked).toBe(true)
  })
})
