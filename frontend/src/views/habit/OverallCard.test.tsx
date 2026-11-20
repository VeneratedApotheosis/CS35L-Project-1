// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react"
import { afterEach, expect, it } from "vitest"
import type { HabitDetail } from "@/lib/habits"
import { OverallCard, runFigures } from "./OverallCard"

const period = (number: number, status: "completed" | "current" | "upcoming") =>
  ({ number, start: "2026-11-07", end: "2026-11-14", count: 0, target: 3, met: false, status })
const habit: HabitDetail = {
  id: "one", owner_id: "me", name: "Read", description: null, plant_type: "pothos",
  start_date: "2026-11-07", created_at: "2026-11-07", interval_count: 1, interval_unit: "week", num_periods: 2, target_count: 3,
  stats: { state: "active", stage: 2, health: "healthy", overall_progress: 0.5, end_date: "2026-11-21",
    streak: 1, consistency: { successful: 1, completed: 1, rate: 1 },
    current_period: { number: 2, total: 2, start: "2026-11-14", end: "2026-11-21", count: 1, target: 3 },
    log_days: [], current_period_logs: [], periods: [period(1, "completed"), period(2, "current")] },
}
const range = "Nov 14 – Nov 20"
afterEach(cleanup)

it("shows the goal, the period and the days left in it, with the period's dates and the habit's end", () => {
  render(<OverallCard habit={habit} today="2026-11-16" />)
  expect(screen.getByText("3×")).toBeTruthy()
  expect(screen.getByText("every week, from Nov 7")).toBeTruthy()
  expect(screen.getByText("2 of 2")).toBeTruthy()
  expect(screen.getByText("1 period done")).toBeTruthy()
  expect(screen.getByText("5 days")).toBeTruthy()
  expect(screen.getByText(range)).toBeTruthy()
  expect(screen.getByText("Habit ends Nov 20")).toBeTruthy()
})

it.each([
  ["2026-11-14", "7 days"],
  ["2026-11-16", "5 days"],
  ["2026-11-20", "1 day"],
])("on %s there are %s left in the period", (today, value) => {
  expect(runFigures(habit, today).left).toEqual({ value, notes: [range, "Habit ends Nov 20"] })
})

it.each([["2026-11-21"], ["2026-12-01"]])("on %s the habit is done", (today) => {
  expect(runFigures(habit, today).left).toEqual({ value: "Done", notes: ["Finished Nov 20"] })
})

it("is done once the server says the habit has expired", () => {
  const expired = { ...habit, stats: { ...habit.stats, state: "expired" as const } }
  expect(runFigures(expired, "2026-11-20").left.value).toBe("Done")
})

it("counts the days until the first period starts", () => {
  const upcoming = { ...habit, stats: { ...habit.stats, state: "not_started" as const } }
  expect(runFigures(upcoming, "2026-11-11").left).toEqual({ value: "3 days", notes: ["until it starts", range, "Habit ends Nov 20"] })
})

it("has no end date for an ongoing habit, and no total of periods", () => {
  const ongoing = { ...habit, num_periods: null, stats: { ...habit.stats, current_period: { ...habit.stats.current_period, total: null } } }
  const figures = runFigures(ongoing, "2026-11-16")
  expect(figures.left.notes).toEqual([range, "No end date"])
  expect(figures.period.value).toBe("2")
})

it("waits for today's date before counting", () => {
  expect(runFigures(habit, undefined).left.value).toBe("—")
})
