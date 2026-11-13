// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { QueryProvider } from "@/lib/QueryProvider"
import type { DashboardSummary, FinishedHabit } from "@/lib/dashboard"
import DashboardPage from "@/app/(signed-in)/dashboard/page"

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

const fetchMock = vi.fn()
const empty: DashboardSummary = { active_count: 0, overall_consistency: null, best_streak: null, habits: [], needs_attention: [], finished: [] }
const summary: DashboardSummary = {
  active_count: 3, overall_consistency: 0.625,
  best_streak: { id: "read", name: "Read", streak: 4 },
  habits: [
    { id: "read", name: "Read", state: "active", streak: 4 },
    { id: "walk", name: "Walk", state: "active", streak: 1 },
    { id: "study", name: "Study", state: "not_started", streak: 0 },
  ],
  needs_attention: [],
  finished: [],
}
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), {
  status, headers: { "Content-Type": "application/json" },
})

const metric = (label: string) => screen.getByText(label).parentElement!
const finishedHabit = (patch: Partial<FinishedHabit> = {}): FinishedHabit => ({
  id: "finished-read", name: "Finished reading", end_date: "2026-11-01",
  progress: 1, consistency: 1, badge: "gold", ...patch,
})

beforeEach(() => {
  auth.user = { id: "user-a" }
  auth.getSession.mockImplementation(async () => ({
    data: { session: auth.user ? { access_token: `token-${auth.user.id}` } : null },
  }))
  vi.stubGlobal("fetch", fetchMock)
})
afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
  vi.resetAllMocks()
})

describe("Dashboard issue #213", () => {
  it("shows the backend's count, percentage and per-habit streaks, highlighting its chosen best", async () => {
    fetchMock.mockResolvedValue(json(summary))
    render(<QueryProvider><DashboardPage /></QueryProvider>)
    await screen.findByText("62.5%")
    expect(within(metric("Active habits")).getByText("3")).toBeTruthy()
    expect(within(metric("Best current streak")).getByText("4 periods")).toBeTruthy()
    const list = screen.getByRole("list")
    const rows = within(list).getAllByRole("listitem")
    expect(rows).toHaveLength(3)
    expect(rows[0].classList.contains("dashboard-habit--best")).toBe(true)
    expect(within(rows[0]).getByText("Best streak")).toBeTruthy()
    expect(within(rows[1]).getByText("1 period")).toBeTruthy()
    expect(within(rows[2]).getByText("0 periods")).toBeTruthy()
    expect(within(rows[2]).getByText("Not started yet")).toBeTruthy()
    expect(within(rows[0]).getByRole("link", { name: "Read" }).getAttribute("href")).toBe("/habits/read")
    expect(fetchMock.mock.calls[0][0]).toBe("http://api.test/dashboard")
    expect(fetchMock.mock.calls[0][1].headers.Authorization).toBe("Bearer token-user-a")
  })

  it("shows a dash before a completed period and a friendly empty state", async () => {
    fetchMock.mockResolvedValue(json(empty))
    render(<QueryProvider><DashboardPage /></QueryProvider>)
    await screen.findByText("No active habits yet")
    expect(within(metric("Active habits")).getByText("0")).toBeTruthy()
    expect(within(metric("Overall consistency")).getByText("—")).toBeTruthy()
    expect(screen.getByText("Available after your first completed period.")).toBeTruthy()
    expect(screen.getByRole("link", { name: "Create a habit" }).getAttribute("href")).toBe("/create")
    expect(screen.queryByRole("list")).toBeNull()
  })

  it("shows actual zero consistency as 0%, not a missing value", async () => {
    fetchMock.mockResolvedValue(json({ ...summary, overall_consistency: 0, best_streak: null,
      habits: summary.habits.map((habit) => ({ ...habit, streak: 0 })) }))
    render(<QueryProvider><DashboardPage /></QueryProvider>)
    await screen.findByText("0%")
    expect(within(metric("Best current streak")).getByText("—")).toBeTruthy()
    expect(screen.queryByText("Best streak")).toBeNull()
  })

  it("uses the backend's tie choice instead of highlighting every tied habit", async () => {
    fetchMock.mockResolvedValue(json({ ...summary,
      habits: summary.habits.map((habit) => ({ ...habit, streak: 4 })) }))
    render(<QueryProvider><DashboardPage /></QueryProvider>)
    await screen.findByRole("list")
    expect(screen.getAllByText("Best streak")).toHaveLength(1)
    expect(within(metric("Best current streak")).getByRole("link").textContent).toBe("Read")
  })

  it("shows loading without inventing zero stats before the response arrives", async () => {
    let resolve!: (response: Response) => void
    fetchMock.mockImplementation(() => new Promise<Response>((done) => { resolve = done }))
    render(<QueryProvider><DashboardPage /></QueryProvider>)
    expect(screen.getByRole("status").textContent).toBe("Loading your dashboard…")
    expect(screen.queryByText("Active habits")).toBeNull()
    await vi.waitFor(() => expect(fetchMock).toHaveBeenCalled())
    resolve(json(empty))
    await screen.findByText("No active habits yet")
  })

  it("shows an error and recovers when Try again succeeds", async () => {
    fetchMock.mockRejectedValueOnce(new TypeError("offline"))
    render(<QueryProvider><DashboardPage /></QueryProvider>)
    expect((await screen.findByRole("alert")).textContent).toContain("Couldn't load your dashboard")
    expect(screen.queryByText("No active habits yet")).toBeNull()
    fetchMock.mockResolvedValue(json(summary))
    fireEvent.click(screen.getByRole("button", { name: "Try again" }))
    await screen.findByText("62.5%")
    expect(screen.queryByRole("alert")).toBeNull()
  })

  it("clears the previous account's summary on account change", async () => {
    fetchMock.mockResolvedValue(json(summary))
    const view = render(<QueryProvider><DashboardPage /></QueryProvider>)
    await screen.findByText("62.5%")
    auth.user = { id: "user-b" }
    fetchMock.mockResolvedValue(json(empty))
    view.rerender(<QueryProvider><DashboardPage /></QueryProvider>)
    expect(screen.queryByText("62.5%")).toBeNull()
    expect(screen.queryAllByRole("link", { name: "Read" })).toHaveLength(0)
    await screen.findByText("No active habits yet")
    expect(fetchMock.mock.calls.at(-1)?.[1].headers.Authorization).toBe("Bearer token-user-b")
  })

  it("requests sign-in again when the backend rejects the session", async () => {
    fetchMock.mockResolvedValue(json({ error: { code: "unauthorized", message: "Invalid token" } }, 401))
    render(<QueryProvider><DashboardPage /></QueryProvider>)
    await screen.findByRole("alert")
    fireEvent.click(screen.getByRole("button", { name: "Sign in again" }))
    expect(auth.signOut).toHaveBeenCalledOnce()
    expect(screen.queryByText("Active habits")).toBeNull()
  })
})

