import type { PlantTypeId } from "@/pottedPlant/plants/plantTypes"

/**
 * The plants on the login wall, in reading order (left to right, top shelf
 * first). Every plant is fully grown. The order matters: both layouts place the
 * same list, so going from two shelves to three only moves the line breaks.
 *
 * Shapes alternate (tall, flat-leaved, trailing, broad, low), and the three
 * flowering plants (rose, peace lily, lily) are spread apart so blooms are
 * seen across the whole wall.
 */
export interface WallPlant {
  /** A unique name that says where the plant is. */
  id: string
  type: PlantTypeId
  /** Seeds the plant and its pot. The same seed always draws the same plant. */
  seed: number
  /** Flip the plant left to right, for variety. */
  mirror?: boolean
}

export const WALL_PLANTS: readonly WallPlant[] = [
  { id: "snake-plant", type: "snake_plant", seed: 12 },
  { id: "rose", type: "rose", seed: 31 },
  { id: "pothos", type: "pothos", seed: 47 },
  { id: "monstera", type: "monstera", seed: 58, mirror: true },
  { id: "peace-lily", type: "peace_lily", seed: 73 },
  { id: "pilea", type: "pilea", seed: 86 },
  { id: "philodendron", type: "philodendron", seed: 21, mirror: true },
  { id: "lily", type: "lily", seed: 108 },
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
  /** One slot per plant of WALL_PLANTS, in the same order. */
  slots: readonly Slot[]
}

/** The depth of the board's top face. A pot rests on the middle of it. */
export const BOARD = { top: 10, front: 20, rest: 4 } as const

/**
 * Wide screens (64rem and up): two shelves of four, the top one shifted left and
 * the bottom one right, like the reference photo. The tall plants are on top,
 * where there is the most room above them.
 */
export const WIDE_LAYOUT: WallLayout = {
  width: 1000,
  height: 720,
  shelves: [
    { y: 300, from: 40, to: 850 },
    { y: 610, from: 150, to: 960 },
  ],
  slots: [
    { shelf: 0, x: 142, size: 290 },
    { shelf: 0, x: 345, size: 310 },
    { shelf: 0, x: 548, size: 315 },
    { shelf: 0, x: 751, size: 335 },
    { shelf: 1, x: 252, size: 310 },
    { shelf: 1, x: 455, size: 295 },
    { shelf: 1, x: 658, size: 300 },
    { shelf: 1, x: 861, size: 310 },
  ],
}

/**
 * Narrower screens: the same eight plants on three shelves (3, 3 and 2), so each
 * pot stays a good size when the wall is squeezed into a smaller, squarer space.
 */
export const TALL_LAYOUT: WallLayout = {
  width: 620,
  height: 650,
  shelves: [
    { y: 182, from: 30, to: 520 },
    { y: 376, from: 100, to: 590 },
    { y: 570, from: 30, to: 360 },
  ],
  slots: [
    { shelf: 0, x: 111, size: 170 },
    { shelf: 0, x: 274, size: 180 },
    { shelf: 0, x: 437, size: 185 },
    { shelf: 1, x: 181, size: 205 },
    { shelf: 1, x: 344, size: 185 },
    { shelf: 1, x: 507, size: 160 },
    { shelf: 2, x: 112, size: 180 },
    { shelf: 2, x: 277, size: 190 },
  ],
}
