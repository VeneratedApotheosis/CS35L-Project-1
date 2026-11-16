import type { Shelf } from "./types"

/**
 * The greenhouse itself: its size, shelves, sunlight and colors. Everything the
 * background layers draw reads from here, so the room can be reshaped in one place.
 * Numbers are in scene units (the canvas is 1600 by 900) and describe a room seen
 * from inside, looking at the back wall. See geometry.ts for how depth works.
 */

export const ROOM = {
  /** The back wall's left and right edges, the height where its roof begins, the roof's peak, and where the floor meets it. */
  left: 360,
  right: 1240,
  eaveY: 210,
  peak: { x: 800, y: 40 },
  floorY: 660,
  /**
   * How near each steel frame along the side walls and roof is: 1 is the back
   * wall, and larger is nearer the viewer. Panes of glass sit between them.
   */
  rings: [1, 1.14, 1.3, 1.5, 1.72, 2.0],
  /** Where the back wall's upright steel bars stand (x), and where its cross bars run (y). */
  backBars: [507, 653, 800, 947, 1093],
  backCrossBars: [290, 470],
  /** The rafters across each roof slope, as a share of the way up from the eave (0) to the ridge (1). */
  rafters: [0, 0.24, 0.5, 0.76, 1],
  /** How far up each side wall a cross bar sits, from the floor (0) to the eave (1). */
  sideCrossBars: [0.38, 0.72],
} as const

/** The shelves the plants stand on. Plants name one in `shelf`, and the tests check they rest on it. */
export const SHELVES: readonly Shelf[] = [
  { id: "back-upper", side: "back", from: 760, to: 1240, y: 372, reach: 1.05, thickness: 11 },
  { id: "back-lower", side: "back", from: 660, to: 1240, y: 522, reach: 1.08, thickness: 12, legs: [676, 960] },
  { id: "right-return", side: "right", from: 1, to: 1.42, y: 522, inset: 74, thickness: 12 },
]

/**
 * The sun comes through the glass on the right and lands on the floor to its left.
 * Sunlight is a set of parallel beams, so each beam starts from a whole pane of glass
 * (a region, not a point) and lands on that pane's footprint on the floor: a patch
 * between two distances from the right wall, and between two frames (ROOM.rings).
 */
export const SUN = {
  /**
   * How far from the right wall (in units at the back wall; the room is 880 wide, so
   * stay inside that) each row of patches starts and ends, and which glass its beams come through: the right wall, or a
   * strip of the right roof slope (from 0 at the eave to 1 at the ridge). Spreading
   * the rows spreads the light across the whole floor.
   */
  rows: [
    { from: 60, to: 300, glass: "wall" },
    { from: 380, to: 620, glass: [0.25, 0.75] },
    { from: 690, to: 860, glass: [0.6, 1] },
  ] as readonly { from: number; to: number; glass: "wall" | readonly [number, number] }[],
  /** Which gaps between rings get patches. The first gap is the pane nearest the back wall. */
  panes: [0, 1, 2, 3],
  /**
   * How much the light leans: a patch farther from the wall lands this much farther
   * from the viewer, per unit of distance. It is what turns the patches into slanted
   * parallelograms instead of flat bars.
   */
  slant: 0.00042,
  /** Share of each pane's depth left dark, so the frames throw a shadow between patches. */
  gap: 0.12,
  /** How strong each part of the light is, from 0 (none) to 1. Kept low so the sun is a gentle warmth. */
  strength: { patch: 0.36, core: 0.26, shaft: 0.2, wash: 0.42 },
  /** Dust in the light: how many specks and the seed that places them. */
  dust: { count: 40, seed: 7 },
} as const

/** The spot the HTML text sits over, left of center. The tests keep every plant out of it. */
export const SAFE_ZONE = { x: 40, y: 200, width: 600, height: 400 } as const

export const COLORS = {
  sky: { top: "#fbfdf4", bottom: "#d9ecc3" },
  sunGlow: "#fff2b0",
  foliage: ["#a6d98a", "#86c870", "#68b358", "#4f9a48"],
  glass: "#f4faf1",
  steel: "#7d8789",
  steelLight: "#aab4b5",
  steelDark: "#5f696b",
  wood: "#dcab68",
  woodLight: "#ebc489",
  woodDark: "#b9803f",
  floor: ["#edc476", "#f3cf88", "#e9ba6b", "#f6d797"],
  floorSeam: "#c98f45",
  skirting: "#a98457",
  light: "#ffd75e",
} as const
