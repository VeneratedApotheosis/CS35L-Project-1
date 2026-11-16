import type { PlantTypeId } from "@/pottedPlant/plants/plantTypes"
import type { PotBand, PotFinishId } from "@/pottedPlant/pots"

/** The scene's pot colors, by name. See scenePots.ts. */
export type ScenePotColor =
  | "terracotta"
  | "clay"
  | "slate"
  | "charcoal"
  | "navy"
  | "teal"
  | "mustard"
  | "cream"
  | "sage"
  | "sky"
  | "blush"

/** How one pot looks. Anything left out comes from the plant's own seed. */
export interface ScenePot {
  color?: ScenePotColor
  band?: PotBand
  finish?: PotFinishId
  /** Seeds the pot's look (palette, band, pattern). Defaults to the plant's seed. */
  seed?: number
}

/**
 * One plant in the login scene. The scene is drawn from the list of these in
 * plants.ts, so this is everything you can change about a plant there.
 */
export interface ScenePlant {
  /** A unique name. Shown in the dev labels, so make it say where the plant is. */
  id: string
  type: PlantTypeId
  /** Where the middle of the pot's bottom sits, in scene units (the canvas is 1600 by 900). */
  x: number
  y: number
  /** The width of the plant's picture in scene units. The pot is about half of it. */
  size: number
  /** 1 (sprout) to 4 (lush). */
  stage: 1 | 2 | 3 | 4
  /** 0 (healthy) to 1 (fully wilted). The lotus does not wilt. */
  wilt: number
  /** The plant's seed: the same seed always draws the same plant. */
  seed: number
  pot?: ScenePot
  /** Draw the plant flipped left to right, for variety. */
  mirror?: boolean
  /** The id of the shelf the pot rests on, if any. The tests check that it really does. */
  shelf?: string
}

/** A shelf attached to the back wall or to the right wall. */
export interface Shelf {
  id: string
  side: "back" | "right"
  /** Back shelf: the left and right ends. Right shelf: how far it runs toward the viewer, as depth factors (1 is the back wall). */
  from: number
  to: number
  /** The height of the board where it meets the wall. */
  y: number
  /** Back shelf: how far the board sticks out from the wall, as a depth factor (1.08 is a little). */
  reach?: number
  /** Right shelf: how far the board sticks out from the wall, in units at the back wall. */
  inset?: number
  /** The thickness of the board's front edge. */
  thickness: number
  /** Back shelf only: x positions of wooden legs down to the floor. A shelf with none hangs from the wall on steel brackets. */
  legs?: readonly number[]
}
