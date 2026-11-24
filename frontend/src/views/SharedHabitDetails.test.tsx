// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import type { SharedHabitDetail } from "@/lib/sharedHabits"
import SharedHabitDetails from "./SharedHabitDetails"
import { SharedHabitRoute } from "@/app/(signed-in)/shared-habit/SharedHabitRoute"

const mocks = vi.hoisted(() => {
  vi.stubEnv("NEXT_PUBLIC_API_URL", "http://api.test")
  return { user: { id: "member-a" } as { id: string } | null, signOut: vi.fn(), getSession: vi.fn(), id: "shared-a" }
})
vi.mock("@/auth/useAuth", () => ({ useAuth: () => mocks }))
vi.mock("@/lib/supabase", () => ({ supabase: { auth: { getSession: mocks.getSession } } }))
vi.mock("next/navigation", () => ({ useRouter: () => ({ replace: vi.fn() }), useSearchParams: () => new URLSearchParams(mocks.id ? { id: mocks.id } : {}) }))
vi.mock("@/pottedPlant/plants/plantTypes", () => {
  const plant = { id: "pothos", label: "Pothos", Preview: ({ stage, wilt }: { stage: number; wilt: number }) => <svg data-testid="plant-art" data-stage={stage} data-wilt={wilt} /> }
  return { plantTypeById: () => plant }
})

const period = { number: 2, total: 4, start: "2026-11-15", end: "2026-11-22", count: 1.5, target: 3 }
function fixture(): SharedHabitDetail {
  return {
    id: "shared-a", owner_id: "member-a", name: "Read together", description: "A chapter with friends.", own_today: "2026-11-19",
    plant_type: "pothos", target_count: 3, interval_count: 1, interval_unit: "week", num_periods: 4,
    start_date: "2026-11-08", created_at: "2026-11-01T00:00:00Z", join_by: "2026-11-08", max_members: 5,
    join_code: "a".repeat(32),
    stats: { today: "2026-11-19", state: "active", overall_progress: 0.375, stage: 2,
      health: "slightly_wilted", health_rate: 0.7, end_date: "2026-12-06", current_period: { ...period } },
    own_stats: { state: "active", overall_progress: 0.5, stage: 3, health: "healthy", streak: 1,
      current_period: { ...period, count: 2 }, consistency: { successful: 1, completed: 1, rate: 1 },
      end_date: "2026-12-06", periods: [], log_days: [], current_period_logs: [] },
    members: [
      { user_id: "member-a", display_name: "Ella", avatar_url: null, is_owner: true,
        overall_progress: 0.5, current_period_count: 2, streak: 1, health: "healthy" },
      { user_id: "member-b", display_name: "Sam", avatar_url: null, is_owner: false,
        overall_progress: 0.25, current_period_count: 1, streak: 0, health: "wilted" },
    ],
  }
}
const fetchMock = vi.fn()
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status })
let client: QueryClient
const wrapper = (child: React.ReactNode) => <QueryClientProvider client={client}>{child}</QueryClientProvider>
const setup = (id = "shared-a") => render(wrapper(<SharedHabitDetails id={id} />))
beforeEach(() => {
  client = new QueryClient({ defaultOptions: { queries: { retry: false, refetchOnWindowFocus: false } } })
  mocks.user = { id: "member-a" }
  mocks.id = "shared-a"
  mocks.getSession.mockImplementation(async () => ({ data: { session: mocks.user ? { access_token: mocks.user.id + "-token" } : null } }))
  fetchMock.mockImplementation(async () => json(fixture()))
  vi.stubGlobal("fetch", fetchMock)
})
afterEach(() => { cleanup(); client.clear(); vi.unstubAllGlobals(); vi.clearAllMocks() })

