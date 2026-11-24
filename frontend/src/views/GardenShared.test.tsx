// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { QueryProvider } from "@/lib/QueryProvider"
import { sharedHabitKeys } from "@/lib/sharedHabits"
import Garden from "./Garden"
import CreateHabit from "./CreateHabit"
import JoinHabit from "./JoinHabit"
import SharedHabitDetails from "./SharedHabitDetails"

const auth = vi.hoisted(() => {
  vi.stubEnv("NEXT_PUBLIC_API_URL", "http://api.test")
  return { user: { id: "caller" } as { id: string } | null, loading: false,
    signOut: vi.fn(), signInWithGoogle: vi.fn(), getSession: vi.fn(), replace: vi.fn() }
})
vi.mock("@/auth/useAuth", () => ({ useAuth: () => auth }))
vi.mock("@/lib/supabase", () => ({ supabase: { auth: { getSession: auth.getSession } } }))
vi.mock("next/navigation", () => ({ useRouter: () => ({ replace: auth.replace, push: vi.fn() }), usePathname: () => "/" }))
vi.mock("@/pottedPlant/plants/plantTypes", () => {
  const plant = { id: "pothos", label: "Pothos", blurb: "A leafy plant",
    Preview: ({ stage }: { stage: number }) => <svg data-testid="plant-art" data-stage={stage} /> }
  return { DEFAULT_PLANT_TYPE: "pothos", PLANT_TYPES: [plant], plantTypeById: () => plant }
})
const ownStats = { state: "active", stage: 1, health: "healthy", overall_progress: 0.25,
  current_period: { number: 1, total: 4, start: "2026-11-18", end: "2026-11-25", count: 1, target: 3 } }
const personal = { id: "personal", owner_id: "caller", name: "Personal reading", description: null,
  plant_type: "pothos", start_date: "2026-11-18", created_at: "2026-11-18T00:00:00Z",
  target_count: 3, interval_count: 1, interval_unit: "week", num_periods: 4, stats: ownStats }
const shared = (id = "shared-a", patch: Record<string, unknown> = {}) => ({
  ...personal, id, name: `Together ${id}`, owner_id: "someone-else", join_code: "a".repeat(32),
  join_by: "2026-11-18", max_members: 5, member_count: 3, own_today: "2026-11-20", own_stats: ownStats,
  stats: { ...ownStats, today: "2026-11-19", stage: 4, health: "wilted", health_rate: 0.2,
    current_period: { ...ownStats.current_period, count: 2.5 }, end_date: "2026-12-16" }, ...patch,
})
const page = (habits: unknown[], total = habits.length, offset = 0, limit = 50) => ({ habits, total, offset, limit })
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status })
const fetchMock = vi.fn()
let personalRows: unknown[]
let sharedPage: ReturnType<typeof page>
let sharedFailed: number
let personalFailed: boolean
let sharedResponse: (() => Promise<Response>) | null
let client: QueryClient
const setup = () => render(<QueryProvider><Garden /></QueryProvider>)
beforeEach(() => {
  auth.user = { id: "caller" }
  personalRows = [personal]
  sharedPage = page([shared()])
  sharedFailed = 0
  personalFailed = false
  sharedResponse = null
  client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  auth.getSession.mockImplementation(async () => ({ data: { session: auth.user ? { access_token: `${auth.user.id}-token` } : null } }))
  fetchMock.mockImplementation(async (url: string, init: RequestInit) => {
    if (url.endsWith("/me")) return json({ id: auth.user?.id, timezone: "UTC" })
    if (url.includes("/shared-habits?")) {
      if (sharedResponse) return sharedResponse()
      if (sharedFailed) return json({ error: { code: "error", message: "Unavailable" } }, sharedFailed)
      return json(sharedPage)
    }
    if (init.method === "POST" && url.endsWith("/shared-habits")) {
      sharedPage = page([shared()])
      return json(shared(), 201)
    }
    if (url.endsWith("/shared-habits/join/" + "a".repeat(32))) {
      if (init.method === "POST") { sharedPage = page([shared()]); return json({ id: "shared-a" }) }
      return json({ ...shared(), owner_display_name: "Sam", places_left: 2 })
    }
    if (personalFailed) throw new TypeError("Offline")
    return json(page(personalRows))
  })
  vi.stubGlobal("fetch", fetchMock)
})
afterEach(() => { cleanup(); client.clear(); vi.unstubAllGlobals(); vi.clearAllMocks() })

