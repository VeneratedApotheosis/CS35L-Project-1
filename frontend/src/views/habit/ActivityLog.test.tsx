// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react"
import { afterEach, expect, it, vi } from "vitest"
import type { HabitDetail } from "@/lib/habits"
import { ActivityLog, activityDays } from "./ActivityLog"

const habit = (log_days: { date: string; count: number }[]): HabitDetail => ({
  id: "one", owner_id: "me", name: "Read", description: null, plant_type: "pothos",
  start_date: "2026-11-01", created_at: "2026-11-01", interval_count: 1, interval_unit: "day", num_periods: 30, target_count: 1,
  stats: { state: "active", stage: 2, health: "healthy", overall_progress: 0.5, end_date: "2026-12-01",
    streak: 1, consistency: { successful: 1, completed: 1, rate: 1 },
    current_period: { number: 10, total: 30, start: "2026-11-10", end: "2026-11-11", count: 1, target: 1 },
    log_days, current_period_logs: [], periods: [] },
})
const noop = () => Promise.resolve()
const days = (n: number) => Array.from({ length: n }, (_, i) => ({ date: `2026-11-${String(i + 1).padStart(2, "0")}`, count: 1 }))
afterEach(cleanup)

const withLogs = (log_days: { date: string; count: number }[], logs: { id: string; occurred_on: string }[]) => {
  const base = habit(log_days)
  return { ...base, stats: { ...base.stats, current_period_logs: logs } }
}

it("orders the days newest first and leaves out days with no activity", () => {
  expect(activityDays(habit([{ date: "2026-11-02", count: 1 }, { date: "2026-11-05", count: 0 }, { date: "2026-11-09", count: 3 }])))
    .toEqual([{ date: "2026-11-09", count: 3 }, { date: "2026-11-02", count: 1 }])
})

it("shows the latest four, and the rest behind Show all", () => {
  render(<ActivityLog habit={habit(days(9))} today="2026-11-10" busy={false} onRemove={noop} />)
  expect(screen.getAllByRole("listitem")).toHaveLength(4)
  expect(screen.getAllByRole("listitem")[0].textContent).toContain("Nov 9, 2026")
  fireEvent.click(screen.getByRole("button", { name: "Show all 9" }))
  expect(screen.getAllByRole("listitem")).toHaveLength(9)
  fireEvent.click(screen.getByRole("button", { name: "Show fewer" }))
  expect(screen.getAllByRole("listitem")).toHaveLength(4)
})

it("has no Show all when everything already fits, and says so when nothing is logged", () => {
  const view = render(<ActivityLog habit={habit(days(3))} today="2026-11-10" busy={false} onRemove={noop} />)
  expect(screen.queryByRole("button")).toBeNull()
  view.rerender(<ActivityLog habit={habit([])} today="2026-11-10" busy={false} onRemove={noop} />)
  expect(screen.getByText("Nothing logged yet.")).toBeTruthy()
})

it("takes one activity off a day of the current period: the latest one", () => {
  const onRemove = vi.fn(noop)
  const current = withLogs([{ date: "2026-11-10", count: 2 }, { date: "2026-11-03", count: 1 }],
    [{ id: "a", occurred_on: "2026-11-10" }, { id: "b", occurred_on: "2026-11-10" }])
  render(<ActivityLog habit={current} today="2026-11-10" busy={false} onRemove={onRemove} />)
  fireEvent.click(screen.getByRole("button", { name: "Remove one activity on Nov 10, 2026" }))
  expect(onRemove).toHaveBeenCalledWith("b")
  // Earlier periods are locked: the 3rd has no button.
  expect(screen.queryByRole("button", { name: /Nov 3, 2026/ })).toBeNull()
})

it("waits while a save runs, and has no buttons once the habit has finished", () => {
  const current = withLogs([{ date: "2026-11-10", count: 1 }], [{ id: "a", occurred_on: "2026-11-10" }])
  const view = render(<ActivityLog habit={current} today="2026-11-10" busy onRemove={noop} />)
  expect((screen.getByRole("button", { name: /Remove one activity/ }) as HTMLButtonElement).disabled).toBe(true)
  view.rerender(<ActivityLog habit={{ ...current, stats: { ...current.stats, state: "expired" } }} today="2026-11-10" busy={false} onRemove={noop} />)
  expect(screen.queryByRole("button", { name: /Remove one activity/ })).toBeNull()
})

it("does not throw when removing fails: the failure is shown elsewhere", async () => {
  const onRemove = vi.fn(() => Promise.reject(new Error("offline")))
  const current = withLogs([{ date: "2026-11-10", count: 1 }], [{ id: "a", occurred_on: "2026-11-10" }])
  render(<ActivityLog habit={current} today="2026-11-10" busy={false} onRemove={onRemove} />)
  fireEvent.click(screen.getByRole("button", { name: /Remove one activity/ }))
  await vi.waitFor(() => expect(onRemove).toHaveBeenCalled())
})
