// @vitest-environment jsdom
import { readFileSync } from "node:fs"
import { cleanup, render, screen } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it } from "vitest"
import { NavBar } from "./NavBar"

let stylesheet: HTMLStyleElement
beforeEach(() => {
  stylesheet = document.createElement("style")
  stylesheet.textContent = readFileSync("src/styles/components/navigation.css", "utf8")
  document.head.appendChild(stylesheet)
})
afterEach(() => { cleanup(); stylesheet.remove() })

describe("NavBar active styles", () => {
  it.each([
    ["/", "My Garden"], ["/dashboard", "Dashboard"], ["/settings", "Settings"], ["/create", "Add Habit"],
  ])("marks the %s label without a shadow border", (path, label) => {
    render(<NavBar currentPath={path} />)
    const active = screen.getByRole("link", { name: label })
    expect(active.getAttribute("aria-current")).toBe("page")
    const style = getComputedStyle(active)
    expect(style.boxShadow).not.toContain("inset")
    expect(style.boxShadow === "" || style.boxShadow.endsWith("none")).toBe(true)
    const text = active.querySelector("span")!
    expect(getComputedStyle(text).textDecoration).not.toContain("underline")
    const others = screen.getAllByRole("link").filter((link) => link !== active && link.classList.contains("navbar__link"))
    for (const link of others) expect(getComputedStyle(link.querySelector("span")!).textDecoration).not.toContain("underline")
  })
})