describe("shared Garden cards (#279)", () => {
  it("shows group stage/health and member count, but uses the caller's integer period count", async () => {
    setup()
    const card = await screen.findByRole("article", { name: "Together shared-a" })
    expect(within(card).getByText("Shared · 3 members")).toBeTruthy()
    expect(within(card).getByText("Pothos · Stage 4 · Wilted")).toBeTruthy()
    expect(within(card).getByTestId("plant-art").getAttribute("data-stage")).toBe("4")
    expect(within(card).getByRole("progressbar", { name: "Together shared-a: your current period" }).getAttribute("aria-valuenow")).toBe("1")
    expect(within(card).getByText("1/3")).toBeTruthy()
    expect(within(card).queryByText("2.5/3")).toBeNull()
    expect(within(card).getByRole("link", { name: "Together shared-a" }).getAttribute("href")).toBe("/shared-habit?id=shared-a")
    expect(within(card).getByRole("link", { name: "Open shared habit Together shared-a" }).getAttribute("href")).toBe("/shared-habit?id=shared-a")
    expect(within(card).queryByRole("button", { name: /Log|Delete/ })).toBeNull()
    expect(fetchMock.mock.calls.find(([url]) => url.includes("/shared-habits?"))?.[1].headers.Authorization).toBe("Bearer caller-token")
    expect(fetchMock.mock.calls.some(([url]) => /\/shared-habits\/shared-a$/.test(url))).toBe(false)
  })

  it("keeps personal shelves before shared cards and orders shared cards oldest first with a stable id tie-break", async () => {
    sharedPage = page([
      shared("new", { created_at: "2026-11-20" }),
      shared("b", { created_at: "2026-11-18" }), shared("a", { created_at: "2026-11-18" }),
    ])
    setup()
    await screen.findByRole("article", { name: "Together new" })
    const cards = screen.getAllByRole("article")
    expect(cards.map((card) => within(card).getByRole("heading").textContent)).toEqual(["Together a", "Together b", "Together new"])
    const personalSection = screen.getByRole("region", { name: "Your habits" })
    const sharedSection = screen.getByRole("region", { name: "Shared habits" })
    expect(personalSection.compareDocumentPosition(sharedSection) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
  })

  it("shows shared-only accounts without falsely saying No habits yet", async () => {
    personalRows = []
    setup()
    await screen.findByRole("article", { name: "Together shared-a" })
    expect(screen.queryByRole("heading", { name: "No habits yet" })).toBeNull()
  })

  it("preserves the friendly empty state when both lists are empty", async () => {
    personalRows = []
    sharedPage = page([])
    setup()
    await screen.findByRole("heading", { name: "No habits yet" })
    expect(screen.getByRole("link", { name: "Create your first habit" }).getAttribute("href")).toBe("/create")
  })

  it("keeps personal habits visible while shared habits load, without claiming the whole garden is empty", async () => {
    let resolve!: (response: Response) => void
    sharedResponse = () => new Promise<Response>((done) => { resolve = done })
    setup()
    await screen.findByRole("button", { name: /^Personal reading,/ })
    expect(screen.getByText("Loading shared habits…")).toBeTruthy()
    expect(screen.queryByRole("heading", { name: "No habits yet" })).toBeNull()
    resolve(json(sharedPage))
    await screen.findByRole("article", { name: "Together shared-a" })
  })

  it("retries shared-list failures independently of personal habits", async () => {
    sharedFailed = 500
    setup()
    await screen.findByRole("heading", { name: "Couldn't load shared habits" })
    expect(screen.getByRole("button", { name: /^Personal reading,/ })).toBeTruthy()
    sharedFailed = 0
    fireEvent.click(screen.getByRole("button", { name: "Try shared habits again" }))
    await screen.findByRole("article", { name: "Together shared-a" })
  })

  it("keeps shared habits visible when the personal list fails", async () => {
    personalFailed = true
    setup()
    await screen.findByRole("article", { name: "Together shared-a" })
    expect(screen.getByRole("heading", { name: "Couldn't load your habits" })).toBeTruthy()
  })

  it("pages shared habits using the backend offset and limit without losing prior cards", async () => {
    sharedPage = page([shared("old")], 2, 0, 1)
    setup()
    await screen.findByRole("article", { name: "Together old" })
    sharedPage = page([shared("new", { created_at: "2026-11-20" })], 2, 1, 1)
    fireEvent.click(screen.getByRole("button", { name: "Load more shared habits" }))
    await screen.findByRole("article", { name: "Together new" })
    expect(screen.getAllByRole("article")).toHaveLength(2)
    expect(fetchMock.mock.calls.some(([url]) => url.endsWith("/shared-habits?limit=50&offset=1"))).toBe(true)
    expect(screen.queryByRole("button", { name: "Load more shared habits" })).toBeNull()
  })

  it("can continue after an empty page caused by a lost membership", async () => {
    personalRows = []
    sharedPage = page([], 2, 0, 1)
    setup()
    const more = await screen.findByRole("button", { name: "Load more shared habits" })
    expect(screen.queryByRole("heading", { name: "No habits yet" })).toBeNull()
    sharedPage = page([shared()], 2, 1, 1)
    fireEvent.click(more)
    await screen.findByRole("article", { name: "Together shared-a" })
  })

  it("retains existing cards after a failed next page and permits retry", async () => {
    sharedPage = page([shared()], 2, 0, 1)
    setup()
    await screen.findByRole("article", { name: "Together shared-a" })
    sharedFailed = 500
    fireEvent.click(screen.getByRole("button", { name: "Load more shared habits" }))
    await screen.findByRole("heading", { name: "Couldn't load shared habits" })
    expect(screen.getByRole("article", { name: "Together shared-a" })).toBeTruthy()
  })

  it("removes prior-account cards on account change and makes no requests when signed out", async () => {
    const view = setup()
    await screen.findByRole("article", { name: "Together shared-a" })
    auth.user = { id: "outsider" }
    sharedPage = page([])
    personalRows = []
    view.rerender(<QueryProvider><Garden /></QueryProvider>)
    expect(screen.queryByRole("article", { name: "Together shared-a" })).toBeNull()
    await screen.findByRole("heading", { name: "No habits yet" })
    fetchMock.mockClear()
    auth.user = null
    view.rerender(<QueryProvider><Garden /></QueryProvider>)
    await waitFor(() => expect(fetchMock).not.toHaveBeenCalled())
  })

  it("hides cached shared cards if a refreshed request loses authorization", async () => {
    render(<QueryClientProvider client={client}><Garden /></QueryClientProvider>)
    await screen.findByRole("article", { name: "Together shared-a" })
    sharedFailed = 401
    await act(() => client.invalidateQueries({ queryKey: sharedHabitKeys.all("caller") }))
    await screen.findByRole("heading", { name: "Sign in to see shared habits" })
    expect(screen.queryByRole("article", { name: "Together shared-a" })).toBeNull()
    fireEvent.click(screen.getByRole("button", { name: "Sign in again" }))
    expect(auth.signOut).toHaveBeenCalledTimes(1)
  })

  it.each(["not_started", "expired"])("uses the caller's %s period bar without using the group average", async (state) => {
    sharedPage = page([shared("shared-a", { member_count: 1, own_stats: { ...ownStats, state }, stats: { ...shared().stats, state } })])
    setup()
    const card = await screen.findByRole("article", { name: "Together shared-a" })
    expect(within(card).getByText("Shared · 1 member")).toBeTruthy()
    expect(within(card).getByRole("progressbar").getAttribute("aria-valuenow")).toBe("1")
    expect(within(card).getByText(state === "not_started" ? "Your first period" : "Your final period")).toBeTruthy()
    expect(within(card).getByText(state === "not_started" ? "Starts Nov 18, 2026" : "Finished")).toBeTruthy()
  })

  it.each(["create", "join"])("refreshes an already-visited Garden after shared %s", async (action) => {
    sharedPage = page([])
    const wrap = (child: React.ReactNode) => <QueryClientProvider client={client}>{child}</QueryClientProvider>
    const view = render(wrap(<Garden />))
    await screen.findByText(/No shared habits yet/)
    if (action === "create") {
      view.rerender(wrap(<CreateHabit />))
      fireEvent.click(screen.getByRole("radio", { name: "With friends" }))
      fireEvent.change(screen.getByLabelText("Name"), { target: { value: "Read together" } })
      fireEvent.change(screen.getByLabelText("Number of periods"), { target: { value: "4" } })
      await waitFor(() => expect((screen.getByLabelText("Start date") as HTMLInputElement).value).not.toBe(""))
      fireEvent.click(screen.getByRole("button", { name: "Review habit" }))
      fireEvent.click(screen.getByRole("button", { name: "Create habit" }))
      await screen.findByRole("heading", { name: "Your shared habit is ready" })
    } else {
      view.rerender(wrap(<JoinHabit code={"a".repeat(32)} />))
      fireEvent.click(await screen.findByRole("button", { name: "Join" }))
      await screen.findByText("You're in!")
    }
    expect(client.getQueryState(sharedHabitKeys.list("caller"))?.isInvalidated).toBe(true)
    view.rerender(wrap(<Garden />))
    await screen.findByRole("article", { name: "Together shared-a" })
  })

  it("refreshes the Garden's own period bar after activity is saved on the shared page", async () => {
    let count = 1
    const normal = fetchMock.getMockImplementation()!
    fetchMock.mockImplementation((url: string, init: RequestInit) => {
      const summary = () => shared("shared-a", { own_stats: { ...ownStats, current_period: { ...ownStats.current_period, count } } })
      if (url.endsWith("/shared-habits/shared-a/logs") && init.method === "POST") {
        count = 2
        sharedPage = page([summary()])
        const current = summary()
        return Promise.resolve(json({ stats: current.stats, own_today: current.own_today,
          own_stats: { ...current.own_stats, streak: 1 }, log: { id: "new", shared_habit_id: "shared-a", user_id: "caller", occurred_on: "2026-11-20" } }, 201))
      }
      if (url.endsWith("/shared-habits/shared-a")) {
        const current = summary()
        return Promise.resolve(json({ ...current, own_stats: { ...current.own_stats, end_date: "2026-12-16",
          consistency: { completed: 0, successful: 0, rate: null }, streak: count === 2 ? 1 : 0,
          periods: [], log_days: [], current_period_logs: [] },
          members: [{ user_id: "caller", display_name: "Ella", is_owner: false, overall_progress: 0.25,
            current_period_count: count, streak: 0, health: "healthy" }] }))
      }
      return normal(url, init)
    })
    const wrap = (child: React.ReactNode) => <QueryClientProvider client={client}>{child}</QueryClientProvider>
    const view = render(wrap(<Garden />))
    await screen.findByRole("article", { name: "Together shared-a" })
    view.rerender(wrap(<SharedHabitDetails id="shared-a" />))
    fireEvent.click(await screen.findByRole("button", { name: "Log today" }))
    await screen.findByText("Activity logged for today.")
    expect(client.getQueryState(sharedHabitKeys.list("caller"))?.isInvalidated).toBe(true)
    view.rerender(wrap(<Garden />))
    await waitFor(() => expect(screen.getByRole("progressbar", { name: "Together shared-a: your current period" }).getAttribute("aria-valuenow")).toBe("2"))
  })
})
