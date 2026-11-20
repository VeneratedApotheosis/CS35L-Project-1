// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { ThemeProvider } from "@/styles/ThemeProvider"
import type { Profile } from "@/lib/profile"
import { sharedHabitKeys } from "@/lib/sharedHabits"
import Settings from "../Settings"

const auth = vi.hoisted(() => {
  vi.stubEnv("NEXT_PUBLIC_API_URL", "http://api.test")
  return { user: { id: "user-a", email: "ella@example.test" }, signOut: vi.fn(), getSession: vi.fn() }
})
vi.mock("@/auth/useAuth", () => ({ useAuth: () => auth }))
vi.mock("@/lib/supabase", () => ({ supabase: { auth: { getSession: auth.getSession } } }))

const fetchMock = vi.fn()
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status })
let saved: Profile
let client: QueryClient
const wrap = () => <ThemeProvider><QueryClientProvider client={client}><Settings /></QueryClientProvider></ThemeProvider>
const input = () => screen.getByRole("textbox", { name: "Display name" }) as HTMLInputElement
const edit = (name: string) => fireEvent.change(input(), { target: { value: name } })
const save = () => fireEvent.click(screen.getByRole("button", { name: "Save display name" }))
const patches = () => fetchMock.mock.calls.filter(([, init]) => init.method === "PATCH")
const open = async () => {
  const view = render(wrap())
  await screen.findByRole("textbox", { name: "Display name" })
  return view
}

beforeEach(() => {
  localStorage.clear()
  vi.stubGlobal("matchMedia", vi.fn().mockReturnValue({ matches: false }))
  client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  auth.user = { id: "user-a", email: "ella@example.test" }
  auth.getSession.mockImplementation(async () => ({ data: { session: { access_token: `token-${auth.user.id}` } } }))
  auth.signOut.mockResolvedValue(undefined)
  saved = { id: "user-a", email: "ella@example.test", display_name: "Ella",
    avatar_url: "https://images.example.test/ella.png", timezone: "America/Los_Angeles" }
  fetchMock.mockImplementation(async (_url: string, init: RequestInit) => {
    if (init.method === "PATCH") saved = { ...saved, ...JSON.parse(init.body as string) }
    return json(saved)
  })
  vi.stubGlobal("fetch", fetchMock)
})
afterEach(() => { cleanup(); client.clear(); vi.unstubAllGlobals(); vi.clearAllMocks() })

