// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { sharedHabitKeys, type SharedHabitDetail } from "@/lib/sharedHabits"
import SharedHabitDetails from "./SharedHabitDetails"

const auth = vi.hoisted(() => {
  vi.stubEnv("NEXT_PUBLIC_API_URL", "http://api.test")
  return { user: { id: "ella" }, signOut: vi.fn(), getSession: vi.fn(), replace: vi.fn() }
})
vi.mock("@/auth/useAuth", () => ({ useAuth: () => auth }))
vi.mock("@/lib/supabase", () => ({ supabase: { auth: { getSession: auth.getSession } } }))
vi.mock("next/navigation", () => ({ useRouter: () => ({ replace: auth.replace }) }))
vi.mock("@/pottedPlant/plants/plantTypes", () => ({ plantTypeById: () => ({ label: "Pothos", Preview: () => <svg /> }) }))
HTMLDialogElement.prototype.showModal = function showModal() { this.setAttribute("open", "") }
HTMLDialogElement.prototype.close = function close() { this.removeAttribute("open") }

function fixture(): SharedHabitDetail {
  const current_period = { number: 1, total: 4, start: "2026-11-25", end: "2026-12-02", count: 0, target: 3 }
  return {
    id: "shared-a", owner_id: "ella", name: "Read together", description: null,
    plant_type: "pothos", target_count: 3, interval_count: 1, interval_unit: "week", num_periods: 4,
    start_date: "2026-11-25", created_at: "2026-11-23T00:00:00Z", join_by: "2026-11-24", max_members: 5,
    join_code: "a".repeat(32), own_today: "2026-11-23",
    stats: { today: "2026-11-23", state: "not_started", overall_progress: 0, stage: 1,
      health: "healthy", health_rate: 1, end_date: "2026-12-23", current_period },
    own_stats: { state: "not_started", overall_progress: 0, stage: 1, health: "healthy", streak: 0,
      current_period, consistency: { successful: 0, completed: 0, rate: null },
      end_date: "2026-12-23", periods: [], log_days: [], current_period_logs: [] },
    members: [
      { user_id: "ella", display_name: "Ella", avatar_url: null, is_owner: true,
        overall_progress: 0, current_period_count: 0, streak: 0, health: "healthy" },
      { user_id: "sam", display_name: "Sam", avatar_url: null, is_owner: false,
        overall_progress: 0, current_period_count: 0, streak: 0, health: "healthy" },
    ],
  }
}
let habit: SharedHabitDetail
let client: QueryClient
let failure: number | "network" | null
let failRefresh: boolean
const fetchMock = vi.fn()
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status })
const writes = () => fetchMock.mock.calls.filter(([, init]) => init.method !== "GET")
const button = (name: string) => screen.getByRole("button", { name }) as HTMLButtonElement
const dialog = () => screen.getByRole("dialog")
const confirm = (name: string) => within(dialog()).getByRole("button", { name }) as HTMLButtonElement

beforeEach(() => {
  habit = fixture()
  client = new QueryClient({ defaultOptions: { queries: { retry: false, refetchOnWindowFocus: false } } })
  failure = null
  failRefresh = false
  auth.user = { id: "ella" }
  auth.getSession.mockImplementation(async () => ({ data: { session: { access_token: auth.user.id + "-token" } } }))
  fetchMock.mockImplementation(async (url: string, init: RequestInit) => {
    if (init.method === "GET") {
      if (failRefresh) throw new TypeError("offline")
      return json(habit)
    }
    if (failure === "network") throw new TypeError("offline")
    if (failure) return json({ error: { code: "error", message: "Private server details" } }, failure)
    if (url.endsWith("/transfer")) {
      habit.owner_id = JSON.parse(init.body as string).user_id
      habit.members = habit.members.map((member) => ({ ...member, is_owner: member.user_id === habit.owner_id }))
    } else if (url.endsWith("/members/sam")) {
      habit.members = habit.members.filter((member) => member.user_id !== "sam")
      habit.stats.stage = 3
      habit.stats.health = "slightly_wilted"
    } else if (url.endsWith("/code")) {
      habit.join_code = init.method === "DELETE" ? null : "b".repeat(32)
      if (init.method === "POST") return json({ join_code: habit.join_code })
    }
    return new Response(null, { status: 204 })
  })
  vi.stubGlobal("fetch", fetchMock)
})
afterEach(() => { cleanup(); client.clear(); vi.unstubAllGlobals(); vi.clearAllMocks() })

