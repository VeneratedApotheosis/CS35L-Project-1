// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import BadgesPage from "@/app/(signed-in)/badges/page"
import { QueryProvider } from "@/lib/QueryProvider"
import type { BadgeBook } from "@/lib/badges"
import { formatEarnedOn } from "./badges/groups"
import { emptyBadgeBook, sampleBadgeBook } from "./badges/sampleBadgeBook"

const auth = vi.hoisted(() => {
  vi.stubEnv("NEXT_PUBLIC_API_URL", "http://api.test")
  return {
    user: { id: "user-a" } as { id: string } | null,
    signOut: vi.fn(),
    getSession: vi.fn(),
  }
})
vi.mock("@/auth/useAuth", () => ({ useAuth: () => auth }))
vi.mock("@/lib/supabase", () => ({ supabase: { auth: { getSession: auth.getSession } } }))

HTMLDialogElement.prototype.showModal = function showModal() { this.setAttribute("open", "") }
HTMLDialogElement.prototype.close = function close() { this.removeAttribute("open") }

const fetchMock = vi.fn()
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), {
  status, headers: { "Content-Type": "application/json" },
})

beforeEach(() => {
  auth.user = { id: "user-a" }
  auth.getSession.mockImplementation(async () => ({ data: { session: { access_token: "token-a" } } }))
  vi.stubGlobal("fetch", fetchMock)
})
afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
  vi.resetAllMocks()
})

const badges = sampleBadgeBook.chapters.flatMap((chapter) => chapter.badges)
const earnedCount = badges.filter((badge) => badge.state === "earned").length
const seedMoneyDate = formatEarnedOn(badges.find((badge) => badge.id === "seed-money")!.earned_at!)

/** Renders the page with GET /me/badges answering `book`, and waits for the count. */
async function show(book: BadgeBook = sampleBadgeBook) {
  fetchMock.mockResolvedValue(json(book))
  render(<QueryProvider><BadgesPage /></QueryProvider>)
  const total = book.chapters.flatMap((chapter) => chapter.badges)
  const earned = total.filter((badge) => badge.state === "earned").length
  await screen.findByRole("heading", { name: `${earned} of ${total.length} earned` })
}

const slot = (name: RegExp | string) => screen.getByRole("button", { name })
const group = (name: string) => screen.getByRole("heading", { level: 2, name: new RegExp(`^${name}`) }).closest("section")!

describe("Badges page", () => {
  it("reads the badge book from the backend", async () => {
    await show()
    expect(fetchMock).toHaveBeenCalledWith("http://api.test/me/badges", expect.objectContaining({ method: "GET" }))
    expect(screen.getByRole("heading", { level: 1, name: "Badges" })).toBeTruthy()
    expect(screen.getByRole("heading", { name: `${earnedCount} of ${badges.length} earned` })).toBeTruthy()
    expect(within(screen.getByRole("list", { name: "Earned badges by tier" })).getAllByRole("listitem")).toHaveLength(4)
  })

  it("shows a loading line until the book arrives", () => {
    fetchMock.mockReturnValue(new Promise(() => {}))
    render(<QueryProvider><BadgesPage /></QueryProvider>)
    expect(screen.getByRole("status").textContent).toBe("Loading your badges…")
  })

  it("shows an error with a retry when the book cannot be loaded", async () => {
    fetchMock.mockResolvedValueOnce(json({ error: { code: "internal_error", message: "boom" } }, 500))
    render(<QueryProvider><BadgesPage /></QueryProvider>)
    const alert = await screen.findByRole("alert")
    expect(within(alert).getByText("Couldn't load your badges")).toBeTruthy()
    fetchMock.mockResolvedValueOnce(json(sampleBadgeBook))
    fireEvent.click(screen.getByRole("button", { name: "Try again" }))
    await screen.findByRole("heading", { name: `${earnedCount} of ${badges.length} earned` })
  })

  it("asks to sign in again when the session has expired", async () => {
    fetchMock.mockResolvedValue(json({ error: { code: "unauthorized", message: "no" } }, 401))
    render(<QueryProvider><BadgesPage /></QueryProvider>)
    await screen.findByText("Sign in to see your badges")
    fireEvent.click(screen.getByRole("button", { name: "Sign in again" }))
    expect(auth.signOut).toHaveBeenCalled()
  })

  it("lists the groups in order, each with its earned count", async () => {
    await show()
    const titles = screen.getAllByRole("heading", { level: 2 }).map((heading) => heading.textContent)
    expect(titles[1]).toBe("Getting started5/8")
    expect(titles.at(-1)).toBe("Secret badges2")
  })

  it("puts only the badge in a slot and says everything else in its name", async () => {
    await show()
    const earned = within(group("Getting started")).getByRole("button", { name: `Seed Money. Bronze. Earned ${seedMoneyDate}.` })
    expect(earned.textContent).toContain("Create your first habit.")
    expect(within(earned).getByText("Seed Money").closest("[aria-hidden='true']")).toBeTruthy()
    expect(within(group("Logging milestones")).getByRole("button", { name: "Ten Taps. Bronze. In progress, 7 of 10." })).toBeTruthy()
    expect(within(group("Logging milestones")).getByRole("button", { name: "Five Hundred Fold. Gold. Locked." })).toBeTruthy()
  })

  it("hides locked badges and keeps earned and in-progress ones", async () => {
    await show()
    const toggle = screen.getByRole("button", { name: "Hide locked" })
    fireEvent.click(toggle)
    expect(toggle.getAttribute("aria-pressed")).toBe("true")
    expect(screen.queryByRole("button", { name: /Locked\./ })).toBeNull()
    expect(within(group("Logging milestones")).getByRole("button", { name: /^Ten Taps\./ })).toBeTruthy()
    // A group with nothing left is dropped.
    expect(screen.queryByRole("heading", { level: 2, name: /^Hard challenges/ })).toBeNull()
    fireEvent.click(toggle)
    expect(screen.getByRole("heading", { level: 2, name: /^Hard challenges/ })).toBeTruthy()
  })
})

