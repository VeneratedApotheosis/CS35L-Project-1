// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it } from "vitest"
import BadgesPage from "@/app/(signed-in)/badges/page"
import { buildChapters, latestEarned, pageOf, buildPages } from "./badges/bookPages"
import { placeholderChapters, placeholderHabitBadges, placeholderSecretBadges } from "./badges/placeholderBadges"

HTMLDialogElement.prototype.showModal = function showModal() { this.setAttribute("open", "") }
HTMLDialogElement.prototype.close = function close() { this.removeAttribute("open") }

const visit = (search = "") => window.history.replaceState(null, "", `/badges${search}`)
beforeEach(() => visit())
afterEach(cleanup)

const chapters = buildChapters(placeholderChapters, placeholderSecretBadges, placeholderHabitBadges)
const pages = buildPages(chapters)
const badgeCount = chapters.flatMap((chapter) => chapter.items).filter((item) => item.kind === "badge").length
const earnedCount = chapters.flatMap((chapter) => chapter.items).filter((item) => item.kind === "badge" && item.badge.state === "earned").length

const slot = (name: RegExp | string) => screen.getByRole("button", { name })
const openBook = () => fireEvent.click(screen.getByRole("button", { name: "Open the book" }))
const ribbon = (name: RegExp) => within(screen.getByRole("navigation", { name: "Chapters" })).getByRole("button", { name })

describe("Badges page: the cover", () => {
  it("opens on a cover with the earned count, the tier counts and the latest badges", () => {
    render(<BadgesPage />)
    expect(screen.getByRole("heading", { level: 1, name: "Badges" })).toBeTruthy()
    expect(screen.getByRole("heading", { name: "My badge book" })).toBeTruthy()
    expect(screen.getAllByText(`${earnedCount} of ${badgeCount} earned`).length).toBeGreaterThan(0)
    expect(within(screen.getByRole("list", { name: "Earned badges by tier" })).getAllByRole("listitem")).toHaveLength(4)
    expect(screen.getByRole("heading", { name: "Latest" })).toBeTruthy()
    expect(screen.queryByRole("region", { name: /^Page 1/ })).toBeNull()
  })

  it("jumps to the page of the newest badge", () => {
    render(<BadgesPage />)
    fireEvent.click(screen.getByRole("button", { name: "Jump to newest" }))
    const newest = latestEarned(chapters, 1)[0]
    const page = pageOf(pages, newest.id)
    expect(screen.getByRole("region", { name: new RegExp(`^Page ${page + 1} of `) })).toBeTruthy()
    expect(window.location.search).toBe(`?page=${page + 1}`)
  })
})

describe("Badges page: the pages", () => {
  it("shows two pages at a time, each chapter starting on a new page", () => {
    render(<BadgesPage />)
    openBook()
    expect(screen.getByRole("region", { name: "Page 1 of 10, Getting started" })).toBeTruthy()
    expect(screen.getByRole("region", { name: "Page 2 of 10, Logging milestones" })).toBeTruthy()
    expect(screen.getByText("Pages 1 and 2 of 10")).toBeTruthy()
    expect(window.location.search).toBe("?page=1")
  })

  it("puts only the badge in a slot and says everything else in its name", () => {
    render(<BadgesPage />)
    openBook()
    const earned = slot("Seed Money. Bronze. Earned Nov 12.")
    expect(earned.textContent).toContain("Create your first habit.")
    expect(within(earned).getByText("Seed Money").closest("[aria-hidden='true']")).toBeTruthy()
    expect(slot("Ten Taps. Bronze. In progress, 7 of 10.")).toBeTruthy()
    expect(slot("Five Hundred Fold. Gold. Locked.")).toBeTruthy()
  })

  it("turns pages with the arrows and returns to the cover from the first page", () => {
    render(<BadgesPage />)
    openBook()
    fireEvent.click(screen.getByRole("button", { name: "Next page" }))
    expect(screen.getByRole("region", { name: "Page 3 of 10, Finishing habits" })).toBeTruthy()
    expect(screen.getByText("Pages 3 and 4 of 10")).toBeTruthy()
    fireEvent.click(screen.getByRole("button", { name: "Previous page" }))
    expect(screen.getByRole("region", { name: "Page 1 of 10, Getting started" })).toBeTruthy()
    fireEvent.click(screen.getByRole("button", { name: "Previous page" }))
    expect(screen.getByRole("heading", { name: "My badge book" })).toBeTruthy()
    expect(window.location.search).toBe("")
  })

  it("turns pages with the arrow keys and stops at the last page", () => {
    visit("?page=9")
    render(<BadgesPage />)
    const next = screen.getByRole("button", { name: "Next page" }) as HTMLButtonElement
    expect(next.disabled).toBe(true)
    fireEvent.keyDown(next, { key: "ArrowLeft" })
    expect(screen.getByText("Pages 7 and 8 of 10")).toBeTruthy()
    fireEvent.keyDown(screen.getByRole("button", { name: "Previous page" }), { key: "ArrowRight" })
    expect(screen.getByText("Pages 9 and 10 of 10")).toBeTruthy()
  })

  it("jumps to a chapter from its ribbon tab, and marks the chapters on screen", () => {
    render(<BadgesPage />)
    openBook()
    fireEvent.click(ribbon(/^Streaks/))
    expect(screen.getByRole("region", { name: "Page 4 of 10, Streaks" })).toBeTruthy()
    expect(ribbon(/^Streaks/).getAttribute("aria-current")).toBe("page")
    expect(ribbon(/^Getting started/).getAttribute("aria-current")).toBeNull()
    fireEvent.click(ribbon(/^Cover/))
    expect(screen.getByRole("heading", { name: "My badge book" })).toBeTruthy()
  })

  it("opens at the page in the address", () => {
    visit("?page=5")
    render(<BadgesPage />)
    expect(screen.getByRole("region", { name: "Page 5 of 10, Garden and plants" })).toBeTruthy()
    expect(screen.getByRole("region", { name: "Page 6 of 10, Comebacks" })).toBeTruthy()
  })
})

