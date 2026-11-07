// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { QueryProvider } from "@/lib/QueryProvider"
import HabitDetails from "./HabitDetails"

const auth = vi.hoisted(() => {
  vi.stubEnv("NEXT_PUBLIC_API_URL", "http://api.test")
  return {
    user: { id: "user-a" },
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
const missing = () => json({ error: { code: "not_found", message: "Habit not found" } }, 404)

beforeEach(() => {
  auth.user = { id: "user-a" }
  auth.getSession.mockImplementation(async () => ({ data: { session: { access_token: `token-${auth.user.id}` } } }))
  vi.stubGlobal("fetch", fetchMock)
})
afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
  vi.resetAllMocks()
})

describe("habit detail placeholder", () => {
  it("loads the selected habit from the authenticated API and shows its name", async () => {
    let resolve!: (response: Response) => void
    fetchMock.mockImplementation(() => new Promise<Response>((done) => { resolve = done }))
    render(<QueryProvider><HabitDetails id="my-habit" /></QueryProvider>)
    expect(screen.getByRole("status").textContent).toBe("Loading habit…")
    await vi.waitFor(() => expect(fetchMock).toHaveBeenCalled())
    resolve(json({ id: "my-habit", name: "Read a little" }))
    await screen.findByRole("heading", { name: "Read a little" })
    expect(fetchMock.mock.calls[0][0]).toBe("http://api.test/habits/my-habit")
    expect(fetchMock.mock.calls[0][1].headers.Authorization).toBe("Bearer token-user-a")
    expect(screen.getByRole("link", { name: "Back to Garden" }).getAttribute("href")).toBe("/")
  })

  it("never carries the previous habit's name into an inaccessible habit page", async () => {
    fetchMock.mockResolvedValueOnce(json({ id: "mine", name: "My private habit" }))
    const view = render(<QueryProvider><HabitDetails id="mine" /></QueryProvider>)
    await screen.findByRole("heading", { name: "My private habit" })
    fetchMock.mockResolvedValueOnce(missing())
    view.rerender(<QueryProvider><HabitDetails id="someone-elses" /></QueryProvider>)
    expect(screen.queryByText("My private habit")).toBeNull()
    await screen.findByRole("heading", { name: "Habit not found" })
    expect(screen.queryByText("My private habit")).toBeNull()
    expect(screen.queryByRole("button", { name: "Try again" })).toBeNull()
  })

  it("clears detail data when accounts change, including for the same habit id", async () => {
    fetchMock.mockResolvedValueOnce(json({ id: "mine", name: "Account A habit" }))
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
    fetchMock.mockResolvedValueOnce(json({ id: "mine", name: "Read" }))
    fireEvent.click(screen.getByRole("button", { name: "Try again" }))
    await screen.findByRole("heading", { name: "Read" })
    expect(screen.queryByRole("alert")).toBeNull()
  })
})
