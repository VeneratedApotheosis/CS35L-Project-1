// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { QueryProvider } from "@/lib/QueryProvider"
import type { HabitWithStats } from "@/lib/habits"
import Garden from "./Garden"
import CreateHabit from "./CreateHabit"
import DashboardPage from "@/app/(signed-in)/dashboard/page"

const auth = vi.hoisted(() => {
  vi.stubEnv("NEXT_PUBLIC_API_URL", "http://api.test")
  return ({
  user: { id: "user-a", email: "a@example.test" } as { id: string; email: string } | null,
  signOut: vi.fn(),
  replace: vi.fn(),
  getSession: vi.fn(),
  })
})
vi.mock("@/auth/useAuth", () => ({ useAuth: () => auth }))
vi.mock("next/navigation", () => ({ useRouter: () => ({ replace: auth.replace, push: vi.fn() }) }))
vi.mock("@/lib/supabase", () => ({
  supabase: { auth: { getSession: auth.getSession } },
}))
// The form's graphics are unrelated to fetching and saving habits.
vi.mock("@/plants/plantTypes", () => {
  const plant = { id: "pothos", label: "Pothos", blurb: "", Preview: ({ seed, stage }: { seed: number; stage: number }) => <svg data-testid="plant-preview" data-seed={seed} data-stage={stage} /> }
  return { DEFAULT_PLANT_TYPE: "pothos", PLANT_TYPES: [plant], plantTypeById: () => plant }
})

const fetchMock = vi.fn()
const habit = (patch: Partial<HabitWithStats> = {}): HabitWithStats => ({
  id: "habit-1", owner_id: "user-a", name: "Read", description: null,
  plant_type: "pothos", target_count: 3, interval_count: 1,
  interval_unit: "week", num_periods: 4, start_date: "2000-01-01",
  created_at: "2026-11-06T12:00:00Z",
  stats: { state: "active", stage: 3, health: "slightly_wilted", overall_progress: 0.6,
    current_period: { number: 1, total: 4, start: "2026-11-06", end: "2026-11-13", count: 4, target: 3 } },
  ...patch,
})
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), {
  status, headers: { "Content-Type": "application/json" },
})
const page = (habits: HabitWithStats[], total = habits.length, offset = 0) => ({ habits, total, limit: 50, offset })

function respondWithHabits(response: () => Response | Promise<Response>) {
  fetchMock.mockImplementation((url: string) => url.endsWith("/me")
    ? Promise.resolve(json({ id: auth.user?.id, timezone: "America/Los_Angeles" }))
    : Promise.resolve(response()))
}

beforeEach(() => {
  auth.user = { id: "user-a", email: "a@example.test" }
  auth.getSession.mockImplementation(async () => ({
    data: { session: auth.user ? { access_token: `token-${auth.user.id}` } : null },
  }))
  vi.stubGlobal("fetch", fetchMock)
})
afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
  vi.useRealTimers()
  vi.restoreAllMocks()
  vi.clearAllMocks()
})

