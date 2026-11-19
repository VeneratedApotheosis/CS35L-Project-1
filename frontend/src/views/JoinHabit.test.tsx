// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { QueryProvider } from "@/lib/QueryProvider"
import JoinHabit from "./JoinHabit"
import { JoinRoute } from "@/app/join/JoinRoute"

const mocks = vi.hoisted(() => {
  vi.stubEnv("NEXT_PUBLIC_API_URL", "http://api.test")
  return {
    user: { id: "second-user" } as { id: string } | null,
    loading: false, signInWithGoogle: vi.fn(), signOut: vi.fn(), getSession: vi.fn(),
    code: "aabbccdd00112233445566778899aabb",
  }
})
vi.mock("@/auth/useAuth", () => ({ useAuth: () => mocks }))
vi.mock("@/lib/supabase", () => ({ supabase: { auth: { getSession: mocks.getSession } } }))
vi.mock("@/lib/useProfile", () => ({ useProfile: () => ({ data: { today: "2026-11-19" }, isPending: false }) }))
vi.mock("next/navigation", () => ({
  usePathname: () => "/join",
  useSearchParams: () => new URLSearchParams({ code: mocks.code }),
}))

const CODE = "aabbccdd00112233445566778899aabb"
const UNAVAILABLE = "This invite isn't available. Ask your friend for a new link."
const preview = {
  name: "Read together", description: null, plant_type: "pothos",
  target_count: 3, interval_count: 1, interval_unit: "week", num_periods: 4,
  start_date: "2026-11-25", join_by: "2026-11-24", owner_display_name: "Ella",
  member_count: 1, max_members: 5, places_left: 4,
}
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status })
const failure = (status: number, code: string) => json({ error: { code, message: "Backend detail" } }, status)
const fetchMock = vi.fn()
const setup = (code = CODE) => render(<QueryProvider><JoinHabit code={code} /></QueryProvider>)
const posts = () => fetchMock.mock.calls.filter(([, init]) => init.method === "POST")

beforeEach(() => {
  mocks.user = { id: "second-user" }
  mocks.loading = false
  mocks.code = CODE
  mocks.getSession.mockImplementation(async () => ({ data: { session: mocks.user ? { access_token: mocks.user.id + "-token" } : null } }))
  mocks.signInWithGoogle.mockResolvedValue(undefined)
  mocks.signOut.mockResolvedValue(undefined)
  fetchMock.mockImplementation(async (_url: string, init: RequestInit) => init.method === "POST"
    ? json({ id: "shared-habit" }) : json(preview))
  vi.stubGlobal("fetch", fetchMock)
})
afterEach(() => { cleanup(); vi.unstubAllGlobals(); vi.clearAllMocks() })

