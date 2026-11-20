import { POT_SHAPE } from "@/pottedPlant/pots"

/*
 * The shared geometry of a wall of potted plants on shelves: where a plant's picture goes so
 * that its pot stands on a board. The login wall and the Garden both use it. Every size is in
 * layout units, which are pixels.
 */

/** One shelf board. y is the front top edge; from and to are its ends. */
export interface Shelf {
  y: number
  from: number
  to: number
}

/** The depth of the board's top face. A pot rests on the middle of it. */
export const BOARD = { top: 10, front: 20, rest: 4 } as const

/** The plant canvas every species draws in (see pottedPlant/genome.ts VIEWBOX): "0 30 200 205". */
export const PLANT_VIEW = { y: 30, width: 200, height: 205 } as const

/** The canvas height of the pot's lowest point: the plant picture is placed so this lands on the shelf. */
export const POT_BASE = POT_SHAPE.body.bounds.y + POT_SHAPE.body.bounds.height

/**
 * How far, in layout units, a pot sits lower than the board point its shadow is drawn at. It
 * brings the pot's base to the middle of the board's height (the top face and the front face
 * together).
 */
export const POT_SINK = BOARD.rest + (BOARD.front - BOARD.top) / 2

/** Where a plant's picture goes so that the bottom of its pot lands on (x, y). */
export function plantFrame(x: number, y: number, size: number) {
  const unit = size / PLANT_VIEW.width
  return {
    x: x - size / 2,
    y: y - (POT_BASE - PLANT_VIEW.y) * unit,
    width: size,
    height: PLANT_VIEW.height * unit,
  }
}
