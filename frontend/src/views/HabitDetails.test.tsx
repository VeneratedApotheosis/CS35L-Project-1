// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { QueryProvider } from "@/lib/QueryProvider"
import HabitDetails from "./HabitDetails"

const auth = vi.hoisted(() => {
  vi.stubEnv("NEXT_PUBLIC_API_URL", "http://api.test")
  return {
    today: "2026-11-10",
    user: { id: "user-a" },
    signOut: vi.fn(),
    getSession: vi.fn(),
  }
})
vi.mock("@/auth/useAuth", () => ({ useAuth: () => auth }))
vi.mock("@/lib/supabase", () => ({ supabase: { auth: { getSession: auth.getSession } } }))

vi.mock("@/lib/useProfile", () => ({ useProfile: () => ({ data: { today: auth.today } }) }))

const baseHabit = {
  id: "mine", owner_id: "user-a", name: "Read", description: "A chapter each evening.",
  plant_type: "peace_lily", target_count: 3, interval_count: 1, interval_unit: "week",
  stats: { state: "active", stage: 2, health: "healthy", overall_progress: 0.5, streak: 1,
    end_date: "2026-11-21", periods: [], log_days: [], current_period_logs: [],
    consistency: { successful: 1, completed: 2, rate: 0.5 },
    current_period: { number: 2, total: 2, start: "2026-11-14", end: "2026-11-21", count: 4, target: 3 } },
  num_periods: 2, start_date: "2026-11-07", created_at: "2026-11-07T00:00:00Z",
}
const habitJson = (overrides: Record<string, unknown> = {}) => json({ ...baseHabit, ...overrides })
const fetchMock = vi.fn()
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), {
  status, headers: { "Content-Type": "application/json" },
})
const missing = () => json({ error: { code: "not_found", message: "Habit not found" } }, 404)

beforeEach(() => {
  auth.today = "2026-11-10"
  auth.user = { id: "user-a" }
  auth.getSession.mockImplementation(async () => ({ data: { session: { access_token: `token-${auth.user.id}` } } }))
  vi.stubGlobal("fetch", fetchMock)
})
afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
  vi.resetAllMocks()
})

describe("habit details", () => {
  it("loads the selected habit from the authenticated API and shows its name", async () => {
    let resolve!: (response: Response) => void
    fetchMock.mockImplementation(() => new Promise<Response>((done) => { resolve = done }))
    render(<QueryProvider><HabitDetails id="my-habit" /></QueryProvider>)
    expect(screen.getByRole("status").textContent).toBe("Loading habit…")
    await vi.waitFor(() => expect(fetchMock).toHaveBeenCalled())
    resolve(habitJson({ id: "my-habit", name: "Read a little" }))
    await screen.findByRole("heading", { name: "Read a little" })
    expect(fetchMock.mock.calls[0][0]).toBe("http://api.test/habits/my-habit")
    expect(fetchMock.mock.calls[0][1].headers.Authorization).toBe("Bearer token-user-a")
    expect(screen.getByText("Peace lily · Stage 2 · Healthy")).toBeTruthy()
    expect(screen.getByText("A chapter each evening.")).toBeTruthy()
    expect(screen.getByRole("progressbar", { name: "Overall progress" }).getAttribute("aria-valuenow")).toBe("50")
    expect(screen.getByText("4/3")).toBeTruthy()
    expect(screen.getByRole("link", { name: "Back to Garden" }).getAttribute("href")).toBe("/")
  })

  it("never carries the previous habit's name into an inaccessible habit page", async () => {
    fetchMock.mockResolvedValueOnce(habitJson({ id: "mine", name: "My private habit" }))
    const view = render(<QueryProvider><HabitDetails id="mine" /></QueryProvider>)
    await screen.findByRole("heading", { name: "My private habit" })
    fetchMock.mockResolvedValueOnce(missing())
    view.rerender(<QueryProvider><HabitDetails id="someone-elses" /></QueryProvider>)
    expect(screen.queryByText("My private habit")).toBeNull()
    await screen.findByRole("heading", { name: "Habit not found" })
    expect(screen.queryByText("My private habit")).toBeNull()
    expect(screen.queryByRole("button", { name: "Try again" })).toBeNull()
    expect(screen.queryByText("A chapter each evening.")).toBeNull()
    expect(screen.queryByText("Peace lily")).toBeNull()
    expect(document.querySelector("time")).toBeNull()
    expect(screen.queryByRole("progressbar")).toBeNull()
  })

  it("clears detail data when accounts change, including for the same habit id", async () => {
    fetchMock.mockResolvedValueOnce(habitJson({ id: "mine", name: "Account A habit" }))
    const view = render(<QueryProvider><HabitDetails id="mine" /></QueryProvider>)
    await screen.findByRole("heading", { name: "Account A habit" })
    auth.user = { id: "user-b" }
    fetchMock.mockResolvedValueOnce(missing())
    view.rerender(<QueryProvider><HabitDetails id="mine" /></QueryProvider>)
    expect(screen.queryByText("Account A habit")).toBeNull()
    await screen.findByRole("heading", { name: "Habit not found" })
  })

  it("handles malformed ids without revealing any habit information", async () => {
    fetchMock.mockResolvedValue(json({ error: { code: "validation_failed", message: "invalid UUID" } }, 400))
    render(<QueryProvider><HabitDetails id="invalid" /></QueryProvider>)
    await screen.findByRole("heading", { name: "Habit not found" })
    expect(screen.queryByText("invalid UUID")).toBeNull()
  })

  it("recovers from a failed request using Try again", async () => {
    fetchMock.mockRejectedValueOnce(new TypeError("offline"))
    render(<QueryProvider><HabitDetails id="mine" /></QueryProvider>)
    await screen.findByRole("heading", { name: "Couldn't load this habit" })
    fetchMock.mockResolvedValueOnce(habitJson({ id: "mine", name: "Read" }))
    fireEvent.click(screen.getByRole("button", { name: "Try again" }))
    await screen.findByRole("heading", { name: "Read" })
    expect(screen.queryByRole("alert")).toBeNull()
  })
})

