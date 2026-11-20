// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react"
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
vi.mock("next/navigation", () => ({ useRouter: () => ({ replace: vi.fn(), push: vi.fn() }) }))

const fetchMock = vi.fn()
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), {
  status, headers: { "Content-Type": "application/json" },
})
let savedTimezone: string | null
let rejectSave: boolean

// jsdom has no modal dialogs, so open and close them by hand.
HTMLDialogElement.prototype.showModal = function showModal() { this.setAttribute("open", "") }
HTMLDialogElement.prototype.close = function close() { this.removeAttribute("open") }

beforeEach(() => {
  auth.user = { id: "user-a" }
  savedTimezone = "America/Los_Angeles"
  rejectSave = false
  auth.getSession.mockImplementation(async () => ({
    data: { session: auth.user ? { access_token: `token-${auth.user.id}` } : null },
  }))
  fetchMock.mockImplementation(async (url: string, init: RequestInit) => {
    if (url.includes("/shared-habits?")) return json({ habits: [], total: 0, limit: 50, offset: 0 })
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
        interval_count: 1, interval_unit: "week", num_periods: 4, start_date: "2026-11-07",
        plant_type: "pothos", stats: { state: savedTimezone === "UTC" ? "active" : "not_started",
          stage: 1, health: "healthy", overall_progress: 0,
          current_period: { number: 1, total: 4, start: "2026-11-07", end: "2026-11-14", count: 0, target: 3 } } }], total: 1, limit: 50, offset: 0 }))
      : handleProfile(url, init))
    const view = render(<QueryProvider><Garden /></QueryProvider>)
    const startsLater = await screen.findByRole("button", { name: /^Read,/ })
    fireEvent.pointerEnter(startsLater)
    expect(document.querySelector(".garden-card")?.textContent).toContain("Starts")
    fireEvent.pointerLeave(startsLater)
    view.rerender(<QueryProvider><Settings /></QueryProvider>)
    await screen.findByRole("combobox", { name: "Timezone" })
    fireEvent.change(input(), { target: { value: "UTC" } })
    fireEvent.click(screen.getByRole("button", { name: "Save timezone" }))
    await screen.findByText("Timezone saved.")
    view.rerender(<QueryProvider><Garden /></QueryProvider>)
    const running = await screen.findByRole("button", { name: /^Read,/ })
    fireEvent.pointerEnter(running)
    await waitFor(() => expect(document.querySelector(".garden-card")?.textContent).not.toContain("Starts"))
    expect(document.querySelector(".garden-card")?.textContent).toContain("days left")
  })
})

describe("sign out", () => {
  it("shows who is signed in and signs the user out from the Account section", async () => {
    auth.user = { id: "user-a", email: "sam@example.com" } as typeof auth.user
    auth.signOut.mockResolvedValue(undefined)
    render(<QueryProvider><Settings /></QueryProvider>)
    await screen.findByRole("combobox", { name: "Timezone" })
    expect(screen.getByText("Signed in as sam@example.com")).toBeTruthy()
    fireEvent.click(screen.getByRole("button", { name: "Sign out" }))
    await waitFor(() => expect(auth.signOut).toHaveBeenCalledTimes(1))
  })

  it("shows an error and keeps the button when signing out fails", async () => {
    auth.signOut.mockRejectedValue(new Error("offline"))
    render(<QueryProvider><Settings /></QueryProvider>)
    await screen.findByRole("combobox", { name: "Timezone" })
    fireEvent.click(screen.getByRole("button", { name: "Sign out" }))
    expect((await screen.findByRole("alert")).textContent).toContain("Couldn't sign out")
    expect((screen.getByRole("button", { name: "Sign out" }) as HTMLButtonElement).disabled).toBe(false)
  })
})

