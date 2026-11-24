// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { QueryProvider } from "@/lib/QueryProvider"
import CreateHabit from "./CreateHabit"

const mocks = vi.hoisted(() => {
  vi.stubEnv("NEXT_PUBLIC_API_URL", "http://api.test")
  return { replace: vi.fn(), push: vi.fn(), getSession: vi.fn(), today: "2026-11-20" }
})
vi.mock("next/navigation", () => ({ useRouter: () => mocks }))
vi.mock("@/auth/useAuth", () => ({ useAuth: () => ({ user: { id: "user-a" } }) }))
vi.mock("@/lib/useProfile", () => ({ useProfile: () => ({ data: { today: mocks.today, timezone: "Pacific/Kiritimati" } }) }))
vi.mock("@/lib/supabase", () => ({ supabase: { auth: { getSession: mocks.getSession } } }))
vi.mock("@/pottedPlant/plants/plantTypes", () => {
  const plant = { id: "pothos", label: "Pothos", blurb: "A leafy plant", Preview: () => null }
  return { DEFAULT_PLANT_TYPE: "pothos", PLANT_TYPES: [plant], plantTypeById: () => plant }
})

const fetchMock = vi.fn()
const json = (body: unknown, status = 201) => new Response(JSON.stringify(body), { status })
const saved = {
  id: "shared-a", name: "Read", start_date: "2026-11-21", join_by: "2026-11-20", max_members: 2,
  join_code: "aabbccdd00112233445566778899aabb",
}
const field = (name: string) => screen.getByLabelText(name) as HTMLInputElement
const change = (name: string, value: string) => fireEvent.change(field(name), { target: { value } })
function setup(shared = true) {
  const view = render(<QueryProvider><CreateHabit /></QueryProvider>)
  change("Name", "Read")
  change("Number of periods", "4")
  if (shared) fireEvent.click(screen.getByRole("radio", { name: "With friends" }))
  return view
}
const review = () => fireEvent.click(screen.getByRole("button", { name: "Review habit" }))
const create = () => fireEvent.click(screen.getByRole("button", { name: "Create habit" }))

beforeEach(() => {
  vi.useFakeTimers({ toFake: ["Date"] })
  vi.setSystemTime(new Date("2026-11-19T12:00:00Z"))
  mocks.today = "2026-11-20" // Deliberately differs from the browser's date.
  mocks.getSession.mockResolvedValue({ data: { session: { access_token: "user-a-token" } } })
  fetchMock.mockImplementation(async (url: string) => url.includes("/shared-habits/join/")
    ? json({ places_left: 1 }, 200) : json(saved))
  vi.stubGlobal("fetch", fetchMock)
})
afterEach(() => {
  cleanup()
  vi.useRealTimers()
  vi.unstubAllGlobals()
  vi.clearAllMocks()
})