describe("Dashboard issue #214", () => {
  it("shows the backend's wilted and slightly wilted habits with detail links, excluding healthy habits", async () => {
    fetchMock.mockResolvedValue(json({ ...summary, needs_attention: [
      { id: "walk", name: "Walk", health: "wilted" },
      { id: "study", name: "Study", health: "slightly_wilted" },
    ] }))
    render(<QueryProvider><DashboardPage /></QueryProvider>)
    const attention = await screen.findByRole("region", { name: "A little attention" })
    const links = within(attention).getAllByRole("link")
    expect(links.map((link) => link.textContent)).toEqual(["Walk", "Study"])
    expect(links.map((link) => link.getAttribute("href"))).toEqual(["/habits/walk", "/habits/study"])
    expect(within(attention).getByText("Wilted")).toBeTruthy()
    expect(within(attention).getByText("Slightly wilted")).toBeTruthy()
    expect(within(attention).queryByRole("link", { name: "Read" })).toBeNull()
    expect(within(attention).queryByText(/Nothing needs extra attention/)).toBeNull()
  })

  it("shows an encouraging message when the backend attention list is empty", async () => {
    fetchMock.mockResolvedValue(json(summary))
    render(<QueryProvider><DashboardPage /></QueryProvider>)
    const attention = await screen.findByRole("region", { name: "A little attention" })
    expect(within(attention).getByText("Nothing needs extra attention right now. Keep growing at your own pace.")).toBeTruthy()
    expect(within(attention).queryByRole("list")).toBeNull()
  })

  it("does not invent an empty attention state while loading or when the request fails", async () => {
    let reject!: (error: Error) => void
    fetchMock.mockImplementation(() => new Promise((_resolve, fail) => { reject = fail }))
    render(<QueryProvider><DashboardPage /></QueryProvider>)
    expect(screen.queryByText(/Nothing needs extra attention/)).toBeNull()
    await vi.waitFor(() => expect(fetchMock).toHaveBeenCalled())
    reject(new TypeError("offline"))
    await screen.findByRole("alert")
    expect(screen.queryByRole("region", { name: "A little attention" })).toBeNull()
  })
})

