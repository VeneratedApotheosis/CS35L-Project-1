// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react"
import { afterEach, expect, it, vi } from "vitest"
import { Toast } from "./Toast"
import { Modal } from "./Modal"

afterEach(() => { cleanup(); document.getElementById("toast-stack")?.remove(); vi.unstubAllGlobals(); vi.useRealTimers() })

function mockDialogs() {
  HTMLDialogElement.prototype.showModal = function () { this.setAttribute("open", "") }
  HTMLDialogElement.prototype.close = function () { this.removeAttribute("open") }
}

it("shares a stack between notifications and preserves their actions", () => {
  const undo = vi.fn()
  const dismiss = vi.fn()
  render(<><Toast message="Badge earned" className="toast--raised" onDismiss={dismiss} />
    <Toast message="Activity logged" onDismiss={dismiss} action={{ label: "Undo", onClick: undo }} /></>)
  const stack = document.getElementById("toast-stack")!
  expect(stack.querySelectorAll(".toast")).toHaveLength(2)
  expect(screen.getByText("Badge earned").closest(".toast")?.classList.contains("toast--raised")).toBe(true)
  fireEvent.click(screen.getByRole("button", { name: "Undo" }))
  expect(undo).toHaveBeenCalledOnce()
  expect(dismiss).toHaveBeenCalledOnce()
})

it("tracks the visible viewport while editing and removes listeners on unmount", async () => {
  const viewport = Object.assign(new EventTarget(), { height: 800, offsetTop: 0, scale: 1 })
  vi.stubGlobal("visualViewport", viewport)
  vi.stubGlobal("innerHeight", 800)
  const input = document.createElement("input")
  document.body.appendChild(input)
  const view = render(<Toast message="Saved" onDismiss={() => {}} />)
  const stack = document.getElementById("toast-stack")!
  input.focus()
  viewport.height = 500
  act(() => viewport.dispatchEvent(new Event("resize")))
  expect(stack.style.getPropertyValue("--keyboard-inset")).toBe("300px")
  input.blur()
  expect(stack.style.getPropertyValue("--keyboard-inset")).toBe("300px")
  viewport.height = 800
  act(() => viewport.dispatchEvent(new Event("resize")))
  expect(stack.style.getPropertyValue("--keyboard-inset")).toBe("0px")
  view.unmount()
  expect(stack.style.getPropertyValue("--keyboard-inset")).toBe("")
  input.remove()
})

it("pauses elapsed time across overlapping dialogs and resumes only after the last closes", () => {
  vi.useFakeTimers()
  mockDialogs()
  const dismiss = vi.fn()
  const renderState = (first: boolean, second: boolean) => <>
    <Toast message="Saved" onDismiss={dismiss} />
    <Modal open={first} title="First" onClose={() => {}}>First</Modal>
    <Modal open={second} title="Second" onClose={() => {}}>Second</Modal>
  </>
  const view = render(renderState(false, false))
  act(() => vi.advanceTimersByTime(2000))
  view.rerender(renderState(true, false))
  act(() => vi.advanceTimersByTime(5000))
  view.rerender(renderState(true, true))
  view.rerender(renderState(false, true))
  act(() => vi.advanceTimersByTime(5000))
  expect(dismiss).not.toHaveBeenCalled()
  view.rerender(renderState(false, false))
  act(() => vi.advanceTimersByTime(1000))
  view.rerender(renderState(true, false))
  act(() => vi.advanceTimersByTime(5000))
  view.rerender(renderState(false, false))
  act(() => vi.advanceTimersByTime(1999))
  expect(dismiss).not.toHaveBeenCalled()
  act(() => vi.advanceTimersByTime(1))
  expect(dismiss).toHaveBeenCalledOnce()
  view.unmount()
  expect(vi.getTimerCount()).toBe(0)
})

it("starts a toast under an open dialog only after it closes, and cancels its timer on Undo", () => {
  vi.useFakeTimers()
  mockDialogs()
  const undo = vi.fn()
  const dismiss = vi.fn()
  const dialog = (open: boolean) => <Modal open={open} title="Badge" onClose={() => {}}>Badge</Modal>
  const view = render(<>{dialog(true)}</>)
  view.rerender(<>{dialog(true)}<Toast message="Activity logged" onDismiss={dismiss} action={{ label: "Undo", onClick: undo }} /></>)
  act(() => vi.advanceTimersByTime(10000))
  expect(dismiss).not.toHaveBeenCalled()
  view.rerender(<>{dialog(false)}<Toast message="Activity logged" onDismiss={dismiss} action={{ label: "Undo", onClick: undo }} /></>)
  act(() => vi.advanceTimersByTime(4999))
  expect(dismiss).not.toHaveBeenCalled()
  fireEvent.click(screen.getByRole("button", { name: "Undo" }))
  expect(undo).toHaveBeenCalledOnce()
  expect(dismiss).toHaveBeenCalledOnce()
  act(() => vi.advanceTimersByTime(5000))
  expect(dismiss).toHaveBeenCalledOnce()
  view.unmount()
  expect(vi.getTimerCount()).toBe(0)
})

it("dismisses normally without a dialog and clears its timer when unmounted", () => {
  vi.useFakeTimers()
  const dismiss = vi.fn()
  const view = render(<Toast message="Saved" duration={1200} onDismiss={dismiss} />)
  act(() => vi.advanceTimersByTime(1199))
  expect(dismiss).not.toHaveBeenCalled()
  act(() => vi.advanceTimersByTime(1))
  expect(dismiss).toHaveBeenCalledOnce()
  view.unmount()
  expect(vi.getTimerCount()).toBe(0)
})
