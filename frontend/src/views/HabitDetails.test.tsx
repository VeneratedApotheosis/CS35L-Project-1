// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react"
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

vi.mock("next/navigation", () => ({ useRouter: () => ({ replace: vi.fn() }) }))
vi.mock("@/lib/useProfile", () => ({ useProfile: () => ({ data: { today: auth.today } }) }))

HTMLDialogElement.prototype.showModal = function showModal() { this.setAttribute("open", "") }
HTMLDialogElement.prototype.close = function close() { this.removeAttribute("open") }

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
  it("offers to delete the habit", async () => {
    fetchMock.mockResolvedValue(habitJson())
    render(<QueryProvider><HabitDetails id="mine" /></QueryProvider>)
    await screen.findByRole("heading", { name: "Read" })
    expect(screen.getByRole("button", { name: "Delete habit" })).toBeTruthy()
  })

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
    expect(screen.getByText("Peace lily · Lv. 2")).toBeTruthy()
    expect(screen.getByText("Healthy")).toBeTruthy()
    expect(document.querySelector(".habit-plant-card svg.lucide")).toBeNull()
    expect(screen.getByText("A chapter each evening.")).toBeTruthy()
    expect(screen.getByRole("progressbar", { name: "Overall progress" }).getAttribute("aria-valuenow")).toBe("50")
    expect(screen.getAllByText("4/3").length).toBeGreaterThan(0)
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