describe("delete account", () => {
  const deleteCalls = () => fetchMock.mock.calls.filter(([, init]) => init.method === "DELETE")
  const open = async () => {
    render(<QueryProvider><Settings /></QueryProvider>)
    await screen.findByRole("combobox", { name: "Timezone" })
    fireEvent.click(screen.getByRole("button", { name: "Delete account" }))
  }
  const dialog = () => screen.getByRole("dialog", { hidden: true })
  const confirmButton = () => within(dialog()).getByRole("button", { name: /Delete account|Deleting/, hidden: true }) as HTMLButtonElement
  const type = (value: string) =>
    fireEvent.change(within(dialog()).getByLabelText(/Type DELETE to confirm/, { selector: "input" }), { target: { value } })
  const answerDelete = (respond: () => Promise<Response>) => {
    const normal = fetchMock.getMockImplementation()!
    fetchMock.mockImplementation(async (url: string, init: RequestInit) => (init.method === "DELETE" ? respond() : normal(url, init)))
  }

  it("shows an Account section with the delete button and lists what is deleted", async () => {
    await open()
    expect(screen.getByRole("heading", { name: "Account" })).toBeTruthy()
    const text = dialog().textContent ?? ""
    expect(text).toContain("habits")
    expect(text).toContain("activity logs")
    expect(text).toContain("badges")
    expect(deleteCalls()).toHaveLength(0)
  })

  it("needs the confirmation typed before it deletes", async () => {
    await open()
    expect(confirmButton().disabled).toBe(true)
    type("delete me")
    expect(confirmButton().disabled).toBe(true)
    fireEvent.submit(within(dialog()).getByLabelText(/Type DELETE to confirm/, { selector: "input" }).closest("form")!)
    expect(deleteCalls()).toHaveLength(0)
    type("DELETE")
    expect(confirmButton().disabled).toBe(false)
  })

  it("deletes, then signs the user out", async () => {
    answerDelete(async () => new Response(null, { status: 204 }))
    auth.signOut.mockResolvedValue(undefined)
    await open()
    type("DELETE")
    fireEvent.click(confirmButton())
    await waitFor(() => expect(auth.signOut).toHaveBeenCalledTimes(1))
    expect(deleteCalls()).toHaveLength(1)
    const [url, request] = deleteCalls()[0]
    expect(url).toBe("http://api.test/me")
    expect(request.headers.Authorization).toBe("Bearer token-user-a")
  })

  it("still ends the session when the server refuses to revoke a deleted user's token", async () => {
    answerDelete(async () => new Response(null, { status: 204 }))
    auth.signOut.mockRejectedValue(new Error("session not found"))
    await open()
    type("DELETE")
    fireEvent.click(confirmButton())
    await waitFor(() => expect(auth.signOut).toHaveBeenCalledTimes(1))
    expect(screen.queryByText(/Couldn't delete/)).toBeNull()
  })

  it("shows an error and keeps the user signed in when deleting fails", async () => {
    answerDelete(async () => json({ error: { code: "internal_error", message: "Could not delete account" } }, 500))
    await open()
    type("DELETE")
    fireEvent.click(confirmButton())
    const alert = await within(dialog()).findByRole("alert", { hidden: true })
    expect(alert.textContent).toContain("Couldn't delete your account")
    expect(alert.textContent).toContain("still signed in")
    expect(auth.signOut).not.toHaveBeenCalled()
    expect(confirmButton().disabled).toBe(false)
  })

  it("offers to sign in again when the session has expired", async () => {
    answerDelete(async () => json({ error: { code: "unauthorized", message: "no" } }, 401))
    await open()
    type("DELETE")
    fireEvent.click(confirmButton())
    const alert = await within(dialog()).findByRole("alert", { hidden: true })
    expect(alert.textContent).toContain("Your session has expired")
    expect(confirmButton().disabled).toBe(true)
    fireEvent.click(within(alert).getByRole("button", { name: "Sign in again", hidden: true }))
    expect(auth.signOut).toHaveBeenCalledTimes(1)
  })

  it("cancels without deleting and asks again next time", async () => {
    await open()
    type("DELETE")
    fireEvent.click(within(dialog()).getByRole("button", { name: "Cancel", hidden: true }))
    expect(deleteCalls()).toHaveLength(0)
    fireEvent.click(screen.getByRole("button", { name: "Delete account" }))
    expect((within(dialog()).getByLabelText(/Type DELETE to confirm/, { selector: "input" }) as HTMLInputElement).value).toBe("")
    expect(confirmButton().disabled).toBe(true)
  })
})
