import type { Pt } from "../geometry"
import { createStagedPlant, leafOutline as stagedLeafOutline } from "../staged/generate"
import type {
  LeafShapeModel,
  PlacedLeaf as StagedPlacedLeaf,
  PlantStage,
  StagedPlant,
  StagedPlantOptions,
  StagedPlantSpecies,
} from "../staged/types"
import { randomSnakeLeaf, snakeLeafOutline, type SnakeLeafSpec } from "./snakeLeaf"
import { SNAKE_PLANT_CONFIG } from "./snakePlantConfig"

/*
 * The snake plant: a staged plant (see ../staged) with tall, stiff sword
 * leaves. Leaves come from the shared engine; it has no flowers.
 */

/** Tall sword leaves with the stalk end at the base and the tip pointing up. */
const SNAKE_LEAF: LeafShapeModel<SnakeLeafSpec> = {
  randomSpec: randomSnakeLeaf,
  outline: (spec, length, perSegment) => snakeLeafOutline(spec, length, perSegment),
  middle: 0.45,
}

export const SNAKE_PLANT_SPECIES: StagedPlantSpecies<SnakeLeafSpec> = {
  config: SNAKE_PLANT_CONFIG,
  leaf: SNAKE_LEAF,
}

export type PlacedSnakeLeaf = StagedPlacedLeaf<SnakeLeafSpec>
export type SnakePlantStage = PlantStage<SnakeLeafSpec>
export type SnakePlantOptions = StagedPlantOptions
export type SnakePlant = StagedPlant<SnakeLeafSpec>

const cache = new Map<string, SnakePlant>()

/** Build (or fetch the cached) snake plant for a seed. Treat the result as read-only. */
export function createSnakePlant(seed: number, options: SnakePlantOptions = {}): SnakePlant {
  const base = createStagedPlant(seed, SNAKE_PLANT_SPECIES, options)
  const key = seed + ":" + base.stages.length
  const hit = cache.get(key)
  if (hit) return hit
  cache.set(key, base)
  return base
}

/** A placed leaf's outline in canvas coordinates. Used by tests and debug views. */
export function leafOutline(leaf: PlacedSnakeLeaf, perSegment?: number): Pt[] {
  return stagedLeafOutline(leaf, SNAKE_PLANT_SPECIES, perSegment)
}
