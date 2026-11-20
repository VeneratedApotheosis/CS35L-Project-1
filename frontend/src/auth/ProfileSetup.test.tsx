// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { profileKeys } from "@/lib/profile"
import { ProfileSetup } from "./ProfileSetup"

const auth = vi.hoisted(() => {
  vi.stubEnv("NEXT_PUBLIC_API_URL", "http://api.test")
  return { user: { id: "user-a" }, signOut: vi.fn(), getSession: vi.fn() }
})
vi.mock("./useAuth", () => ({ useAuth: () => auth }))
vi.mock("@/lib/supabase", () => ({ supabase: { auth: { getSession: auth.getSession } } }))

const fetchMock = vi.fn()
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status })
const serverError = () => json({ error: { code: "internal_error", message: "Could not load profile" } }, 500)
const profile = () => json({ id: "user-a", display_name: "Ella", avatar_url: null, timezone: "UTC" })
let client: QueryClient
const setup = () => render(<QueryClientProvider client={client}><ProfileSetup><p>Signed-in content</p></ProfileSetup></QueryClientProvider>)

beforeEach(() => {
  client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  auth.getSession.mockResolvedValue({ data: { session: { access_token: "token-a" } } })
  auth.signOut.mockResolvedValue(undefined)
  fetchMock.mockImplementation(async () => serverError())
  vi.stubGlobal("fetch", fetchMock)
})
afterEach(() => { cleanup(); client.clear(); vi.unstubAllGlobals(); vi.clearAllMocks() })

describe("profile sign-in recovery (#187)", () => {
  it.each(["network", "server"])("offers retry and sign-in again after a %s failure", async (failure) => {
    if (failure === "network") fetchMock.mockRejectedValue(new TypeError("offline"))
    setup()
    await screen.findByRole("heading", { name: "Couldn't load your profile" })
    expect(screen.getByRole("button", { name: "Try again" })).toBeTruthy()
    expect(screen.queryByText("Signed-in content")).toBeNull()
    fireEvent.click(screen.getByRole("button", { name: "Sign in again" }))
    expect(auth.signOut).toHaveBeenCalledTimes(1)
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it("keeps retry's pending state and shows content once retry succeeds", async () => {
    let resolve!: (response: Response) => void
    fetchMock.mockImplementationOnce(async () => serverError())
      .mockImplementationOnce(() => new Promise<Response>((done) => { resolve = done }))
    setup()
    fireEvent.click(await screen.findByRole("button", { name: "Try again" }))
    const pending = await screen.findByRole("button", { name: "Trying again…" })
    expect((pending as HTMLButtonElement).disabled).toBe(true)
    expect(screen.getByRole("button", { name: "Sign in again" })).toBeTruthy()
    expect(screen.queryByText("Signed-in content")).toBeNull()
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2))
    resolve(profile())
    await screen.findByText("Signed-in content")
    expect(screen.queryByRole("alert")).toBeNull()
    expect(auth.signOut).not.toHaveBeenCalled()
  })

  it("still allows sign-in again after another retry fails", async () => {
    setup()
    fireEvent.click(await screen.findByRole("button", { name: "Try again" }))
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2))
    await screen.findByRole("button", { name: "Try again" })
    fireEvent.click(screen.getByRole("button", { name: "Sign in again" }))
    expect(auth.signOut).toHaveBeenCalledTimes(1)
  })

  it("preserves the existing 401 message and sign-in-only action", async () => {
    fetchMock.mockImplementation(async () => json({ error: { code: "unauthorized", message: "Expired session" } }, 401))
    setup()
    await screen.findByRole("heading", { name: "Sign in to continue" })
    expect(screen.getByText("Your session has expired. Sign in again to continue.")).toBeTruthy()
    expect(screen.queryByRole("button", { name: "Try again" })).toBeNull()
    fireEvent.click(screen.getByRole("button", { name: "Sign in again" }))
    expect(auth.signOut).toHaveBeenCalledTimes(1)
  })

  it("keeps already-loaded content visible when a background refresh fails", async () => {
    fetchMock.mockImplementationOnce(async () => profile())
    setup()
    await screen.findByText("Signed-in content")
    await act(() => client.invalidateQueries({ queryKey: profileKeys.user("user-a") }))
    await waitFor(() => expect(client.getQueryState(profileKeys.user("user-a"))?.status).toBe("error"))
    expect(screen.getByText("Signed-in content")).toBeTruthy()
    expect(screen.queryByRole("button", { name: "Sign in again" })).toBeNull()
    expect(auth.signOut).not.toHaveBeenCalled()
  })
})
