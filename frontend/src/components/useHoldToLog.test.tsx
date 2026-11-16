// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, act } from "@testing-library/react"
import { afterEach, beforeEach, expect, it, vi } from "vitest"
import { useHoldToLog } from "./useHoldToLog"

function Example({ log, open }: { log: () => void; open: () => void }) {
  const hold = useHoldToLog(log)
  return <button {...hold.handlers} onClick={open}>{hold.holding ? "Holding" : "Plant"}</button>
}
beforeEach(() => {
  vi.useFakeTimers()
  vi.stubGlobal("PointerEvent", MouseEvent)
})
afterEach(() => { cleanup(); vi.useRealTimers(); vi.unstubAllGlobals() })

it("preserves short taps and logs once after one second without opening details", () => {
  const log = vi.fn(), open = vi.fn()
  render(<Example log={log} open={open} />)
  const plant = screen.getByRole("button")
  fireEvent.pointerDown(plant, { button: 0 })
  act(() => vi.advanceTimersByTime(500))
  fireEvent.pointerUp(plant)
  fireEvent.click(plant, { detail: 1 })
  expect(log).not.toHaveBeenCalled()
  expect(open).toHaveBeenCalledTimes(1)
  fireEvent.pointerDown(plant, { button: 0 })
  expect(plant.textContent).toBe("Holding")
  act(() => vi.advanceTimersByTime(2000))
  fireEvent.pointerUp(plant)
  fireEvent.click(plant, { detail: 1 })
  expect(log).toHaveBeenCalledTimes(1)
  expect(open).toHaveBeenCalledTimes(1)
})

it.each(["pointerCancel", "pointerLeave", "blur", "scroll", "move", "unmount"])("cancels on %s", (event) => {
  const log = vi.fn()
  const view = render(<Example log={log} open={vi.fn()} />)
  const plant = screen.getByRole("button")
  fireEvent.pointerDown(plant, { button: 0, clientX: 0, clientY: 0 })
  if (event === "unmount") view.unmount()
  else if (event === "move") fireEvent.pointerMove(plant, { clientX: 20, clientY: 0 })
  else if (event === "scroll") fireEvent.scroll(window)
  else if (event === "blur") fireEvent.blur(plant)
  else if (event === "pointerCancel") fireEvent.pointerCancel(plant)
  else fireEvent.pointerLeave(plant)
  act(() => vi.advanceTimersByTime(1500))
  expect(log).not.toHaveBeenCalled()
})
