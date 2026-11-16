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
import { randomSpiderLeaf, spiderLeafOutline, type SpiderLeafSpec } from "./spiderLeaf"
import { SPIDER_PLANT_CONFIG } from "./spiderPlantConfig"

/*
 * The spider plant: a staged plant (see ../staged) with many long, thin blades
 * that arch outward and droop at the tip. Every blade fans, so the bend is
 * passed into the blade's outline (and so into the fitted, measured
 * silhouette). So is the blade's angle: the outermost blades are short and
 * droop low, over the pot rim. It has no flowers.
 */

/** Thin blades with the stalk end at the base; the tip arches out and down when fanned. */
const SPIDER_LEAF: LeafShapeModel<SpiderLeafSpec> = {
  randomSpec: randomSpiderLeaf,
  outline: (spec, length, perSegment, fan, angle) => spiderLeafOutline(spec, length, perSegment, fan, angle),
  middle: 0.45,
}

export const SPIDER_PLANT_SPECIES: StagedPlantSpecies<SpiderLeafSpec> = {
  config: SPIDER_PLANT_CONFIG,
  leaf: SPIDER_LEAF,
}

export type PlacedSpiderLeaf = StagedPlacedLeaf<SpiderLeafSpec>
export type SpiderPlantStage = PlantStage<SpiderLeafSpec>
export type SpiderPlantOptions = StagedPlantOptions
export type SpiderPlantModel = StagedPlant<SpiderLeafSpec>

/** Build (or fetch the cached) spider plant for a seed. Treat the result as read-only. */
export function createSpiderPlant(seed: number, options: SpiderPlantOptions = {}): SpiderPlantModel {
  return createStagedPlant(seed, SPIDER_PLANT_SPECIES, options)
}

/** A placed blade's outline in canvas coordinates. Used by tests and debug views. */
export function leafOutline(leaf: PlacedSpiderLeaf, perSegment?: number): Pt[] {
  return stagedLeafOutline(leaf, SPIDER_PLANT_SPECIES, perSegment)
}

/** Blades at each stage for a plant with `stages` stages. */
export function stageLeafCounts(stages: number): number[] {
  return leafCountLadder(stages, SPIDER_PLANT_CONFIG.stages)
}

/** Envelope scale at each stage for a plant with `stages` stages. */
export function stageScales(stages: number): number[] {
  return scaleLadder(stages, SPIDER_PLANT_CONFIG.stages)
}