describe("Badges page: details", () => {
  it("opens a dialog with the rule and status, and steps to the next badge", () => {
    render(<BadgesPage />)
    openBook()
    fireEvent.click(slot("Ten Taps. Bronze. In progress, 7 of 10."))
    let dialog = screen.getByRole("dialog", { name: "Ten Taps" })
    expect(within(dialog).getByText("Log 10 activities in total.")).toBeTruthy()
    expect(within(dialog).getByText("7 of 10")).toBeTruthy()
    expect(within(dialog).getByRole("progressbar", { name: "Ten Taps progress" }).getAttribute("aria-valuenow")).toBe("7")
    fireEvent.click(within(dialog).getByRole("button", { name: "Next badge" }))
    dialog = screen.getByRole("dialog", { name: "Fifty Strong" })
    expect(within(dialog).getByText("Log 50 activities in total.")).toBeTruthy()
    fireEvent.click(within(dialog).getByRole("button", { name: "Previous badge" }))
    expect(screen.getByRole("dialog", { name: "Ten Taps" })).toBeTruthy()
    fireEvent.click(within(screen.getByRole("dialog", { name: "Ten Taps" })).getByRole("button", { name: "Close dialog" }))
    expect(document.querySelector("dialog")?.hasAttribute("open")).toBe(false)
  })

  it("says a locked badge is not earned yet and shows its full rule", () => {
    render(<BadgesPage />)
    openBook()
    fireEvent.click(slot("Five Hundred Fold. Gold. Locked."))
    const dialog = screen.getByRole("dialog", { name: "Five Hundred Fold" })
    expect(within(dialog).getByText("Log 500 activities in total.")).toBeTruthy()
    expect(within(dialog).getByText("Not earned yet")).toBeTruthy()
  })
})

describe("Badges page: secret badges and finished habits", () => {
  it("has a Secret chapter that lists only earned secret badges, as secret", () => {
    render(<BadgesPage />)
    openBook()
    fireEvent.click(ribbon(/^Secret badges/))
    expect(screen.getByRole("region", { name: "Page 10 of 10, Secret badges" })).toBeTruthy()
    for (const badge of placeholderSecretBadges) {
      expect(slot(new RegExp(`^${badge.name}\\. Secret\\. .*\\. Earned `))).toBeTruthy()
    }
    expect(placeholderSecretBadges.every((badge) => badge.state === "earned")).toBe(true)
    expect(screen.queryByRole("button", { name: /Secret\. .*Locked/ })).toBeNull()
    expect(screen.queryByRole("button", { name: /Secret\. .*In progress/ })).toBeNull()
  })

  it("shows one slot per finished habit and opens its details", () => {
    render(<BadgesPage />)
    openBook()
    fireEvent.click(ribbon(/^Finished habits/))
    expect(screen.getAllByRole("button", { name: /badge\. Finished/ })).toHaveLength(placeholderHabitBadges.length)
    fireEvent.click(slot(/^Read a little\. Gold badge\. Finished Nov 22, 2026\./))
    const dialog = screen.getByRole("dialog", { name: "Read a little" })
    expect(within(dialog).getByText("3 times every week, for 4 weeks")).toBeTruthy()
    expect(within(dialog).getByText("Final progress").nextSibling?.textContent).toBe("100%")
    expect(within(dialog).getByText("Total activities").nextSibling?.textContent).toBe("13")
    expect(within(dialog).getByText("Stage 4, healthy")).toBeTruthy()
  })
})

describe("Badges page for a new user (?demo=empty)", () => {
  beforeEach(() => visit("?demo=empty"))

  it("has nothing earned, a gentle line, and no Secret chapter or latest row", () => {
    render(<BadgesPage />)
    const total = placeholderChapters.flatMap((chapter) => chapter.badges).length
    expect(screen.getAllByText(`0 of ${total} earned`).length).toBeGreaterThan(0)
    expect(screen.getByText("Your first badge is one log away.")).toBeTruthy()
    expect(screen.queryByRole("heading", { name: "Latest" })).toBeNull()
    expect(screen.queryByRole("button", { name: "Jump to newest" })).toBeNull()
    expect(within(screen.getByRole("navigation", { name: "Chapters" })).queryByRole("button", { name: /^Secret badges/ })).toBeNull()
  })

  it("lists every badge as locked, and explains the empty finished habits chapter", () => {
    render(<BadgesPage />)
    openBook()
    expect(slot("Seed Money. Bronze. Locked.")).toBeTruthy()
    expect(screen.queryByRole("button", { name: /Earned/ })).toBeNull()
    fireEvent.click(ribbon(/^Finished habits/))
    expect(screen.getByText(/earns a Bronze, Silver or Gold badge/)).toBeTruthy()
    expect(screen.queryByRole("button", { name: /badge\. Finished/ })).toBeNull()
  })
})
