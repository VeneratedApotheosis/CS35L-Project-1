// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen, within } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { QueryProvider } from "@/lib/QueryProvider"
import type { HabitWithStats } from "@/lib/habits"
import { GardenShelves, type GardenShelvesProps } from "./GardenShelves"
import { CLICK_MAX_MS, HOLD_MS, progressLine } from "./GardenPlant"
import { HOVER_CARD_WIDTH } from "./gardenLayout"
import { encouragement, progressTitle, remainingLine } from "./HabitCard"

const auth = vi.hoisted(() => {
  vi.stubEnv("NEXT_PUBLIC_API_URL", "http://api.test")
  return { user: { id: "user-a" }, signOut: vi.fn(), getSession: vi.fn() }
})
vi.mock("@/auth/useAuth", () => ({ useAuth: () => auth }))
vi.mock("next/navigation", () => ({ useRouter: () => ({ replace: vi.fn(), push: vi.fn() }) }))
vi.mock("@/lib/supabase", () => ({ supabase: { auth: { getSession: auth.getSession } } }))
// The plants' drawings are not what these tests are about.
vi.mock("@/pottedPlant/plants/plantTypes", () => {
  const plant = { id: "pothos", label: "Pothos", blurb: "", Preview: () => <svg data-testid="plant" /> }
  return { DEFAULT_PLANT_TYPE: "pothos", PLANT_TYPES: [plant], plantTypeById: () => plant }
})

// jsdom has no modal dialogs, so open and close them by hand.
HTMLDialogElement.prototype.showModal = function showModal() { this.setAttribute("open", "") }
HTMLDialogElement.prototype.close = function close() { this.removeAttribute("open") }

const fetchMock = vi.fn()
const habit = (id: string, name: string, patch: Partial<HabitWithStats> = {}): HabitWithStats => ({
  id, owner_id: "user-a", name, description: null, plant_type: "pothos", target_count: 3,
  interval_count: 1, interval_unit: "week", num_periods: 8, start_date: "2026-11-01",
  created_at: `2026-11-0${id.length}T00:00:00Z`,
  stats: { state: "active", stage: 3, health: "healthy", overall_progress: 0.4,
    current_period: { number: 2, total: 8, start: "2026-11-14", end: "2026-11-21", count: 2, target: 3 } },
  ...patch,
})
const read = habit("a", "Read")
const walk = habit("bb", "Walk", { stats: { ...read.stats, state: "expired" } })

const onLogToday = vi.fn()
const onLogOn = vi.fn()
function show(habits: HabitWithStats[], props: Partial<GardenShelvesProps> = {}) {
  return render(
    <QueryProvider>
      <GardenShelves habits={habits} userId="user-a" today="2026-11-16" loggingDisabled={false}
        onLogToday={onLogToday} onLogOn={onLogOn} {...props} />
    </QueryProvider>,
  )
}
const plant = (name: RegExp | string) => screen.getByRole("button", { name })
/** Closed dialogs stay in the page, so find the one that is open. */
const openDialog = () => document.querySelector<HTMLElement>("dialog[open]")!

beforeEach(() => {
  auth.getSession.mockResolvedValue({ data: { session: { access_token: "token-a" } } })
  fetchMock.mockResolvedValue(new Response(JSON.stringify({}), { status: 200, headers: { "Content-Type": "application/json" } }))
  vi.stubGlobal("fetch", fetchMock)
})
afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
  vi.useRealTimers()
  vi.clearAllMocks()
})

