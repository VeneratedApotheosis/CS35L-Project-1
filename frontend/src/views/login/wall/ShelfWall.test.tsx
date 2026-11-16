// @vitest-environment jsdom
import { act, cleanup, fireEvent, render } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { SHRINK_MS, ShelfWall } from "./ShelfWall"

/** The plants on the wall (an unmeasured wall, as in jsdom, is the biggest: two shelves of four). */
function plants(container: HTMLElement) {
  return Array.from(container.querySelectorAll<SVGGElement>("[data-plant]"))
}
const advance = (ms: number) => act(() => void vi.advanceTimersByTime(ms))

beforeEach(() => vi.useFakeTimers())
afterEach(() => {
  cleanup()
  vi.useRealTimers()
})

describe("replanting a plant by touching it with the pointer", () => {
  it("starts to un-grow at once, with no wait and no circle or sparks, and keeps the old plant until it is smallest", () => {
    const { container } = render(<ShelfWall />)
    const plant = plants(container)[0]
    advance(5000) // let the first grow-in finish
    const before = plant.dataset.seed
    expect(plant.dataset.changing).toBe("false")

    fireEvent.pointerEnter(plant)
    expect(plant.dataset.changing).toBe("true")
    expect(container.querySelector(".wall__pop, .wall__spark")).toBeNull()
    // The same plant is still there while it shrinks.
    advance(SHRINK_MS - 20)
    expect(plant.dataset.seed).toBe(before)
  })

  it("swaps in a new plant once it is smallest, then grows it in one move", () => {
    const { container } = render(<ShelfWall />)
    const plant = plants(container)[0]
    advance(5000)
    const before = plant.dataset.seed
    fireEvent.pointerEnter(plant)

    advance(SHRINK_MS + 100)
    expect(plant.dataset.seed).not.toBe(before)
    expect(plant.dataset.changing).toBe("true")

    advance(3000)
    expect(plant.dataset.changing).toBe("false")
  })

  it("leaves the pot bare between the old plant and the new one, so the swap is never seen", () => {
    const { container } = render(<ShelfWall />)
    const plant = plants(container)[0]
    advance(5000)
    const bare = () => plant.querySelector('[aria-label="Empty pot"]') !== null
    const before = plant.dataset.seed

    fireEvent.pointerEnter(plant)
    expect(bare()).toBe(false)
    advance(SHRINK_MS + 40 + 20)
    // The old plant is gone and the swap has happened, but the pot shows only soil.
    expect(bare()).toBe(true)
    expect(plant.dataset.seed).not.toBe(before)

    advance(1000)
    expect(bare()).toBe(false)
  })

  it("works in the middle of the grow animation: the plant un-grows at once and is replaced by another new one", () => {
    const { container } = render(<ShelfWall />)
    const plant = plants(container)[0]
    advance(5000)
    fireEvent.pointerEnter(plant)
    advance(SHRINK_MS + 40 + 100)
    const first = plant.dataset.seed
    // A new plant is now growing (the sprout has been shown and the stage change has started).
    advance(500)
    expect(plant.dataset.changing).toBe("true")

    fireEvent.pointerLeave(plant)
    fireEvent.pointerEnter(plant)
    // Its stage changes at once, but the plant is only swapped when it is smallest.
    expect(plant.dataset.seed).toBe(first)
    advance(SHRINK_MS + 100)
    expect(plant.dataset.seed).not.toBe(first)
    advance(5000)
    expect(plant.dataset.changing).toBe("false")
  })

  it("swaps a sprout that is waiting to grow straight away", () => {
    const { container } = render(<ShelfWall />)
    const plant = plants(container)[0]
    advance(5000)
    fireEvent.pointerEnter(plant)
    advance(SHRINK_MS + 40 + 20) // swapped; the new sprout is being held before it grows
    const first = plant.dataset.seed

    fireEvent.pointerLeave(plant)
    fireEvent.pointerEnter(plant)
    expect(plant.dataset.seed).not.toBe(first)
  })

  it("leaves a plant that is already un-growing to finish, with one swap", () => {
    const { container } = render(<ShelfWall />)
    const plant = plants(container)[0]
    advance(5000)
    const before = plant.dataset.seed
    fireEvent.pointerEnter(plant)
    advance(40)
    fireEvent.pointerLeave(plant)
    fireEvent.pointerEnter(plant)
    advance(SHRINK_MS + 40 - 40 + 5)
    const swapped = plant.dataset.seed
    expect(swapped).not.toBe(before)
    advance(100)
    expect(plant.dataset.seed).toBe(swapped)
  })

  it("leaves the other plants alone", () => {
    const { container } = render(<ShelfWall />)
    const all = plants(container)
    advance(5000)
    const seeds = all.map((plant) => plant.dataset.seed)
    fireEvent.pointerEnter(all[0])
    advance(SHRINK_MS + 100)
    expect(all.map((plant) => plant.dataset.seed).slice(1)).toEqual(seeds.slice(1))
  })
})
