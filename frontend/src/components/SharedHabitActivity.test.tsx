// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { QueryProvider } from "@/lib/QueryProvider"
import SharedHabitDetails from "@/views/SharedHabitDetails"

const auth = vi.hoisted(() => {
  vi.stubEnv("NEXT_PUBLIC_API_URL", "http://api.test")
  return { user: { id: "caller" }, signOut: vi.fn(), getSession: vi.fn() }
})
vi.mock("@/auth/useAuth", () => ({ useAuth: () => auth }))
vi.mock("@/lib/supabase", () => ({ supabase: { auth: { getSession: auth.getSession } } }))
vi.mock("@/pottedPlant/plants/plantTypes", () => ({ plantTypeById: () => ({ label: "Pothos", Preview: () => <svg /> }) }))

const fetchMock = vi.fn()
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status })
let logs: { id: string; occurred_on: string }[]
let beforeStart: boolean
let expired: boolean
let failSave: boolean
let failDelete: boolean
let holdRefresh: boolean
let failRefresh: boolean
let gets: number
let ownToday: string
let groupBeforeStart: boolean

function responseStats() {
  const period = { number: 1, total: 2, start: beforeStart ? "2026-11-22" : "2026-11-18",
    end: beforeStart ? "2026-11-29" : "2026-11-25", count: logs.length, target: 2 }
  const state = expired ? "expired" : beforeStart ? "not_started" : "active"
  return {
    own_today: ownToday,
    own_stats: { state, overall_progress: logs.length / 4, stage: 2, health: "healthy",
      current_period: period, streak: logs.length >= 2 ? 1 : 0 },
    stats: { today: "2026-11-19", state: groupBeforeStart ? "not_started" : state,
      overall_progress: (logs.length / 4 + 0.5) / 2, stage: logs.length > 1 ? 3 : 2,
      health: "slightly_wilted", health_rate: 0.75, end_date: "2026-12-02",
      current_period: { ...period, count: (logs.length + 2) / 2 } },
  }
}
function detail() {
  const snapshot = responseStats()
  return {
    id: "shared-a", owner_id: "other", name: "Read together", description: null, plant_type: "pothos",
    target_count: 2, interval_count: 1, interval_unit: "week", num_periods: 2,
    start_date: beforeStart ? "2026-11-22" : "2026-11-18", join_by: "2026-11-18", max_members: 5,
    join_code: null, created_at: "2026-11-17T00:00:00Z", ...snapshot,
    own_stats: { ...snapshot.own_stats, end_date: "2026-12-02",
      consistency: { completed: 0, successful: 0, rate: null }, periods: [],
      current_period_logs: beforeStart || expired ? [] : [...logs],
      log_days: [{ date: "2026-11-10", count: 1 }, ...logs.map((log) => ({ date: log.occurred_on, count: 1 }))] },
    members: [
      { user_id: "other", display_name: "Sam", avatar_url: null, is_owner: true,
        overall_progress: 0.5, current_period_count: 2, streak: 2, health: "healthy" },
      { user_id: "caller", display_name: "Ella", avatar_url: null, is_owner: false,
        overall_progress: snapshot.own_stats.overall_progress, current_period_count: logs.length,
        streak: snapshot.own_stats.streak, health: "healthy" },
    ],
  }
}
const calls = (method: string) => fetchMock.mock.calls.filter(([, init]) => init.method === method)
const input = () => screen.getByLabelText("Activity date") as HTMLInputElement
const ownCount = () => screen.getByRole("progressbar", { name: "Current period" }).getAttribute("aria-valuenow")
const callerRow = () => screen.getByRole("row", { name: /Ella/ })
async function openDetails() {
  render(<QueryProvider><SharedHabitDetails id="shared-a" /></QueryProvider>)
  await screen.findByRole("heading", { name: "Read together" })
}

beforeEach(() => {
  logs = [{ id: "own-log", occurred_on: "2026-11-19" }]
  beforeStart = false
  expired = false
  failSave = false
  failDelete = false
  holdRefresh = false
  failRefresh = false
  groupBeforeStart = false
  ownToday = "2026-11-20" // Membership date differs from the group's cutoff.
  gets = 0
  auth.getSession.mockResolvedValue({ data: { session: { access_token: "caller-token" } } })
  fetchMock.mockImplementation(async (url: string, init: RequestInit) => {
    if (init.method === "POST") {
      if (failSave) throw new TypeError("offline")
      const log = { id: `new-${logs.length}`, occurred_on: JSON.parse(init.body as string).occurred_on }
      logs = [...logs, log]
      return json({ ...responseStats(), log: { ...log, shared_habit_id: "shared-a", user_id: "caller" } }, 201)
    }
    if (init.method === "DELETE") {
      if (failDelete) throw new TypeError("offline")
      logs = logs.filter((log) => log.id !== url.split("/").at(-1))
      return json(responseStats())
    }
    gets++
    if (gets > 1 && holdRefresh) return new Promise<Response>(() => {})
    if (gets > 1 && failRefresh) throw new TypeError("offline")
    return json(detail())
  })
  vi.stubGlobal("fetch", fetchMock)
})
afterEach(() => { cleanup(); vi.useRealTimers(); vi.unstubAllGlobals(); vi.clearAllMocks() })

