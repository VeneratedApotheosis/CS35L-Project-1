// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { QueryProvider } from "@/lib/QueryProvider"
import { DeleteHabit } from "./DeleteHabit"

const mocks = vi.hoisted(() => {
  vi.stubEnv("NEXT_PUBLIC_API_URL", "http://api.test")
  return {
    auth: { user: { id: "user-a" }, signOut: vi.fn() },
    getSession: vi.fn(),
    replace: vi.fn(),
  }
})
vi.mock("@/auth/useAuth", () => ({ useAuth: () => mocks.auth }))
vi.mock("@/lib/supabase", () => ({ supabase: { auth: { getSession: mocks.getSession } } }))
vi.mock("next/navigation", () => ({ useRouter: () => ({ replace: mocks.replace }) }))

// jsdom has no modal dialogs, so open and close them by hand.
HTMLDialogElement.prototype.showModal = function showModal() { this.setAttribute("open", "") }
HTMLDialogElement.prototype.close = function close() { this.removeAttribute("open") }

const fetchMock = vi.fn()
const error = (status: number, code: string) =>
  new Response(JSON.stringify({ error: { code, message: code } }), { status, headers: { "Content-Type": "application/json" } })

beforeEach(() => {
  mocks.getSession.mockResolvedValue({ data: { session: { access_token: "token-a" } } })
  fetchMock.mockResolvedValue(new Response(null, { status: 204 }))
  vi.stubGlobal("fetch", fetchMock)
})
afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
  vi.clearAllMocks()
})

const open = () => {
  render(<QueryProvider><DeleteHabit id="h 1" name="Read" /></QueryProvider>)
  fireEvent.click(screen.getByRole("button", { name: "Delete habit" }))
}
const dialog = () => screen.getByRole("dialog", { hidden: true })
const confirm = () => within(dialog()).getByRole("button", { name: /Delete habit|Deleting/, hidden: true }) as HTMLButtonElement

describe("delete habit", () => {
  it("asks first and names the habit, and deletes nothing until confirmed", () => {
    open()
    expect(dialog().textContent).toContain("“Read”")
    expect(dialog().textContent).toContain("can't be undone")
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it("deletes the habit, then goes back to the Garden", async () => {
    open()
    fireEvent.click(confirm())
    await waitFor(() => expect(mocks.replace).toHaveBeenCalledWith("/"))
    expect(fetchMock).toHaveBeenCalledTimes(1)
    const [url, request] = fetchMock.mock.calls[0]
    expect(url).toBe("http://api.test/habits/h%201")
    expect(request.method).toBe("DELETE")
    expect(request.headers.Authorization).toBe("Bearer token-a")
  })

  it("treats a habit that is already gone as deleted", async () => {
    fetchMock.mockResolvedValue(error(404, "not_found"))
    open()
    fireEvent.click(confirm())
    await waitFor(() => expect(mocks.replace).toHaveBeenCalledWith("/"))
  })

  it("shows an error and stays on the page when deleting fails", async () => {
    fetchMock.mockResolvedValue(error(500, "internal_error"))
    open()
    fireEvent.click(confirm())
    const alert = await within(dialog()).findByRole("alert", { hidden: true })
    expect(alert.textContent).toContain("Couldn't delete this habit")
    expect(mocks.replace).not.toHaveBeenCalled()
    expect(confirm().disabled).toBe(false)
  })

  it("offers to sign in again when the session has expired", async () => {
    fetchMock.mockResolvedValue(error(401, "unauthorized"))
    open()
    fireEvent.click(confirm())
    const alert = await within(dialog()).findByRole("alert", { hidden: true })
    expect(alert.textContent).toContain("Your session has expired")
    expect(confirm().disabled).toBe(true)
    fireEvent.click(within(alert).getByRole("button", { name: "Sign in again", hidden: true }))
    expect(mocks.auth.signOut).toHaveBeenCalledTimes(1)
    expect(mocks.replace).not.toHaveBeenCalled()
  })

  it("cancels without deleting", () => {
    open()
    fireEvent.click(within(dialog()).getByRole("button", { name: "Cancel", hidden: true }))
    expect(dialog().hasAttribute("open")).toBe(false)
    expect(fetchMock).not.toHaveBeenCalled()
  })
})
