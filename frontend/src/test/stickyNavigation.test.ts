import { readFileSync } from "node:fs"
import postcss from "postcss"
import { expect, it } from "vitest"

const parse = (name: string) => postcss.parse(readFileSync(`src/styles/components/${name}.css`, "utf8"))
const values = (rule: postcss.Rule) => Object.fromEntries(rule.nodes.filter((node) => node.type === "decl").map((node) => [node.prop, node.value]))

it("keeps the desktop shell navbar sticky without changing phone or preview navigation", () => {
  let desktop = false
  parse("navigation").walkRules((rule) => {
    if (rule.selector !== ".app-shell > .navbar:not(.navbar--preview)") return
    expect(rule.parent?.type).toBe("atrule")
    if (rule.parent?.type !== "atrule") return
    expect(rule.parent.params).toBe("(--not-phone)")
    expect(values(rule)).toMatchObject({ position: "sticky", top: "0", "z-index": "var(--z-sticky)" })
    desktop = true
  })
  expect(desktop).toBe(true)
})

it("reserves the desktop navbar height for focus scrolling and the sticky plant preview", () => {
  let offset = ""
  parse("navigation").walkRules((rule) => {
    if (rule.selector !== "html:has(.app-shell > .navbar:not(.navbar--preview))") return
    expect(rule.parent?.type === "atrule" && rule.parent.params).toBe("(--not-phone)")
    const d = values(rule)
    offset = d["--desktop-nav-height"]
    expect(d["scroll-padding-top"]).toBe("calc(var(--desktop-nav-height) + var(--space-4))")
  })
  expect(offset).toBe("calc(var(--touch-target) + 2 * var(--space-4) + 1px)")
  let preview = false
  parse("forms").walkRules(".create-grid__plant", (rule) => {
    if (rule.parent?.type !== "atrule" || rule.parent.params !== "(--not-phone)") return
    expect(values(rule).top).toBe("calc(var(--desktop-nav-height, 0px) + var(--space-6))")
    preview = true
  })
  expect(preview).toBe(true)
})
