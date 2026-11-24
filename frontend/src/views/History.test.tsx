// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { QueryProvider } from "@/lib/QueryProvider"
import type { HistoryHabit, HistoryPage } from "@/lib/history"
import History from "./History"
import { dateRange, goalPhrase, groupByMonth, streakText } from "./history/format"

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

const nav = vi.hoisted(() => ({ search: "", replace: vi.fn() }))
vi.mock("next/navigation", () => ({
  usePathname: () => "/history",
  useRouter: () => ({ replace: nav.replace }),
  useSearchParams: () => new URLSearchParams(nav.search),
}))

const fetchMock = vi.fn()
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), {
  status, headers: { "Content-Type": "application/json" },
})

const finished = (patch: Partial<HistoryHabit> = {}): HistoryHabit => ({
  id: "run", name: "Morning run", description: null, plant_type: "pothos",
  target_count: 3, interval_count: 1, interval_unit: "week", num_periods: 4,
  start_date: "2026-10-26", end_date: "2026-11-23", last_day: "2026-11-22",
  badge: "gold", final_progress: 1, final_consistency: 1, periods_met: 4, periods_total: 4,
  total_logs: 13, best_streak: 4, stage: 4, health: "healthy",
  ...patch,
})

const page = (habits: HistoryHabit[], patch: Partial<HistoryPage> = {}): HistoryPage => ({
  summary: {
    finished: habits.length,
    by_level: {
      gold: habits.filter((h) => h.badge === "gold").length,
      silver: habits.filter((h) => h.badge === "silver").length,
      bronze: habits.filter((h) => h.badge === "bronze").length,
      none: habits.filter((h) => h.badge === "none").length,
    },
    total_logs: habits.reduce((sum, h) => sum + h.total_logs, 0),
    average_final_progress: habits.length ? habits.reduce((sum, h) => sum + h.final_progress, 0) / habits.length : null,
    next_end_date: null,
  },
  habits, total: habits.length, limit: 20, offset: 0,
  ...patch,
})

beforeEach(() => {
  auth.user = { id: "user-a" }
  auth.getSession.mockImplementation(async () => ({ data: { session: { access_token: "token-a" } } }))
  nav.search = ""
  vi.stubGlobal("fetch", fetchMock)
})
afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
  vi.resetAllMocks()
})

const show = () => render(<QueryProvider><History /></QueryProvider>)
const requested = (call = 0) => new URL(String(fetchMock.mock.calls[call]?.[0]))

