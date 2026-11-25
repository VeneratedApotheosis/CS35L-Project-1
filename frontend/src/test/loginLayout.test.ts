import { readFileSync } from "node:fs"
import postcss from "postcss"
import { expect, it } from "vitest"

it("keeps the login gutter and fits the complete phone shelf", () => {
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
  const login = phoneRule("login", ".login")
  // The login has the same side space as the app pages, so the two line up on a phone.
  expect(login["--login-gutter"]).toBeUndefined()
  expect(login["grid-template-rows"]).toBe("auto minmax(auto, 1fr) auto")
  const wallRegion = phoneRule("login", ".wall")
  expect(wallRegion["align-self"]).toBe("stretch")
  expect(wallRegion["min-height"]).toBe("var(--wall-row)")
  const wall = phoneRule("login", ".wall__svg")
  expect(wall["max-width"]).toBe("calc(100% - 2 * var(--phone-side))")
  expect(wall.height).toBe("auto")
  const content = phoneRule("login", ".login__content")
  expect(content["padding-bottom"]).toContain("var(--login-content-lift)")
  for (const selector of [".login__brand", ".login__content"]) {
    const rule = phoneRule("login", selector)
    expect(rule["padding-left"]).toBe("max(var(--phone-side), env(safe-area-inset-left, 0px))")
    expect(rule["padding-right"]).toBe("max(var(--phone-side), env(safe-area-inset-right, 0px))")
  }
})
