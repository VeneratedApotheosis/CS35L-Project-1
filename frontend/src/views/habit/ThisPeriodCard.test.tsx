// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react"
import { afterEach, expect, it, vi } from "vitest"
import type { HabitDetail } from "@/lib/habits"
import { ThisPeriodCard } from "./ThisPeriodCard"

const habit: HabitDetail = {
  id: "one", owner_id: "me", name: "Read", description: null, plant_type: "pothos",
  start_date: "2026-11-07", created_at: "2026-11-07", interval_count: 1, interval_unit: "week", num_periods: 2, target_count: 3,
  stats: { state: "active", stage: 2, health: "healthy", overall_progress: 0.5, end_date: "2026-11-21",
    streak: 1, consistency: { successful: 1, completed: 2, rate: 0.5 },
    current_period: { number: 2, total: 2, start: "2026-11-14", end: "2026-11-21", count: 2, target: 3 },
    log_days: [], current_period_logs: [], periods: [] },
}
const props = { today: "2026-11-16", busy: false, onLogToday: vi.fn(), onLogDate: vi.fn() }
afterEach(() => { cleanup(); vi.clearAllMocks() })

it("shows a personal habit's own progress as the bar and logs today or another date", () => {
  render(<ThisPeriodCard habit={habit} {...props} />)
  expect(screen.getByRole("heading", { name: "This week" })).toBeTruthy()
  expect(screen.getByRole("progressbar", { name: "Read: current period" }).getAttribute("aria-valuenow")).toBe("2")
  expect(screen.getByText("Consistency")).toBeTruthy()
  expect(screen.getByText("Current streak")).toBeTruthy()
  fireEvent.click(screen.getByRole("button", { name: "Log today" }))
  fireEvent.click(screen.getByRole("button", { name: "Log date" }))
  expect(props.onLogToday).toHaveBeenCalledTimes(1)
  expect(props.onLogDate).toHaveBeenCalledTimes(1)
})

it("shows a shared habit's group average as the bar, with the member's own progress and figures beside it", () => {
  render(<ThisPeriodCard habit={habit} group={{ count: 1.5, target: 3 }} {...props} />)
  const card = screen.getByRole("region", { name: "This week" })
  expect(within(card).getByRole("progressbar", { name: "Group average this period" }).getAttribute("aria-valuenow")).toBe("1.5")
  expect(within(card).getByText("1.5/3")).toBeTruthy()
  expect(within(card).getByRole("progressbar", { name: "Your progress this period" }).getAttribute("aria-valuenow")).toBe("2")
  expect(within(card).getByRole("progressbar", { name: "Your overall progress" }).getAttribute("aria-valuenow")).toBe("50")
  expect(within(card).getByText("Your consistency")).toBeTruthy()
  expect(within(card).getByText("Your streak")).toBeTruthy()
})

it("lets a personal habit be logged before it starts, but not a shared one", () => {
  const upcoming = { ...habit, stats: { ...habit.stats, state: "not_started" as const } }
  const personal = render(<ThisPeriodCard habit={upcoming} {...props} />)
  expect((screen.getByRole("button", { name: "Log today" }) as HTMLButtonElement).disabled).toBe(false)
  personal.unmount()
  render(<ThisPeriodCard habit={upcoming} group={{ count: 0, target: 3 }} {...props} />)
  expect((screen.getByRole("button", { name: "Log today" }) as HTMLButtonElement).disabled).toBe(true)
  expect((screen.getByRole("button", { name: "Log date" }) as HTMLButtonElement).disabled).toBe(true)
  expect(screen.getByText("This habit starts on Nov 7, 2026. You can log from then.")).toBeTruthy()
})

it("locks logging while a save runs and once the habit has finished", () => {
  const busy = render(<ThisPeriodCard habit={habit} {...props} busy />)
  expect((screen.getByRole("button", { name: "Log today" }) as HTMLButtonElement).disabled).toBe(true)
  busy.unmount()
  render(<ThisPeriodCard habit={{ ...habit, stats: { ...habit.stats, state: "expired" } }} {...props} />)
  expect((screen.getByRole("button", { name: "Log date" }) as HTMLButtonElement).disabled).toBe(true)
  expect(screen.getByText("This habit has finished, so its activity is locked.")).toBeTruthy()
})
