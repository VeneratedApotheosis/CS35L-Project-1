// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import BadgesPage from "@/app/(signed-in)/badges/page"
import { placeholderCategories, placeholderHabitBadges, placeholderSecretBadges } from "./badges/placeholderBadges"

const search = vi.hoisted(() => ({ current: new URLSearchParams() }))
vi.mock("next/navigation", () => ({ useSearchParams: () => search.current }))
HTMLDialogElement.prototype.showModal = function showModal() { this.setAttribute("open", "") }
HTMLDialogElement.prototype.close = function close() { this.removeAttribute("open") }

beforeEach(() => { search.current = new URLSearchParams() })
afterEach(cleanup)

const allAchievements = [...placeholderCategories.flatMap((category) => category.badges), ...placeholderSecretBadges]

describe("Badges page", () => {
  it("summarizes how many badges are earned and what is next", () => {
    render(<BadgesPage />)
    const earned = allAchievements.filter((badge) => badge.state === "earned").length
    expect(screen.getByRole("heading", { level: 1, name: "Badges" })).toBeTruthy()
    expect(screen.getByRole("heading", { name: `${earned} of ${allAchievements.length} earned` })).toBeTruthy()
    expect(screen.getByText(/Next up:/).parentElement?.textContent).toContain("Ten Taps")
  })

  it("groups achievements and states each badge's tier and status in words", () => {
    render(<BadgesPage />)
    for (const category of placeholderCategories) {
      expect(screen.getByRole("heading", { level: 2, name: category.title })).toBeTruthy()
    }
    expect(screen.getByRole("article", { name: "Seed Money. Bronze. Earned" })).toBeTruthy()
    expect(screen.getByRole("article", { name: "Ten Taps. Bronze. In progress" })).toBeTruthy()
    expect(screen.getByRole("article", { name: "Evergreen. Platinum. Locked" })).toBeTruthy()
    expect(within(screen.getByRole("article", { name: "Ten Taps. Bronze. In progress" })).getByText("7 of 10")).toBeTruthy()
  })

  it("filters by state", () => {
    render(<BadgesPage />)
    fireEvent.click(screen.getByRole("button", { name: "In progress" }))
    expect(screen.getByRole("button", { name: "In progress" }).getAttribute("aria-pressed")).toBe("true")
    expect(screen.getByRole("article", { name: "Ten Taps. Bronze. In progress" })).toBeTruthy()
    expect(screen.queryByRole("article", { name: "Seed Money. Bronze. Earned" })).toBeNull()
    expect(screen.queryByRole("heading", { name: "Secret badges" })).toBeNull()
  })

  it("lists secret badges only once they are earned, never as locked or in progress", () => {
    render(<BadgesPage />)
    const secretSection = screen.getByRole("heading", { name: "Secret badges" }).closest("section")!
    expect(within(secretSection).getAllByRole("article")).toHaveLength(placeholderSecretBadges.length)
    expect(within(secretSection).getByRole("article", { name: "Leap of Faith. Secret. Gold. Earned" })).toBeTruthy()
    expect(placeholderSecretBadges.every((badge) => badge.state === "earned" && badge.secret)).toBe(true)
    expect(screen.queryByText("Secret badge")).toBeNull()
  })

  it("shows one badge per finished habit at every level, and opens its details", () => {
    render(<BadgesPage />)
    fireEvent.click(screen.getByRole("tab", { name: /Finished habits/ }))
    const cards = screen.getAllByRole("button", { name: /badge\. Finished/ })
    expect(cards).toHaveLength(placeholderHabitBadges.length)
    for (const level of ["Gold", "Silver", "Bronze"]) {
      expect(cards.some((card) => card.getAttribute("aria-label")?.includes(`${level} badge`))).toBe(true)
    }
    fireEvent.click(screen.getByRole("button", { name: /Read a little\. Gold badge/ }))
    const dialog = screen.getByRole("dialog", { name: "Read a little" })
    expect(within(dialog).getByText("3 times every week, for 4 weeks")).toBeTruthy()
    expect(within(dialog).getByText("Final progress").nextSibling?.textContent).toBe("100%")
    expect(within(dialog).getByText("Total activities").nextSibling?.textContent).toBe("13")
    expect(within(dialog).getByText("Stage 4, healthy")).toBeTruthy()
    fireEvent.click(within(dialog).getByRole("button", { name: "Close" }))
    expect(dialog.hasAttribute("open")).toBe(false)
  })

  it("moves between the tabs with the arrow keys", () => {
    render(<BadgesPage />)
    const first = screen.getByRole("tab", { name: /Achievements/ })
    fireEvent.keyDown(first, { key: "ArrowRight" })
    expect(screen.getByRole("tab", { name: /Finished habits/ }).getAttribute("aria-selected")).toBe("true")
  })

  describe("for a new user (?demo=empty)", () => {
    beforeEach(() => { search.current = new URLSearchParams("demo=empty") })

    it("encourages them, lists every badge as locked and shows no secret badges", () => {
      render(<BadgesPage />)
      const total = placeholderCategories.flatMap((category) => category.badges).length
      expect(screen.getByRole("heading", { name: `0 of ${total} earned` })).toBeTruthy()
      expect(screen.getByText("Log your first activity to earn your first badge.")).toBeTruthy()
      expect(screen.queryByRole("heading", { name: "Secret badges" })).toBeNull()
      expect(screen.queryByRole("article", { name: /Earned$/ })).toBeNull()
      expect(screen.getByRole("article", { name: "Seed Money. Bronze. Locked" })).toBeTruthy()
    })

    it("explains the empty finished habits list and points back to the garden", () => {
      render(<BadgesPage />)
      fireEvent.click(screen.getByRole("tab", { name: /Finished habits/ }))
      expect(screen.getByRole("heading", { name: "No badges from finished habits yet" })).toBeTruthy()
      expect(screen.getByRole("link", { name: "Back to my garden" }).getAttribute("href")).toBe("/")
    })
  })
})