describe("habit information and lifecycle", () => {
  it.each([
    ["2026-11-06", "Not started yet", "Starts in 1 day"],
    ["2026-11-07", "Active", "14 days remaining"],
    ["2026-11-20", "Active", "1 day remaining"],
    ["2026-11-21", "Finished", "0 days remaining"],
    ["2026-12-01", "Finished", "0 days remaining"],
  ])("shows the correct state on %s in the profile's calendar", async (today, status, remaining) => {
    auth.today = today
    fetchMock.mockResolvedValue(habitJson())
    render(<QueryProvider><HabitDetails id="mine" /></QueryProvider>)
    await screen.findByRole("heading", { name: "Read" })
    expect(screen.getByText(status)).toBeTruthy()
    expect(screen.getByText(remaining)).toBeTruthy()
    expect(screen.getByText("3 times every week")).toBeTruthy()
    expect(screen.getByText("A chapter each evening.")).toBeTruthy()
    expect(screen.getByText("Peace lily")).toBeTruthy()
    expect(document.querySelector('time[datetime="2026-11-07"]')).toBeTruthy()
    expect(document.querySelector('time[datetime="2026-11-21"]')).toBeTruthy()
  })

  it("clamps month-end goals and supports a missing description", async () => {
    auth.today = "2028-02-28"
    fetchMock.mockResolvedValue(habitJson({ start_date: "2028-01-31", interval_unit: "month", num_periods: 1, target_count: 1, description: null }))
    render(<QueryProvider><HabitDetails id="mine" /></QueryProvider>)
    await screen.findByText("1 time every month")
    expect(document.querySelector('time[datetime="2028-02-29"]')).toBeTruthy()
    expect(screen.getByText("1 day remaining")).toBeTruthy()
  })

  it("counts calendar days across daylight saving and updates after midnight", async () => {
    auth.today = "2026-03-08"
    fetchMock.mockResolvedValue(habitJson({ start_date: "2026-03-07", interval_unit: "day", num_periods: 2 }))
    const view = render(<QueryProvider><HabitDetails id="mine" /></QueryProvider>)
    await screen.findByText("1 day remaining")
    auth.today = "2026-03-09"
    view.rerender(<QueryProvider><HabitDetails id="mine" /></QueryProvider>)
    expect(screen.getByText("Finished")).toBeTruthy()
  })

  it("handles an ongoing habit without inventing an end date", async () => {
    fetchMock.mockResolvedValue(habitJson({ num_periods: null }))
    render(<QueryProvider><HabitDetails id="mine" /></QueryProvider>)
    await screen.findByText("No end date")
    expect(screen.getByText("Ongoing")).toBeTruthy()
  })
})