describe("shared habit details (#276, #337)", () => {
  it("requests authenticated detail data and shows the group's bar beside the member's own figures", async () => {
    setup()
    await screen.findByRole("heading", { name: "Read together" })
    expect(fetchMock.mock.calls[0][0]).toBe("http://api.test/shared-habits/shared-a")
    expect(fetchMock.mock.calls[0][1].headers.Authorization).toBe("Bearer member-a-token")
    expect(screen.getByRole("link", { name: "Back to Garden" }).getAttribute("href")).toBe("/")
    expect(screen.getByText("A chapter with friends.")).toBeTruthy()
    // Plant card: the group's stage and health.
    const plant = document.querySelector(".habit-plant-card")!
    expect(plant.textContent).toContain("Pothos · Lv. 2")
    expect(plant.textContent).toContain("Slightly wilted")
    // "This week": the group's average as the bar, the member's own figures beside it.
    const week = screen.getByRole("region", { name: "This week" })
    const group = within(week).getByRole("progressbar", { name: "Group average this period" })
    expect(group.getAttribute("aria-valuenow")).toBe("1.5")
    expect(within(week).getByText("1.5/3")).toBeTruthy()
    expect(within(week).getByRole("progressbar", { name: "Your progress this period" }).getAttribute("aria-valuenow")).toBe("2")
    expect(within(week).getByRole("progressbar", { name: "Your overall progress" }).getAttribute("aria-valuenow")).toBe("50")
    expect(within(week).getByText("100%")).toBeTruthy()
    expect((within(week).getByRole("button", { name: "Log today" }) as HTMLButtonElement).disabled).toBe(false)
    expect((within(week).getByRole("button", { name: "Log date" }) as HTMLButtonElement).disabled).toBe(false)
    // Overall: goal, period and days left from the member's own dates (not the group's), and the members.
    const overall = screen.getByRole("region", { name: "Overall" })
    expect(within(overall).getByText("3×")).toBeTruthy()
    expect(within(overall).getByText("2 of 4")).toBeTruthy()
    expect(within(overall).getByText("3 days")).toBeTruthy()
    expect(within(overall).getByText("Habit ends Dec 5")).toBeTruthy()
    expect(within(overall).getByText("2 of 5")).toBeTruthy()
    expect(screen.getByRole("region", { name: "Activity" })).toBeTruthy()
    expect(screen.getByRole("region", { name: "Activity log" })).toBeTruthy()
  })

  it("has no Delete button for a regular member", async () => {
    mocks.user = { id: "member-b" }
    setup()
    await screen.findByRole("heading", { name: "Read together" })
    expect(screen.queryByRole("button", { name: /Delete/ })).toBeNull()
  })

  it("shows every member's returned name, progress, count, streak and health without their log dates", async () => {
    setup()
    const table = await screen.findByRole("table", { name: "Member progress summaries" })
    const ella = within(table).getByRole("row", { name: /Ella/ })
    expect(ella.textContent).toContain("Ella (owner) (you)")
    for (const value of ["50%", "2/3", "1 period", "Healthy"]) expect(within(ella).getByText(value)).toBeTruthy()
    const sam = within(table).getByRole("row", { name: /Sam/ })
    for (const value of ["25%", "1/3", "0 periods", "Wilted"]) expect(within(sam).getByText(value)).toBeTruthy()
    expect(table.textContent).not.toContain("2026-11-15")
  })

  it("lists the same members as a list for a phone", async () => {
    setup()
    const list = await screen.findByRole("list", { name: "Member progress summaries" })
    const items = within(list).getAllByRole("listitem")
    expect(items).toHaveLength(2)
    expect(items[0].textContent).toContain("Ella (owner) (you)")
    expect(items[0].textContent).toContain("50% overall · 2/3 this period · 1 period streak")
    expect(items[1].textContent).toContain("Sam")
    expect(items[1].textContent).toContain("Wilted")
  })

  it("shows the start date, who has joined, zero progress and no logging before the start", async () => {
    const habit = fixture()
    habit.start_date = "2026-11-25"
    habit.stats = { ...habit.stats, state: "not_started", overall_progress: 0, stage: 1, health: "healthy", end_date: "2026-12-23",
      current_period: { ...period, number: 1, count: 0, start: "2026-11-25", end: "2026-12-02" } }
    habit.own_stats = { ...habit.own_stats, state: "not_started", overall_progress: 0, streak: 0,
      current_period: { ...habit.stats.current_period }, end_date: "2026-12-23", consistency: { successful: 0, completed: 0, rate: null } }
    habit.members = habit.members.map((member) => ({ ...member, overall_progress: 0, current_period_count: 0, streak: 0, health: "healthy" }))
    fetchMock.mockResolvedValueOnce(json(habit))
    setup()
    await screen.findByText("This habit starts on Nov 25, 2026. You can log from then.")
    expect(screen.getByRole("heading", { name: "Who has joined" })).toBeTruthy()
    expect(screen.getByRole("row", { name: /Ella/ })).toBeTruthy()
    expect(screen.getByRole("row", { name: /Sam/ })).toBeTruthy()
    expect(document.querySelector(".habit-plant-card")!.textContent).toContain("Pothos · Lv. 1")
    expect(screen.getByRole("progressbar", { name: "Your overall progress" }).getAttribute("aria-valuenow")).toBe("0")
    expect(screen.getByText("Available after your first completed period.")).toBeTruthy()
    expect(screen.getByText("until it starts", { exact: false })).toBeTruthy()
    expect((screen.getByRole("button", { name: "Log today" }) as HTMLButtonElement).disabled).toBe(true)
    expect((screen.getByRole("button", { name: "Log date" }) as HTMLButtonElement).disabled).toBe(true)
  })

  it("uses backend stage and health even when they differ from personal progress", async () => {
    const habit = fixture()
    habit.stats.stage = 4
    habit.stats.health = "wilted"
    fetchMock.mockResolvedValueOnce(json(habit))
    setup()
    await screen.findByRole("heading", { name: "Read together" })
    const plant = document.querySelector(".habit-plant-card")!
    expect(plant.textContent).toContain("Pothos · Lv. 4")
    expect(plant.textContent).toContain("Wilted")
    expect(screen.getByTestId("plant-art").getAttribute("data-stage")).toBe("4")
  })

  it("caps the group bar visually while retaining an over-target fractional count", async () => {
    const habit = fixture()
    habit.stats.current_period.count = 4.5
    fetchMock.mockResolvedValueOnce(json(habit))
    setup()
    const bar = await screen.findByRole("progressbar", { name: "Group average this period" })
    expect(bar.getAttribute("aria-valuenow")).toBe("3")
    expect(bar.getAttribute("aria-valuetext")).toBe("4.5 of 3 activities, goal met")
    expect(screen.getByText("4.5/3")).toBeTruthy()
  })

  it("keeps group and caller period states separate across membership timezones", async () => {
    const habit = fixture()
    habit.start_date = "2026-11-20"
    habit.stats.state = "not_started"
    fetchMock.mockResolvedValueOnce(json(habit))
    setup()
    await screen.findByRole("progressbar", { name: "Group average this period" })
    expect(screen.getByRole("progressbar", { name: "Your progress this period" })).toBeTruthy()
    expect((screen.getByRole("button", { name: "Log today" }) as HTMLButtonElement).disabled).toBe(false)
  })

  it("handles an expired habit using the member's status: done, and logging locked", async () => {
    const habit = fixture()
    habit.stats.state = "expired"
    habit.stats.today = "2026-12-08"
    habit.own_stats.state = "expired"
    fetchMock.mockResolvedValueOnce(json(habit))
    setup()
    await screen.findByText("Done")
    expect(screen.getByText("This habit has finished, so its activity is locked.")).toBeTruthy()
    expect((screen.getByRole("button", { name: "Log today" }) as HTMLButtonElement).disabled).toBe(true)
  })

  it("loads without revealing member names while a request is pending", async () => {
    let resolve!: (response: Response) => void
    fetchMock.mockImplementationOnce(() => new Promise<Response>((done) => { resolve = done }))
    setup()
    expect(screen.getByRole("status").textContent).toBe("Loading shared habit…")
    expect(screen.queryByText(/Ella/)).toBeNull()
    await waitFor(() => expect(fetchMock).toHaveBeenCalled())
    resolve(json(fixture()))
    await screen.findByRole("heading", { name: "Read together" })
  })

  it.each([400, 404])("shows a generic unavailable state for %i without private details", async (status) => {
    fetchMock.mockResolvedValueOnce(json({ error: { code: "not_found", message: "Internal information" } }, status))
    setup()
    await screen.findByRole("heading", { name: "Shared habit not found" })
    expect(screen.queryByText(/Ella/)).toBeNull()
    expect(screen.queryByRole("table")).toBeNull()
    expect(screen.queryByRole("button", { name: "Try again" })).toBeNull()
  })

  it("supports retrying a failed request", async () => {
    fetchMock.mockRejectedValueOnce(new Error("Offline"))
    setup()
    await screen.findByRole("heading", { name: "Couldn't load this shared habit" })
    fireEvent.click(screen.getByRole("button", { name: "Try again" }))
    await screen.findByRole("heading", { name: "Read together" })
  })

  it("offers sign-in again for an expired session", async () => {
    fetchMock.mockResolvedValueOnce(json({ error: { code: "unauthorized", message: "Expired" } }, 401))
    setup()
    fireEvent.click(await screen.findByRole("button", { name: "Sign in again" }))
    expect(mocks.signOut).toHaveBeenCalledTimes(1)
  })

  it("never carries private details into another account's view", async () => {
    const view = setup()
    await screen.findByRole("heading", { name: "Read together" })
    mocks.user = { id: "outsider" }
    fetchMock.mockResolvedValueOnce(json({ error: { code: "not_found" } }, 404))
    view.rerender(wrapper(<SharedHabitDetails id="shared-a" />))
    expect(screen.queryByRole("heading", { name: "Read together" })).toBeNull()
    await screen.findByRole("heading", { name: "Shared habit not found" })
    expect(fetchMock.mock.calls[1][1].headers.Authorization).toBe("Bearer outsider-token")
  })

  it("clears prior details when a different habit is selected", async () => {
    const view = setup()
    await screen.findByRole("heading", { name: "Read together" })
    fetchMock.mockResolvedValueOnce(json({ error: { code: "not_found" } }, 404))
    view.rerender(wrapper(<SharedHabitDetails id="other" />))
    expect(screen.queryByRole("heading", { name: "Read together" })).toBeNull()
    await screen.findByRole("heading", { name: "Shared habit not found" })
  })

  it("retains the last loaded values on a transient refresh error but hides them after membership loss", async () => {
    setup()
    await screen.findByRole("heading", { name: "Read together" })
    fetchMock.mockRejectedValueOnce(new Error("Offline"))
    await act(() => client.invalidateQueries({ queryKey: ["shared-habits", "member-a"] }))
    expect((await screen.findByRole("alert")).textContent).toContain("last loaded values")
    expect(screen.getByRole("heading", { name: "Read together" })).toBeTruthy()
    fetchMock.mockResolvedValueOnce(json({ error: { code: "not_found" } }, 404))
    await act(() => client.invalidateQueries({ queryKey: ["shared-habits", "member-a"] }))
    await screen.findByRole("heading", { name: "Shared habit not found" })
    expect(screen.queryByText(/Ella/)).toBeNull()
    expect(screen.queryByRole("table")).toBeNull()
  })

  it("loads again after remounting and uses a safe fallback for an unnamed member", async () => {
    const habit = fixture()
    habit.members[1].display_name = null
    fetchMock.mockImplementation(async () => json(habit))
    const view = setup()
    await screen.findByRole("row", { name: /Garden member/ })
    view.unmount()
    client.clear()
    setup()
    await screen.findByRole("row", { name: /Garden member/ })
    expect(fetchMock).toHaveBeenCalledTimes(2)
  })

  it("copies the saved invite and recovers gracefully when copying fails", async () => {
    const writeText = vi.fn().mockRejectedValueOnce(new Error("Denied")).mockResolvedValue(undefined)
    Object.defineProperty(navigator, "clipboard", { configurable: true, value: { writeText } })
    setup()
    fireEvent.click(await screen.findByRole("button", { name: "Copy invite link" }))
    await screen.findByText("Couldn't copy automatically. Open the invite link and copy its address.")
    expect(screen.getByRole("link", { name: "Open invite link" }).getAttribute("href")).toBe(`/join?code=${"a".repeat(32)}`)
    fireEvent.click(screen.getByRole("button", { name: "Copy invite link" }))
    await screen.findByText("Invite link copied.")
    expect(writeText).toHaveBeenLastCalledWith(`${window.location.origin}/join?code=${"a".repeat(32)}`)
  })

  it("shows closed joining when the invite code is null", async () => {
    fetchMock.mockResolvedValueOnce(json({ ...fixture(), join_code: null }))
    setup()
    await screen.findByText("Joining is closed.")
    expect(screen.queryByRole("button", { name: "Copy invite link" })).toBeNull()
  })

  it("handles a missing route id without requesting data", () => {
    mocks.id = ""
    render(wrapper(<SharedHabitRoute />))
    expect(screen.getByRole("heading", { name: "No shared habit was chosen" })).toBeTruthy()
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it("reads and escapes the shared id from the static-compatible route", async () => {
    mocks.id = "a b&c"
    render(wrapper(<SharedHabitRoute />))
    await screen.findByRole("heading", { name: "Read together" })
    expect(fetchMock.mock.calls[0][0]).toBe("http://api.test/shared-habits/a%20b%26c")
  })
})
