// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react"
import { afterEach, expect, it, vi } from "vitest"
import { Modal } from "./Modal"

afterEach(() => { cleanup(); vi.restoreAllMocks() })

it("opens a native dialog, handles Escape, and restores the trigger focus", () => {
  const show = vi.fn(function (this: HTMLDialogElement) { this.setAttribute("open", "") })
  const close = vi.fn(function (this: HTMLDialogElement) { this.removeAttribute("open") })
  HTMLDialogElement.prototype.showModal = show
  HTMLDialogElement.prototype.close = close
  const trigger = document.createElement("button")
  document.body.appendChild(trigger)
  trigger.focus()
  const onClose = vi.fn()
  const view = render(<Modal open onClose={onClose} title="Log another day"><input aria-label="Day" /></Modal>)
  const dialog = screen.getByRole("dialog", { name: "Log another day" })
  expect(show).toHaveBeenCalledOnce()
  expect(screen.getByRole("textbox", { name: "Day" })).toBeTruthy()
  fireEvent(dialog, new Event("cancel", { bubbles: true, cancelable: true }))
  expect(onClose).toHaveBeenCalledOnce()
  view.unmount()
  expect(close).toHaveBeenCalledOnce()
  expect(document.activeElement).toBe(trigger)
  trigger.remove()
})
