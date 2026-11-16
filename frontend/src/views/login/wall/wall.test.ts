import { describe, expect, it } from "vitest"
import { PLANT_TYPES } from "@/pottedPlant/plants/plantTypes"
import { POT_SHAPE } from "@/pottedPlant/pots"
import {
  BOARD,
  MAX_COLS,
  MAX_SCALE,
  PITCH,
  POT_SIZE,
  ROW_PITCH,
  SHELF_MARGIN,
  WALL_PLANTS,
  wallFit,
  wallLayout,
  type WallFit,
} from "./layouts"
import { plantFrame } from "./ShelfWall"

/** The pot's width as a share of the plant picture's width (the body is 84 of 200 units). */
const POT_SHARE = POT_SHAPE.body.bounds.width / 200
/** About how far the tallest leaf reaches above the pot's base, as a share of the picture's width. */
const REACH = 0.7
/** About how far the widest leaves spread to either side of the pot's middle, as a share of the picture's width. */
const SPREAD = 0.4

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

  it("keeps the picture sizes within a few percent, so pots look alike", () => {
    for (const plant of WALL_PLANTS) {
      expect(plant.scale).toBeGreaterThan(0.9)
      expect(plant.scale).toBeLessThanOrEqual(MAX_SCALE)
    }
  })

  it("puts a flowering plant among the first two, so a small wall still has blooms", () => {
    expect(["rose", "peace_lily", "lily"]).toContain(WALL_PLANTS[0].type)
    expect(WALL_PLANTS.slice(0, 4).some((plant) => plant.type === "peace_lily" || plant.type === "lily")).toBe(true)
  })
})

describe("how many pots fit", () => {
  it("is two shelves of four on a big wall, and never more than the plants there are", () => {
    expect(wallFit(900, 840, false)).toEqual({ cols: 4, rows: 2 })
    expect(wallFit(2000, 2000, false)).toEqual({ cols: 4, rows: 2 })
    expect(wallFit(0, 0, false)).toEqual({ cols: 4, rows: 2 })
  })

  it("loses pots as the wall narrows, never changing their size", () => {
    const count = (width: number) => {
      const fit = wallFit(width, 900, false)
      return wallLayout(fit).slots.length
    }
    const counts = [900, 700, 560, 400, 300, 200].map(count)
    expect(counts).toEqual([...counts].sort((a, b) => b - a))
    expect(counts[0]).toBe(8)
    expect(counts.at(-1)).toBeLessThan(counts[0])
    expect(counts.at(-1)).toBeGreaterThanOrEqual(1)
    for (const width of [900, 560, 300]) {
      for (const slot of wallLayout(wallFit(width, 900, false)).slots) {
        expect(slot.size).toBeLessThanOrEqual(Math.round(POT_SIZE * MAX_SCALE))
        expect(slot.size).toBeGreaterThanOrEqual(Math.round(POT_SIZE * 0.9))
      }
    }
  })

  it("loses shelves as the wall gets shorter", () => {
    expect(wallFit(900, 700, false).rows).toBe(2)
    expect(wallFit(900, 400, false)).toEqual({ cols: 4, rows: 1 })
    expect(wallFit(300, 1200, false)).toEqual({ cols: 1, rows: 4 })
  })

  it("is one shelf when stacked above the words", () => {
    expect(wallFit(600, 300, true)).toEqual({ cols: 2, rows: 1 })
    expect(wallFit(360, 300, true)).toEqual({ cols: 1, rows: 1 })
    expect(wallFit(1000, 300, true).rows).toBe(1)
    expect(wallFit(1000, 300, true).cols).toBeLessThanOrEqual(MAX_COLS)
  })

  it("always keeps at least one pot", () => {
    expect(wallFit(100, 100, false)).toEqual({ cols: 1, rows: 1 })
    expect(wallFit(100, 100, true)).toEqual({ cols: 1, rows: 1 })
  })
})

const fits: WallFit[] = [
  { cols: 4, rows: 2 },
  { cols: 3, rows: 3 },
  { cols: 2, rows: 4 },
  { cols: 1, rows: 4 },
  { cols: 4, rows: 1 },
  { cols: 1, rows: 1 },
]

describe.each(fits)("the layout for  across and  shelves", (fit) => {
  const layout = wallLayout(fit)

  it("shows the first plants in reading order, filling the shelves from the top", () => {
    expect(layout.slots).toHaveLength(Math.min(8, fit.cols * fit.rows))
    expect(layout.shelves).toHaveLength(fit.rows)
    const order = layout.slots.map((slot) => [slot.shelf, slot.x])
    expect(order).toEqual([...order].sort((a, b) => a[0] - b[0] || a[1] - b[1]))
  })

  it("keeps every pot on its board, with no two pots touching, at the same spacing", () => {
    layout.shelves.forEach((shelf, index) => {
      const slots = layout.slots.filter((slot) => slot.shelf === index)
      expect(slots.length).toBeGreaterThan(0)
      slots.forEach((slot, i) => {
        const half = (slot.size * POT_SHARE) / 2
        expect(slot.x - half).toBeGreaterThanOrEqual(shelf.from)
        expect(slot.x + half).toBeLessThanOrEqual(shelf.to)
        if (i > 0) expect(slot.x - slots[i - 1].x).toBe(PITCH)
      })
      expect(slots[0].x - shelf.from).toBe(SHELF_MARGIN + PITCH / 2)
    })
  })

  it("keeps every plant, shelf, bracket and shadow inside the canvas and clear of the shelf above", () => {
    expect(layout.height).toBe(fit.rows * ROW_PITCH)
    for (const slot of layout.slots) {
      const y = layout.shelves[slot.shelf].y - BOARD.rest
      const frame = plantFrame(slot.x, y, slot.size)
      expect(frame.y + frame.height).toBeGreaterThan(y)
      expect(slot.x - slot.size * SPREAD).toBeGreaterThanOrEqual(0)
      expect(slot.x + slot.size * SPREAD).toBeLessThanOrEqual(layout.width)
      const top = y - slot.size * REACH
      expect(top).toBeGreaterThanOrEqual(slot.shelf * ROW_PITCH)
      const above = layout.shelves[slot.shelf - 1]
      if (above) expect(top).toBeGreaterThan(above.y + BOARD.front)
    }
    for (const shelf of layout.shelves) {
      expect(shelf.from).toBeGreaterThanOrEqual(0)
      expect(shelf.to).toBeLessThanOrEqual(layout.width)
      expect(shelf.y + BOARD.front + 54).toBeLessThanOrEqual(layout.height)
    }
  })
})