describe("Dashboard issue #215", () => {
  it.each([
    ["gold", 1, 0.8, "Gold badge", "100%", "80%"],
    ["silver", 1, 0.5, "Silver badge", "100%", "50%"],
    ["bronze", 0.6, 0.25, "Bronze badge", "60%", "25%"],
    ["none", 0.5996153846, 0, "No badge", "59.96%", "0%"],
  ] as const)("shows the backend's %s result with final progress and consistency", async (badge, progress, consistency, label, progressText, consistencyText) => {
    fetchMock.mockResolvedValue(json({ ...empty, finished: [finishedHabit({ badge, progress, consistency })] }))
    render(<QueryProvider><DashboardPage /></QueryProvider>)
    const history = await screen.findByRole("region", { name: "Finished habits" })
    const row = within(history).getByRole("listitem")
    expect(within(row).getByText(label)).toBeTruthy()
    expect(within(within(row).getByText("Final progress").parentElement!).getByText(progressText)).toBeTruthy()
    expect(within(within(row).getByText("Final consistency").parentElement!).getByText(consistencyText)).toBeTruthy()
    expect(within(row).getByRole("link", { name: "Finished reading" }).getAttribute("href")).toBe("/habits/finished-read")
    expect(row.querySelector("time")?.getAttribute("datetime")).toBe("2026-11-01")
    expect(screen.queryByRole("region", { name: "Current streaks" })).toBeNull()
    expect(screen.getByRole("heading", { name: "No active habits" })).toBeTruthy()
  })

  it("distinguishes no-badge results with explicit text and a separate visual treatment", async () => {
    fetchMock.mockResolvedValue(json({ ...empty, finished: [
      finishedHabit({ id: "awarded", name: "Awarded", badge: "bronze", progress: 0.6 }),
      finishedHabit({ id: "no-badge", name: "Another try", badge: "none", progress: 0.2 }),
    ] }))
    render(<QueryProvider><DashboardPage /></QueryProvider>)
    const history = await screen.findByRole("region", { name: "Finished habits" })
    const rows = within(history).getAllByRole("listitem")
    expect(rows[0].classList.contains("dashboard-result--awarded")).toBe(true)
    expect(rows[1].classList.contains("dashboard-result--no-badge")).toBe(true)
    expect(within(rows[1]).getByText("No badge")).toBeTruthy()
    expect(within(rows[1]).getByText(/Ended below 60%/)).toBeTruthy()
    expect(within(rows[0]).queryByText(/Ended below 60%/)).toBeNull()
    // Preserve the backend's order rather than regrouping or recalculating results.
    expect(within(history).getAllByRole("link").map((link) => link.textContent)).toEqual(["Awarded", "Another try"])
  })

  it("shows encouragement when there are no expired habits", async () => {
    fetchMock.mockResolvedValue(json(summary))
    render(<QueryProvider><DashboardPage /></QueryProvider>)
    const history = await screen.findByRole("region", { name: "Finished habits" })
    expect(within(history).getByText(/No finished habits yet/)).toBeTruthy()
    expect(within(history).queryByRole("list")).toBeNull()
    expect(within(history).queryByRole("link", { name: "Read" })).toBeNull()
  })

  it("keeps an unavailable final value distinct from a real zero", async () => {
    fetchMock.mockResolvedValue(json({ ...empty, finished: [finishedHabit({ progress: 0, consistency: null, badge: "none" })] }))
    render(<QueryProvider><DashboardPage /></QueryProvider>)
    const history = await screen.findByRole("region", { name: "Finished habits" })
    expect(within(history).getByText("0%")).toBeTruthy()
    expect(within(history).getByText("—")).toBeTruthy()
  })

  it("clears finished results when switching accounts", async () => {
    fetchMock.mockResolvedValue(json({ ...empty, finished: [finishedHabit()] }))
    const view = render(<QueryProvider><DashboardPage /></QueryProvider>)
    await screen.findByRole("link", { name: "Finished reading" })
    auth.user = { id: "user-b" }
    fetchMock.mockResolvedValue(json(empty))
    view.rerender(<QueryProvider><DashboardPage /></QueryProvider>)
    expect(screen.queryByRole("link", { name: "Finished reading" })).toBeNull()
    await screen.findByText(/No finished habits yet/)
  })
})