describe("shared habit activity (#277)", () => {
  it("defaults to the server's membership date rather than group or browser today", async () => {
    await openDetails()
    expect(input().value).toBe("2026-11-20")
    expect(input().min).toBe("2026-11-18")
    expect(input().max).toBe("2026-11-20")
    expect(fetchMock.mock.calls.every(([url]) => url.includes("/shared-habits/"))).toBe(true)
  })

  it("updates the caller row, group average and plant from POST while the detail refresh is pending", async () => {
    holdRefresh = true
    await openDetails()
    expect(ownCount()).toBe("1")
    expect(screen.getByText("Pothos · Stage 2 · Slightly wilted")).toBeTruthy()
    const otherBefore = screen.getByRole("row", { name: /Sam/ }).textContent
    fireEvent.click(screen.getByRole("button", { name: "Log activity" }))
    await screen.findByText("Activity logged.")
    expect(ownCount()).toBe("2")
    for (const value of ["50%", "2/2", "1 period", "Healthy"]) expect(within(callerRow()).getByText(value)).toBeTruthy()
    expect(screen.getByRole("row", { name: /Sam/ }).textContent).toBe(otherBefore)
    expect(screen.getByText("Pothos · Stage 3 · Slightly wilted")).toBeTruthy()
    expect(screen.getByRole("progressbar", { name: "Group average this period" }).getAttribute("aria-valuenow")).toBe("2")
    const [url, request] = calls("POST")[0]
    expect(url).toBe("http://api.test/shared-habits/shared-a/logs")
    expect(JSON.parse(request.body)).toEqual({ occurred_on: "2026-11-20" })
    expect(request.headers.Authorization).toBe("Bearer caller-token")
    expect(screen.getAllByRole("button", { name: /Delete activity on/ })).toHaveLength(2)
  })

  it("Undo deletes the new log and restores the caller row, fractional group count and plant", async () => {
    holdRefresh = true
    await openDetails()
    fireEvent.click(screen.getByRole("button", { name: "Log activity" }))
    fireEvent.click(await screen.findByRole("button", { name: "Undo" }))
    await screen.findByText("Activity removed.")
    expect(calls("DELETE")[0][0]).toBe("http://api.test/shared-habits/shared-a/logs/new-1")
    expect(ownCount()).toBe("1")
    expect(within(callerRow()).getByText("1/2")).toBeTruthy()
    expect(within(callerRow()).getByText("0 periods")).toBeTruthy()
    expect(screen.getByText("Pothos · Stage 2 · Slightly wilted")).toBeTruthy()
    expect(screen.getByRole("progressbar", { name: "Group average this period" }).getAttribute("aria-valuenow")).toBe("1.5")
  })

  it("deletes only the caller's current log, with no locked or other-member delete controls", async () => {
    holdRefresh = true
    await openDetails()
    expect(screen.getAllByRole("button", { name: /Delete activity on/ })).toHaveLength(1)
    expect(screen.queryByRole("button", { name: "Delete activity on Nov 10, 2026" })).toBeNull()
    fireEvent.click(screen.getByRole("button", { name: "Delete activity on Nov 19, 2026" }))
    await screen.findByText("Activity removed.")
    expect(calls("DELETE")[0][0]).toBe("http://api.test/shared-habits/shared-a/logs/own-log")
    expect(ownCount()).toBe("0")
    expect(within(callerRow()).getByText("0/2")).toBeTruthy()
    expect(screen.queryByRole("button", { name: /Delete activity on/ })).toBeNull()
    expect(within(screen.getByRole("row", { name: /Sam/ })).getByText("2/2")).toBeTruthy()
  })

  it.each(["2026-11-17", "2026-11-21", ""])("rejects date %j outside the caller's current period up to today", async (date) => {
    await openDetails()
    fireEvent.change(input(), { target: { value: date } })
    fireEvent.click(screen.getByRole("button", { name: "Log activity" }))
    expect((await screen.findByRole("alert")).textContent).toContain("Choose a date from")
    expect(calls("POST")).toHaveLength(0)
  })

  it("allows a valid earlier date within the current period", async () => {
    await openDetails()
    fireEvent.change(input(), { target: { value: "2026-11-18" } })
    fireEvent.click(screen.getByRole("button", { name: "Log activity" }))
    await screen.findByText("Activity logged.")
    expect(JSON.parse(calls("POST")[0][1].body)).toEqual({ occurred_on: "2026-11-18" })
  })

  it("disables logging before the caller's start date", async () => {
    beforeStart = true
    await openDetails()
    expect(input().disabled).toBe(true)
    expect(screen.getByText("This shared habit hasn't started yet. You can log after its start date.")).toBeTruthy()
    fireEvent.click(screen.getByRole("button", { name: "Log activity" }))
    expect(calls("POST")).toHaveLength(0)
    expect(screen.queryByRole("button", { name: /Delete activity on/ })).toBeNull()
  })

  it("allows an active caller to log even when the group's timezone has not reached the start date", async () => {
    groupBeforeStart = true
    await openDetails()
    fireEvent.click(screen.getByRole("button", { name: "Log activity" }))
    await screen.findByText("Activity logged.")
    expect(calls("POST")).toHaveLength(1)
  })

  it("disables logging and deletion after the caller's habit has expired", async () => {
    expired = true
    ownToday = "2026-12-03"
    await openDetails()
    expect(input().disabled).toBe(true)
    expect(screen.getByText("This habit has ended. Its activity is locked.")).toBeTruthy()
    expect(screen.queryByRole("button", { name: /Delete activity on/ })).toBeNull()
    fireEvent.click(screen.getByRole("button", { name: "Log activity" }))
    expect(calls("POST")).toHaveLength(0)
  })

  it("preserves the date and all values after a failed save, then allows retry", async () => {
    failSave = true
    await openDetails()
    fireEvent.change(input(), { target: { value: "2026-11-18" } })
    fireEvent.click(screen.getByRole("button", { name: "Log activity" }))
    expect((await screen.findByRole("alert")).textContent).toContain("Couldn't log the activity")
    expect(input().value).toBe("2026-11-18")
    expect(ownCount()).toBe("1")
    failSave = false
    fireEvent.click(screen.getByRole("button", { name: "Log activity" }))
    await screen.findByText("Activity logged.")
    expect(ownCount()).toBe("2")
  })

  it("keeps the log, row and group stats when deletion fails", async () => {
    failDelete = true
    await openDetails()
    fireEvent.click(screen.getByRole("button", { name: /Delete activity on/ }))
    expect((await screen.findByRole("alert")).textContent).toContain("Couldn't remove the activity")
    expect(ownCount()).toBe("1")
    expect(within(callerRow()).getByText("1/2")).toBeTruthy()
    expect(screen.getByRole("button", { name: /Delete activity on/ })).toBeTruthy()
  })

  it("does not pretend Undo worked when deletion fails", async () => {
    await openDetails()
    fireEvent.click(screen.getByRole("button", { name: "Log activity" }))
    failDelete = true
    fireEvent.click(await screen.findByRole("button", { name: "Undo" }))
    expect((await screen.findByRole("alert")).textContent).toContain("Couldn't remove the activity")
    expect(ownCount()).toBe("2")
    expect(screen.getAllByRole("button", { name: /Delete activity on/ })).toHaveLength(2)
  })

  it("retains successful response updates even if the following detail refresh fails", async () => {
    failRefresh = true
    await openDetails()
    fireEvent.click(screen.getByRole("button", { name: "Log activity" }))
    await screen.findByText("Activity logged.")
    await screen.findByText(/Couldn't refresh the latest details/)
    expect(ownCount()).toBe("2")
    expect(within(callerRow()).getByText("2/2")).toBeTruthy()
    expect(screen.getByText("Pothos · Stage 3 · Slightly wilted")).toBeTruthy()
    expect(calls("POST")).toHaveLength(1)
  })

  it("prevents rapid duplicate submissions", async () => {
    let resolve!: (response: Response) => void
    const normal = fetchMock.getMockImplementation()!
    fetchMock.mockImplementation((url: string, init: RequestInit) => init.method === "POST"
      ? new Promise<Response>((done) => { resolve = done }) : normal(url, init))
    await openDetails()
    const button = screen.getByRole("button", { name: "Log activity" })
    fireEvent.click(button)
    fireEvent.click(button)
    await waitFor(() => expect(calls("POST")).toHaveLength(1))
    logs.push({ id: "new-log", occurred_on: ownToday })
    resolve(json({ ...responseStats(), log: { id: "new-log", occurred_on: ownToday, shared_habit_id: "shared-a", user_id: "caller" } }, 201))
    await screen.findByText("Activity logged.")
  })

  it("dismisses Undo after five seconds while keeping current-period deletion available", async () => {
    await openDetails()
    fireEvent.click(screen.getByRole("button", { name: "Log activity" }))
    await screen.findByRole("button", { name: "Undo" })
    // Restart the toast timer with fake timers by using another successful log.
    vi.useFakeTimers()
    fireEvent.click(screen.getByRole("button", { name: "Dismiss notification" }))
    fireEvent.click(screen.getByRole("button", { name: "Log activity" }))
    await act(async () => { await vi.advanceTimersByTimeAsync(100) })
    expect(screen.getByRole("button", { name: "Undo" })).toBeTruthy()
    await act(async () => { await vi.advanceTimersByTimeAsync(5000) })
    expect(screen.queryByRole("button", { name: "Undo" })).toBeNull()
    expect(screen.getAllByRole("button", { name: /Delete activity on/ }).length).toBeGreaterThan(0)
  })
})
