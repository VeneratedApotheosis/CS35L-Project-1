// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react"
import { useEffect } from "react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { QueryProvider } from "@/lib/QueryProvider"
import type { ApiBadge } from "@/lib/badges"
import { BadgeNotifierProvider, useBadgeNotifier } from "./BadgeNotifier"
import { useHabitLogging } from "@/views/habit/useHabitLogging"
import { Toast } from "./Toast"

const logApi = vi.hoisted(() => ({ addActivity: vi.fn(), deleteActivity: vi.fn() }))
vi.mock("@/lib/logs", () => logApi)

const auth = vi.hoisted(() => {
  vi.stubEnv("NEXT_PUBLIC_API_URL", "http://api.test")
  return { user: { id: "user-a" } as { id: string } | null, signOut: vi.fn(), getSession: vi.fn() }
})
const router = vi.hoisted(() => ({ push: vi.fn(), replace: vi.fn() }))
vi.mock("@/auth/useAuth", () => ({ useAuth: () => auth }))
vi.mock("@/lib/supabase", () => ({ supabase: { auth: { getSession: auth.getSession } } }))
vi.mock("next/navigation", () => ({ useRouter: () => router }))

HTMLDialogElement.prototype.showModal = function showModal() { this.setAttribute("open", "") }
HTMLDialogElement.prototype.close = function close() { this.removeAttribute("open") }

const fetchMock = vi.fn()
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), {
  status, headers: { "Content-Type": "application/json" },
})

const badge = (patch: Partial<ApiBadge> = {}): ApiBadge => ({
  id: "first-drop", name: "First Drop of Water", description: "Log your first activity.", tier: "bronze", secret: false,
  state: "earned", progress: { count: 1, target: 1 }, earned_at: "2026-11-24T20:00:00Z", ...patch,
})
const gold = badge({ id: "perfect-score", name: "Perfect Score", description: "Finish a habit at 100% progress and 100% consistency.", tier: "gold" })
const secret = badge({ id: "early-bird", name: "Early Bird", description: "Log an activity before 6 AM, your local time.", secret: true })

/** Answers GET /me/badges/unseen with `unseen`, and everything else with 204. */
function serve(unseen: ApiBadge[] = []) {
  fetchMock.mockImplementation(async (url: string) =>
    url.endsWith("/me/badges/unseen") ? json({ badges: unseen }) : new Response(null, { status: 204 }))
}

const seenCalls = () => fetchMock.mock.calls
  .filter(([url]) => String(url).endsWith("/me/badges/seen"))
  .map(([, init]) => JSON.parse(String((init as RequestInit).body)).ids)

let pushBadges: (badges: ApiBadge[]) => void = () => {}
function Pusher() {
  const { push } = useBadgeNotifier()
  useEffect(() => { pushBadges = push }, [push])
  return null
}

function renderNotifier() {
  render(<QueryProvider><BadgeNotifierProvider><Pusher /></BadgeNotifierProvider></QueryProvider>)
}

beforeEach(() => {
  auth.user = { id: "user-a" }
  auth.getSession.mockImplementation(async () => ({ data: { session: { access_token: "token-a" } } }))
  vi.stubGlobal("fetch", fetchMock)
})
afterEach(() => {
  cleanup()
  vi.useRealTimers()
  vi.unstubAllGlobals()
  vi.resetAllMocks()
})

describe("BadgeNotifier", () => {
  it("keeps the activity Undo available after a badge dialog has covered it", async () => {
    serve()
    logApi.addActivity.mockResolvedValue({ log: { id: "log-1", occurred_on: "2026-11-24" }, new_badges: [gold] })
    logApi.deleteActivity.mockResolvedValue({ stats: {} })
    function Logging() {
      const logging = useHabitLogging("habit-1", "2026-11-24", false)
      return <>
        <button onClick={() => { void logging.logToday() }}>Log</button>
        {logging.notice && <Toast key={logging.noticeId} message={logging.notice.message} onDismiss={logging.dismiss}
          action={logging.notice.undo ? { label: "Undo", onClick: logging.notice.undo } : undefined} />}
      </>
    }
    vi.useFakeTimers()
    render(<QueryProvider><BadgeNotifierProvider><Logging /></BadgeNotifierProvider></QueryProvider>)
    await act(async () => { fireEvent.click(screen.getByRole("button", { name: "Log" })); await Promise.resolve() })
    expect(screen.getByRole("dialog", { name: "Badge earned" })).toBeTruthy()
    expect(screen.getByText("Activity logged for today.")).toBeTruthy()
    act(() => vi.advanceTimersByTime(10000))
    expect(screen.getByText("Activity logged for today.")).toBeTruthy()
    fireEvent.click(within(screen.getByRole("dialog", { name: "Badge earned" })).getByRole("button", { name: "Nice" }))
    act(() => vi.advanceTimersByTime(4999))
    await act(async () => { fireEvent.click(screen.getByRole("button", { name: "Undo" })); await Promise.resolve() })
    expect(logApi.deleteActivity).toHaveBeenCalledWith("habit-1", "log-1")
  })

  it("shows badges earned while the app was closed, and marks them seen", async () => {
    serve([badge()])
    renderNotifier()
    await screen.findByText("Badge earned: First Drop of Water.")
    await waitFor(() => expect(seenCalls()).toEqual([["first-drop"]]))
  })

  it("shows a toast for Bronze and Silver, with a link to the badges", async () => {
    serve()
    renderNotifier()
    act(() => pushBadges([badge()]))
    expect(screen.getByText("Badge earned: First Drop of Water.").closest(".toast")?.classList.contains("toast--raised")).toBe(true)
    fireEvent.click(screen.getByRole("button", { name: "View badges" }))
    expect(router.push).toHaveBeenCalledWith("/badges")
  })

  it("opens a dialog for Gold, and a secret one for secret badges, one after another", async () => {
    serve()
    renderNotifier()
    act(() => pushBadges([gold, secret]))
    const first = screen.getByRole("dialog", { name: "Badge earned" })
    expect(within(first).getByRole("heading", { name: "Perfect Score" })).toBeTruthy()
    fireEvent.click(within(first).getByRole("button", { name: "Nice" }))
    const second = screen.getByRole("dialog", { name: "Secret badge found" })
    expect(within(second).getByRole("heading", { name: "Early Bird" })).toBeTruthy()
    expect(within(second).getByText("Secret")).toBeTruthy()
    fireEvent.click(within(second).getByRole("button", { name: "Nice" }))
    expect(screen.queryByRole("dialog")).toBeNull()
    await waitFor(() => expect(seenCalls()).toEqual([["perfect-score"], ["early-bird"]]))
  })

  it("shows a badge once when it arrives from both a response and the load check", async () => {
    serve([badge()])
    renderNotifier()
    await screen.findByText("Badge earned: First Drop of Water.")
    act(() => pushBadges([badge()]))
    fireEvent.click(screen.getByRole("button", { name: "Dismiss notification" }))
    expect(screen.queryByText("Badge earned: First Drop of Water.")).toBeNull()
  })

  it("ignores an empty or missing list", () => {
    serve()
    renderNotifier()
    act(() => pushBadges([]))
    expect(screen.queryByRole("status")).toBeNull()
  })

  it("stays quiet when the load check fails", async () => {
    fetchMock.mockResolvedValue(json({ error: { code: "internal_error", message: "boom" } }, 500))
    renderNotifier()
    await waitFor(() => expect(fetchMock).toHaveBeenCalled())
    expect(screen.queryByRole("status")).toBeNull()
  })
})