describe("create shared habit (#274)", () => {
  it("defaults to Just me and keeps personal creation on /habits with a Garden redirect", async () => {
    setup(false)
    expect((screen.getByRole("radio", { name: "Just me" }) as HTMLInputElement).checked).toBe(true)
    expect(field("Start date").value).toBe("2026-11-19")
    expect(screen.queryByLabelText("Join by")).toBeNull()
    expect(screen.queryByLabelText("Max members")).toBeNull()
    review()
    create()
    await waitFor(() => expect(mocks.replace).toHaveBeenCalledWith("/"))
    const [url, request] = fetchMock.mock.calls[0]
    expect(url).toBe("http://api.test/habits")
    expect(JSON.parse(request.body)).not.toHaveProperty("join_by")
    expect(JSON.parse(request.body)).not.toHaveProperty("max_members")
    expect(JSON.parse(request.body)).not.toHaveProperty("start_date")
  })

  it("defaults shared starts to the next profile-local date and joining to today", () => {
    setup()
    expect(field("Start date").value).toBe("2026-11-21")
    expect(field("Join by").value).toBe("2026-11-20")
    expect(field("Join by").min).toBe("2026-11-20")
    expect(field("Join by").max).toBe("2026-11-21")
    expect(field("Max members").min).toBe("2")
    expect(field("Max members").max).toBe("50")
    expect(field("Max members").value).toBe("2")
  })

  it.each([
    ["2026-11-30", "2026-12-01"], ["2026-12-31", "2027-01-01"], ["2028-02-28", "2028-02-29"],
  ])("defaults the shared start after %s to %s", (today, next) => {
    mocks.today = today
    setup()
    expect(field("Start date").value).toBe(next)
    expect(field("Join by").value).toBe(today)
  })

  it("warns for a same-day start and never offers its unusable invite", async () => {
    fetchMock.mockResolvedValue(json({ ...saved, start_date: "2026-11-20" }))
    setup()
    change("Start date", "2026-11-20")
    expect(screen.getByText("Starting today means others cannot join this shared habit.")).toBeTruthy()
    expect(field("Start date").getAttribute("aria-describedby")).toContain("habit-start-warning")
    review()
    expect(screen.getByText("Starting today means others cannot join this shared habit.")).toBeTruthy()
    create()
    expect(await screen.findByText("This invitation is no longer available.")).toBeTruthy()
    expect(screen.queryByLabelText("Invite link")).toBeNull()
    expect(fetchMock.mock.calls.filter(([url]) => url.includes("/shared-habits/join/"))).toHaveLength(0)
  })

  it.each([
    [404, "not_found"],
    [400, "shared_habit_join_ended"],
    [409, "shared_habit_full"],
  ])("hides the link for unavailable invite response %s (%s)", async (status, code) => {
    fetchMock.mockImplementation(async (url: string) => url.includes("/shared-habits/join/")
      ? json({ error: { code, message: "Unavailable" } }, status) : json(saved))
    setup()
    review()
    create()
    expect(await screen.findByText("This invitation is no longer available.")).toBeTruthy()
    expect(screen.queryByLabelText("Invite link")).toBeNull()
    expect(screen.queryByRole("button", { name: "Retry invite check" })).toBeNull()
  })

  it("does not offer a link when the habit is full", async () => {
    fetchMock.mockImplementation(async (url: string) => url.includes("/shared-habits/join/")
      ? json({ places_left: 0 }, 200) : json(saved))
    setup()
    review()
    create()
    expect(await screen.findByText("This invitation is no longer available.")).toBeTruthy()
    expect(screen.queryByLabelText("Invite link")).toBeNull()
  })

  it("offers retry rather than an unverified link when preview fails", async () => {
    let available = false
    fetchMock.mockImplementation(async (url: string) => url.includes("/shared-habits/join/")
      ? available ? json({ places_left: 1 }, 200) : json({ error: { message: "offline" } }, 500) : json(saved))
    setup()
    review()
    create()
    expect((await screen.findByRole("alert")).textContent).toContain("Could not check the invite")
    expect(screen.queryByLabelText("Invite link")).toBeNull()
    available = true
    fireEvent.click(screen.getByRole("button", { name: "Retry invite check" }))
    expect(await screen.findByLabelText("Invite link")).toBeTruthy()
  })

  it.each([400, 409])("offers retry for unrelated %s errors", async (status) => {
    fetchMock.mockImplementation(async (url: string) => url.includes("/shared-habits/join/")
      ? json({ error: { code: "unexpected", message: "Try again" } }, status) : json(saved))
    setup()
    review()
    create()
    expect(await screen.findByRole("alert")).toBeTruthy()
    expect(screen.getByRole("button", { name: "Retry invite check" })).toBeTruthy()
    expect(screen.queryByLabelText("Invite link")).toBeNull()
  })

  it("offers retry for a network failure", async () => {
    fetchMock.mockImplementation(async (url: string) => {
      if (url.includes("/shared-habits/join/")) throw new TypeError("Network error")
      return json(saved)
    })
    setup()
    review()
    create()
    expect(await screen.findByRole("alert")).toBeTruthy()
    expect(screen.getByRole("button", { name: "Retry invite check" })).toBeTruthy()
    expect(screen.queryByLabelText("Invite link")).toBeNull()
  })

  it("hides a previously available invite when the owner's local start date arrives", async () => {
    const view = setup()
    review()
    create()
    expect(await screen.findByLabelText("Invite link")).toBeTruthy()
    vi.setSystemTime(new Date("2026-11-20T12:00:00Z")) // Nov 21 in Kiritimati.
    mocks.today = "2026-11-21"
    view.rerender(<QueryProvider><CreateHabit /></QueryProvider>)
    expect(screen.queryByLabelText("Invite link")).toBeNull()
    expect(screen.getByRole("status").textContent).toContain("no longer available")
  })

  it("defaults Join by to the day before a future start, including a month boundary", () => {
    setup()
    change("Start date", "2026-12-01")
    expect(field("Join by").value).toBe("2026-11-30")
    change("Join by", "2026-11-25")
    change("Start date", "2026-12-02")
    expect(field("Join by").value).toBe("2026-11-25")
  })

  it.each(["", "1", "51", "2.5", "1e1", "-2"])("rejects member limit %j before submitting", (value) => {
    setup()
    change("Max members", value)
    review()
    expect(screen.getByText("Enter a whole number from 2 to 50.")).toBeTruthy()
    expect(screen.queryByRole("button", { name: "Create habit" })).toBeNull()
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it.each(["", "2026-11-19", "2026-11-22"])("rejects joining deadline %j outside today's/start bounds", (value) => {
    setup()
    change("Start date", "2026-11-21")
    change("Join by", value)
    review()
    expect(screen.queryByRole("button", { name: "Create habit" })).toBeNull()
    expect(document.getElementById("habit-join-by-error")).toBeTruthy()
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it("rejects a start date before the profile's today, even if it is today in the browser", () => {
    setup()
    change("Start date", "2026-11-19")
    review()
    expect(screen.getByText("Start date can't be in the past.")).toBeTruthy()
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it("does not create a shared habit until the profile's today is available", () => {
    mocks.today = ""
    setup()
    review()
    expect(screen.getByText("Wait for your profile to load, then try again.")).toBeTruthy()
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it("rechecks the joining deadline if today changes while reviewing", async () => {
    const view = setup()
    change("Start date", "2026-11-25")
    change("Join by", "2026-11-20")
    review()
    mocks.today = "2026-11-21"
    view.rerender(<QueryProvider><CreateHabit /></QueryProvider>)
    create()
    expect(await screen.findByText("Join by must be between today and the start date.")).toBeTruthy()
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it.each([2, 50])("creates with member limit %i and shows the saved invitation instead of redirecting", async (limit) => {
    fetchMock.mockImplementation(async (url: string) => url.includes("/shared-habits/join/")
      ? json({ places_left: 1 }, 200) : json({ ...saved, max_members: limit }))
    setup()
    change("Max members", String(limit))
    review()
    expect(screen.getByText(/The goal and start date lock once a friend joins/)).toBeTruthy()
    create()
    await screen.findByRole("heading", { name: "Your shared habit is ready" })
    expect(screen.getByRole("link", { name: "View shared habit" }).getAttribute("href")).toBe("/shared-habit?id=shared-a")
    expect((await screen.findByLabelText("Invite link") as HTMLInputElement).value).toBe(`${window.location.origin}/join?code=${saved.join_code}`)
    const [url, request] = fetchMock.mock.calls[0]
    expect(url).toBe("http://api.test/shared-habits")
    expect(request.headers.Authorization).toBe("Bearer user-a-token")
    expect(JSON.parse(request.body)).toEqual({ name: "Read", plant_type: "pothos",
      target_count: 1, interval_count: 1, interval_unit: "week", num_periods: 4,
      start_date: "2026-11-21", join_by: "2026-11-20", max_members: limit })
    expect(mocks.replace).not.toHaveBeenCalled()
  })

  it("allows joining on the start date and preserves custom values through review/back", async () => {
    setup()
    change("Start date", "2026-11-25")
    change("Join by", "2026-11-25")
    change("Max members", "5")
    review()
    fireEvent.click(screen.getByRole("button", { name: "Back" }))
    expect(field("Join by").value).toBe("2026-11-25")
    expect(field("Max members").value).toBe("5")
    review()
    create()
    await screen.findByRole("heading", { name: "Your shared habit is ready" })
    expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toMatchObject({
      start_date: "2026-11-25", join_by: "2026-11-25", max_members: 5,
    })
  })

  it("ignores invalid hidden shared fields when switching back to Just me", async () => {
    setup()
    change("Max members", "1")
    change("Join by", "")
    fireEvent.click(screen.getByRole("radio", { name: "Just me" }))
    review()
    create()
    await waitFor(() => expect(mocks.replace).toHaveBeenCalledWith("/"))
    expect(fetchMock.mock.calls[0][0]).toBe("http://api.test/habits")
  })

  it("keeps entered values on a server failure so the user can retry", async () => {
    fetchMock.mockResolvedValueOnce(json({ error: { code: "validation_failed", message: "Could not save shared habit" } }, 400))
    setup()
    change("Max members", "5")
    review()
    create()
    expect((await screen.findByRole("alert")).textContent).toBe("Could not save shared habit")
    expect(field("Name").value).toBe("Read")
    expect(field("Max members").value).toBe("5")
    review()
    create()
    await screen.findByRole("heading", { name: "Your shared habit is ready" })
    expect(fetchMock.mock.calls.filter(([, init]) => init.method === "POST")).toHaveLength(2)
  })

  it("sends only one request while creation is pending", async () => {
    let resolve!: (response: Response) => void
    fetchMock.mockImplementationOnce(() => new Promise<Response>((done) => { resolve = done }))
    setup()
    review()
    const button = screen.getByRole("button", { name: "Create habit" })
    fireEvent.click(button)
    fireEvent.click(button)
    await waitFor(() => expect(fetchMock.mock.calls.filter(([, init]) => init.method === "POST")).toHaveLength(1))
    expect((screen.getByRole("button", { name: "Creating…" }) as HTMLButtonElement).disabled).toBe(true)
    resolve(json(saved))
    await screen.findByRole("heading", { name: "Your shared habit is ready" })
  })

  it("copies the saved code's invite link and confirms success", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined)
    Object.defineProperty(navigator, "clipboard", { configurable: true, value: { writeText } })
    setup()
    review()
    create()
    fireEvent.click(await screen.findByRole("button", { name: "Copy invite link" }))
    expect((await screen.findByRole("status")).textContent).toBe("Invite link copied.")
    expect(writeText).toHaveBeenCalledWith(field("Invite link").value)
    expect(fetchMock.mock.calls.filter(([, init]) => init.method === "POST")).toHaveLength(1)
  })

  it("keeps the invite selectable for manual copying when clipboard access fails", async () => {
    const writeText = vi.fn().mockRejectedValue(new Error("Denied"))
    Object.defineProperty(navigator, "clipboard", { configurable: true, value: { writeText } })
    setup()
    review()
    create()
    fireEvent.click(await screen.findByRole("button", { name: "Copy invite link" }))
    expect((await screen.findByRole("status")).textContent).toContain("Select and copy the invite link above")
    expect(field("Invite link").value).toContain(saved.join_code)
    fireEvent.focus(field("Invite link"))
    expect(field("Invite link").selectionEnd).toBe(field("Invite link").value.length)
    expect(fetchMock.mock.calls.filter(([, init]) => init.method === "POST")).toHaveLength(1)
  })

  it("does not fabricate an invitation if the saved habit has no join code", async () => {
    fetchMock.mockResolvedValue(json({ ...saved, join_code: null }))
    setup()
    review()
    create()
    expect((await screen.findByRole("status")).textContent).toContain("Your habit was saved, but no invite link was returned")
    expect(screen.queryByRole("button", { name: "Create habit" })).toBeNull()
    expect(screen.queryByRole("button", { name: "Copy invite link" })).toBeNull()
  })

  it("redirects an expired session to sign-in without showing a saved invitation", async () => {
    fetchMock.mockResolvedValueOnce(json({ error: { code: "unauthorized", message: "Sign in again" } }, 401))
    setup()
    review()
    create()
    await waitFor(() => expect(mocks.replace).toHaveBeenCalledWith("/login"))
    expect(screen.queryByLabelText("Invite link")).toBeNull()
  })
})
