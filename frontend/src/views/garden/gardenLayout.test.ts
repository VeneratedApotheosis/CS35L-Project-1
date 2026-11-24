import { describe, expect, it } from "vitest"
import { SHELF_MARGIN, STAGGER } from "../login/wall/layouts"
import { CARD_GAP, GARDEN_MAX_COLS, GARDEN_PITCH, GARDEN_SCALE, HOVER_CARD_WIDTH, gardenCols, gardenExtra, gardenLayout, gardenScale, peekSide } from "./gardenLayout"

describe("how many pots fit across", () => {
  it("never scales the pots: a narrower wall just holds fewer", () => {
    expect(gardenCols(1700)).toBe(3)
    expect(gardenCols(1250)).toBe(3)
    expect(gardenCols(1000)).toBe(2)
    expect(gardenCols(700)).toBe(1)
    for (const width of [700, 1000, 1250, 1700]) {
      const cols = gardenCols(width)
      expect(GARDEN_SCALE * (cols * GARDEN_PITCH + 2 * SHELF_MARGIN + 2 * STAGGER)).toBeLessThanOrEqual(width)
    }
  })

  it("keeps the pots only as far apart as two open cards need, with the gap between them", () => {
    const gap = GARDEN_SCALE * GARDEN_PITCH - HOVER_CARD_WIDTH
    expect(gap).toBeGreaterThanOrEqual(CARD_GAP)
    expect(gap).toBeLessThan(CARD_GAP + GARDEN_SCALE)
  })

  it("is at least one and never more than three", () => {
    expect(GARDEN_MAX_COLS).toBe(3)
    expect(gardenCols(50)).toBe(1)
    expect(gardenCols(100_000)).toBe(3)
  })

  it("is the most when the wall has not been measured", () => {
    expect(gardenCols(0)).toBe(3)
  })
})

describe("narrow shelves", () => {
  it("fits and centers every plant and board at mobile wall widths", () => {
    for (const width of [264, 294, 334, 360, 390, 430]) {
      const scale = gardenScale(width)
      const layout = gardenLayout(5, gardenCols(width), gardenExtra(width, gardenCols(width)))
      expect(layout.width * scale).toBeLessThanOrEqual(width + 1e-8)
      for (const slot of layout.slots) {
        const board = layout.shelves[slot.shelf]
        expect(slot.x).toBeCloseTo((board.from + board.to) / 2)
        expect(board.from * scale).toBeGreaterThanOrEqual(0)
        expect(board.to * scale).toBeLessThanOrEqual(width + 1e-8)
      }
    }
  })

  it("keeps desktop sizes and avoids dividing by zero before measurement", () => {
    expect(gardenScale(0)).toBe(GARDEN_SCALE)
    expect(gardenScale(1000)).toBe(GARDEN_SCALE)
    expect(gardenScale(264)).toBeLessThan(GARDEN_SCALE)
  })
})

describe("the shelves", () => {
  it("fills each shelf in reading order and starts another when one is full", () => {
    const layout = gardenLayout(7, 3)
    expect(layout.slots).toHaveLength(7)
    expect(layout.shelves).toHaveLength(3)
    expect(layout.slots.map((slot) => slot.shelf)).toEqual([0, 0, 0, 1, 1, 1, 2])
    expect(layout.slots.map((slot) => slot.col)).toEqual([0, 1, 2, 0, 1, 2, 0])
  })

  it("puts every pot on its own board, inside it, one pitch from its neighbour", () => {
    const layout = gardenLayout(8, 4)
    for (const slot of layout.slots) {
      const board = layout.shelves[slot.shelf]
      expect(slot.x).toBeGreaterThan(board.from)
      expect(slot.x).toBeLessThan(board.to)
    }
    expect(layout.slots[1].x - layout.slots[0].x).toBe(GARDEN_PITCH)
  })

  it("shifts each shelf off the one above, left then right", () => {
    const layout = gardenLayout(8, 4)
    expect(layout.shelves[1].from - layout.shelves[0].from).toBe(2 * STAGGER)
  })

  it("has no shift with one pot across, and fits its own canvas", () => {
    const layout = gardenLayout(3, 1)
    expect(layout.shelves.map((shelf) => shelf.from)).toEqual([0, 0, 0])
    expect(layout.width).toBe(GARDEN_PITCH + 2 * SHELF_MARGIN)
    for (const shelf of layout.shelves) expect(shelf.to).toBeLessThanOrEqual(layout.width)
  })

  it("is one short shelf for one habit's slot, as wide as its pots", () => {
    const layout = gardenLayout(2, 6)
    expect(layout.shelves).toHaveLength(1)
    expect(layout.slots).toHaveLength(2)
    expect(layout.width).toBe(2 * GARDEN_PITCH + 2 * SHELF_MARGIN + 2 * STAGGER)
  })
})

describe("the space between the shelves and the edge of the screen", () => {
  const used = (cols: number) => GARDEN_SCALE * (cols * GARDEN_PITCH + 2 * SHELF_MARGIN + 2 * STAGGER)

  it("is halved: each board is longer at both ends by half of the space that was beside it", () => {
    const width = 1600
    const before = (width - used(2)) / 2
    const lengthened = GARDEN_SCALE * (2 * GARDEN_PITCH + 2 * (SHELF_MARGIN + gardenExtra(width, 2)) + 2 * STAGGER)
    expect((width - lengthened) / 2).toBeCloseTo(before / 2)
  })

  it("is nothing when the wall is not measured or has no room to spare", () => {
    expect(gardenExtra(0, 3)).toBe(0)
    expect(gardenExtra(used(3), 3)).toBe(0)
    expect(gardenExtra(100, 3)).toBe(0)
  })

  it("makes the boards longer and the canvas wider, and moves each pot in by the same amount", () => {
    const plain = gardenLayout(3, 3)
    const longer = gardenLayout(3, 3, 50)
    expect(longer.width).toBe(plain.width + 100)
    expect(longer.shelves[0].to - longer.shelves[0].from).toBe(plain.shelves[0].to - plain.shelves[0].from + 100)
    expect(longer.slots[0].x).toBe(plain.slots[0].x + 50)
  })
})

describe("which side the peek panel opens on", () => {
  it("is out toward the nearer edge of the wall when there is room", () => {
    expect(peekSide(600, 1600)).toBe("left")
    expect(peekSide(1000, 1600)).toBe("right")
  })

  it("is the other side where the nearer edge has no room", () => {
    expect(peekSide(300, 1600)).toBe("right")
    expect(peekSide(1400, 1600)).toBe("left")
  })

  it("is the side with room on a wall too narrow for either", () => {
    expect(["left", "right"]).toContain(peekSide(300, 600))
  })
})
