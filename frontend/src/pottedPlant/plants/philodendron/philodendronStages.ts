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
import { leafPolygon, randomPhilodendronLeaf, type PhilodendronLeafSpec } from "./philodendronLeaf"
import { PHILODENDRON_CONFIG } from "./philodendronConfig"

/*
 * The Philodendron 'Sun Red' / Rojo Congo: a staged plant (see ../staged) with
 * a few broad paddle leaves in an upright crown that fans outward. It has no
 * flowers. Philodendron-specific choices live here and in philodendronConfig.ts.
 */

/** Broad paddle leaves, base at the stalk end and tip pointing up; outer leaves bend. */
const PHILODENDRON_LEAF: LeafShapeModel<PhilodendronLeafSpec> = {
  randomSpec: randomPhilodendronLeaf,
  outline: (spec, length, perSegment, fan) => leafPolygon(length, spec, perSegment, fan),
  middle: 0.5,
}

export const PHILODENDRON_SPECIES: StagedPlantSpecies<PhilodendronLeafSpec> = {
  config: PHILODENDRON_CONFIG,
  leaf: PHILODENDRON_LEAF,
}

export type PlacedPhilodendronLeaf = StagedPlacedLeaf<PhilodendronLeafSpec>
export type PhilodendronStage = PlantStage<PhilodendronLeafSpec>
export type PhilodendronOptions = StagedPlantOptions
export type PhilodendronPlant = StagedPlant<PhilodendronLeafSpec>

/** Build (or fetch the cached) philodendron for a seed. Treat the result as read-only. */
export function createPhilodendron(seed: number, options: PhilodendronOptions = {}): PhilodendronPlant {
  return createStagedPlant(seed, PHILODENDRON_SPECIES, options)
}

/** A placed leaf's paddle outline in canvas coordinates. Used by tests and debug views. */
export function leafOutline(leaf: PlacedPhilodendronLeaf, perSegment?: number): Pt[] {
  return stagedLeafOutline(leaf, PHILODENDRON_SPECIES, perSegment)
}

/** Leaves at each stage for a plant with `stages` stages. */
export function stageLeafCounts(stages: number): number[] {
  return leafCountLadder(stages, PHILODENDRON_CONFIG.stages)
}

/** Envelope scale at each stage for a plant with `stages` stages. */
export function stageScales(stages: number): number[] {
  return scaleLadder(stages, PHILODENDRON_CONFIG.stages)
}

/** How many of the newest, most upright leaves are drawn deep burgundy-red. */
export const RED_LEAF_COUNT = 2

/**
 * Which leaves are the deep burgundy-red ones: the `count` most upright leaves
 * of the full-size plant, picked by the smallest lean from vertical (ties broken
 * by index). This is the central, newest crown. The set is decided once from the
 * full plant and keyed by leaf index, so a leaf keeps its color at every stage
 * and every scale - earlier stages simply show fewer of them.
 */
export function redLeafIndices(plant: PhilodendronPlant, count = RED_LEAF_COUNT): Set<number> {
  const last = plant.stages[plant.stages.length - 1]
  const upright = [...last.leaves].sort(
    (a, b) => Math.abs(a.angle) - Math.abs(b.angle) || a.index - b.index,
  )
  return new Set(upright.slice(0, Math.min(count, upright.length)).map((leaf) => leaf.index))
}
