import { readFileSync } from "node:fs"
import postcss from "postcss"
import { expect, it } from "vitest"

it("matches the Garden gutter and fits the complete phone shelf", () => {
  const phoneRule = (file: string, selector: string) => {
    const declarations: Record<string, string> = {}
    postcss.parse(readFileSync(`src/styles/components/${file}.css`, "utf8"))
      .walkAtRules("media", (media) => {
        if (media.params !== "(--phone)") return
        media.walkRules((rule) => {
          if (rule.selectors.includes(selector)) {
            rule.walkDecls((decl) => { declarations[decl.prop] = decl.value })
          }
        })
      })
    return declarations
  }
  const garden = phoneRule("navigation", ".app-shell--full")
  const login = phoneRule("login", ".login")
  expect(login["--login-gutter"]).toBe(garden["--page-gutter"])
  expect(login["grid-template-rows"]).toBe("auto minmax(auto, 1fr) auto")
  const wallRegion = phoneRule("login", ".wall")
  expect(wallRegion["align-self"]).toBe("stretch")
  expect(wallRegion["min-height"]).toBe("var(--wall-row)")
  const wall = phoneRule("login", ".wall__svg")
  expect(wall["max-width"]).toBe("calc(100% - 2 * var(--login-gutter))")
  expect(wall.height).toBe("auto")
  const content = phoneRule("login", ".login__content")
  expect(content["padding-bottom"]).toContain("var(--login-content-lift)")
  for (const selector of [".login__brand", ".login__content"]) {
    const rule = phoneRule("login", selector)
    expect(rule["padding-left"]).toBe("max(var(--login-gutter), env(safe-area-inset-left, 0px))")
    expect(rule["padding-right"]).toBe("max(var(--login-gutter), env(safe-area-inset-right, 0px))")
  }
})
