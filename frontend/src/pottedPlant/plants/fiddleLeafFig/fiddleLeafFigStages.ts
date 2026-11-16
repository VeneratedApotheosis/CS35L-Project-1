import type { Pt } from "../../geometry"
import { createStagedPlant, leafOutline as stagedLeafOutline } from "../staged/generate"
import { leafCountLadder, scaleLadder } from "../staged/ladder"
import type {
  LeafShapeModel,
  PlacedLeaf as StagedPlacedLeaf,
  PlantStage,
  StagedPlant,
  StagedPlantOptions,
  StagedPlantSpecies,
} from "../staged/types"
import { FIDDLE_LEAF_FIG_CONFIG } from "./fiddleLeafFigConfig"
import { fiddleLeafPolygon, randomFiddleLeaf, type FiddleLeafSpec } from "./fiddleLeafFigLeaf"

/*
 * The fiddle-leaf fig: a staged plant (see ../staged) with a layered crown of
 * large violin leaves on a slim trunk. The leaves and their heights come from
 * the shared engine (its `layerAngle` option sets each leaf's direction from its height); the trunk is drawn by FiddleLeafFig. It has no flowers.
 */

/** Violin-shaped leaves, stalk end at the base and tip pointing up. The leaf does not fan. */
const FIDDLE_LEAF: LeafShapeModel<FiddleLeafSpec> = {
  randomSpec: randomFiddleLeaf,
  outline: (spec, length, perSegment) => fiddleLeafPolygon(spec, length, perSegment),
  middle: 0.5,
}

export const FIDDLE_LEAF_FIG_SPECIES: StagedPlantSpecies<FiddleLeafSpec> = {
  config: FIDDLE_LEAF_FIG_CONFIG,
  leaf: FIDDLE_LEAF,
}

export type PlacedFiddleLeaf = StagedPlacedLeaf<FiddleLeafSpec>
export type FiddleLeafFigStage = PlantStage<FiddleLeafSpec>
export type FiddleLeafFigOptions = StagedPlantOptions
export type FiddleLeafFigPlant = StagedPlant<FiddleLeafSpec>

/** Build (or fetch the cached) fiddle-leaf fig for a seed. Treat the result as read-only. */
export function createFiddleLeafFig(seed: number, options: FiddleLeafFigOptions = {}): FiddleLeafFigPlant {
  return createStagedPlant(seed, FIDDLE_LEAF_FIG_SPECIES, options)
}

/** A placed leaf's outline in canvas coordinates. Used by tests and debug views. */
export function leafOutline(leaf: PlacedFiddleLeaf, perSegment?: number): Pt[] {
  return stagedLeafOutline(leaf, FIDDLE_LEAF_FIG_SPECIES, perSegment)
}

/** Leaves at each stage for a plant with `stages` stages. */
export function stageLeafCounts(stages: number): number[] {
  return leafCountLadder(stages, FIDDLE_LEAF_FIG_CONFIG.stages)
}

/** Envelope scale at each stage for a plant with `stages` stages. */
export function stageScales(stages: number): number[] {
  return scaleLadder(stages, FIDDLE_LEAF_FIG_CONFIG.stages)
}
