// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react"
import { afterEach, expect, it, vi } from "vitest"
import type { HabitDetail } from "@/lib/habits"
import { ActivityCalendar } from "./ActivityCalendar"

// jsdom has no modal dialogs, so open and close them by hand.
HTMLDialogElement.prototype.showModal = function showModal() { this.setAttribute("open", "") }
HTMLDialogElement.prototype.close = function close() { this.removeAttribute("open") }

const habit: HabitDetail = {
  id: "one", owner_id: "me", name: "Read", description: null, plant_type: "pothos",
  start_date: "2028-02-01", created_at: "2028-02-01", interval_count: 1, interval_unit: "week", num_periods: 4, target_count: 3,
  stats: { state: "active", stage: 2, health: "healthy", overall_progress: 0.5, end_date: "2028-03-01",
    streak: 1, consistency: { successful: 1, completed: 2, rate: 0.5 },
    current_period: { number: 3, total: 4, start: "2028-02-15", end: "2028-02-22", count: 2, target: 3 },
    log_days: [{ date: "2028-02-03", count: 1 }, { date: "2028-02-16", count: 2 }, { date: "2028-02-29", count: 1 }],
    current_period_logs: [{ id: "log-a", occurred_on: "2028-02-16" }, { id: "log-b", occurred_on: "2028-02-16" }],
    periods: [
      { number: 1, start: "2028-02-01", end: "2028-02-08", count: 4, target: 3, met: true, status: "completed" },
      { number: 2, start: "2028-02-08", end: "2028-02-15", count: 1, target: 3, met: false, status: "completed" },
      { number: 3, start: "2028-02-15", end: "2028-02-22", count: 2, target: 3, met: false, status: "current" },
      { number: 4, start: "2028-02-22", end: "2028-03-01", count: 0, target: 3, met: false, status: "upcoming" },
    ],
  },
}
const noop = () => Promise.resolve()
afterEach(cleanup)

it("fills logged days, keeps their date, shows the count, includes leap day, and moves between months", () => {
  const view = render(<ActivityCalendar habit={habit} today="2028-02-16" busy={false} onRemove={noop} />)
  const logged = screen.getByRole("button", { name: "Feb 16, 2028: 2 activities, today. Manage" })
  expect(logged.getAttribute("data-logged")).toBe("true")
  expect(logged.textContent).toContain("×2")
  expect(logged.textContent).toContain("16")
  expect(screen.getByLabelText("Feb 29, 2028: 1 activity").textContent).toBe("29")
  const empty = screen.getByLabelText("Feb 1, 2028: 0 activities")
  expect(empty.getAttribute("data-logged")).toBe("false")
  expect(empty.textContent).toBe("1")
  expect(view.container.querySelectorAll("svg.lucide-leaf")).toHaveLength(0)
  expect(view.container.querySelectorAll(".habit-day[data-logged='true']")).toHaveLength(3)
  fireEvent.click(screen.getByRole("button", { name: "Next month" }))
  expect(screen.getByRole("table", { name: "Activity calendar for March 2028" })).toBeTruthy()
  expect(screen.queryByText(/No activities/)).toBeNull()
  expect(document.querySelectorAll(".habit-day[data-logged='true']")).toHaveLength(0)
  fireEvent.click(screen.getByRole("button", { name: "Previous month" }))
  expect(screen.getByLabelText("Feb 29, 2028: 1 activity")).toBeTruthy()
})

it("only lets the current period's days be managed; earlier ones are locked", () => {
  render(<ActivityCalendar habit={habit} today="2028-02-16" busy={false} onRemove={noop} />)
  expect(screen.getAllByRole("button", { name: /Manage$/ })).toHaveLength(1)
  expect(screen.getByLabelText("Feb 3, 2028: 1 activity").tagName).toBe("DIV")
})

it("lists a day's logs and removes the one chosen, then closes", async () => {
  const onRemove = vi.fn(noop)
  render(<ActivityCalendar habit={habit} today="2028-02-16" busy={false} onRemove={onRemove} />)
  fireEvent.click(screen.getByRole("button", { name: /Manage$/ }))
  const dialog = document.querySelector("dialog[open]") as HTMLElement
  expect(within(dialog).getByText("Feb 16, 2028")).toBeTruthy()
  expect(within(dialog).getAllByRole("button", { name: /^Remove activity/ })).toHaveLength(2)
  fireEvent.click(within(dialog).getByRole("button", { name: "Remove activity 2 on Feb 16, 2028" }))
  await waitFor(() => expect(onRemove).toHaveBeenCalledWith("log-b"))
  await waitFor(() => expect(document.querySelector("dialog[open]")).toBeNull())
})