describe("History page", () => {
  it("lists finished habits by month with their final numbers", async () => {
    fetchMock.mockResolvedValue(json(page([
      finished(),
      finished({ id: "read", name: "Read before bed", badge: "none", final_progress: 0.52, periods_met: 5, periods_total: 14,
        start_date: "2026-10-01", last_day: "2026-10-14", interval_unit: "day", target_count: 1, num_periods: 14, best_streak: 3, total_logs: 7 }),
    ])))
    show()

    expect(await screen.findByRole("heading", { level: 2, name: "2 finished" })).toBeTruthy()
    expect(requested().pathname).toBe("/me/history")
    expect(requested().searchParams.get("sort")).toBe("newest")
    expect(requested().searchParams.get("level")).toBeNull()

    const november = screen.getByRole("region", { name: "November 2026" })
    const run = within(november).getByRole("link", { name: /Morning run/ })
    expect(run.getAttribute("href")).toBe("/habit?id=run")
    expect(within(run).getByText("Gold")).toBeTruthy()
    expect(within(run).getByText("100%")).toBeTruthy()
    expect(within(run).getByLabelText("4 of 4 periods met (100%)")).toBeTruthy()
    expect(within(run).getByText("4 weeks")).toBeTruthy()

    const october = screen.getByRole("region", { name: "October 2026" })
    const read = within(october).getByRole("link", { name: /Read before bed/ })
    expect(within(read).getByText("No badge")).toBeTruthy()
    expect(within(read).getByText("52%")).toBeTruthy()
    expect(screen.getByText(/1 ended below 60%/)).toBeTruthy()
  })

  it("links to Badges and marks History as the current tab", async () => {
    fetchMock.mockResolvedValue(json(page([finished()])))
    show()
    const tabs = await screen.findByRole("navigation", { name: "Badges and history" })
    expect(within(tabs).getByRole("link", { name: "History" }).getAttribute("aria-current")).toBe("page")
    expect(within(tabs).getByRole("link", { name: "Badges" }).getAttribute("href")).toBe("/badges")
  })

  it("reads the filter and sort from the URL and writes changes back", async () => {
    nav.search = "level=gold&sort=best"
    fetchMock.mockResolvedValue(json(page([finished()])))
    show()

    await screen.findByRole("link", { name: /Morning run/ })
    expect(requested().searchParams.get("level")).toBe("gold")
    expect(requested().searchParams.get("sort")).toBe("best")
    expect(screen.getByRole("button", { name: /^Gold/ }).getAttribute("aria-pressed")).toBe("true")
    // Best result first is one list, not grouped by month.
    expect(screen.queryByRole("region", { name: "November 2026" })).toBeNull()

    fireEvent.click(screen.getByRole("button", { name: "All" }))
    expect(nav.replace).toHaveBeenLastCalledWith("/history?sort=best", { scroll: false })
    fireEvent.change(screen.getByRole("combobox", { name: "Sort" }), { target: { value: "newest" } })
    expect(nav.replace).toHaveBeenLastCalledWith("/history?level=gold", { scroll: false })
  })

  it("keeps the last list on screen, faded, while a new filter loads", async () => {
    fetchMock.mockResolvedValueOnce(json(page([finished()])))
    const view = show()
    await screen.findByRole("link", { name: /Morning run/ })

    // The URL now asks for Bronze, and that request has not answered yet.
    nav.search = "level=bronze"
    fetchMock.mockReturnValueOnce(new Promise(() => {}))
    view.rerender(<QueryProvider><History /></QueryProvider>)

    expect(await screen.findByRole("button", { name: /^Bronze/, pressed: true })).toBeTruthy()
    expect(screen.queryByText("Loading your history…")).toBeNull()
    expect(screen.getByRole("heading", { level: 2, name: "1 finished" })).toBeTruthy()
    const run = screen.getByRole("link", { name: /Morning run/ })
    expect(run.closest(".history-results")?.getAttribute("aria-busy")).toBe("true")
  })

  it("loads 20 more with Show more", async () => {
    const first = Array.from({ length: 20 }, (_, i) => finished({ id: `h${i}`, name: `Habit ${i}` }))
    fetchMock
      .mockResolvedValueOnce(json(page(first, { total: 21 })))
      .mockResolvedValueOnce(json(page([finished({ id: "h20", name: "Habit 20" })], { total: 21, offset: 20 })))
    show()

    fireEvent.click(await screen.findByRole("button", { name: "Show more (1)" }))
    expect(await screen.findByRole("link", { name: /Habit 20/ })).toBeTruthy()
    expect(requested(1).searchParams.get("offset")).toBe("20")
    expect(screen.queryByRole("button", { name: /Show more/ })).toBeNull()
  })

  it("shows a message when a filter matches nothing", async () => {
    nav.search = "level=silver"
    const all = page([finished()])
    fetchMock.mockResolvedValue(json({ ...all, habits: [], total: 0 }))
    show()

    expect(await screen.findByText("No Silver habits yet.")).toBeTruthy()
    fireEvent.click(screen.getByRole("button", { name: "Show all" }))
    expect(nav.replace).toHaveBeenLastCalledWith("/history", { scroll: false })
  })

  it("explains the empty history with the next end date", async () => {
    fetchMock.mockResolvedValue(json({ ...page([]), summary: { ...page([]).summary, next_end_date: "2026-12-21" } }))
    show()

    expect(await screen.findByRole("heading", { name: "No finished habits yet" })).toBeTruthy()
    expect(screen.getByText(/Your next one ends/)).toBeTruthy()
    expect(screen.getByRole("link", { name: "Go to your garden" }).getAttribute("href")).toBe("/")
  })

  it("shows an error with a retry", async () => {
    fetchMock.mockResolvedValueOnce(json({ error: { code: "internal_error", message: "boom" } }, 500))
    fetchMock.mockResolvedValueOnce(json(page([finished()])))
    show()

    expect(await screen.findByRole("heading", { name: "Couldn't load your history" })).toBeTruthy()
    fireEvent.click(screen.getByRole("button", { name: "Try again" }))
    expect(await screen.findByRole("link", { name: /Morning run/ })).toBeTruthy()
  })
})

describe("history formatting", () => {
  it("writes the goal, dates and streak", () => {
    expect(goalPhrase(finished())).toBe("3 times every week for 4 weeks")
    expect(goalPhrase(finished({ target_count: 1, interval_count: 2, interval_unit: "day", num_periods: 5 }))).toBe("1 time every 2 days for 5 periods")
    expect(dateRange(finished(), 2026)).toMatch(/Oct 26.*–.*Nov 22/)
    expect(dateRange(finished(), 2027)).toMatch(/2026/)
    expect(streakText(finished({ best_streak: 1 }))).toBe("1 week")
    expect(streakText(finished({ interval_count: 3 }))).toBe("4 periods")
  })

  it("groups runs of the same month in order", () => {
    const groups = groupByMonth([
      finished({ id: "a", last_day: "2026-11-20" }),
      finished({ id: "b", last_day: "2026-11-02" }),
      finished({ id: "c", last_day: "2026-10-30" }),
    ])
    expect(groups.map((g) => [g.month, g.habits.map((h) => h.id)])).toEqual([
      ["November 2026", ["a", "b"]],
      ["October 2026", ["c"]],
    ])
  })
})
