import { readFileSync } from "node:fs"
import postcss from "postcss"
import { describe, expect, it } from "vitest"

// A touch device can be wider than a phone. Keep the sheet and the hiding of the hover card in the
// same media rule so a hover card and a sheet cannot appear together.
describe("garden touch sheet styles", () => {
  it("hides the hover card's surface, and the card until it is clicked, wherever the card becomes a fixed sheet", () => {
    const css = postcss.parse(readFileSync("src/styles/components/garden.css", "utf8"))
    let checked = false
    css.walkAtRules("media", (media) => {
      let fixedSheet = false
      let hiddenSurface = false
      let hiddenUntilOpen = false
      media.walkRules((rule) => {
        if (rule.selectors.includes('.garden-card[data-open="true"]')) {
          rule.walkDecls("position", (decl) => { if (decl.value === "fixed") fixedSheet = true })
        }
        rule.walkDecls("display", (decl) => {
          if (decl.value !== "none") return
          hiddenSurface ||= rule.selectors.includes(".garden-card__surface")
          hiddenUntilOpen ||= rule.selectors.includes('.garden-card:not([data-open="true"])')
        })
      })
      if (!fixedSheet) return
      checked = true
      expect(media.params).toContain("(max-width: 40rem)")
      expect(media.params).toContain("(hover: none)")
      expect(media.params).toContain("(pointer: coarse)")
      expect(hiddenSurface && hiddenUntilOpen).toBe(true)
    })
    expect(checked).toBe(true)
  })
})