describe("Settings display name (#259)", () => {
  it("shows the saved display name, email and Google avatar", async () => {
    await open()
    expect(input().value).toBe("Ella")
    expect(screen.getByText("Signed in as ella@example.test")).toBeTruthy()
    expect(screen.getByRole("img", { name: "Your profile photo" }).getAttribute("src")).toBe(saved.avatar_url)
    expect(patches()).toHaveLength(0)
  })

  it("shows a fallback for a missing or unavailable avatar", async () => {
    const view = await open()
    fireEvent.error(screen.getByRole("img", { name: "Your profile photo" }))
    expect(screen.getByRole("img", { name: "Default profile picture" })).toBeTruthy()
    view.unmount()
    client.clear()
    saved.avatar_url = null
    await open()
    expect(screen.getByRole("img", { name: "Default profile picture" })).toBeTruthy()
  })

  it("saves the trimmed name through PATCH /me and retains it after a fresh load", async () => {
    const view = await open()
    edit("  Ella D  ")
    save()
    await screen.findByText("Display name saved.")
    expect(saved.display_name).toBe("Ella D")
    expect(input().value).toBe("Ella D")
    const [url, request] = patches()[0]
    expect(url).toBe("http://api.test/me")
    expect(request.headers.Authorization).toBe("Bearer token-user-a")
    expect(JSON.parse(request.body)).toEqual({ display_name: "Ella D" })
    expect(saved.timezone).toBe("America/Los_Angeles")
    view.unmount()
    client.clear()
    await open()
    expect(input().value).toBe("Ella D")
  })

  it.each(["", "   ", "x".repeat(51)])("rejects invalid name %j without a request", async (name) => {
    await open()
    edit(name)
    save()
    expect((await screen.findByRole("alert")).textContent).toContain("between 1 and 50 characters")
    expect(input().getAttribute("aria-invalid")).toBe("true")
    expect(patches()).toHaveLength(0)
    expect(saved.display_name).toBe("Ella")
  })

  it.each(["E", "x".repeat(50)])("accepts the boundary-length name %j", async (name) => {
    await open()
    edit(name)
    save()
    await screen.findByText("Display name saved.")
    expect(saved.display_name).toBe(name)
  })

  it("keeps unsaved input on network failure and allows retry", async () => {
    await open()
    fetchMock.mockRejectedValueOnce(new TypeError("offline"))
    edit("Ella with friends")
    save()
    expect((await screen.findByRole("alert")).textContent).toContain("Couldn't save your display name")
    expect(input().value).toBe("Ella with friends")
    expect(saved.display_name).toBe("Ella")
    expect(screen.queryByText("Display name saved.")).toBeNull()
    save()
    await screen.findByText("Display name saved.")
    expect(saved.display_name).toBe("Ella with friends")
  })

  it("shows a backend validation error without losing the draft", async () => {
    await open()
    fetchMock.mockResolvedValueOnce(json({ error: { code: "validation_failed", message: "Rejected" } }, 400))
    edit("Ella D")
    save()
    expect((await screen.findByRole("alert")).textContent).toContain("That display name wasn't accepted")
    expect(input().value).toBe("Ella D")
    expect(saved.display_name).toBe("Ella")
  })

  it("offers sign-in again for an expired session", async () => {
    await open()
    fetchMock.mockResolvedValueOnce(json({ error: { code: "unauthorized", message: "Expired" } }, 401))
    edit("Ella D")
    save()
    expect((await screen.findByRole("alert")).textContent).toContain("Your session has expired")
    expect((screen.getByRole("button", { name: "Save display name" }) as HTMLButtonElement).disabled).toBe(true)
    fireEvent.click(screen.getByRole("button", { name: "Sign in again" }))
    expect(auth.signOut).toHaveBeenCalledTimes(1)
  })

  it("disables editing while saving and blocks duplicate submissions", async () => {
    await open()
    let resolve!: (response: Response) => void
    fetchMock.mockImplementationOnce(() => new Promise<Response>((done) => { resolve = done }))
    edit("Ella D")
    const button = screen.getByRole("button", { name: "Save display name" })
    fireEvent.click(button)
    fireEvent.click(button)
    await waitFor(() => expect(patches()).toHaveLength(1))
    expect(input().disabled).toBe(true)
    expect((screen.getByRole("button", { name: "Saving display name…" }) as HTMLButtonElement).disabled).toBe(true)
    resolve(json({ ...saved, display_name: "Ella D" }))
    await screen.findByText("Display name saved.")
  })

  it("invalidates the caller's shared habit and invite summaries after saving", async () => {
    client.setQueryData(sharedHabitKeys.detail("user-a", "shared-a"), { name: "Cached habit" })
    client.setQueryData(["shared-invite", "user-a", "code"], { owner_display_name: "Ella" })
    client.setQueryData(sharedHabitKeys.detail("someone-else", "shared-b"), { name: "Other user's cache" })
    await open()
    edit("Ella D")
    save()
    await screen.findByText("Display name saved.")
    expect(client.getQueryState(sharedHabitKeys.detail("user-a", "shared-a"))?.isInvalidated).toBe(true)
    expect(client.getQueryState(["shared-invite", "user-a", "code"])?.isInvalidated).toBe(true)
    expect(client.getQueryState(sharedHabitKeys.detail("someone-else", "shared-b"))?.isInvalidated).toBe(false)
  })

  it("clears an unsaved name when accounts change", async () => {
    const view = await open()
    edit("Private unsaved name")
    auth.user = { id: "user-b", email: "sam@example.test" }
    saved = { ...saved, id: "user-b", email: "sam@example.test", display_name: "Sam" }
    view.rerender(wrap())
    expect(screen.queryByDisplayValue("Private unsaved name")).toBeNull()
    await waitFor(() => expect(input().value).toBe("Sam"))
    expect(patches()).toHaveLength(0)
  })

  it.each(["name", "timezone"])("queues simultaneous profile edits when %s saves first", async (first) => {
    await open()
    const normal = fetchMock.getMockImplementation()!
    let release!: () => void
    let held = false
    fetchMock.mockImplementation((url: string, init: RequestInit) => {
      if (init.method === "PATCH" && !held) {
        held = true
        saved = { ...saved, ...JSON.parse(init.body as string) }
        const response = json(saved)
        return new Promise<Response>((resolve) => { release = () => resolve(response) })
      }
      return normal(url, init)
    })
    const nameSave = () => { edit("Ella D"); save() }
    const timezoneSave = () => {
      fireEvent.change(screen.getByRole("combobox", { name: "Timezone" }), { target: { value: "UTC" } })
      fireEvent.click(screen.getByRole("button", { name: "Save timezone" }))
    }
    const actions = first === "name" ? [nameSave, timezoneSave] : [timezoneSave, nameSave]
    actions[0]()
    await waitFor(() => expect(patches()).toHaveLength(1))
    actions[1]()
    await screen.findByRole("button", { name: "Saving display name…" })
    await screen.findByRole("button", { name: "Saving…" })
    expect(patches()).toHaveLength(1)
    release()
    await screen.findByText("Display name saved.")
    await screen.findByText("Timezone saved.")
    expect(patches()).toHaveLength(2)
    expect(saved).toMatchObject({ display_name: "Ella D", timezone: "UTC" })
    expect(input().value).toBe("Ella D")
    expect((screen.getByRole("combobox", { name: "Timezone" }) as HTMLInputElement).value).toBe("UTC")
  })
})