describe("the shelves", () => {
  it("shows each habit as a plant button with the whole story in its label, its name, and a pot that adds a habit", () => {
    show([read, walk])
    expect(plant("Read, 2 of 3 this period, healthy")).toBeTruthy()
    expect(plant(/^Walk,/)).toBeTruthy()
    expect(screen.getAllByTestId("plant")).toHaveLength(2)
    expect(screen.getByRole("link", { name: "Add a habit" }).getAttribute("href")).toBe("/create")
  })

  it("keeps the plants in the order the habits were made", () => {
    show([walk, read])
    const names = screen.getAllByRole("button", { name: /,/ }).map((button) => button.getAttribute("aria-label")?.split(",")[0])
    expect(names).toEqual(["Read", "Walk"])
  })

  it("shows only the plant until the pointer comes: not even the name", () => {
    show([read])
    expect(screen.queryByRole("progressbar")).toBeNull()
    expect(screen.queryByText("Read")).toBeNull()
    expect(document.querySelector(".garden-card")).toBeNull()
  })

  it("puts at most three pots on a shelf, and starts another shelf for more", () => {
    const shelves = (count: number) => {
      cleanup()
      const names = Array.from({ length: count }, (_, index) => habit("x".repeat(index + 1), `Habit ${index}`))
      show(names)
      return document.querySelectorAll("[data-shelf]").length
    }
    expect(shelves(2)).toBe(1) // two plants and the add pot
    expect(shelves(3)).toBe(2) // the add pot is the fourth
    expect(shelves(8)).toBe(3) // nine pots
  })

  it("puts the finished habits on their own shelves beneath the active ones, with no add pot there", () => {
    show([read, walk])
    const active = screen.getAllByRole("button", { name: /^Read,/ })[0]
    const heading = screen.getByRole("heading", { name: "Completed garden" })
    const finished = screen.getByRole("button", { name: /^Walk,/ })
    expect(heading.compareDocumentPosition(active) & Node.DOCUMENT_POSITION_PRECEDING).toBeTruthy()
    expect(heading.compareDocumentPosition(finished) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    expect(screen.getAllByRole("link", { name: "Add a habit" })).toHaveLength(1)
  })

  it("has no completed garden until a habit has finished", () => {
    show([read])
    expect(screen.queryByRole("heading", { name: "Completed garden" })).toBeNull()
  })
})

describe("hover", () => {
  it("shows a card with the name, what is left, the progress pills and how far the goal is, and takes it away when the pointer leaves", () => {
    show([read])
    fireEvent.pointerEnter(plant(/^Read,/), { pointerType: "mouse" })
    const card = document.querySelector<HTMLElement>(".garden-card")!
    expect(within(card).getByRole("heading", { name: "Read" })).toBeTruthy()
    expect(card.textContent).toContain("5 days left this week")
    expect(card.textContent).toContain("Weekly progress")
    expect(card.textContent).toContain("2/3")
    expect(card.textContent).toContain("One more to reach your goal!")
    expect(card.textContent).not.toContain("Hold the plant")
    const bar = within(card).getByRole("progressbar")
    expect(bar.getAttribute("aria-valuenow")).toBe("2")
    expect(bar.querySelectorAll(".habit-progress__step")).toHaveLength(3)
    expect(bar.querySelectorAll(".habit-progress__step--complete")).toHaveLength(2)
    // The see-through square is behind the plant: its own element, ahead of the plant in the page.
    const surface = document.querySelector(".garden-card__surface")!
    expect(surface.compareDocumentPosition(document.querySelector(".garden-plant")!) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    fireEvent.pointerLeave(plant(/^Read,/), { pointerType: "mouse" })
    expect(document.querySelector(".garden-card")).toBeNull()
    expect(document.querySelector(".garden-card__surface")).toBeNull()
  })

  it("does not change the card at all while a log is being saved, so nothing shifts when logging", () => {
    const view = show([read])
    fireEvent.pointerEnter(plant(/^Read,/), { pointerType: "mouse" })
    const before = document.querySelector(".garden-card")!.innerHTML
    view.rerender(
      <QueryProvider>
        <GardenShelves habits={[read]} userId="user-a" today="2026-11-16" loggingDisabled
          onLogToday={onLogToday} onLogOn={onLogOn} />
      </QueryProvider>,
    )
    expect(document.querySelector(".garden-card")!.innerHTML).toBe(before)
  })

  it("shows the streak in the card once it is known", async () => {
    fetchMock.mockResolvedValue(new Response(JSON.stringify({ ...read, stats: { ...read.stats, streak: 2 } }), { status: 200, headers: { "Content-Type": "application/json" } }))
    show([read])
    fireEvent.pointerEnter(plant(/^Read,/), { pointerType: "mouse" })
    expect(await screen.findByText("2 week streak")).toBeTruthy()
  })

  it("turns the goal into words: a goal met, a bigger goal, and a goal every few weeks", () => {
    const base = read.stats.current_period
    expect(encouragement(habit("e", "A", { stats: { ...read.stats, current_period: { ...base, count: 3 } } }))).toBe("Goal reached. Nice work!")
    expect(encouragement(habit("f", "B", { stats: { ...read.stats, current_period: { ...base, count: 0, target: 4 } } }))).toBe("4 more to reach your goal")
    expect(progressTitle(read)).toBe("Weekly progress")
    expect(progressTitle(habit("g", "C", { interval_count: 2 }))).toBe("Progress this period")
    expect(remainingLine(read, "2026-11-20")).toBe("1 day left this week")
    expect(remainingLine(read, "2026-11-21")).toBe("Ends today")
    expect(remainingLine(walk, "2026-11-16")).toBe("Finished")
    const soon = habit("c", "Run", { start_date: "2026-11-20", stats: { ...read.stats, state: "not_started" } })
    expect(remainingLine(soon, "2026-11-16")).toMatch(/^Starts .*20/)
  })

  it("draws one continuous bar for a goal of more than ten", () => {
    const base = read.stats.current_period
    show([habit("h", "Big", { stats: { ...read.stats, current_period: { ...base, count: 12, target: 20 } } })])
    fireEvent.pointerEnter(plant(/^Big,/), { pointerType: "mouse" })
    const bar = within(document.querySelector<HTMLElement>(".garden-card")!).getByRole("progressbar")
    expect(bar.querySelectorAll(".habit-progress__step")).toHaveLength(0)
    expect(bar.querySelector<HTMLElement>(".habit-progress__fill")!.style.width).toBe("60%")
  })

  it("is not shown for a touch, which has no hover", () => {
    show([read])
    fireEvent.pointerEnter(plant(/^Read,/), { pointerType: "touch" })
    expect(screen.queryByRole("progressbar")).toBeNull()
  })

  it("says what state a habit that is not running is in", () => {
    const soon = habit("c", "Run", { start_date: "2026-11-20", stats: { ...read.stats, state: "not_started" } })
    expect(progressLine(soon, "2026-11-16")).toMatch(/^Starts .*20/)
    expect(progressLine(walk, "2026-11-16")).toBe("Finished")
    expect(progressLine(read, "2026-11-20")).toBe("2 of 3 · 1 day left")
    expect(progressLine(read, "2026-11-21")).toBe("2 of 3 · ends today")
    expect(progressLine(read, "")).toBe("2 of 3")
  })
})

describe("hold", () => {
  const press = (button: HTMLElement) => fireEvent.pointerDown(button, { button: 0, isPrimary: true, clientX: 10, clientY: 10 })

  it("logs today after the hold time, with a ring filling meanwhile, and does not also open the panel", () => {
    vi.useFakeTimers()
    show([read])
    const button = plant(/^Read,/)
    press(button)
    expect(button.closest(".garden-plant")?.getAttribute("data-holding")).toBe("true")
    // The hover card stays up while it is held, even for a touch, which has no hover.
    expect(document.querySelector(".garden-card")).toBeTruthy()
    expect(onLogToday).not.toHaveBeenCalled()
    act(() => void vi.advanceTimersByTime(HOLD_MS))
    expect(onLogToday).toHaveBeenCalledWith("a")
    fireEvent.pointerUp(button)
    fireEvent.click(button, { detail: 1 })
    expect(screen.queryByRole("dialog", { name: "Read" })).toBeNull()
  })

  it("opens the panel for a normal click: a quick press and release", () => {
    vi.useFakeTimers()
    show([read])
    const button = plant(/^Read,/)
    press(button)
    act(() => void vi.advanceTimersByTime(CLICK_MAX_MS - 100))
    fireEvent.pointerUp(button)
    fireEvent.click(button, { detail: 1 })
    expect(onLogToday).not.toHaveBeenCalled()
    expect(screen.getByRole("dialog", { name: "Read" })).toBeTruthy()
  })

  it("opens neither the panel nor a log when a hold is let go before it is long enough to log", () => {
    vi.useFakeTimers()
    show([read])
    const button = plant(/^Read,/)
    press(button)
    act(() => void vi.advanceTimersByTime(HOLD_MS - 100))
    fireEvent.pointerUp(button)
    fireEvent.click(button, { detail: 1 })
    expect(onLogToday).not.toHaveBeenCalled()
    expect(screen.queryByRole("dialog", { name: "Read" })).toBeNull()
  })

  it("never opens the panel after a hold, even where holding cannot log (a finished habit, or a log being saved)", () => {
    vi.useFakeTimers()
    show([walk])
    const finished = plant(/^Walk,/)
    press(finished)
    act(() => void vi.advanceTimersByTime(HOLD_MS + 200))
    fireEvent.pointerUp(finished)
    fireEvent.click(finished, { detail: 1 })
    expect(screen.queryByRole("dialog", { name: "Walk" })).toBeNull()
    cleanup()
    show([read], { loggingDisabled: true })
    const busy = plant(/^Read,/)
    press(busy)
    act(() => void vi.advanceTimersByTime(HOLD_MS + 200))
    fireEvent.pointerUp(busy)
    fireEvent.click(busy, { detail: 1 })
    expect(screen.queryByRole("dialog", { name: "Read" })).toBeNull()
  })

  it("opens the panel for a keyboard click, which has no press", () => {
    show([read])
    fireEvent.click(plant(/^Read,/), { detail: 0 })
    expect(screen.getByRole("dialog", { name: "Read" })).toBeTruthy()
  })

  it("does nothing for a habit that has finished, or while another log is being saved", () => {
    vi.useFakeTimers()
    show([walk])
    press(plant(/^Walk,/))
    act(() => void vi.advanceTimersByTime(HOLD_MS))
    expect(onLogToday).not.toHaveBeenCalled()
    cleanup()
    show([read], { loggingDisabled: true })
    press(plant(/^Read,/))
    act(() => void vi.advanceTimersByTime(HOLD_MS))
    expect(onLogToday).not.toHaveBeenCalled()
  })

  it("has no options menu: a right-click opens nothing", () => {
    show([read])
    fireEvent.contextMenu(plant(/^Read,/))
    expect(screen.queryByRole("group")).toBeNull()
    expect(screen.queryByRole("dialog")).toBeNull()
  })
})

describe("the panel beside the plant", () => {
  const open = () => {
    fireEvent.click(plant(/^Read,/), { detail: 1 })
    return screen.getByRole("dialog", { name: "Read" })
  }

  it("opens on a click, beside the plant and not as a page-wide modal, with the overview and the quick actions", () => {
    show([read])
    const panel = open()
    expect(panel.closest(".garden-plant")).toBeTruthy()
    expect(panel.closest("dialog")).toBeNull()
    expect(panel.closest(".garden-plant")?.getAttribute("data-side")).toBeTruthy()
    expect(panel.textContent).toContain("3 times every week for 8 weeks")
    expect(within(panel).getByRole("progressbar").getAttribute("aria-valuenow")).toBe("2")
    expect(panel.textContent).toContain("One more to reach your goal!")
    expect(panel.textContent).toContain("Health")
    expect(panel.textContent).toContain("Streak")
    expect(panel.textContent).toContain("Started")
    expect(panel.textContent).toContain("Nov 1")
    expect(within(panel).getByRole("link", { name: "View details" }).getAttribute("href")).toBe("/habit?id=a")
    fireEvent.click(within(panel).getByRole("button", { name: "Log today" }))
    expect(onLogToday).toHaveBeenCalledWith("a")
    expect(screen.queryByRole("dialog", { name: "Read" })).toBeNull()
  })

  it("closes on a press anywhere outside it, and on Escape", () => {
    show([read])
    open()
    fireEvent.pointerDown(document.body)
    expect(screen.queryByRole("dialog", { name: "Read" })).toBeNull()
    open()
    fireEvent.keyDown(document, { key: "Escape" })
    expect(screen.queryByRole("dialog", { name: "Read" })).toBeNull()
  })

  it("stays open for a press inside it", () => {
    show([read])
    fireEvent.pointerDown(within(open()).getByText("Health"))
    expect(screen.getByRole("dialog", { name: "Read" })).toBeTruthy()
  })

  it("is closed by a second click on the same plant, and moves to another plant that is clicked", () => {
    show([read, habit("bb", "Walk")])
    open()
    fireEvent.pointerDown(plant(/^Read,/))
    fireEvent.click(plant(/^Read,/), { detail: 1 })
    expect(screen.queryByRole("dialog", { name: "Read" })).toBeNull()
    open()
    fireEvent.pointerDown(plant(/^Walk,/))
    fireEvent.click(plant(/^Walk,/), { detail: 1 })
    expect(screen.queryByRole("dialog", { name: "Read" })).toBeNull()
    expect(screen.getByRole("dialog", { name: "Walk" })).toBeTruthy()
  })

  it("keeps the hover card open, even once the pointer has gone, and sets itself beside the card, not over it", () => {
    show([read])
    fireEvent.pointerEnter(plant(/^Read,/), { pointerType: "mouse" })
    const panel = open()
    fireEvent.pointerLeave(plant(/^Read,/), { pointerType: "mouse" })
    expect(document.querySelector(".garden-card")).toBeTruthy()
    expect(document.querySelector(".garden-card__surface")).toBeTruthy()
    // The panel starts half the card's width from the plant's middle, centred on the card's height.
    const wrapper = panel.closest<HTMLElement>(".garden-plant")!
    expect(wrapper.style.getPropertyValue("--card-half")).toBe(`${HOVER_CARD_WIDTH / 2}px`)
    expect(wrapper.style.getPropertyValue("--card-top")).toMatch(/^-?\d+(\.\d+)?px$/)
    expect(wrapper.style.getPropertyValue("--card-height")).toMatch(/^\d+(\.\d+)?px$/)
  })

  it("takes the card away with the panel once the pointer is gone, and closes with its close button", () => {
    show([read])
    fireEvent.pointerEnter(plant(/^Read,/), { pointerType: "mouse" })
    const panel = open()
    fireEvent.pointerLeave(plant(/^Read,/), { pointerType: "mouse" })
    fireEvent.click(within(panel).getByRole("button", { name: "Close" }))
    expect(screen.queryByRole("dialog", { name: "Read" })).toBeNull()
    expect(document.querySelector(".garden-card")).toBeNull()
  })

  it("does not offer logging for a habit that has finished", () => {
    show([walk])
    fireEvent.click(plant(/^Walk,/), { detail: 1 })
    const panel = screen.getByRole("dialog", { name: "Walk" })
    expect(within(panel).queryByRole("button", { name: "Log today" })).toBeNull()
    expect(within(panel).getByRole("button", { name: "Delete habit" })).toBeTruthy()
  })

  it("turns logging off while another log is being saved", () => {
    show([read], { loggingDisabled: true })
    expect((within(open()).getByRole("button", { name: "Log today" }) as HTMLButtonElement).disabled).toBe(true)
  })

  it("asks before deleting", () => {
    show([read])
    fireEvent.click(within(open()).getByRole("button", { name: "Delete habit" }))
    expect(openDialog().textContent).toContain("Delete this habit?")
    expect(fetchMock).not.toHaveBeenCalled()
  })
})

describe("log another day", () => {
  const open = () => {
    fireEvent.click(plant(/^Read,/), { detail: 1 })
    fireEvent.click(within(screen.getByRole("dialog", { name: "Read" })).getByRole("button", { name: "Choose date" }))
    return openDialog()
  }
  const pick = (dialog: HTMLElement, date: string) =>
    fireEvent.change(within(dialog).getByLabelText("Day"), { target: { value: date } })
  const save = (dialog: HTMLElement) => fireEvent.submit(within(dialog).getByLabelText("Day").closest("form")!)

  it("only allows days from the period's start to today", () => {
    show([read])
    const day = within(open()).getByLabelText("Day") as HTMLInputElement
    expect(day.min).toBe("2026-11-14")
    expect(day.max).toBe("2026-11-16")
  })

  it("refuses a day outside that range without calling the server", () => {
    show([read])
    const dialog = open()
    pick(dialog, "2026-11-10")
    save(dialog)
    expect(within(dialog).getByRole("alert", { hidden: true }).textContent).toContain("Choose a day from")
    expect(onLogOn).not.toHaveBeenCalled()
  })

  it("logs the chosen day and closes", async () => {
    onLogOn.mockResolvedValue(undefined)
    show([read])
    const dialog = open()
    pick(dialog, "2026-11-15")
    await act(async () => save(dialog))
    expect(onLogOn).toHaveBeenCalledWith("a", "2026-11-15")
    expect(dialog.hasAttribute("open")).toBe(false)
  })

  it("shows why it failed and stays open", async () => {
    onLogOn.mockRejectedValue(new Error("offline"))
    show([read])
    const dialog = open()
    pick(dialog, "2026-11-15")
    await act(async () => save(dialog))
    expect(within(dialog).getByRole("alert", { hidden: true }).textContent).toContain("Couldn't log activity")
    expect(dialog.hasAttribute("open")).toBe(true)
  })
})
