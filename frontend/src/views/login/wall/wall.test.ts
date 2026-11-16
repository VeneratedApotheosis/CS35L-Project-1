import { describe, expect, it } from "vitest"
import { PLANT_TYPES } from "@/pottedPlant/plants/plantTypes"
import { POT_SHAPE } from "@/pottedPlant/pots"
import { BOARD, TALL_LAYOUT, WALL_PLANTS, WIDE_LAYOUT, type WallLayout } from "./layouts"
import { plantFrame } from "./ShelfWall"

const layouts: [string, WallLayout][] = [
  ["wide", WIDE_LAYOUT],
  ["tall", TALL_LAYOUT],
]

/** The pot's width as a share of the plant picture's width (the body is 84 of 200 units). */
const POT_SHARE = POT_SHAPE.body.bounds.width / 200
/** About how far the tallest leaf reaches above the pot's base, as a share of the picture's width. */
const REACH = 0.7
/** About how far the widest leaves spread to either side of the pot's middle, as a share of the picture's width. */
const SPREAD = 0.4

const perShelf = (layout: WallLayout) => layout.shelves.map((_, shelf) => layout.slots.filter((slot) => slot.shelf === shelf))

describe("the login wall's plants", () => {
  it("has eight plants with unique ids and seeds, all of known types", () => {
    expect(WALL_PLANTS).toHaveLength(8)
    expect(new Set(WALL_PLANTS.map((plant) => plant.id)).size).toBe(8)
    expect(new Set(WALL_PLANTS.map((plant) => plant.seed)).size).toBe(8)
    const known = new Set(PLANT_TYPES.map((type) => type.id))
    for (const plant of WALL_PLANTS) expect(known.has(plant.type)).toBe(true)
  })

  it("is mostly leafy, with three blooming plants and a mix of shapes", () => {
    const blooming = WALL_PLANTS.filter((plant) => ["rose", "peace_lily", "lily"].includes(plant.type))
    expect(blooming).toHaveLength(3)
    expect(new Set(WALL_PLANTS.map((plant) => plant.type)).size).toBe(8)
  })
})

describe.each(layouts)("the %s layout", (_name, layout) => {
  it("gives every plant one slot", () => {
    expect(layout.slots).toHaveLength(WALL_PLANTS.length)
  })

  it("keeps every pot on its board, with no two pots touching", () => {
    for (const slots of perShelf(layout)) {
      expect(slots.length).toBeGreaterThan(0)
      const sorted = [...slots].sort((a, b) => a.x - b.x)
      sorted.forEach((slot, index) => {
        const shelf = layout.shelves[slot.shelf]
        const half = (slot.size * POT_SHARE) / 2
        expect(slot.x - half).toBeGreaterThanOrEqual(shelf.from)
        expect(slot.x + half).toBeLessThanOrEqual(shelf.to)
        const next = sorted[index + 1]
        if (next) expect(slot.x + half).toBeLessThan(next.x - (next.size * POT_SHARE) / 2)
      })
    }
  })

  it("keeps every plant inside the canvas and clear of the shelf above it", () => {
    for (const slot of layout.slots) {
      const y = layout.shelves[slot.shelf].y - BOARD.rest
      const frame = plantFrame(slot.x, y, slot.size)
      expect(frame.y + frame.height).toBeGreaterThan(y)
      expect(slot.x - slot.size * SPREAD).toBeGreaterThanOrEqual(0)
      expect(slot.x + slot.size * SPREAD).toBeLessThanOrEqual(layout.width)
      const top = y - slot.size * REACH
      expect(top).toBeGreaterThanOrEqual(0)
      const above = layout.shelves[slot.shelf - 1]
      if (above) expect(top).toBeGreaterThan(above.y + BOARD.front)
    }
  })

  it("keeps the shelves, brackets and shadows inside the canvas", () => {
    for (const shelf of layout.shelves) {
      expect(shelf.from).toBeGreaterThanOrEqual(0)
      expect(shelf.to).toBeLessThanOrEqual(layout.width)
      expect(shelf.y + BOARD.front + 54).toBeLessThanOrEqual(layout.height)
    }
  })

  it("lists the plants in reading order, top shelf first and left to right", () => {
    const order = layout.slots.map((slot) => [slot.shelf, slot.x])
    expect(order).toEqual([...order].sort((a, b) => a[0] - b[0] || a[1] - b[1]))
  })
})

describe("the two layouts", () => {
  it("use two shelves of four on wide screens and three shelves of 3, 3 and 2 on narrow ones", () => {
    expect(perShelf(WIDE_LAYOUT).map((slots) => slots.length)).toEqual([4, 4])
    expect(perShelf(TALL_LAYOUT).map((slots) => slots.length)).toEqual([3, 3, 2])
  })
})
