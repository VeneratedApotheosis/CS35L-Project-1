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
import { leafPolygon, randomMonsteraLeaf, type MonsteraLeafSpec } from "./monsteraLeaf"
import { MONSTERA_CONFIG } from "./monsteraConfig"

/*
 * The Monstera deliciosa: a staged plant (see ../staged) with a few large,
 * broad, fenestrated leaves. Leaves come from the shared engine; it has no
 * flowers and does not fan. Monstera-specific choices live here and in
 * monsteraConfig.ts.
 */

/** Broad heart leaves with the base at the stalk end and the drip tip pointing up. */
const MONSTERA_LEAF: LeafShapeModel<MonsteraLeafSpec> = {
  randomSpec: randomMonsteraLeaf,
  // The engine measures the outer blade (bent by the fan); fenestrations are a
  // drawing detail.
  outline: (spec, length, perSegment, fan) => leafPolygon(length, spec, perSegment, fan),
  middle: 0.45,
}

export const MONSTERA_SPECIES: StagedPlantSpecies<MonsteraLeafSpec> = {
  config: MONSTERA_CONFIG,
  leaf: MONSTERA_LEAF,
}

export type PlacedMonsteraLeaf = StagedPlacedLeaf<MonsteraLeafSpec>
export type MonsteraStage = PlantStage<MonsteraLeafSpec>
export type MonsteraOptions = StagedPlantOptions
export type MonsteraPlant = StagedPlant<MonsteraLeafSpec>

/** Build (or fetch the cached) monstera for a seed. Treat the result as read-only. */
export function createMonstera(seed: number, options: MonsteraOptions = {}): MonsteraPlant {
  return createStagedPlant(seed, MONSTERA_SPECIES, options)
}

/** A placed leaf's outer-blade outline in canvas coordinates. Used by tests and debug views. */
export function leafOutline(leaf: PlacedMonsteraLeaf, perSegment?: number): Pt[] {
  return stagedLeafOutline(leaf, MONSTERA_SPECIES, perSegment)
}

/** Leaves at each stage for a plant with `stages` stages. */
export function stageLeafCounts(stages: number): number[] {
  return leafCountLadder(stages, MONSTERA_CONFIG.stages)
}

/** Envelope scale at each stage for a plant with `stages` stages. */
export function stageScales(stages: number): number[] {
  return scaleLadder(stages, MONSTERA_CONFIG.stages)
}