it("keeps the dialog open when removing fails", async () => {
  const onRemove = vi.fn(() => Promise.reject(new Error("offline")))
  render(<ActivityCalendar habit={habit} today="2028-02-16" busy={false} onRemove={onRemove} />)
  fireEvent.click(screen.getByRole("button", { name: /Manage$/ }))
  const dialog = document.querySelector("dialog[open]") as HTMLElement
  fireEvent.click(within(dialog).getByRole("button", { name: "Remove activity 1 on Feb 16, 2028" }))
  await waitFor(() => expect(onRemove).toHaveBeenCalled())
  expect(document.querySelector("dialog[open]")).toBeTruthy()
})

it("disables removing while a save runs", () => {
  render(<ActivityCalendar habit={habit} today="2028-02-16" busy onRemove={noop} />)
  fireEvent.click(screen.getByRole("button", { name: /Manage$/ }))
  const dialog = document.querySelector("dialog[open]") as HTMLElement
  expect((within(dialog).getByRole("button", { name: /Remove activity 1/ }) as HTMLButtonElement).disabled).toBe(true)
})

it("locks every day once the habit has finished, even with stale log data", () => {
  render(<ActivityCalendar habit={{ ...habit, stats: { ...habit.stats, state: "expired" } }} today="2028-03-01" busy={false} onRemove={noop} />)
  expect(screen.queryByRole("button", { name: /Manage$/ })).toBeNull()
})

it("updates after fresh stats arrive", () => {
  const view = render(<ActivityCalendar habit={habit} today="2028-02-16" busy={false} onRemove={noop} />)
  view.rerender(<ActivityCalendar habit={{ ...habit, stats: { ...habit.stats, log_days: [], current_period_logs: [] } }}
    today="2028-02-16" busy={false} onRemove={noop} />)
  expect(screen.getByLabelText("Feb 16, 2028: 0 activities, today").getAttribute("data-logged")).toBe("false")
  expect(screen.queryByRole("button", { name: /Manage$/ })).toBeNull()
})

const cell = (label: string) => screen.getByLabelText(label).closest("td")!

it("joins the days of each period in a band, coloured by how it went", () => {
  render(<ActivityCalendar habit={habit} today="2028-02-16" busy={false} onRemove={noop} />)
  // Period 1 (met): Feb 1 is a Tuesday, so its band is one piece to the end of the row, then the 2nd period.
  expect(cell("Feb 1, 2028: 0 activities").getAttribute("data-period")).toBe("met")
  expect(cell("Feb 1, 2028: 0 activities").getAttribute("data-band")).toBe("start")
  expect(cell("Feb 3, 2028: 1 activity").getAttribute("data-band")).toBe("middle")
  expect(cell("Feb 7, 2028: 0 activities").getAttribute("data-band")).toBe("end")
  expect(cell("Feb 8, 2028: 0 activities").getAttribute("data-period")).toBe("missed")
  expect(cell("Feb 17, 2028: 0 activities").getAttribute("data-period")).toBe("current")
  expect(cell("Feb 23, 2028: 0 activities").getAttribute("data-period")).toBe("upcoming")
})

it("breaks a band at the end of the week and starts it again on the next row", () => {
  render(<ActivityCalendar habit={habit} today="2028-02-16" busy={false} onRemove={noop} />)
  // Period 2 is Feb 8 to 14: Tuesday to Monday.
  expect(cell("Feb 8, 2028: 0 activities").getAttribute("data-band")).toBe("start")
  expect(cell("Feb 12, 2028: 0 activities").getAttribute("data-band")).toBe("end")
  expect(cell("Feb 13, 2028: 0 activities").getAttribute("data-band")).toBe("start")
  expect(cell("Feb 14, 2028: 0 activities").getAttribute("data-band")).toBe("end")
})

it("outlines the days outside the habit's run, and fills the days inside it", () => {
  render(<ActivityCalendar habit={habit} today="2028-02-16" busy={false} onRemove={noop} />)
  // The run is Feb 1 to Feb 28 (the end, Mar 1, is exclusive).
  expect(screen.getByLabelText("Feb 1, 2028: 0 activities").getAttribute("data-outside")).toBe("false")
  expect(screen.getByLabelText("Feb 28, 2028: 0 activities").getAttribute("data-outside")).toBe("false")
  expect(screen.getByLabelText("Feb 29, 2028: 1 activity").getAttribute("data-outside")).toBe("true")
  fireEvent.click(screen.getByRole("button", { name: "Previous month" }))
  expect(screen.getByLabelText("Jan 31, 2028: 0 activities").getAttribute("data-outside")).toBe("true")
})

it("shows no count over the bands", () => {
  const view = render(<ActivityCalendar habit={habit} today="2028-02-16" busy={false} onRemove={noop} />)
  expect(view.container.querySelector(".habit-day__tally")).toBeNull()
})

it("draws no bands when there are no periods", () => {
  render(<ActivityCalendar habit={{ ...habit, stats: { ...habit.stats, periods: [] } }} today="2028-02-16" busy={false} onRemove={noop} />)
  expect(document.querySelectorAll("td[data-band]")).toHaveLength(0)
})
