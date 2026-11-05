import { renderToStaticMarkup } from "react-dom/server"
import { describe, expect, it } from "vitest"
import { NavBar } from "./NavBar"

describe("NavBar", () => {
  it("links only to existing screens and disables future destinations", () => {
    const markup = renderToStaticMarkup(<NavBar currentPath="/" />)
    expect(markup).toContain('aria-label="Main navigation"')
    expect(markup.match(/<a[^>]*>/g)?.find((tag) => tag.includes('aria-current="page"')))
      .toContain('href="/"')
    expect(markup).toContain('href="/create"')
    for (const route of ["dashboard", "badges", "settings"]) {
      expect(markup).not.toContain(`href="/${route}"`)
    }
    expect(markup.match(/aria-disabled="true"/g)).toHaveLength(3)
  })

  it("marks only Add Habit as current on the creation route", () => {
    const markup = renderToStaticMarkup(<NavBar currentPath="/create" />)
    expect(markup.match(/aria-current="page"/g)).toHaveLength(1)
    expect(markup.match(/<a[^>]*>/g)?.find((tag) => tag.includes('aria-current="page"')))
      .toContain('href="/create"')
  })

  it("does not mark the garden current on a habit detail route", () => {
    const markup = renderToStaticMarkup(<NavBar currentPath="/habits/example" />)
    expect(markup).not.toContain('aria-current="page"')
  })
})