describe("Badges page: details", () => {
  it("opens a dialog with the rule and status, and steps to the next badge", async () => {
    await show()
    fireEvent.click(slot("Ten Taps. Bronze. In progress, 7 of 10."))
    let dialog = screen.getByRole("dialog", { name: "Ten Taps" })
    expect(within(dialog).getByText("Log 10 activities in total.")).toBeTruthy()
    expect(within(dialog).getByText("7 of 10")).toBeTruthy()
    expect(within(dialog).getByRole("progressbar", { name: "Ten Taps progress" }).getAttribute("aria-valuenow")).toBe("7")
    fireEvent.click(within(dialog).getByRole("button", { name: "Next badge" }))
    dialog = screen.getByRole("dialog", { name: "Fifty Strong" })
    fireEvent.click(within(dialog).getByRole("button", { name: "Previous badge" }))
    expect(screen.getByRole("dialog", { name: "Ten Taps" })).toBeTruthy()
    fireEvent.click(within(screen.getByRole("dialog", { name: "Ten Taps" })).getByRole("button", { name: "Close dialog" }))
    expect(document.querySelector("dialog")?.hasAttribute("open")).toBe(false)
  })

  it("says a locked badge is not earned yet and shows its full rule", async () => {
    await show()
    fireEvent.click(slot("Five Hundred Fold. Gold. Locked."))
    const dialog = screen.getByRole("dialog", { name: "Five Hundred Fold" })
    expect(within(dialog).getByText("Log 500 activities in total.")).toBeTruthy()
    expect(within(dialog).getByText("Not earned yet")).toBeTruthy()
  })

  it("steps only through the badges that are showing", async () => {
    await show()
    fireEvent.click(screen.getByRole("button", { name: "Hide locked" }))
    fireEvent.click(within(group("Getting started")).getByRole("button", { name: /^Green Thumb\./ }))
    fireEvent.click(within(screen.getByRole("dialog", { name: "Green Thumb" })).getByRole("button", { name: "Next badge" }))
    // Sapling Season is locked and hidden, so the next badge is Full Bloom.
    expect(screen.getByRole("dialog", { name: "Full Bloom" })).toBeTruthy()
  })
})

describe("Badges page: secret badges", () => {
  it("lists earned secret badges as secret, never as locked or in progress", async () => {
    await show()
    const secret = group("Secret badges")
    expect(within(secret).getByRole("button", { name: /^Early Bird\. Secret\. Bronze\. Earned / })).toBeTruthy()
    expect(within(secret).getByRole("button", { name: /^Night Owl\. Secret\. Bronze\. Earned / })).toBeTruthy()
    expect(screen.queryByRole("button", { name: /Secret\. .*Locked/ })).toBeNull()
  })
})

describe("Badges page for a new user", () => {
  it("has nothing earned, every badge locked and no Secret group", async () => {
    await show(emptyBadgeBook)
    expect(slot("Seed Money. Bronze. Locked.")).toBeTruthy()
    expect(screen.queryByRole("button", { name: /Earned/ })).toBeNull()
    expect(screen.queryByRole("heading", { level: 2, name: /^Secret badges/ })).toBeNull()
  })
})
