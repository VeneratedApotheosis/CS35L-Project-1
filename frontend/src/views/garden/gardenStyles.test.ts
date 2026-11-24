import { readFileSync } from "node:fs"
import postcss from "postcss"
import { describe, expect, it } from "vitest"

// A touch device can be wider than a phone. Keep the sheet and the hiding of the hover card in the
// same media rule so a hover card and a sheet cannot appear together.
describe("garden touch sheet styles", () => {
  it("wraps a long habit name in the touch sheet without changing the desktop rule", () => {
    const css = postcss.parse(readFileSync("src/styles/components/garden.css", "utf8"))
    let desktop = ""
    let touch = false
    css.walkRules(".garden-card__name", (rule) => {
      if (rule.parent?.type === "root") {
        rule.walkDecls("white-space", (decl) => { desktop = decl.value })
      } else if (rule.parent?.type === "atrule" && rule.parent.params.includes("(hover: none)") && rule.parent.params.includes("(pointer: coarse)")) {
        const values: Record<string, string> = {}
        rule.walkDecls((decl) => { values[decl.prop] = decl.value })
        touch = values["white-space"] === "normal" && values["overflow-wrap"] === "anywhere"
      }
    })
    expect(desktop).toBe("nowrap")
    expect(touch).toBe(true)
  })

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
      expect(media.params).toContain("(--phone)")
      expect(media.params).toContain("(hover: none)")
      expect(media.params).toContain("(pointer: coarse)")
      expect(hiddenSurface && hiddenUntilOpen).toBe(true)
    })
    expect(checked).toBe(true)
  })
})
