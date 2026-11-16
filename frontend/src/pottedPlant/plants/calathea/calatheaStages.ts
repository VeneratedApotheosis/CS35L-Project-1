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
import { CALATHEA_CONFIG } from "./calatheaConfig"
import { calatheaLeafOutline, randomCalatheaLeaf, type CalatheaLeafSpec } from "./calatheaLeaf"

/*
 * The calathea (a prayer plant): a staged plant (see ../staged) with broad,
 * striped oval leaves on stems. Leaves come from the shared engine; it has no
 * flowers and does not fan.
 */

/** Broad ovals with the stalk end at the base and the tip pointing up. */
const CALATHEA_LEAF: LeafShapeModel<CalatheaLeafSpec> = {
  randomSpec: randomCalatheaLeaf,
  outline: (spec, length, perSegment) => calatheaLeafOutline(spec, length, perSegment),
  middle: 0.5,
}

export const CALATHEA_SPECIES: StagedPlantSpecies<CalatheaLeafSpec> = {
  config: CALATHEA_CONFIG,
  leaf: CALATHEA_LEAF,
}

export type PlacedCalatheaLeaf = StagedPlacedLeaf<CalatheaLeafSpec>
export type CalatheaStage = PlantStage<CalatheaLeafSpec>
export type CalatheaOptions = StagedPlantOptions
export type CalatheaPlant = StagedPlant<CalatheaLeafSpec>

/** Build (or fetch the cached) calathea for a seed. Treat the result as read-only. */
export function createCalathea(seed: number, options: CalatheaOptions = {}): CalatheaPlant {
  return createStagedPlant(seed, CALATHEA_SPECIES, options)
}

/** A placed leaf's outline in canvas coordinates. Used by tests and debug views. */
export function leafOutline(leaf: PlacedCalatheaLeaf, perSegment?: number): Pt[] {
  return stagedLeafOutline(leaf, CALATHEA_SPECIES, perSegment)
}

/** Leaves at each stage for a plant with N stages. */
export function stageLeafCounts(stages: number): number[] {
  return leafCountLadder(stages, CALATHEA_CONFIG.stages)
}

/** Envelope scale at each stage for a plant with N stages. */
export function stageScales(stages: number): number[] {
  return scaleLadder(stages, CALATHEA_CONFIG.stages)
}