describe("Garden", () => {
  it("shows loading until the response arrives, then the empty state with a create link", async () => {
    let resolve!: (response: Response) => void
    const response = new Promise<Response>((done) => { resolve = done })
    respondWithHabits(() => response)
    render(<QueryProvider><Garden /></QueryProvider>)
    expect(screen.getByRole("status").textContent).toContain("Loading your habits")
    expect(screen.queryByText("No habits yet")).toBeNull()
    resolve(json(page([])))
    await screen.findByText("No habits yet")
    expect(screen.getByRole("link", { name: "Create your first habit" }).getAttribute("href")).toBe("/create")
  })

  it("shows names and goals, labelling only future habits in the profile timezone", async () => {
    // At this instant UTC has reached Nov 7, but Los Angeles is still Nov 6.
    vi.useFakeTimers({ toFake: ["Date"] })
    vi.setSystemTime(new Date("2026-11-07T02:00:00Z"))
    respondWithHabits(() => json(page([
      habit({ start_date: "2026-11-06" }),
      habit({ stats: { ...habit().stats, state: "not_started" }, id: "future", name: "Walk", start_date: "2026-11-07", target_count: 1, interval_count: 2, num_periods: null }),
    ])))
    render(<QueryProvider><Garden /></QueryProvider>)
    await screen.findByRole("heading", { name: "Read" })
    expect(screen.getAllByText("Slightly wilted")).toHaveLength(2)
    expect(screen.getAllByTestId("plant-preview")[0].getAttribute("data-stage")).toBe("3")
    expect(screen.getAllByTestId("plant-preview")[0].getAttribute("data-seed")).not.toBe(screen.getAllByTestId("plant-preview")[1].getAttribute("data-seed"))
    expect(screen.queryByRole("button", { name: "Log activity" })).toBeNull()
    expect(screen.getByRole("link", { name: "Read" }).getAttribute("href")).toBe("/habits/habit-1")
    expect(screen.getByRole("progressbar", { name: "Read: Current period" }).getAttribute("aria-valuenow")).toBe("3")
    expect(screen.getAllByText(/Not started yet/)).toHaveLength(1)
    expect(fetchMock.mock.calls.find(([url]) => url.includes("/habits"))?.[1].headers.Authorization).toBe("Bearer token-user-a")
  })

  it("shows an error and retries the request successfully", async () => {
    let failed = true
    respondWithHabits(() => failed
      ? Promise.reject(new TypeError("offline"))
      : json(page([habit()])))
    render(<QueryProvider><Garden /></QueryProvider>)
    expect((await screen.findByRole("alert")).textContent).toContain("Couldn't load your habits")
    expect(screen.queryByText("No habits yet")).toBeNull()
    failed = false
    fireEvent.click(screen.getByRole("button", { name: "Try again" }))
    await screen.findByRole("heading", { name: "Read" })
    expect(screen.queryByRole("alert")).toBeNull()
  })

  it("keeps existing habits visible when loading the next page fails", async () => {
    respondWithHabits(() => json(page([habit()], 2)))
    const view = render(<QueryProvider><Garden /></QueryProvider>)
    await screen.findByRole("heading", { name: "Read" })
    respondWithHabits(() => Promise.reject(new TypeError("offline")))
    fireEvent.click(screen.getByRole("button", { name: "Load more habits" }))
    await screen.findByRole("alert")
    expect(screen.getByRole("heading", { name: "Read" })).toBeTruthy()
    view.unmount()
  })

  it("loads more habits from the next offset", async () => {
    respondWithHabits(() => json(page([habit()], 2)))
    render(<QueryProvider><Garden /></QueryProvider>)
    await screen.findByRole("heading", { name: "Read" })
    respondWithHabits(() => json(page([habit({ id: "older", name: "Walk" })], 2, 1)))
    fireEvent.click(screen.getByRole("button", { name: "Load more habits" }))
    await screen.findByRole("heading", { name: "Walk" })
    expect(screen.getByRole("heading", { name: "Read" })).toBeTruthy()
    expect(fetchMock.mock.calls.some(([url]) => url.endsWith("offset=1"))).toBe(true)
    expect(screen.queryByRole("button", { name: "Load more habits" })).toBeNull()
  })

  it("discards the old account's habits on account change and does not fetch signed out", async () => {
    respondWithHabits(() => json(page([habit()])))
    const view = render(<QueryProvider><Garden /></QueryProvider>)
    await screen.findByRole("heading", { name: "Read" })
    auth.user = { id: "user-b", email: "b@example.test" }
    respondWithHabits(() => json(page([])))
    view.rerender(<QueryProvider><Garden /></QueryProvider>)
    expect(screen.queryByRole("heading", { name: "Read" })).toBeNull()
    await screen.findByText("No habits yet")
    fetchMock.mockClear()
    auth.user = null
    view.rerender(<QueryProvider><Garden /></QueryProvider>)
    await waitFor(() => expect(fetchMock).not.toHaveBeenCalled())
  })

  it("redirects to the dashboard after saving and refreshes its cached habits", async () => {
    let saved = false
    fetchMock.mockImplementation(async (url: string, init: RequestInit) => {
      if (url.endsWith("/me")) return json({ id: auth.user?.id, timezone: "UTC" })
      if (init.method === "POST") { saved = true; return json(habit({ name: "Practice" }), 201) }
      if (url.endsWith("/dashboard")) return json({
        active_count: saved ? 1 : 0, overall_consistency: null, best_streak: null,
        habits: saved ? [{ id: "habit-1", name: "Practice", state: "active", streak: 0 }] : [],
      })
      return json(page(saved ? [habit({ name: "Practice" })] : []))
    })
    const view = render(<QueryProvider><DashboardPage /></QueryProvider>)
    await screen.findByText("No active habits yet")
    view.rerender(<QueryProvider><CreateHabit /></QueryProvider>)
    fireEvent.change(screen.getByLabelText("Name"), { target: { value: "Practice" } })
    fireEvent.change(screen.getByLabelText("Number of periods"), { target: { value: "4" } })
    fireEvent.click(screen.getByRole("button", { name: "Review habit" }))
    fireEvent.click(screen.getByRole("button", { name: "Create habit" }))
    await waitFor(() => expect(auth.replace).toHaveBeenCalledWith("/dashboard"))
    view.rerender(<QueryProvider><DashboardPage /></QueryProvider>)
    expect(screen.getByRole("heading", { name: "Dashboard" })).toBeTruthy()
    await screen.findByRole("link", { name: "Practice" })
  })

  it("stays on the creation form and shows an error when saving fails", async () => {
    fetchMock.mockResolvedValue(jsonResponseError())
    render(<QueryProvider><CreateHabit /></QueryProvider>)
    fireEvent.change(screen.getByLabelText("Name"), { target: { value: "Practice" } })
    fireEvent.change(screen.getByLabelText("Number of periods"), { target: { value: "4" } })
    fireEvent.click(screen.getByRole("button", { name: "Review habit" }))
    fireEvent.click(screen.getByRole("button", { name: "Create habit" }))
    expect((await screen.findByRole("alert")).textContent).toContain("Could not create habit")
    expect(auth.replace).not.toHaveBeenCalled()
    expect((screen.getByLabelText("Name") as HTMLInputElement).value).toBe("Practice")
  })
})

function jsonResponseError() {
  return json({ error: { code: "internal_error", message: "Could not create habit" } }, 500)
}
