// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react"
import { afterEach, expect, it } from "vitest"
import type { HabitProgressStats } from "@/lib/habits"
import { HabitProgress } from "./HabitProgress"

const stats: HabitProgressStats = {
  state: "active", current_period: { number: 3, total: 4, start: "2026-11-15", end: "2026-11-22", count: 4, target: 3 },
  overall_progress: 0.625, consistency: { successful: 1, completed: 2, rate: 0.5 }, streak: 2,
}
afterEach(cleanup)
it("shows server stats and caps the bar while preserving the actual count", () => {
  render(<HabitProgress stats={stats} />)
  expect(screen.getByText("4/3")).toBeTruthy()
  expect(screen.getByRole("progressbar", { name: "Current period" }).getAttribute("aria-valuenow")).toBe("3")
  expect(screen.getByRole("progressbar", { name: "Overall progress" }).getAttribute("aria-valuenow")).toBe("63")
  expect(screen.getByText("50%")).toBeTruthy()
  expect(screen.getByText("2 periods")).toBeTruthy()
})
it("shows unavailable values as dashes without hiding a real zero", () => {
  render(<HabitProgress stats={{ ...stats, state: "not_started", overall_progress: 0,
    consistency: { successful: 0, completed: 0, rate: null }, streak: 0 }} />)
  expect(screen.getByText("—")).toBeTruthy()
  expect(screen.getByText("0%")).toBeTruthy()
  expect(screen.getByText("0 periods")).toBeTruthy()
  expect(screen.getByRole("progressbar", { name: "First period" })).toBeTruthy()
})
it("labels final-period stats and displays null overall progress as unavailable", () => {
  render(<HabitProgress stats={{ ...stats, state: "expired", overall_progress: null, streak: 1 }} />)
  expect(screen.getByRole("progressbar", { name: "Final period" })).toBeTruthy()
  expect(screen.getByRole("img", { name: "Overall progress: unavailable" })).toBeTruthy()
  expect(screen.getByText("1 period")).toBeTruthy()
})
