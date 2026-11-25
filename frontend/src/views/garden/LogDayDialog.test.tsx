// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen, within } from "@testing-library/react"
import { afterEach, beforeEach, expect, it, vi } from "vitest"
import type { HabitWithStats } from "@/lib/habits"
import { LogDayDialog } from "./LogDayDialog"

vi.mock("@/lib/supabase", () => ({ supabase: {} }))

const habit = {
  id: "habit-1", name: "Read",
  stats: { state: "active", current_period: { start: "2027-12-30" } },
} as HabitWithStats

beforeEach(() => {
  HTMLDialogElement.prototype.showModal = function () { this.setAttribute("open", "") }
  HTMLDialogElement.prototype.close = function () { this.removeAttribute("open") }
})
afterEach(() => { cleanup(); vi.useRealTimers() })

const day = (iso: string) => document.querySelector<HTMLButtonElement>(`[data-day="${iso}"] button`)!

it("opens to the supplied latest month, limits dates, and navigates across years and leap day", () => {
  vi.useFakeTimers({ toFake: ["Date"] })
  vi.setSystemTime(new Date("2000-01-01T00:00:00Z"))
  render(<LogDayDialog habit={habit} today="2028-03-01" onSave={vi.fn()} onClose={vi.fn()} />)
  expect(screen.getByText("March 2028")).toBeTruthy()
  expect(day("2028-03-01").disabled).toBe(false)
  expect(day("2028-03-02").disabled).toBe(true)
  expect(day("2028-03-01").getAttribute("aria-label")).toContain("Today")
  fireEvent.click(screen.getByRole("button", { name: /previous month/i }))
  expect(screen.getByText("February 2028")).toBeTruthy()
  expect(day("2028-02-29").disabled).toBe(false)
  fireEvent.click(screen.getByRole("button", { name: /previous month/i }))
  fireEvent.click(screen.getByRole("button", { name: /previous month/i }))
  expect(screen.getByText("December 2027")).toBeTruthy()
  expect(day("2027-12-29").disabled).toBe(true)
  expect(day("2027-12-30").disabled).toBe(false)
})

it("navigates and selects with the keyboard, then saves a date-only value", async () => {
  const save = vi.fn().mockResolvedValue(undefined)
  const close = vi.fn()
  render(<LogDayDialog habit={habit} today="2028-02-29" onSave={save} onClose={close} />)
  expect(screen.getByText("No date selected")).toBeTruthy()
  act(() => day("2028-02-28").focus())
  fireEvent.keyDown(day("2028-02-28"), { key: "ArrowRight" })
  expect(document.activeElement).toBe(day("2028-02-29"))
  fireEvent.click(day("2028-02-29"))
  expect(screen.getByText("February 29, 2028")).toBeTruthy()
  expect(screen.queryByText("No date selected")).toBeNull()
  expect(screen.getByText("Selected Feb 29, 2028").getAttribute("role")).toBe("status")
  expect(day("2028-02-29").getAttribute("aria-label")).toContain("selected")
  fireEvent.click(screen.getByRole("button", { name: "Log activity" }))
  await vi.waitFor(() => expect(save).toHaveBeenCalledWith("habit-1", "2028-02-29"))
  expect(close).toHaveBeenCalledOnce()
})

it("prevents submission without a selection and keeps controls disabled while saving", async () => {
  let resolve!: () => void
  const save = vi.fn(() => new Promise<void>((done) => { resolve = done }))
  render(<LogDayDialog habit={habit} today="2028-02-29" onSave={save} onClose={() => {}} />)
  const dialog = screen.getByRole("dialog", { name: "Log another day" })
  fireEvent.click(within(dialog).getByRole("button", { name: "Log activity" }))
  expect(within(dialog).getByRole("alert").textContent).toContain("Choose a day from")
  expect(save).not.toHaveBeenCalled()
  fireEvent.click(day("2028-02-29"))
  fireEvent.click(within(dialog).getByRole("button", { name: "Log activity" }))
  expect((within(dialog).getByRole("button", { name: "Saving…" }) as HTMLButtonElement).disabled).toBe(true)
  expect(day("2028-02-28").disabled).toBe(true)
  resolve()
  await vi.waitFor(() => expect(save).toHaveBeenCalledOnce())
})

it("closes on Escape and restores focus to the trigger", () => {
  const trigger = document.createElement("button")
  document.body.appendChild(trigger)
  trigger.focus()
  const close = vi.fn()
  const view = render(<LogDayDialog habit={habit} today="2028-02-29" onSave={vi.fn()} onClose={close} />)
  fireEvent(screen.getByRole("dialog", { name: "Log another day" }), new Event("cancel", { bubbles: true, cancelable: true }))
  expect(close).toHaveBeenCalledOnce()
  view.rerender(<LogDayDialog habit={null} today="2028-02-29" onSave={vi.fn()} onClose={close} />)
  expect(document.activeElement).toBe(trigger)
  trigger.remove()
})
