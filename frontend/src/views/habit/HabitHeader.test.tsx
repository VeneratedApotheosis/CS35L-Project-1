// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react"
import { afterEach, expect, it, vi } from "vitest"
import { HabitHeader } from "./HabitHeader"

afterEach(cleanup)

it("shows the way back, the name and the description, and a Delete button when it is given a way to delete", () => {
  const onDelete = vi.fn()
  render(<HabitHeader habit={{ name: "Read", description: "A chapter each evening." }} onDelete={onDelete} />)
  expect(screen.getByRole("link", { name: "Back to Garden" }).getAttribute("href")).toBe("/")
  expect(screen.getByRole("heading", { name: "Read" })).toBeTruthy()
  expect(screen.getByText("A chapter each evening.")).toBeTruthy()
  fireEvent.click(screen.getByRole("button", { name: "Delete habit" }))
  expect(onDelete).toHaveBeenCalledTimes(1)
})

it("has no Delete button without a way to delete, as for a shared habit", () => {
  render(<HabitHeader habit={{ name: "Read", description: null }} />)
  expect(screen.queryByRole("button")).toBeNull()
})
