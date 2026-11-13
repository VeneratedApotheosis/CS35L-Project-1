import type { Pt } from "../../geometry"
import { createStagedPlant, leafOutline as stagedLeafOutline } from "../staged/generate"
import type {
  LeafShapeModel,
  PlacedLeaf as StagedPlacedLeaf,
  PlantStage,
  StagedPlant,
  StagedPlantOptions,
  StagedPlantSpecies,
} from "../staged/types"
import { placeFlowers, type PlacedFlower } from "./flowers"
import { lilyLeafOutline, randomLilyLeaf, type LilyLeafSpec } from "./leaf"
import { BLOOM_SHAPE, FLOWER_CONFIG, PEACE_LILY_CONFIG } from "./peaceLilyConfig"

/*
 * The peace lily: a staged plant (see ../staged) with long pointed leaves,
 * plus flowers placed by ./flowers.ts. Leaves come from the shared engine;
 * flowers are added on top and scale with the same stages.
 */

/** Long, pointed leaves with the stalk end at the base and the tip pointing up. */
const LILY_LEAF: LeafShapeModel<LilyLeafSpec> = {
  randomSpec: randomLilyLeaf,
  outline: lilyLeafOutline,
  middle: 0.4,
}

export const PEACE_LILY_SPECIES: StagedPlantSpecies<LilyLeafSpec> = {
  config: PEACE_LILY_CONFIG,
  leaf: LILY_LEAF,
}

export type PlacedLilyLeaf = StagedPlacedLeaf<LilyLeafSpec>
export type PeaceLilyStage = PlantStage<LilyLeafSpec>
export type PeaceLilyOptions = StagedPlantOptions

export interface PeaceLilyPlant extends StagedPlant<LilyLeafSpec> {
  /** The plant's flowers at full size. Which are visible, and how, depends on the stage. */
  flowers: PlacedFlower[]
}

const cache = new Map<string, PeaceLilyPlant>()

/** Build (or fetch the cached) peace lily for a seed. Treat the result as read-only. */
export function createPeaceLily(seed: number, options: PeaceLilyOptions = {}): PeaceLilyPlant {
  const base = createStagedPlant(seed, PEACE_LILY_SPECIES, options)
  const key = seed + ":" + base.stages.length
  const hit = cache.get(key)
  if (hit) return hit

  const plant: PeaceLilyPlant = {
    ...base,
    flowers: placeFlowers(seed, PEACE_LILY_CONFIG, FLOWER_CONFIG, BLOOM_SHAPE),
  }
  cache.set(key, plant)
  return plant
}

/** A placed leaf's outline in canvas coordinates. Used by tests and debug views. */
export function leafOutline(leaf: PlacedLilyLeaf, perSegment?: number): Pt[] {
  return stagedLeafOutline(leaf, PEACE_LILY_SPECIES, perSegment)
}
