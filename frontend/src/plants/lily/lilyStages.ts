import type { Pt } from "../geometry"
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
import { lilyLeafOutline, randomLilyLeaf, type LilyLeafSpec } from "./leaf"
import { BLOOM_SHAPE, FLOWER_CONFIG, LILY_CONFIG } from "./lilyConfig"

/*
 * The lily: a staged plant (see ../staged) with long, pointed leaves, plus
 * showy six-petalled flowers placed by the peace lily's shared flower engine
 * and drawn by ./Flower. Flowers bud in stage 3 and open in stage 4.
 */

const LILY_LEAF: LeafShapeModel<LilyLeafSpec> = {
  randomSpec: randomLilyLeaf,
  outline: lilyLeafOutline,
  middle: 0.4,
}

export const LILY_SPECIES: StagedPlantSpecies<LilyLeafSpec> = {
  config: LILY_CONFIG,
  leaf: LILY_LEAF,
}

export type PlacedLilyLeaf = StagedPlacedLeaf<LilyLeafSpec>
export type LilyStage = PlantStage<LilyLeafSpec>
export type LilyOptions = StagedPlantOptions

export interface LilyPlant extends StagedPlant<LilyLeafSpec> {
  /** The plant's flowers at full size. Which are visible, and how, depends on the stage. */
  flowers: PlacedFlower[]
}

const cache = new Map<string, LilyPlant>()

/** Build (or fetch the cached) lily for a seed. Treat the result as read-only. */
export function createLily(seed: number, options: LilyOptions = {}): LilyPlant {
  const base = createStagedPlant(seed, LILY_SPECIES, options)
  const key = seed + ":" + base.stages.length
  const hit = cache.get(key)
  if (hit) return hit

  const plant: LilyPlant = {
    ...base,
    flowers: placeFlowers(seed, LILY_CONFIG, FLOWER_CONFIG, BLOOM_SHAPE),
  }
  cache.set(key, plant)
  return plant
}

/** A placed leaf's outline in canvas coordinates. Used by tests and debug views. */
export function leafOutline(leaf: PlacedLilyLeaf, perSegment?: number): Pt[] {
  return stagedLeafOutline(leaf, LILY_SPECIES, perSegment)
}
