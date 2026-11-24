// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it } from "vitest"
import BadgesPage from "@/app/(signed-in)/badges/page"
import { buildGroups, latestEarned } from "./badges/groups"
import { placeholderChapters, placeholderHabitBadges, placeholderSecretBadges } from "./badges/placeholderBadges"

HTMLDialogElement.prototype.showModal = function showModal() { this.setAttribute("open", "") }
HTMLDialogElement.prototype.close = function close() { this.removeAttribute("open") }

const visit = (search = "") => window.history.replaceState(null, "", `/badges${search}`)
beforeEach(() => visit())
afterEach(cleanup)

const groups = buildGroups(placeholderChapters, placeholderSecretBadges, placeholderHabitBadges)
const badges = groups.flatMap((group) => group.items).filter((item) => item.kind === "badge")
const earnedCount = badges.filter((item) => item.badge.state === "earned").length

const slot = (name: RegExp | string) => screen.getByRole("button", { name })
const group = (name: string) => screen.getByRole("heading", { level: 2, name: new RegExp(`^${name}`) }).closest("section")!

describe("Badges page", () => {
  it("shows the count, the tier counts and the groups in order", () => {
    render(<BadgesPage />)
    expect(screen.getByRole("heading", { level: 1, name: "Badges" })).toBeTruthy()
    expect(screen.getByRole("heading", { name: `${earnedCount} of ${badges.length} earned` })).toBeTruthy()
    expect(within(screen.getByRole("list", { name: "Earned badges by tier" })).getAllByRole("listitem")).toHaveLength(4)
    const titles = screen.getAllByRole("heading", { level: 2 }).map((heading) => heading.textContent)
    expect(titles.slice(2, 4)).toEqual(expect.arrayContaining(["Getting started5/8"]))
    expect(titles.some((title) => title?.startsWith("Finished habits"))).toBe(true)
  })

  it("shows the latest badges, newest first", () => {
    render(<BadgesPage />)
    const latest = within(screen.getByRole("heading", { name: "Latest" }).closest("section")!).getAllByRole("button")
    const expected = latestEarned(groups, 8)
    expect(latest).toHaveLength(8)
    expect(latest[0].getAttribute("aria-label")).toContain(expected[0].badge.name)
  })

  it("puts only the badge in a slot and says everything else in its name", () => {
    render(<BadgesPage />)
    const earned = within(group("Getting started")).getByRole("button", { name: "Seed Money. Bronze. Earned Nov 12." })
    expect(earned.textContent).toContain("Create your first habit.")
    expect(within(earned).getByText("Seed Money").closest("[aria-hidden='true']")).toBeTruthy()
    expect(within(group("Logging milestones")).getByRole("button", { name: "Ten Taps. Bronze. In progress, 7 of 10." })).toBeTruthy()
    expect(within(group("Logging milestones")).getByRole("button", { name: "Five Hundred Fold. Gold. Locked." })).toBeTruthy()
  })

  it("hides locked badges and keeps earned and in-progress ones", () => {
    render(<BadgesPage />)
    const toggle = screen.getByRole("button", { name: "Hide locked" })
    expect(toggle.getAttribute("aria-pressed")).toBe("false")
    fireEvent.click(toggle)
    expect(toggle.getAttribute("aria-pressed")).toBe("true")
    expect(screen.queryByRole("button", { name: /Locked\./ })).toBeNull()
    expect(within(group("Logging milestones")).getByRole("button", { name: /^Ten Taps\./ })).toBeTruthy()
    expect(within(group("Getting started")).getByRole("button", { name: /^Seed Money\./ })).toBeTruthy()
    // A group with nothing left is dropped.
    expect(screen.queryByRole("heading", { level: 2, name: /^Hard challenges/ })).toBeNull()
    fireEvent.click(toggle)
    expect(screen.getByRole("heading", { level: 2, name: /^Hard challenges/ })).toBeTruthy()
  })
})

describe("Badges page: details", () => {
  it("opens a dialog with the rule and status, and steps to the next badge", () => {
    render(<BadgesPage />)
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
    fireEvent.click(slot("Five Hundred Fold. Gold. Locked."))
    const dialog = screen.getByRole("dialog", { name: "Five Hundred Fold" })
    expect(within(dialog).getByText("Log 500 activities in total.")).toBeTruthy()
    expect(within(dialog).getByText("Not earned yet")).toBeTruthy()
  })

  it("steps only through the badges that are showing", () => {
    render(<BadgesPage />)
    fireEvent.click(screen.getByRole("button", { name: "Hide locked" }))
    fireEvent.click(within(group("Getting started")).getByRole("button", { name: /^Green Thumb\./ }))
    const dialog = screen.getByRole("dialog", { name: "Green Thumb" })
    fireEvent.click(within(dialog).getByRole("button", { name: "Next badge" }))
    // Sapling Season is locked and hidden, so the next badge is Full Bloom.
    expect(screen.getByRole("dialog", { name: "Full Bloom" })).toBeTruthy()
  })
})

describe("Badges page: secret badges and finished habits", () => {
  it("has a Secret group that lists only earned secret badges, as secret", () => {
    render(<BadgesPage />)
    const secret = group("Secret badges")
    for (const badge of placeholderSecretBadges) {
      expect(within(secret).getByRole("button", { name: new RegExp(`^${badge.name}\\. Secret\\. .*\\. Earned `) })).toBeTruthy()
    }
    expect(placeholderSecretBadges.every((badge) => badge.state === "earned")).toBe(true)
    expect(screen.queryByRole("button", { name: /Secret\. .*Locked/ })).toBeNull()
    expect(screen.queryByRole("button", { name: /Secret\. .*In progress/ })).toBeNull()
  })

  it("shows one slot per finished habit and opens its details", () => {
    render(<BadgesPage />)
    expect(within(group("Finished habits")).getAllByRole("button", { name: /badge\. Finished/ })).toHaveLength(placeholderHabitBadges.length)
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

  it("has nothing earned, a gentle line, and no Secret group or latest row", () => {
    render(<BadgesPage />)
    const total = placeholderChapters.flatMap((chapter) => chapter.badges).length
    expect(screen.getByRole("heading", { name: `0 of ${total} earned` })).toBeTruthy()
    expect(screen.getByText("Your first badge is one log away.")).toBeTruthy()
    expect(screen.queryByRole("heading", { level: 2, name: /^Secret badges/ })).toBeNull()
  })

  it("lists every badge as locked, and explains the empty finished habits group", () => {
    render(<BadgesPage />)
    expect(slot("Seed Money. Bronze. Locked.")).toBeTruthy()
    expect(screen.queryByRole("button", { name: /Earned/ })).toBeNull()
    expect(within(group("Finished habits")).getByText(/earns a Bronze, Silver or Gold badge/)).toBeTruthy()
    expect(screen.queryByRole("button", { name: /badge\. Finished/ })).toBeNull()
  })
})
