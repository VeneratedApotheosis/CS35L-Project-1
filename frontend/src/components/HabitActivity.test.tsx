// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { QueryProvider } from "@/lib/QueryProvider"
import HabitDetails from "@/views/HabitDetails"

const auth = vi.hoisted(() => {
  vi.stubEnv("NEXT_PUBLIC_API_URL", "http://api.test")
  return { user: { id: "user-a" }, today: "2026-11-11" as string | undefined, signOut: vi.fn(), getSession: vi.fn() }
})
vi.mock("@/auth/useAuth", () => ({ useAuth: () => auth }))
vi.mock("@/lib/useProfile", () => ({ useProfile: () => ({ data: { today: auth.today } }) }))
vi.mock("@/lib/supabase", () => ({ supabase: { auth: { getSession: auth.getSession } } }))

const fetchMock = vi.fn()
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), {
  status, headers: { "Content-Type": "application/json" },
})
let logs: { id: string; occurred_on: string }[]
let expired: boolean
let notStarted: boolean
let failSave: boolean
let failDelete: boolean
let holdRefresh: boolean
let gets: number

function shortStats() {
  const progress = logs.length / 6
  return {
    state: expired ? "expired" : notStarted ? "not_started" : "active",
    current_period: { number: 1, total: 2, start: notStarted ? "2026-11-20" : "2026-11-09",
      end: notStarted ? "2026-11-27" : "2026-11-16", count: logs.length, target: 3 },
    overall_progress: progress, stage: progress < 0.25 ? 1 : 2, health: "healthy",
  }
}
function detail() {
  return {
    id: "mine", owner_id: "user-a", name: "Read", description: null,
    plant_type: "peace_lily", target_count: 3, interval_count: 1, interval_unit: "week",
    num_periods: 2, start_date: notStarted ? "2026-11-20" : "2026-11-09",
    created_at: "2026-11-09T00:00:00Z",
    stats: { ...shortStats(), end_date: expired ? "2026-11-10" : notStarted ? "2026-12-04" : "2026-11-23",
      streak: logs.length >= 3 ? 1 : 0, consistency: { successful: 0, completed: 0, rate: null },
      current_period_logs: expired ? [] : [...logs],
      log_days: [{ date: "2026-11-01", count: 1 }, ...logs.map((log) => ({ date: log.occurred_on, count: 1 }))],
    },
  }
}
const methodCalls = (method: string) => fetchMock.mock.calls.filter(([, init]) => init.method === method)
const dateInput = () => screen.getByLabelText("Activity date") as HTMLInputElement
const count = () => screen.getByRole("progressbar", { name: "Current period" }).getAttribute("aria-valuenow")
async function openDetails() {
  const view = render(<QueryProvider><HabitDetails id="mine" /></QueryProvider>)
  await screen.findByRole("heading", { name: "Read" })
  return view
}

beforeEach(() => {
  auth.today = "2026-11-11"
  auth.user = { id: "user-a" }
  logs = [{ id: "existing", occurred_on: "2026-11-10" }]
  expired = false
  notStarted = false
  failSave = false
  failDelete = false
  holdRefresh = false
  gets = 0
  auth.getSession.mockResolvedValue({ data: { session: { access_token: "token-a" } } })
  fetchMock.mockImplementation(async (url: string, init: RequestInit) => {
    if (init.method === "POST") {
      if (failSave) throw new TypeError("offline")
      const log = { id: `new-${logs.length}`, occurred_on: JSON.parse(init.body as string).occurred_on }
      logs = [...logs, log]
      return json({ log: { ...log, habit_id: "mine" }, stats: shortStats() }, 201)
    }
    if (init.method === "DELETE") {
      if (failDelete) throw new TypeError("offline")
      logs = logs.filter((log) => log.id !== url.split("/").at(-1))
      return json({ stats: shortStats() })
    }
    gets++
    if (holdRefresh && gets > 1) return new Promise<Response>(() => {})
    return json(detail())
  })
  vi.stubGlobal("fetch", fetchMock)
})
afterEach(() => {
  cleanup()
  vi.useRealTimers()
  vi.unstubAllGlobals()
  vi.resetAllMocks()
})

