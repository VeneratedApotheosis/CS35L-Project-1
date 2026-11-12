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
import { randomKimberlyFrond, kimberlyFrondOutline, type KimberlyFrondSpec } from "./kimberlyLeaf"
import { KIMBERLY_QUEEN_CONFIG } from "./kimberlyQueenConfig"

/*
 * The Kimberly Queen fern: a staged plant (see ../staged) with tall, gently
 * arching sword fronds. Each frond's silhouette comes from the shared engine;
 * the rachis and pinnae are drawn inside it. It has no flowers. Its outer
 * fronds fan outward, so the bend is passed into the frond's outline (and so
 * into the fitted, measured silhouette).
 */

/** Tall sword fronds with the stalk end at the base and the tip pointing up. */
const KIMBERLY_FROND: LeafShapeModel<KimberlyFrondSpec> = {
  randomSpec: randomKimberlyFrond,
  outline: (spec, length, perSegment, fan) => kimberlyFrondOutline(spec, length, perSegment, fan),
  middle: 0.45,
}

export const KIMBERLY_QUEEN_SPECIES: StagedPlantSpecies<KimberlyFrondSpec> = {
  config: KIMBERLY_QUEEN_CONFIG,
  leaf: KIMBERLY_FROND,
}

export type PlacedKimberlyFrond = StagedPlacedLeaf<KimberlyFrondSpec>
export type KimberlyQueenStage = PlantStage<KimberlyFrondSpec>
export type KimberlyQueenOptions = StagedPlantOptions
export type KimberlyQueenPlant = StagedPlant<KimberlyFrondSpec>

const cache = new Map<string, KimberlyQueenPlant>()

/** Build (or fetch the cached) Kimberly Queen fern for a seed. Treat the result as read-only. */
export function createKimberlyQueen(seed: number, options: KimberlyQueenOptions = {}): KimberlyQueenPlant {
  const base = createStagedPlant(seed, KIMBERLY_QUEEN_SPECIES, options)
  const key = seed + ":" + base.stages.length
  const hit = cache.get(key)
  if (hit) return hit
  cache.set(key, base)
  return base
}

/** A placed frond's silhouette in canvas coordinates. Used by tests and debug views. */
export function leafOutline(leaf: PlacedKimberlyFrond, perSegment?: number): Pt[] {
  return stagedLeafOutline(leaf, KIMBERLY_QUEEN_SPECIES, perSegment)
}

/** Fronds at each stage for a plant with `stages` stages. */
export function stageLeafCounts(stages: number): number[] {
  return leafCountLadder(stages, KIMBERLY_QUEEN_CONFIG.stages)
}

/** Envelope scale at each stage for a plant with `stages` stages. */
export function stageScales(stages: number): number[] {
  return scaleLadder(stages, KIMBERLY_QUEEN_CONFIG.stages)
}
