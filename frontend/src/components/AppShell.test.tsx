// @vitest-environment jsdom
import { readFileSync } from "node:fs"
import { cleanup, render } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

const pathname = vi.hoisted(() => ({ current: "/" }))
vi.mock("next/navigation", () => ({ usePathname: () => pathname.current }))

import { AppShell, pageWidth } from "./AppShell"

afterEach(cleanup)

describe("pageWidth", () => {
  it.each([
    ["/", "full"],
    ["/habit", "wide"], ["/habit/", "wide"], ["/shared-habit", "wide"],
    ["/create", "medium"], ["/dashboard", "medium"], ["/settings", "medium"], ["/join", "medium"],
    [null, "medium"],
  ])("gives %s the %s width", (path, width) => {
    expect(pageWidth(path)).toBe(width)
  })
})

describe("AppShell width", () => {
  it.each([
    ["/", "app-shell app-shell--full"],
    ["/habit", "app-shell app-shell--wide"],
    ["/create", "app-shell"],
  ])("puts the width of %s on the shell, so the top bar and the content share it", (path, className) => {
    pathname.current = path
    const { container } = render(<AppShell><main /></AppShell>)
    expect(container.firstElementChild!.className).toBe(className)
  })
})

describe("page width styles", () => {
  let stylesheet: HTMLStyleElement
  beforeEach(() => {
    stylesheet = document.createElement("style")
    stylesheet.textContent = ["tokens/spacing", "components/navigation"]
      .map((file) => readFileSync(`src/styles/${file}.css`, "utf8")).join("\n")
    document.head.appendChild(stylesheet)
  })
  afterEach(() => stylesheet.remove())

  it("reads the same side space in the top bar and the content", () => {
    const css = stylesheet.textContent!
    const content = css.match(/\.app-shell__content \{[^}]*\}/)![0]
    const bar = css.match(/\.navbar__inner \{[^}]*\}/)![0]
    expect(content).toContain("padding-inline: var(--page-side)")
    expect(bar).not.toContain("max-width")
    expect(css).toMatch(/@container navigation[^{]*\{[\s\S]*\.navbar__inner \{[^}]*padding-inline: var\(--page-side\)/)
  })

  it("has no Garden-only or Habit-only content class left", () => {
    expect(stylesheet.textContent).not.toContain("app-shell__content--")
  })
})
