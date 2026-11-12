// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react"
import { afterEach, expect, it } from "vitest"
import type { HabitDetail } from "@/lib/habits"
import { HabitHistory } from "./HabitHistory"

const habit: HabitDetail = {
  id: "one", owner_id: "me", name: "Read", description: null, plant_type: "pothos",
  start_date: "2028-02-01", created_at: "2028-02-01", interval_count: 1, interval_unit: "week", num_periods: 4, target_count: 3,
  stats: { state: "active", stage: 2, health: "healthy", overall_progress: 0.5, end_date: "2028-03-01",
    streak: 1, consistency: { successful: 1, completed: 2, rate: 0.5 },
    current_period: { number: 3, total: 4, start: "2028-02-15", end: "2028-02-22", count: 2, target: 3 },
    log_days: [{ date: "2028-02-16", count: 2 }, { date: "2028-02-29", count: 1 }],
    current_period_logs: [{ id: "log-a", occurred_on: "2028-02-16" }, { id: "log-b", occurred_on: "2028-02-16" }],
    periods: [
      { number: 1, start: "2028-02-01", end: "2028-02-08", count: 4, target: 3, met: true, status: "completed" },
      { number: 2, start: "2028-02-08", end: "2028-02-15", count: 1, target: 3, met: false, status: "completed" },
      { number: 3, start: "2028-02-15", end: "2028-02-22", count: 2, target: 3, met: false, status: "current" },
      { number: 4, start: "2028-02-22", end: "2028-03-01", count: 0, target: 3, met: false, status: "upcoming" },
    ],
  },
}
afterEach(cleanup)

it("marks logged days with counts, includes leap day, and navigates months", () => {
  render(<HabitHistory habit={habit} today="2028-02-16" />)
  expect(screen.getByLabelText("Feb 16, 2028: 2 activities, today").getAttribute("data-logged")).toBe("true")
  expect(screen.getByLabelText("Feb 29, 2028: 1 activity")).toBeTruthy()
  expect(screen.getByLabelText("Feb 1, 2028: 0 activities").getAttribute("data-logged")).toBe("false")
  fireEvent.click(screen.getByRole("button", { name: "Next month" }))
  expect(screen.getByRole("table", { name: "Activity calendar for March 2028" })).toBeTruthy()
  expect(screen.getByText("No activities logged this month.")).toBeTruthy()
  fireEvent.click(screen.getByRole("button", { name: "Previous month" }))
  expect(screen.getByLabelText("Feb 29, 2028: 1 activity")).toBeTruthy()
})

it("lists every period, distinguishes results with text, and links editable logs", () => {
  const view = render(<HabitHistory habit={habit} today="2028-02-16" />)
  expect(screen.getAllByRole("heading", { level: 4 })).toHaveLength(4)
  expect(screen.getByText("✓ Goal met")).toBeTruthy()
  expect(screen.getByText("− Goal missed")).toBeTruthy()
  expect(screen.getByText("Current · In progress")).toBeTruthy()
  expect(screen.getByText("Upcoming")).toBeTruthy()
  expect(screen.getByText("4/3 activities")).toBeTruthy()
  expect(view.container.querySelector('[aria-current="step"]')?.textContent).toContain("Period 3")
  expect(screen.getAllByRole("link")).toHaveLength(2)
  expect(screen.getAllByRole("link")[0].getAttribute("href")).toBe("#delete-log-log-a")
  // Backend end dates are exclusive: the visible last day is the 7th.
  expect(screen.getByText("Feb 7, 2028")).toBeTruthy()
})

it("removes management links when the habit expires, even with stale log data", () => {
  render(<HabitHistory habit={{ ...habit, stats: { ...habit.stats, state: "expired" } }} today="2028-03-01" />)
  expect(screen.queryByRole("link")).toBeNull()
})

it("updates counts and period results after fresh stats arrive", () => {
  const view = render(<HabitHistory habit={habit} today="2028-02-16" />)
  view.rerender(<HabitHistory habit={{ ...habit, stats: { ...habit.stats, log_days: [], current_period_logs: [] } }} today="2028-02-16" />)
  expect(screen.getByLabelText("Feb 16, 2028: 0 activities, today").getAttribute("data-logged")).toBe("false")
  expect(screen.queryByRole("link")).toBeNull()
})

it("reopens collapsed activities when managing a log from history", () => {
  render(<><details><summary>Activities this period</summary><button id="delete-log-log-a">Delete activity</button></details><HabitHistory habit={habit} today="2028-02-16" /></>)
  const target = screen.getByText("Delete activity")
  expect(target.closest("details")?.open).toBe(false)
  fireEvent.click(screen.getByRole("link", { name: /Manage activity 1/ }))
  expect(target.closest("details")?.open).toBe(true)
})