describe("join shared habit (#275)", () => {
  it("does not request protected preview data before sign-in and keeps the code through sign-in", async () => {
    mocks.user = null
    const view = setup()
    expect(fetchMock).not.toHaveBeenCalled()
    expect(screen.queryByText("Read together")).toBeNull()
    fireEvent.click(screen.getByRole("button", { name: "Sign in with Google" }))
    await waitFor(() => expect(mocks.signInWithGoogle).toHaveBeenCalledWith(CODE))
    expect((screen.getByRole("button", { name: "Connecting to Google…" }) as HTMLButtonElement).disabled).toBe(true)
    mocks.user = { id: "second-user" }
    view.rerender(<QueryProvider><JoinHabit code={CODE} /></QueryProvider>)
    await screen.findByRole("heading", { name: "Read together" })
    expect(fetchMock.mock.calls[0][0]).toBe(`http://api.test/shared-habits/join/${CODE}`)
    expect(posts()).toHaveLength(0) // Signing in alone never consents to joining.
  })

  it("shows a sign-in error and allows another attempt", async () => {
    mocks.user = null
    mocks.signInWithGoogle.mockRejectedValueOnce(new Error("Offline"))
    setup()
    fireEvent.click(screen.getByRole("button", { name: "Sign in with Google" }))
    expect((await screen.findByRole("alert")).textContent).toContain("Google sign-in didn't start")
    fireEvent.click(screen.getByRole("button", { name: "Sign in with Google" }))
    await waitFor(() => expect(mocks.signInWithGoogle).toHaveBeenCalledTimes(2))
  })

  it("waits for auth restoration before fetching", () => {
    mocks.loading = true
    setup()
    expect(screen.getByRole("status").textContent).toBe("Checking sign-in…")
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it.each(["", "wrong", "../../private", "a".repeat(33)])("shows the same unavailable message for malformed code %j without requesting it", (code) => {
    setup(code)
    expect(screen.getByRole("alert").textContent).toBe(UNAVAILABLE)
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it("loads preview information for the signed-in second account without joining", async () => {
    setup()
    await screen.findByRole("heading", { name: "Read together" })
    expect(screen.getByText("Read together 3 times every week for 4 weeks.")).toBeTruthy()
    expect(screen.getByText("Nov 25, 2026")).toBeTruthy()
    expect(screen.getByText("Ella")).toBeTruthy()
    expect(screen.getByText("4")).toBeTruthy()
    expect(screen.getByText("Other members will see your display name when you join.")).toBeTruthy()
    expect(fetchMock.mock.calls[0][1].headers.Authorization).toBe("Bearer second-user-token")
    expect(posts()).toHaveLength(0)
  })

  it("normalizes uppercase codes", async () => {
    setup(CODE.toUpperCase())
    await screen.findByRole("button", { name: "Join" })
    expect(fetchMock.mock.calls[0][0]).toContain(CODE)
  })

  it("shows loading before the preview arrives", async () => {
    let resolve!: (response: Response) => void
    fetchMock.mockImplementationOnce(() => new Promise<Response>((done) => { resolve = done }))
    setup()
    expect(screen.getByRole("status").textContent).toBe("Loading invite…")
    await waitFor(() => expect(fetchMock).toHaveBeenCalled())
    resolve(json(preview))
    await screen.findByRole("button", { name: "Join" })
  })

  it.each(["unknown", "closed", "expired"])("uses the same message for an %s invite", async () => {
    fetchMock.mockImplementation(() => Promise.resolve(failure(404, "not_found")))
    setup()
    expect((await screen.findByRole("alert")).textContent).toBe(UNAVAILABLE)
    expect(screen.queryByRole("button", { name: "Join" })).toBeNull()
    expect(screen.queryByRole("button", { name: "Try again" })).toBeNull()
  })

  it("shows full separately and disables joining when no places are left", async () => {
    fetchMock.mockResolvedValueOnce(json({ ...preview, places_left: 0 }))
    setup()
    await screen.findByText("This shared habit is full. There are no places left.")
    expect((screen.getByRole("button", { name: "Join" }) as HTMLButtonElement).disabled).toBe(true)
    expect(posts()).toHaveLength(0)
  })

  it("joins as a second account only on confirmation and shows success", async () => {
    setup()
    fireEvent.click(await screen.findByRole("button", { name: "Join" }))
    expect((await screen.findByRole("status")).textContent).toBe("You are now a member of Read together.")
    expect(posts()).toHaveLength(1)
    expect(posts()[0][0]).toBe(`http://api.test/shared-habits/join/${CODE}`)
    expect(posts()[0][1].headers.Authorization).toBe("Bearer second-user-token")
    expect(JSON.parse(posts()[0][1].body)).toEqual({})
    expect(screen.queryByRole("button", { name: "Join" })).toBeNull()
  })

  it.each([
    [409, "shared_habit_full", "This shared habit is full"],
    [400, "shared_habit_join_ended", "Joining has ended"],
    [404, "not_found", UNAVAILABLE],
  ] as const)("handles a %i join failure after the preview was loaded", async (status, code, message) => {
    fetchMock.mockImplementation(async (_url: string, init: RequestInit) => init.method === "POST" ? failure(status, code) : json(preview))
    setup()
    fireEvent.click(await screen.findByRole("button", { name: "Join" }))
    expect((await screen.findByRole("alert")).textContent).toContain(message)
    expect(screen.queryByText("You're in!")).toBeNull()
    expect((screen.getByRole("button", { name: "Join" }) as HTMLButtonElement).disabled).toBe(true)
  })

  it("recovers from a failed preview request", async () => {
    fetchMock.mockRejectedValueOnce(new TypeError("offline"))
    setup()
    expect((await screen.findByRole("alert")).textContent).toContain("Couldn't connect")
    fireEvent.click(screen.getByRole("button", { name: "Try again" }))
    await screen.findByRole("heading", { name: "Read together" })
  })

  it("offers a retry after a failed join without claiming success", async () => {
    let failed = true
    fetchMock.mockImplementation(async (_url: string, init: RequestInit) => {
      if (init.method === "POST") {
        if (failed) throw new TypeError("offline")
        return json({ id: "shared-habit" })
      }
      return json(preview)
    })
    setup()
    fireEvent.click(await screen.findByRole("button", { name: "Join" }))
    expect((await screen.findByRole("alert")).textContent).toContain("Couldn't connect")
    failed = false
    fireEvent.click(screen.getByRole("button", { name: "Try again" }))
    await waitFor(() => expect((screen.getByRole("button", { name: "Join" }) as HTMLButtonElement).disabled).toBe(false))
    fireEvent.click(screen.getByRole("button", { name: "Join" }))
    await screen.findByText("You're in!")
    expect(posts()).toHaveLength(2)
  })

  it("does not send duplicate requests during joining", async () => {
    let resolve!: (response: Response) => void
    fetchMock.mockImplementation((_url: string, init: RequestInit) => init.method === "POST"
      ? new Promise<Response>((done) => { resolve = done }) : Promise.resolve(json(preview)))
    setup()
    const button = await screen.findByRole("button", { name: "Join" })
    fireEvent.click(button)
    fireEvent.click(button)
    await waitFor(() => expect(posts()).toHaveLength(1))
    expect((screen.getByRole("button", { name: "Joining…" }) as HTMLButtonElement).disabled).toBe(true)
    resolve(json({ id: "shared-habit" }))
    await screen.findByText("You're in!")
  })

  it("does not reuse another account's preview or success", async () => {
    const view = setup()
    fireEvent.click(await screen.findByRole("button", { name: "Join" }))
    await screen.findByText("You're in!")
    mocks.user = { id: "third-user" }
    fetchMock.mockResolvedValueOnce(failure(404, "not_found"))
    view.rerender(<QueryProvider><JoinHabit code={CODE} /></QueryProvider>)
    expect(screen.queryByText("You're in!")).toBeNull()
    expect((await screen.findByRole("alert")).textContent).toBe(UNAVAILABLE)
    expect(screen.queryByRole("heading", { name: "Read together" })).toBeNull()
  })

  it("clears prior success when a new invite is selected on the same route", async () => {
    const view = render(<QueryProvider><JoinRoute /></QueryProvider>)
    fireEvent.click(await screen.findByRole("button", { name: "Join" }))
    await screen.findByText("You're in!")
    mocks.code = "f".repeat(32)
    fetchMock.mockResolvedValueOnce(failure(404, "not_found"))
    view.rerender(<QueryProvider><JoinRoute /></QueryProvider>)
    expect(screen.queryByText("You're in!")).toBeNull()
    expect((await screen.findByRole("alert")).textContent).toBe(UNAVAILABLE)
  })

  it.each(["preview", "join"])("handles an expired session during %s", async (stage) => {
    fetchMock.mockImplementation(async (_url: string, init: RequestInit) => stage === "preview" || init.method === "POST"
      ? failure(401, "unauthorized") : json(preview))
    setup()
    if (stage === "join") fireEvent.click(await screen.findByRole("button", { name: "Join" }))
    expect((await screen.findByRole("alert")).textContent).toContain("Your session has expired")
    fireEvent.click(screen.getByRole("button", { name: "Sign in again" }))
    expect(mocks.signOut).toHaveBeenCalledTimes(1)
  })

  it("explains rate limiting without exposing backend details", async () => {
    fetchMock.mockResolvedValueOnce(failure(429, "rate_limit_exceeded"))
    setup()
    expect((await screen.findByRole("alert")).textContent).toContain("Too many attempts")
  })
})
