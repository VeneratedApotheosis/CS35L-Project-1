import { leafPolygon, randomLeafSpec, type LeafSpec } from "./leaf"
import type { Pt } from "../geometry"
import { POTHOS_CONFIG } from "./pothosConfig"
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

/*
 * The pothos: a staged plant (see ./staged) with heart-shaped leaves.
 *
 * Pothos-specific choices live here and in pothosConfig.ts. The engine that
 * places leaves on stems is shared by every plant built this way.
 */

/** Heart-shaped leaves, with the notch at the stalk end and the tip pointing up. */
const HEART_LEAF: LeafShapeModel<LeafSpec> = {
  randomSpec: randomLeafSpec,
  outline: (spec, length, perSegment) => leafPolygon(length, spec, perSegment),
  middle: 0.45,
}

export const POTHOS_SPECIES: StagedPlantSpecies<LeafSpec> = {
  config: POTHOS_CONFIG,
  leaf: HEART_LEAF,
}

export type PlacedLeaf = StagedPlacedLeaf<LeafSpec>
export type PothosStage = PlantStage<LeafSpec>
export type PothosPlant = StagedPlant<LeafSpec>
export type PothosOptions = StagedPlantOptions

/** Build (or fetch the cached) pothos for a seed. Treat the result as read-only. */
export function createPothos(seed: number, options: PothosOptions = {}): PothosPlant {
  return createStagedPlant(seed, POTHOS_SPECIES, options)
}

/** A placed leaf's outline in canvas coordinates. Used by tests and debug views. */
export function leafOutline(leaf: PlacedLeaf, perSegment?: number): Pt[] {
  return stagedLeafOutline(leaf, POTHOS_SPECIES, perSegment)
}

/** Leaves at each stage for a plant with `stages` stages. */
export function stageLeafCounts(stages: number): number[] {
  return leafCountLadder(stages, POTHOS_CONFIG.stages)
}

/** Envelope scale at each stage for a plant with `stages` stages. */
export function stageScales(stages: number): number[] {
  return scaleLadder(stages, POTHOS_CONFIG.stages)
}

/*
 * The pothos's main limits, read from its config so there is one source of
 * truth. Tests and the page use these names.
 */
export const MAX_LEAVES = POTHOS_CONFIG.stages.maxLeaves
export const MAX_STAGES = POTHOS_CONFIG.stages.max
export const GROWTH_RATIO = POTHOS_CONFIG.stages.growthRatio
export const MAX_LAYERS = POTHOS_CONFIG.coverage.maxOverlap
export const BOUNDS = POTHOS_CONFIG.limits
export const ENVELOPE = POTHOS_CONFIG.dome
export const ROOT_RANGE = POTHOS_CONFIG.roots.range
export const POT_RIM = { left: POTHOS_CONFIG.pot.rimLeft, right: POTHOS_CONFIG.pot.rimRight }