describe("the cards at the top", () => {
  const logResult = { log: { id: "log-1", habit_id: "mine", occurred_on: "2026-11-10" }, stats: baseHabit.stats }
  const page = () => render(<QueryProvider><HabitDetails id="mine" /></QueryProvider>)

  it("names the period, shows the streak and how far the goal is", async () => {
    fetchMock.mockResolvedValue(habitJson())
    page()
    await screen.findByRole("heading", { name: "Read" })
    expect(screen.getByRole("heading", { name: "This week" })).toBeTruthy()
    expect(screen.getByText("Goal reached. Nice work!")).toBeTruthy()
    expect(screen.getByText("Nov 14 – Nov 20")).toBeTruthy()
    expect(screen.getAllByText("50%")).toHaveLength(2) // the ring, and the consistency
    expect(screen.getByText("1 week")).toBeTruthy()
    expect(screen.queryByRole("heading", { name: "Progress" })).toBeNull()
  })

  it("shows the period in Overall, not under the progress bar", async () => {
    auth.today = "2026-11-16"
    fetchMock.mockResolvedValue(habitJson())
    page()
    await screen.findByRole("heading", { name: "Read" })
    expect(screen.queryByText(/^Period 2 of 2 ·/)).toBeNull()
    expect(screen.getByText("2 of 2")).toBeTruthy()
    expect(screen.getByText("5 days")).toBeTruthy()
    expect(screen.getByText("Nov 14 – Nov 20")).toBeTruthy()
    expect(screen.getByText("Habit ends Nov 20")).toBeTruthy()
  })

  it("lists the days with activity, newest first, under Overall", async () => {
    fetchMock.mockResolvedValue(habitJson({ stats: { ...baseHabit.stats,
      log_days: [{ date: "2026-11-08", count: 1 }, { date: "2026-11-10", count: 2 }] } }))
    page()
    await screen.findByRole("heading", { name: "Read" })
    const items = screen.getAllByRole("listitem").filter((item) => item.closest(".habit-log"))
    expect(items.map((item) => item.textContent)).toEqual(["Today2 activities", "Nov 8, 20261 activity"])
  })

  it("takes one activity off a day from the log", async () => {
    fetchMock.mockImplementation(async (url: string, init?: { method?: string }) =>
      init?.method === "DELETE" ? json({ stats: baseHabit.stats }) : habitJson({ stats: { ...baseHabit.stats,
        current_period: { ...baseHabit.stats.current_period, start: "2026-11-07", end: "2026-11-14" },
        log_days: [{ date: "2026-11-10", count: 2 }],
        current_period_logs: [{ id: "a", occurred_on: "2026-11-10" }, { id: "b", occurred_on: "2026-11-10" }] } }))
    page()
    await screen.findByRole("heading", { name: "Read" })
    fireEvent.click(screen.getByRole("button", { name: "Remove one activity on Nov 10, 2026" }))
    await screen.findByText("Activity removed.")
    expect(fetchMock.mock.calls.some((call) => call[1]?.method === "DELETE" && String(call[0]).endsWith("/logs/b"))).toBe(true)
  })

  it("logs today with one press, and Undo removes it again", async () => {
    fetchMock.mockImplementation(async (url: string, init?: { method?: string }) =>
      init?.method === "POST" ? json(logResult, 201) : init?.method === "DELETE" ? json({ stats: baseHabit.stats }) : habitJson())
    page()
    await screen.findByRole("heading", { name: "Read" })
    fireEvent.click(screen.getByRole("button", { name: "Log today" }))
    await screen.findByText("Activity logged for today.")
    const post = fetchMock.mock.calls.find((call) => call[1]?.method === "POST")!
    expect(post[0]).toBe("http://api.test/habits/mine/logs")
    expect(JSON.parse(post[1].body)).toEqual({ occurred_on: "2026-11-10" })
    fireEvent.click(screen.getByRole("button", { name: "Undo" }))
    await screen.findByText("Activity removed.")
    expect(fetchMock.mock.calls.some((call) => call[1]?.method === "DELETE" && String(call[0]).endsWith("/logs/log-1"))).toBe(true)
  })

  it("says so when a log fails", async () => {
    fetchMock.mockImplementation(async (url: string, init?: { method?: string }) =>
      init?.method === "POST" ? Promise.reject(new TypeError("offline")) : habitJson())
    page()
    await screen.findByRole("heading", { name: "Read" })
    fireEvent.click(screen.getByRole("button", { name: "Log today" }))
    await screen.findByText(/Couldn't log activity/)
  })

  it("logs another day from the Log date dialog", async () => {
    fetchMock.mockImplementation(async (url: string, init?: { method?: string }) =>
      init?.method === "POST" ? json(logResult, 201) : habitJson({ stats: { ...baseHabit.stats,
        current_period: { ...baseHabit.stats.current_period, start: "2026-11-07", end: "2026-11-14" } } }))
    page()
    await screen.findByRole("heading", { name: "Read" })
    fireEvent.click(screen.getByRole("button", { name: "Log date" }))
    fireEvent.change(await screen.findByLabelText("Day"), { target: { value: "2026-11-09" } })
    fireEvent.click(within(document.querySelector("dialog[open]") as HTMLElement).getByRole("button", { name: "Log activity" }))
    await screen.findByText(/Activity logged for/)
    const post = fetchMock.mock.calls.find((call) => call[1]?.method === "POST")!
    expect(JSON.parse(post[1].body)).toEqual({ occurred_on: "2026-11-09" })
  })

  it("locks both log buttons for a finished habit and says why", async () => {
    fetchMock.mockResolvedValue(habitJson({ stats: { ...baseHabit.stats, state: "expired" } }))
    page()
    await screen.findByRole("heading", { name: "Read" })
    expect((screen.getByRole("button", { name: "Log today" }) as HTMLButtonElement).disabled).toBe(true)
    expect((screen.getByRole("button", { name: "Log date" }) as HTMLButtonElement).disabled).toBe(true)
    expect(screen.getByText("This habit has finished, so its activity is locked.")).toBeTruthy()
  })

  it("lets a habit that has not started log today toward its first period", async () => {
    auth.today = "2026-11-06"
    fetchMock.mockResolvedValue(habitJson({ stats: { ...baseHabit.stats, state: "not_started" } }))
    page()
    await screen.findByRole("heading", { name: "Read" })
    expect((screen.getByRole("button", { name: "Log today" }) as HTMLButtonElement).disabled).toBe(false)
    expect(screen.queryByText(/has finished/)).toBeNull()
  })

  it("keeps showing the saved cards when a refresh fails", async () => {
    fetchMock.mockResolvedValueOnce(habitJson())
    const view = page()
    await screen.findByRole("heading", { name: "Read" })
    fetchMock.mockRejectedValue(new TypeError("offline"))
    await view.rerender(<QueryProvider><HabitDetails id="mine" /></QueryProvider>)
    expect(screen.getByRole("heading", { name: "This week" })).toBeTruthy()
    expect(screen.getByRole("heading", { name: "Activity" })).toBeTruthy()
    expect(screen.getByRole("heading", { name: "Overall" })).toBeTruthy()
  })

  it("has all four cards and the log in the page, and no old cards", async () => {
    fetchMock.mockResolvedValue(habitJson())
    page()
    await screen.findByRole("heading", { name: "Read" })
    for (const name of ["This week", "Activity", "Overall", "Activity log"]) {
      expect(screen.getByRole("heading", { name })).toBeTruthy()
    }
    for (const name of ["Progress", "Activity history", "Period history", "Habit details"]) {
      expect(screen.queryByRole("heading", { name })).toBeNull()
    }
  })

  it("asks before deleting", async () => {
    fetchMock.mockResolvedValue(habitJson())
    page()
    await screen.findByRole("heading", { name: "Read" })
    fireEvent.click(screen.getByRole("button", { name: "Delete habit" }))
    await waitFor(() => expect(document.querySelector("dialog[open]")).toBeTruthy())
    expect(screen.getByText("Delete this habit?")).toBeTruthy()
  })
})
