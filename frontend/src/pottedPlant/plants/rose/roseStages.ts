import type { Pt } from "../../geometry"
import { placeFlowers, type PlacedFlower } from "../peaceLily/flowers"
import { createStagedPlant, leafOutline as stagedLeafOutline } from "../staged/generate"
import type {
  LeafShapeModel,
  PlacedLeaf as StagedPlacedLeaf,
  PlantStage,
  StagedPlant,
  StagedPlantOptions,
  StagedPlantSpecies,
} from "../staged/types"
import { randomRoseLeaf, roseLeafOutline, type RoseLeafSpec } from "./leaf"
import { BLOOM_SHAPE, FLOWER_CONFIG, ROSE_CONFIG } from "./roseConfig"

/*
 * The rose: a staged plant (see ../staged) with rounded, veined leaves, plus
 * layered flowers placed by the peace lily's shared flower engine and drawn by
 * ./Flower. Flowers bud in stage 3 and open in stage 4.
 */

const ROSE_LEAF: LeafShapeModel<RoseLeafSpec> = {
  randomSpec: randomRoseLeaf,
  outline: (spec, length, perSegment) => roseLeafOutline(spec, length, perSegment),
  middle: 0.45,
}

export const ROSE_SPECIES: StagedPlantSpecies<RoseLeafSpec> = {
  config: ROSE_CONFIG,
  leaf: ROSE_LEAF,
}

export type PlacedRoseLeaf = StagedPlacedLeaf<RoseLeafSpec>
export type RoseStage = PlantStage<RoseLeafSpec>
export type RoseOptions = StagedPlantOptions

export interface RosePlant extends StagedPlant<RoseLeafSpec> {
  /** The plant's flowers at full size. Which are visible, and how, depends on the stage. */
  flowers: PlacedFlower[]
}

const cache = new Map<string, RosePlant>()

/** Build (or fetch the cached) rose for a seed. Treat the result as read-only. */
export function createRose(seed: number, options: RoseOptions = {}): RosePlant {
  const base = createStagedPlant(seed, ROSE_SPECIES, options)
  const key = seed + ":" + base.stages.length
  const hit = cache.get(key)
  if (hit) return hit

  const plant: RosePlant = {
    ...base,
    flowers: placeFlowers(seed, ROSE_CONFIG, FLOWER_CONFIG, BLOOM_SHAPE),
  }
  cache.set(key, plant)
  return plant
}

/** A placed leaf's outline in canvas coordinates. Used by tests and debug views. */
export function leafOutline(leaf: PlacedRoseLeaf, perSegment?: number): Pt[] {
  return stagedLeafOutline(leaf, ROSE_SPECIES, perSegment)
}
