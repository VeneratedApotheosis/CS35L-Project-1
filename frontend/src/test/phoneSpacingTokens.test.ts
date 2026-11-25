import { readdirSync, readFileSync } from "node:fs"
import { join } from "node:path"
import postcss from "postcss"
import { describe, expect, it } from "vitest"

const root = "src/styles"
const files = (dir: string): string[] =>
  readdirSync(dir, { withFileTypes: true }).flatMap((entry) =>
    entry.isDirectory() ? files(join(dir, entry.name)) : entry.name.endsWith(".css") ? [join(dir, entry.name)] : [])
const sheets = files(root).map((file) => ({ file: file.replaceAll("\\", "/"), css: postcss.parse(readFileSync(file, "utf8")) }))
const tokenFile = "src/styles/tokens/spacing.css"
const tokens = (): Record<string, string> => {
  const found: Record<string, string> = {}
  sheets.find((sheet) => sheet.file === tokenFile)!.css.walkDecls(/^--phone-/, (decl) => { found[decl.prop] = decl.value })
  return found
}
/** Every declaration inside a (--phone) media query, with the selector it is in. */
const phoneDecls = () => sheets.flatMap(({ file, css }) => {
  const found: { file: string; selector: string; prop: string; value: string }[] = []
  css.walkAtRules("media", (media) => {
    if (!media.params.includes("(--phone)")) return
    media.walkDecls((decl) => {
      found.push({ file, selector: (decl.parent as postcss.Rule).selector, prop: decl.prop, value: decl.value })
    })
  })
  return found
})

describe("phone spacing tokens", () => {
  it("defines the phone tokens once, in tokens/spacing.css", () => {
    expect(Object.keys(tokens()).sort()).toEqual([
      "--phone-block-gap", "--phone-card-gap", "--phone-card-pad", "--phone-nav-gap", "--phone-nav-height",
      "--phone-page-bottom", "--phone-page-top", "--phone-page-top-garden", "--phone-section-gap", "--phone-sheet-top", "--phone-side",
    ])
    for (const { file, css } of sheets) {
      if (file === tokenFile) continue
      css.walkDecls(/^--phone-/, (decl) => { throw new Error(`${decl.prop} is defined in ${file}`) })
    }
  })

  it("has a fixed 16px side space", () => {
    expect(tokens()["--phone-side"]).toBe("1rem")
  })

  it("reads every token somewhere", () => {
    const css = sheets.map((sheet) => sheet.css.toString()).join("\n")
    for (const name of Object.keys(tokens())) expect(css.split(`var(${name}`).length - 1, name).toBeGreaterThan(0)
  })

  it("does not read the desktop page spacing in a phone rule", () => {
    const desktop = /var\(--(page-side|page-margin|page-padding|section-padding|card-padding|login-gutter)\b/
    for (const decl of phoneDecls()) expect(decl.value, `${decl.file} ${decl.selector} ${decl.prop}`).not.toMatch(desktop)
    expect(sheets.map((sheet) => sheet.css.toString()).join("\n")).not.toContain("--mobile-nav-height")
  })

  it("gives the login and the app pages the same side space, safe-area inset included", () => {
    const sides = phoneDecls().filter((decl) => /^padding-(left|right)$/.test(decl.prop) && /^\.(login__brand|login__content|app-shell__content)$/.test(decl.selector))
    expect(sides).toHaveLength(6)
    for (const decl of sides) {
      const edge = decl.prop.slice("padding-".length)
      expect(decl.value).toBe(`max(var(--phone-side), env(safe-area-inset-${edge}, 0px))`)
    }
  })

  it("keeps the Garden's bottom sheet margins on the tokens", () => {
    const sheet = phoneDecls().filter((decl) => decl.selector === '.garden-card[data-open="true"]')
    const value = (prop: string) => sheet.find((decl) => decl.prop === prop)?.value
    expect(value("left")).toBe("max(var(--phone-side), env(safe-area-inset-left, 0px))")
    expect(value("right")).toBe("max(var(--phone-side), env(safe-area-inset-right, 0px))")
    expect(value("bottom")).toBe("calc(var(--phone-nav-height) + env(safe-area-inset-bottom, 0px) + var(--phone-nav-gap))")
    expect(value("max-height")).toContain("var(--phone-sheet-top)")
  })
})
