import { readFileSync } from "node:fs"
import postcss from "postcss"
import { expect, it } from "vitest"

const css = (file: string) => postcss.parse(readFileSync(`src/styles/components/${file}.css`, "utf8"))
const declarations = (rule: postcss.Rule) => Object.fromEntries(rule.nodes.filter((node) => node.type === "decl").map((node) => [node.prop, node.value]))

it("gives phone navigation labels the whole column and keeps touch targets", () => {
  let found = false
  let consistentRadius = false
  let hoverTransform = false
  css("navigation").walkAtRules("media", (media) => {
    if (media.params !== "(--phone)") return
    media.walkRules((rule) => {
      if (rule.selectors.includes('.navbar__link:hover:not([aria-disabled])') && rule.selectors.includes('.navbar__add:hover:not(:disabled)')) {
        hoverTransform = declarations(rule).transform === "none"
      }
      if (!rule.selectors.includes(".navbar__link") || !rule.selectors.includes(".navbar__add")) return
      const d = declarations(rule)
      if (d["margin-inline"] !== "0") return
      expect(d["min-width"]).toBe("var(--touch-target)")
      consistentRadius = d["border-radius"] === "var(--space-3)" && d["transition-property"] === "background, color"
      found = true
    })
  })
  expect(found).toBe(true)
  expect(consistentRadius).toBe(true)
  expect(hoverTransform).toBe(true)
})

it("keeps dialogs scrollable and stacks toasts by their actual heights", () => {
  const rules: Record<string, Record<string, string>> = {}
  css("feedback").walkRules((rule) => {
    if (rule.parent?.type === "root") rules[rule.selector] = declarations(rule)
  })
  expect(rules[".modal"]["overflow-y"]).toBe("auto")
  expect(rules[".toast-stack"]["flex-direction"]).toBe("column-reverse")
  expect(rules[".toast-stack"].gap).toBe("var(--space-3)")
  expect(rules[".toast--raised"].order).toBe("1")
  let phone = false
  css("feedback").walkAtRules("media", (media) => {
    if (media.params !== "(--phone)") return
    media.walkRules(".modal", (rule) => {
      const d = declarations(rule)
      expect(d["max-height"]).toContain("safe-area-inset-top")
      expect(d["max-height"]).toContain("safe-area-inset-bottom")
      phone = true
    })
  })
  expect(phone).toBe(true)
})
