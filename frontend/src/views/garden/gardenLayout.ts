import type { Shelf } from "@/components/shelf/geometry"
import { POT_SIZE, SHELF_MARGIN, STAGGER } from "../login/wall/layouts"

/** The most pots across a shelf. Fewer fit on a narrow screen, and more habits just add shelves. */
export const GARDEN_MAX_COLS = 4

/**
 * The Garden draws the login wall's shelves and pots a little bigger than they are there. The layout below is in the
 * login wall's units. Desktop uses GARDEN_SCALE; a narrow wall scales the single-column
 * layout uniformly so its shelf and plants fit together.
 */
export const GARDEN_SCALE = 1.1

/** A pot's size in the login wall's units. On the screen it is GARDEN_SCALE times this. */
export const GARDEN_POT_SIZE = POT_SIZE

/**
 * The width of the card that opens behind a hovered plant, in pixels. A pot is about 200 wide, so
 * the card reaches about 30 past each side of it.
 */
export const HOVER_CARD_WIDTH = 258

/**
 * How far the pots are from each other, in layout units: a little wider than the login wall's pitch (190), so the
 * leaves of neighbours just touch. The hover card is wider than that and covers the plants beside it:
 * only one card is ever open.
 */
export const GARDEN_PITCH = 215

/** The height of one shelf with its plants, in layout units: the login wall's 300, a little less. The hover card may reach over the next shelf. */
export const GARDEN_ROW_PITCH = 262
/** Room under the last shelf, in layout units, so a card open on it (it reaches below the board) is not cut off. */
export const GARDEN_BOTTOM_PAD = 52
/** Where the board sits in its band, in layout units: room for the tallest plant above it, and the brackets below. */
export const GARDEN_BOARD_IN_ROW = 196
/** How far the brackets are from the ends of a board, in layout units: out at the ends, so the bar under a plant never meets one. */
export const GARDEN_BRACKET_INSET = 24

/** The stagger between shelves: none with one pot across. */
const staggerFor = (across: number) => (across > 1 ? STAGGER : 0)

/** How many pots fit across a wall this wide, in pixels. At least one, at most GARDEN_MAX_COLS. A width of 0 (not measured) gives the most. */
export function gardenCols(width: number): number {
  if (width <= 0) return GARDEN_MAX_COLS
  const room = width - GARDEN_SCALE * (2 * SHELF_MARGIN + 2 * STAGGER)
  return Math.min(GARDEN_MAX_COLS, Math.max(1, Math.floor(room / (GARDEN_SCALE * GARDEN_PITCH))))
}

/** Scale a single-column shelf to fit a narrow measured wall; keep desktop sizes unchanged. */
export function gardenScale(width: number): number {
  const oneColumnWidth = GARDEN_PITCH + 2 * SHELF_MARGIN
  return width > 0 ? Math.min(GARDEN_SCALE, width / oneColumnWidth) : GARDEN_SCALE
}

/**
 * How much longer each board is at each end, in layout units. The shelves are as wide as their pots
 * need; the space left between them and the edge of the screen is cut to a third, by sharing two thirds
 * of it out to the two ends. A width of 0 (not measured), or no space left, gives 0.
 */
export function gardenExtra(width: number, cols: number): number {
  if (width <= 0) return 0
  const used = GARDEN_SCALE * (cols * GARDEN_PITCH + 2 * SHELF_MARGIN + 2 * staggerFor(cols))
  return Math.max(0, (width - used) / 3 / GARDEN_SCALE)
}

/**
 * The width of the buttons' column that a click adds to one side of the hover card, in pixels. The
 * card is that much wider while it is open.
 */
export const ACTIONS_WIDTH = 210

/**
 * Which side of a plant its card grows toward on a click: out toward the nearer edge of the wall, so
 * it covers the plants beside it as little as it can, or the other side where the near one has no
 * room. The middle of the plant is the first argument, in the wall's pixels.
 */
export function peekSide(centre: number, wallWidth: number): "left" | "right" {
  const reach = HOVER_CARD_WIDTH / 2 + ACTIONS_WIDTH
  const leftFits = centre - reach >= 0
  const rightFits = centre + reach <= wallWidth
  if (centre < wallWidth / 2) return leftFits || !rightFits ? "left" : "right"
  return rightFits || !leftFits ? "right" : "left"
}

/** Where one slot is: its shelf, its place along the shelf, and the middle of its pot. */
export interface GardenSlot {
  index: number
  shelf: number
  col: number
  x: number
}

/** The shelves in layout units: multiply by GARDEN_SCALE for pixels. */
export interface GardenLayout {
  width: number
  height: number
  shelves: readonly Shelf[]
  slots: readonly GardenSlot[]
}

/**
 * The shelves for this many slots, this many across, filled in reading order, each shelf shifted
 * off the one above like the login wall. The canvas is as wide as the shelf with the most pots,
 * and each board runs `extra` further than the login wall's at both ends.
 */
export function gardenLayout(count: number, cols: number, extra = 0): GardenLayout {
  const across = Math.max(1, Math.min(cols, count))
  const rows = Math.max(1, Math.ceil(count / across))
  const stagger = staggerFor(across)
  const margin = SHELF_MARGIN + extra
  const width = across * GARDEN_PITCH + 2 * margin + 2 * stagger
  const shelves: Shelf[] = []
  const slots: GardenSlot[] = []
  for (let shelf = 0; shelf < rows; shelf++) {
    const inRow = Math.min(across, count - shelf * across)
    const shift = shelf % 2 === 0 ? -stagger : stagger
    const left = margin + stagger + shift
    shelves.push({
      y: shelf * GARDEN_ROW_PITCH + GARDEN_BOARD_IN_ROW,
      from: left - margin,
      to: left + inRow * GARDEN_PITCH + margin,
    })
    for (let col = 0; col < inRow; col++) {
      slots.push({ index: slots.length, shelf, col, x: left + GARDEN_PITCH * (col + 0.5) })
    }
  }
  return { width, height: rows * GARDEN_ROW_PITCH + GARDEN_BOTTOM_PAD, shelves, slots }
}