describe("Log activity: issue #203", () => {
  it("defaults to the profile's today and uses the backend's current-period range", async () => {
    await openDetails()
    expect(dateInput().value).toBe("2026-11-11")
    expect(dateInput().min).toBe("2026-11-09")
    expect(dateInput().max).toBe("2026-11-11")
  })

  it("updates progress and plant immediately from POST even while the full refresh is pending", async () => {
    holdRefresh = true
    await openDetails()
    expect(count()).toBe("1")
    expect(screen.getByText("Peace lily · Stage 1 · Healthy")).toBeTruthy()
    fireEvent.change(dateInput(), { target: { value: "2026-11-09" } })
    fireEvent.click(screen.getByRole("button", { name: "Log activity" }))
    await screen.findByText("Activity logged.")
    expect(count()).toBe("2")
    expect(screen.getByText("Peace lily · Stage 2 · Healthy")).toBeTruthy()
    const [url, request] = methodCalls("POST")[0]
    expect(url).toBe("http://api.test/habits/mine/logs")
    expect(JSON.parse(request.body)).toEqual({ occurred_on: "2026-11-09" })
    expect(request.headers.Authorization).toBe("Bearer token-a")
  })

  it.each(["2026-11-08", "2026-11-12", ""])("rejects out-of-range or empty date %j without a request", async (date) => {
    await openDetails()
    fireEvent.change(dateInput(), { target: { value: date } })
    expect(dateInput().checkValidity()).toBe(false)
    fireEvent.click(screen.getByRole("button", { name: "Log activity" }))
    expect((await screen.findByRole("alert")).textContent).toContain("Choose a date from")
    expect(methodCalls("POST")).toHaveLength(0)
  })

  it("shows a save failure, preserves the date and count, and allows retry", async () => {
    await openDetails()
    failSave = true
    fireEvent.change(dateInput(), { target: { value: "2026-11-09" } })
    fireEvent.click(screen.getByRole("button", { name: "Log activity" }))
    expect((await screen.findByRole("alert")).textContent).toContain("Couldn't log the activity")
    expect(dateInput().value).toBe("2026-11-09")
    expect(count()).toBe("1")
    expect(screen.queryByText("Activity logged.")).toBeNull()
    failSave = false
    fireEvent.click(screen.getByRole("button", { name: "Log activity" }))
    await screen.findByText("Activity logged.")
    expect(count()).toBe("2")
  })

  it("disables logging and deletion on an expired habit", async () => {
    expired = true
    await openDetails()
    expect((screen.getByRole("button", { name: "Log activity" }) as HTMLButtonElement).disabled).toBe(true)
    expect(dateInput().disabled).toBe(true)
    expect(screen.queryByRole("button", { name: /Delete activity/ })).toBeNull()
    fireEvent.click(screen.getByRole("button", { name: "Log activity" }))
    expect(methodCalls("POST")).toHaveLength(0)
  })

  it("allows only today before the start, matching the existing endpoint rule", async () => {
    notStarted = true
    await openDetails()
    expect(dateInput().min).toBe(auth.today)
    expect(dateInput().max).toBe(auth.today)
    fireEvent.click(screen.getByRole("button", { name: "Log activity" }))
    await screen.findByText("Activity logged.")
    expect(JSON.parse(methodCalls("POST")[0][1].body)).toEqual({ occurred_on: auth.today })
  })

  it("does not submit the same activity twice on repeated clicks", async () => {
    await openDetails()
    const button = screen.getByRole("button", { name: "Log activity" })
    fireEvent.click(button)
    fireEvent.click(button)
    await screen.findByText("Activity logged.")
    expect(methodCalls("POST")).toHaveLength(1)
  })

  it("keeps a successful log visible if the follow-up GET fails", async () => {
    await openDetails()
    const normal = fetchMock.getMockImplementation()!
    fetchMock.mockImplementation((url: string, init: RequestInit) => init.method === "GET"
      ? Promise.reject(new TypeError("offline")) : normal(url, init))
    fireEvent.click(screen.getByRole("button", { name: "Log activity" }))
    await screen.findByText("Activity logged.")
    expect((await screen.findByRole("alert")).textContent).toContain("Couldn't refresh the latest details")
    expect(count()).toBe("2")
    expect(methodCalls("POST")).toHaveLength(1)
  })
})

describe("Undo and delete activity: issue #204", () => {
  it("undoes the new log through DELETE and restores progress and plant", async () => {
    await openDetails()
    fireEvent.click(screen.getByRole("button", { name: "Log activity" }))
    fireEvent.click(await screen.findByRole("button", { name: "Undo" }))
    await screen.findByText("Activity removed.")
    expect(methodCalls("DELETE")[0][0]).toBe("http://api.test/habits/mine/logs/new-1")
    expect(count()).toBe("1")
    expect(screen.getByText("Peace lily · Stage 1 · Healthy")).toBeTruthy()
    expect(logs.map((log) => log.id)).toEqual(["existing"])
  })

  it("deletes a current-period log while offering no delete action for locked history", async () => {
    await openDetails()
    const buttons = screen.getAllByRole("button", { name: /Delete activity on/ })
    expect(buttons).toHaveLength(1)
    expect(screen.queryByRole("button", { name: /Nov 1,/ })).toBeNull()
    fireEvent.click(buttons[0])
    await screen.findByText("Activity removed.")
    expect(count()).toBe("0")
    expect(methodCalls("DELETE")[0][0]).toBe("http://api.test/habits/mine/logs/existing")
    expect(screen.queryByRole("button", { name: /Delete activity on/ })).toBeNull()
  })

  it("keeps the log and progress on failed deletion and permits retry", async () => {
    await openDetails()
    failDelete = true
    fireEvent.click(screen.getByRole("button", { name: /Delete activity on/ }))
    expect((await screen.findByRole("alert")).textContent).toContain("Couldn't remove the activity")
    expect(count()).toBe("1")
    expect(screen.getByRole("button", { name: /Delete activity on/ })).toBeTruthy()
    failDelete = false
    fireEvent.click(screen.getByRole("button", { name: /Delete activity on/ }))
    await screen.findByText("Activity removed.")
    expect(count()).toBe("0")
  })

  it("shows a failed Undo without pretending the newly saved activity was removed", async () => {
    await openDetails()
    fireEvent.click(screen.getByRole("button", { name: "Log activity" }))
    failDelete = true
    fireEvent.click(await screen.findByRole("button", { name: "Undo" }))
    expect((await screen.findByRole("alert")).textContent).toContain("Couldn't remove the activity")
    expect(count()).toBe("2")
    expect(logs).toHaveLength(2)
    expect(screen.queryByText("Activity removed.")).toBeNull()
  })

  it("dismisses Undo after about five seconds while keeping the normal delete action", async () => {
    await openDetails()
    vi.useFakeTimers()
    fireEvent.click(screen.getByRole("button", { name: "Log activity" }))
    await act(async () => { await vi.advanceTimersByTimeAsync(100) })
    expect(screen.getByRole("button", { name: "Undo" })).toBeTruthy()
    await act(async () => { await vi.advanceTimersByTimeAsync(5000) })
    expect(screen.queryByRole("button", { name: "Undo" })).toBeNull()
    expect(screen.getAllByRole("button", { name: /Delete activity on/ })).toHaveLength(2)
  })
})
