// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { QueryProvider } from "@/lib/QueryProvider"
import { ProfileSetup } from "@/auth/ProfileSetup"
import Settings from "./Settings"
import Garden from "./Garden"

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
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), {
  status, headers: { "Content-Type": "application/json" },
})
let savedTimezone: string | null
let rejectSave: boolean

beforeEach(() => {
  auth.user = { id: "user-a" }
  savedTimezone = "America/Los_Angeles"
  rejectSave = false
  auth.getSession.mockImplementation(async () => ({
    data: { session: auth.user ? { access_token: `token-${auth.user.id}` } : null },
  }))
  fetchMock.mockImplementation(async (_url: string, init: RequestInit) => {
    if (init.method === "PATCH") {
      if (rejectSave) throw new TypeError("offline")
      savedTimezone = JSON.parse(init.body as string).timezone
    }
    return json({ id: auth.user?.id, display_name: "Sam", avatar_url: null, timezone: savedTimezone })
  })
  vi.stubGlobal("fetch", fetchMock)
})
afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
  vi.useRealTimers()
  vi.restoreAllMocks()
  vi.clearAllMocks()
})
const patchCalls = () => fetchMock.mock.calls.filter(([, init]) => init.method === "PATCH")
const input = () => screen.getByRole("combobox", { name: "Timezone" }) as HTMLInputElement

describe("timezone settings", () => {
  it("initializes an empty profile from the browser once before showing signed-in content", async () => {
    savedTimezone = null
    const options = new Intl.DateTimeFormat().resolvedOptions()
    vi.spyOn(Intl.DateTimeFormat.prototype, "resolvedOptions").mockReturnValue({ ...options, timeZone: "Asia/Tokyo" })
    render(<QueryProvider><ProfileSetup><Settings /></ProfileSetup></QueryProvider>)
    expect(screen.getByRole("status").textContent).toBe("Loading your profile…")
    expect(screen.queryByRole("heading", { name: "Settings" })).toBeNull()
    await screen.findByRole("combobox", { name: "Timezone" })
    expect(input().value).toBe("Asia/Tokyo")
    expect(patchCalls()).toHaveLength(1)
    const [url, request] = patchCalls()[0]
    expect(url).toBe("http://api.test/me")
    expect(JSON.parse(request.body)).toEqual({ timezone: "Asia/Tokyo" })
    expect(request.headers.Authorization).toBe("Bearer token-user-a")
  })

  it("preserves an existing timezone on sign-in even if the browser differs", async () => {
    render(<QueryProvider><ProfileSetup><Settings /></ProfileSetup></QueryProvider>)
    await screen.findByRole("combobox", { name: "Timezone" })
    expect(input().value).toBe("America/Los_Angeles")
    expect(patchCalls()).toHaveLength(0)
  })

  it("saves an edited timezone and loads it again after a fresh mount", async () => {
    const view = render(<QueryProvider><Settings /></QueryProvider>)
    await screen.findByRole("combobox", { name: "Timezone" })
    fireEvent.change(input(), { target: { value: " Europe/London " } })
    fireEvent.click(screen.getByRole("button", { name: "Save timezone" }))
    await screen.findByText("Timezone saved.")
    expect(savedTimezone).toBe("Europe/London")
    expect(input().value).toBe("Europe/London")
    view.unmount()
    render(<QueryProvider><Settings /></QueryProvider>)
    await screen.findByRole("combobox", { name: "Timezone" })
    expect(input().value).toBe("Europe/London")
    expect(patchCalls()).toHaveLength(1)
  })

  it.each(["", "Mars/Olympus"])("rejects invalid timezone %j without saving", async (value) => {
    render(<QueryProvider><Settings /></QueryProvider>)
    await screen.findByRole("combobox", { name: "Timezone" })
    fireEvent.change(input(), { target: { value } })
    fireEvent.click(screen.getByRole("button", { name: "Save timezone" }))
    expect((await screen.findByRole("alert")).textContent).toContain("Choose a valid timezone")
    expect(patchCalls()).toHaveLength(0)
  })

  it("preserves an unsaved change on network failure and allows retry", async () => {
    render(<QueryProvider><Settings /></QueryProvider>)
    await screen.findByRole("combobox", { name: "Timezone" })
    rejectSave = true
    fireEvent.change(input(), { target: { value: "UTC" } })
    fireEvent.click(screen.getByRole("button", { name: "Save timezone" }))
    expect((await screen.findByRole("alert")).textContent).toContain("Couldn't save your timezone")
    expect(input().value).toBe("UTC")
    expect(savedTimezone).toBe("America/Los_Angeles")
    expect(screen.queryByText("Timezone saved.")).toBeNull()
    rejectSave = false
    fireEvent.click(screen.getByRole("button", { name: "Save timezone" }))
    await screen.findByText("Timezone saved.")
    expect(savedTimezone).toBe("UTC")
  })

  it("retries failed first-sign-in initialization without enabling habit actions too early", async () => {
    savedTimezone = null
    rejectSave = true
    render(<QueryProvider><ProfileSetup><Settings /></ProfileSetup></QueryProvider>)
    await screen.findByRole("heading", { name: "Couldn't load your profile" })
    expect(screen.queryByRole("heading", { name: "Settings" })).toBeNull()
    rejectSave = false
    fireEvent.click(screen.getByRole("button", { name: "Try again" }))
    await screen.findByRole("combobox", { name: "Timezone" })
    expect(savedTimezone).toBeTruthy()
  })

  it("does not send profile requests while signed out", async () => {
    auth.user = null
    render(<QueryProvider><ProfileSetup><Settings /></ProfileSetup></QueryProvider>)
    await waitFor(() => expect(fetchMock).not.toHaveBeenCalled())
  })

  it("updates the Garden's future-start label after a timezone change", async () => {
    vi.useFakeTimers({ toFake: ["Date"] })
    vi.setSystemTime(new Date("2026-11-07T02:00:00Z"))
    const handleProfile = fetchMock.getMockImplementation()!
    fetchMock.mockImplementation((url: string, init: RequestInit) => url.includes("/habits")
      ? Promise.resolve(json({ habits: [{ id: "habit-a", name: "Read", target_count: 3,
        interval_count: 1, interval_unit: "week", num_periods: 4, start_date: "2026-11-07" }], total: 1, limit: 50, offset: 0 }))
      : handleProfile(url, init))
    const view = render(<QueryProvider><Garden /></QueryProvider>)
    await screen.findByText(/Not started yet/)
    view.rerender(<QueryProvider><Settings /></QueryProvider>)
    await screen.findByRole("combobox", { name: "Timezone" })
    fireEvent.change(input(), { target: { value: "UTC" } })
    fireEvent.click(screen.getByRole("button", { name: "Save timezone" }))
    await screen.findByText("Timezone saved.")
    view.rerender(<QueryProvider><Garden /></QueryProvider>)
    await screen.findByRole("heading", { name: "Read" })
    expect(screen.queryByText(/Not started yet/)).toBeNull()
  })
})
