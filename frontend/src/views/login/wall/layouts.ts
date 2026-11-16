import type { PlantTypeId } from "@/pottedPlant/plants/plantTypes"

/**
 * The plants on the login wall, in the order they are shown. Every plant is fully
 * grown. When the screen only has room for a few pots, the first ones are kept, so
 * the order puts a flowering plant (rose, peace lily, lily) among every few.
 * Shapes alternate (tall, flat-leaved, trailing, broad, low).
 */
export interface WallPlant {
  /** A unique name that says where the plant is. */
  id: string
  type: PlantTypeId
  /** Seeds the plant and its pot. The same seed always draws the same plant. */
  seed: number
  /** Flip the plant left to right, for variety. */
  mirror?: boolean
  /** Its picture's size as a share of POT_SIZE: a little variety, never more than MAX_SCALE. */
  scale: number
}

export const WALL_PLANTS: readonly WallPlant[] = [
  { id: "rose", type: "rose", seed: 31, scale: 1.05 },
  { id: "snake-plant", type: "snake_plant", seed: 12, scale: 1 },
  { id: "pothos", type: "pothos", seed: 47, scale: 1.03 },
  { id: "peace-lily", type: "peace_lily", seed: 73, scale: 1.02 },
  { id: "monstera", type: "monstera", seed: 58, mirror: true, scale: 1.06 },
  { id: "pilea", type: "pilea", seed: 86, scale: 0.96 },
  { id: "lily", type: "lily", seed: 108, scale: 1 },
  { id: "philodendron", type: "philodendron", seed: 21, mirror: true, scale: 1.02 },
]

/** One shelf board. y is the front top edge, in layout units; from and to are its ends. */
export interface Shelf {
  y: number
  from: number
  to: number
}

/** Where each plant of WALL_PLANTS goes: the middle of its pot, and the width of its picture. */
export interface Slot {
  shelf: number
  x: number
  size: number
}

export interface WallLayout {
  /** The canvas, in layout units. */
  width: number
  height: number
  shelves: readonly Shelf[]
  /** One slot per plant shown: the first plants of WALL_PLANTS, in the same order. */
  slots: readonly Slot[]
}

/** The depth of the board's top face. A pot rests on the middle of it. */
export const BOARD = { top: 10, front: 20, rest: 4 } as const

/*
 * The pots never scale with the screen. Every size here is in pixels (one layout unit is
 * one pixel), and what changes as the screen narrows is how many pots fit.
 */
/** The width of a pot's picture, in pixels. */
export const POT_SIZE = 280
/** The biggest WallPlant.scale. */
export const MAX_SCALE = 1.06
/** How far the pots are from each other, side by side, in pixels. The leaves of neighbours overlap a little. */
export const PITCH = 190
/** How far the shelf runs past the outermost pots, in pixels. */
export const SHELF_MARGIN = 40
/** How far each shelf is shifted off the one above (left, then right), when there is more than one pot across. */
export const STAGGER = 24
/** The height of one shelf with the plants standing on it and the brackets below, in pixels. */
export const ROW_PITCH = 300
/** Where the board sits in its band: the plants and room for the tallest leaf above, then the brackets below. */
const BOARD_IN_ROW = 226
/** The most pots across and the most shelves. */
export const MAX_COLS = 4
export const MAX_ROWS = 4

/**
 * The width, in rem, below which the wall is not a column beside the words: not even one pot fits
 * there. It is one shelf above the words on the page's own background. Keep it in step with
 * login.css, whose words column is at least 22rem wide.
 */
export const STACKED_QUERY = "(max-width: 38.99rem)"

/** How many pots across and how many shelves fit in a wall of this size, in pixels. Never less than one. */
export interface WallFit {
  cols: number
  rows: number
}

/**
 * What fits. Beside the words, as many shelves as the height allows and pots as the width allows, up
 * to what is needed for all the plants. Stacked, a single shelf. A size of 0 (not measured) gives the
 * biggest wall.
 */
export function wallFit(width: number, height: number, stacked: boolean): WallFit {
  const cols = width > 0 ? Math.min(MAX_COLS, Math.max(1, Math.floor((width - 2 * SHELF_MARGIN) / PITCH))) : MAX_COLS
  if (stacked) return { cols: Math.min(cols, WALL_PLANTS.length), rows: 1 }
  const roomRows = height > 0 ? Math.min(MAX_ROWS, Math.max(1, Math.floor(height / ROW_PITCH))) : 2
  const count = Math.min(WALL_PLANTS.length, cols * roomRows)
  return { cols: Math.min(cols, count), rows: Math.ceil(count / Math.min(cols, count)) }
}

/** The wall for this many pots across and shelves: as many plants as fit, in reading order, shelves staggered. */
export function wallLayout({ cols, rows }: WallFit): WallLayout {
  const stagger = cols > 1 ? STAGGER : 0
  const width = cols * PITCH + 2 * SHELF_MARGIN + 2 * stagger
  const count = Math.min(WALL_PLANTS.length, cols * rows)
  const shelves: Shelf[] = []
  const slots: Slot[] = []
  for (let shelf = 0; shelf < rows; shelf++) {
    const inRow = Math.min(cols, count - shelf * cols)
    const shift = shelf % 2 === 0 ? -stagger : stagger
    const left = SHELF_MARGIN + stagger + shift
    shelves.push({ y: shelf * ROW_PITCH + BOARD_IN_ROW, from: left - SHELF_MARGIN, to: left + inRow * PITCH + SHELF_MARGIN })
    for (let i = 0; i < inRow; i++) {
      slots.push({ shelf, x: left + PITCH * (i + 0.5), size: Math.round(POT_SIZE * WALL_PLANTS[slots.length].scale) })
    }
  }
  return { width, height: rows * ROW_PITCH, shelves, slots }
}