async function open() {
  render(<QueryClientProvider client={client}><SharedHabitDetails id="shared-a" /></QueryClientProvider>)
  await screen.findByRole("heading", { name: "Read together" })
}
function selectSam() { fireEvent.change(screen.getByLabelText("Member to manage"), { target: { value: "sam" } }) }

describe("shared habit management (#278)", () => {
  it("shows owner controls, excludes self from member choices, and requires a selection", async () => {
    await open()
    for (const name of ["Get a new link", "Close joining", "Delete shared habit"]) expect(button(name).disabled).toBe(false)
    expect(button("Remove member").disabled).toBe(true)
    expect(button("Transfer ownership").disabled).toBe(true)
    expect(screen.queryByRole("button", { name: "Leave habit" })).toBeNull()
    expect(screen.queryByRole("option", { name: "Ella" })).toBeNull()
    selectSam()
    expect(button("Remove member").disabled).toBe(false)
    expect(button("Transfer ownership").disabled).toBe(false)
  })

  it("shows only Leave for a regular member", async () => {
    auth.user = { id: "sam" }
    await open()
    expect(button("Leave habit").disabled).toBe(false)
    for (const name of ["Remove member", "Transfer ownership", "Get a new link", "Close joining", "Delete shared habit"]) {
      expect(screen.queryByRole("button", { name })).toBeNull()
    }
    expect(screen.queryByRole("combobox")).toBeNull()
    expect(button("Copy invite link")).toBeTruthy()
  })

  it("lets a sole owner delete but explains why they cannot leave or transfer", async () => {
    habit.members = habit.members.slice(0, 1)
    await open()
    expect(screen.getByText("You're the only member. Invite a friend before transferring ownership.")).toBeTruthy()
    expect(screen.queryByRole("combobox")).toBeNull()
    expect(screen.queryByRole("button", { name: "Leave habit" })).toBeNull()
    expect(button("Delete shared habit").disabled).toBe(false)
  })

  const actions = [
    { label: "Leave habit", method: "DELETE", path: "/members/me", member: true, warning: "Your past logs stay saved" },
    { label: "Remove member", method: "DELETE", path: "/members/sam", target: true, warning: "Their past logs stay saved" },
    { label: "Transfer ownership", method: "POST", path: "/transfer", target: true, warning: "You will remain a regular member" },
    { label: "Get a new link", method: "POST", path: "/code", warning: "old invite link will stop working" },
    { label: "Close joining", method: "DELETE", path: "/code", warning: "invite link will stop working" },
    { label: "Delete shared habit", method: "DELETE", path: "", warning: "deleted for everyone" },
  ]
  it.each(actions)("confirms $label, supports cancel, then calls the authenticated endpoint", async ({ label, method, path, member, target, warning }) => {
    if (member) auth.user = { id: "sam" }
    await open()
    if (target) selectSam()
    fireEvent.click(button(label))
    expect(dialog().textContent).toContain(warning)
    expect(writes()).toHaveLength(0)
    fireEvent.click(within(dialog()).getByRole("button", { name: "Cancel" }))
    expect(screen.queryByRole("dialog")).toBeNull()
    expect(writes()).toHaveLength(0)
    fireEvent.click(button(label))
    fireEvent.click(confirm(label))
    await waitFor(() => expect(writes()).toHaveLength(1))
    const [url, request] = writes()[0]
    expect(url).toBe(`http://api.test/shared-habits/shared-a${path}`)
    expect(request.method).toBe(method)
    expect(request.headers.Authorization).toBe(`Bearer ${member ? "sam" : "ella"}-token`)
    if (label === "Transfer ownership") expect(JSON.parse(request.body)).toEqual({ user_id: "sam" })
    if (label === "Leave habit" || label === "Delete shared habit") {
      await waitFor(() => expect(auth.replace).toHaveBeenCalledWith("/"))
      expect(client.getQueryData(sharedHabitKeys.detail(auth.user.id, habit.id))).toBeUndefined()
    } else {
      await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull())
    }
  })

  it("refreshes group numbers and the plant after removing a member", async () => {
    await open()
    selectSam()
    fireEvent.click(button("Remove member"))
    fireEvent.click(confirm("Remove member"))
    await waitFor(() => expect(screen.queryByRole("row", { name: /Sam/ })).toBeNull())
    expect(screen.queryByRole("option", { name: "Sam" })).toBeNull()
    expect(document.querySelector(".habit-plant-card")!.textContent).toContain("Pothos · Lv. 3")
    expect(document.querySelector(".habit-plant-card")!.textContent).toContain("Slightly wilted")
    expect(screen.getByText("1 of 5")).toBeTruthy()
  })

  it("immediately drops owner controls after transfer even if the refresh fails", async () => {
    await open()
    selectSam()
    fireEvent.click(button("Transfer ownership"))
    failRefresh = true
    fireEvent.click(confirm("Transfer ownership"))
    await screen.findByRole("button", { name: "Leave habit" })
    expect(screen.queryByRole("button", { name: "Delete shared habit" })).toBeNull()
    expect(screen.getByRole("row", { name: /Sam/ }).textContent).toContain("(owner)")
    expect(screen.getByRole("row", { name: /Ella/ }).textContent).not.toContain("(owner)")
    await screen.findByText(/last loaded values are shown/)
  })

  it("replaces the displayed invite, closes it, and allows reopening before start", async () => {
    await open()
    fireEvent.click(button("Get a new link"))
    fireEvent.click(confirm("Get a new link"))
    await waitFor(() => expect(screen.getByRole("link", { name: "Open invite link" }).getAttribute("href")).toBe(`/join?code=${"b".repeat(32)}`))
    const writeText = vi.fn().mockResolvedValue(undefined)
    Object.defineProperty(navigator, "clipboard", { configurable: true, value: { writeText } })
    fireEvent.click(button("Copy invite link"))
    await waitFor(() => expect(writeText).toHaveBeenCalledWith(`${window.location.origin}/join?code=${"b".repeat(32)}`))
    fireEvent.click(button("Close joining"))
    fireEvent.click(confirm("Close joining"))
    await screen.findByText("Joining is closed.")
    expect(screen.queryByRole("link", { name: "Open invite link" })).toBeNull()
    expect(screen.queryByRole("button", { name: "Close joining" })).toBeNull()
    await waitFor(() => expect(button("Get a new link").disabled).toBe(false))
    fireEvent.click(button("Get a new link"))
    fireEvent.click(confirm("Get a new link"))
    await screen.findByRole("link", { name: "Open invite link" })
  })

  it.each(["active", "expired"] as const)("locks invite management for an %s habit but keeps membership actions and deletion", async (state) => {
    habit.stats.state = state
    habit.own_stats.state = state
    await open()
    expect(button("Get a new link").disabled).toBe(true)
    expect(button("Close joining").disabled).toBe(true)
    selectSam()
    expect(button("Transfer ownership").disabled).toBe(false)
    expect(button("Remove member").disabled).toBe(false)
    expect(button("Delete shared habit").disabled).toBe(false)
  })

  it("locks invites when the caller reaches the start before the group's date", async () => {
    habit.own_today = habit.start_date
    await open()
    expect(button("Get a new link").disabled).toBe(true)
  })

  it("explains a server-side start lock caused by another member or a past departure", async () => {
    failure = 400
    await open()
    fireEvent.click(button("Get a new link"))
    fireEvent.click(confirm("Get a new link"))
    await within(dialog()).findByText("Invite links can no longer be changed. A member may have reached the start date.")
    expect(screen.getByRole("link", { name: "Open invite link" }).getAttribute("href")).toContain("a".repeat(32))
    expect(screen.queryByText("Private server details")).toBeNull()
  })

  it("keeps a failed confirmation open and allows retry without losing the selected member", async () => {
    failure = "network"
    await open()
    selectSam()
    fireEvent.click(button("Remove member"))
    fireEvent.click(confirm("Remove member"))
    await within(dialog()).findByRole("alert")
    expect(dialog().textContent).toContain("Couldn't save this change")
    expect(dialog().textContent).toContain("Sam")
    expect(screen.getByRole("row", { name: /Sam/ })).toBeTruthy()
    failure = null
    fireEvent.click(confirm("Remove member"))
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull())
    expect(writes()).toHaveLength(2)
  })

  it("prevents duplicate requests and closing while saving", async () => {
    await open()
    let resolve!: (response: Response) => void
    fetchMock.mockImplementationOnce(() => new Promise<Response>((done) => { resolve = done }))
    fireEvent.click(button("Delete shared habit"))
    const save = confirm("Delete shared habit")
    fireEvent.click(save)
    fireEvent.click(save)
    await waitFor(() => expect(writes()).toHaveLength(1))
    expect(confirm("Deleting…").disabled).toBe(true)
    expect((within(dialog()).getByRole("button", { name: "Cancel" }) as HTMLButtonElement).disabled).toBe(true)
    fireEvent.click(within(dialog()).getByRole("button", { name: "Close dialog" }))
    expect(dialog()).toBeTruthy()
    await act(async () => { resolve(new Response(null, { status: 204 })) })
    await waitFor(() => expect(auth.replace).toHaveBeenCalledWith("/"))
  })

  it("offers sign-in again after a 401 and does not claim the action succeeded", async () => {
    failure = 401
    await open()
    fireEvent.click(button("Delete shared habit"))
    fireEvent.click(confirm("Delete shared habit"))
    fireEvent.click(await within(dialog()).findByRole("button", { name: "Sign in again" }))
    expect(auth.signOut).toHaveBeenCalledTimes(1)
    expect(confirm("Delete shared habit").disabled).toBe(true)
    expect(auth.replace).not.toHaveBeenCalled()
  })

  it("refreshes permissions after a stale owner's request is refused", async () => {
    await open()
    selectSam()
    fireEvent.click(button("Remove member"))
    habit.owner_id = "sam"
    habit.members = habit.members.map((member) => ({ ...member, is_owner: member.user_id === "sam" }))
    failure = 403
    fireEvent.click(confirm("Remove member"))
    await within(dialog()).findByText("Your permissions have changed. Only the current owner can do this.")
    expect(confirm("Remove member").disabled).toBe(true)
    await screen.findByRole("button", { name: "Leave habit" })
    expect(screen.queryByRole("button", { name: "Delete shared habit" })).toBeNull()
    expect(writes()).toHaveLength(1)
  })

  it("refreshes a missing removal target rather than treating it as successful", async () => {
    await open()
    selectSam()
    fireEvent.click(button("Remove member"))
    habit.members = habit.members.slice(0, 1)
    failure = 404
    fireEvent.click(confirm("Remove member"))
    await within(dialog()).findByText("This habit or member is no longer available. Refresh the page to see the latest details.")
    expect(confirm("Remove member").disabled).toBe(true)
    await waitFor(() => expect(screen.queryByRole("row", { name: /Sam/ })).toBeNull())
    expect(screen.queryByText("Member removed.")).toBeNull()
  })

  it("keeps access and cached details when leaving fails", async () => {
    auth.user = { id: "sam" }
    failure = 500
    await open()
    fireEvent.click(button("Leave habit"))
    fireEvent.click(confirm("Leave habit"))
    await within(dialog()).findByRole("alert")
    expect(auth.replace).not.toHaveBeenCalled()
    expect(client.getQueryData(sharedHabitKeys.detail("sam", habit.id))).toBeTruthy()
    expect(confirm("Leave habit").disabled).toBe(false)
  })
})
