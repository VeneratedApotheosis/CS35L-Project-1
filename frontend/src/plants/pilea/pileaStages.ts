import type { Pt } from "../geometry"
import { subSeed } from "../genome"
import { int, mulberry32, range } from "../rng"
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
import { PILEA_CONFIG } from "./pileaConfig"
import { pileaLeafPolygon, randomPileaLeaf, type PileaLeafSpec } from "./pileaLeaf"

/*
 * The pilea (Pilea peperomioides): a staged plant (see ../staged) with round,
 * flat coin leaves on thin stalks. Leaves come from the shared engine; the
 * pilea adds its signature baby "pups" at the base (see pups below). It has no
 * flowers and does not fan.
 */

/** Round coins held face-on, with the stalk end at the base and the far edge at (0,-length). */
const PILEA_LEAF: LeafShapeModel<PileaLeafSpec> = {
  randomSpec: randomPileaLeaf,
  outline: (spec, length, perSegment) => pileaLeafPolygon(spec, length, perSegment),
  // The coin is centred on its length, so its middle is halfway along.
  middle: 0.5,
}

export const PILEA_SPECIES: StagedPlantSpecies<PileaLeafSpec> = {
  config: PILEA_CONFIG,
  leaf: PILEA_LEAF,
}

export type PlacedPileaLeaf = StagedPlacedLeaf<PileaLeafSpec>
export type PileaStage = PlantStage<PileaLeafSpec>
export type PileaOptions = StagedPlantOptions
export type PileaPlant = StagedPlant<PileaLeafSpec>

/** Build (or fetch the cached) pilea for a seed. Treat the result as read-only. */
export function createPilea(seed: number, options: PileaOptions = {}): PileaPlant {
  return createStagedPlant(seed, PILEA_SPECIES, options)
}

/** A placed coin's outline in canvas coordinates. Used by tests and debug views. */
export function leafOutline(leaf: PlacedPileaLeaf, perSegment?: number): Pt[] {
  return stagedLeafOutline(leaf, PILEA_SPECIES, perSegment)
}

/** Leaves at each stage for a plant with `stages` stages. */
export function stageLeafCounts(stages: number): number[] {
  return leafCountLadder(stages, PILEA_CONFIG.stages)
}

/** Envelope scale at each stage for a plant with `stages` stages. */
export function stageScales(stages: number): number[] {
  return scaleLadder(stages, PILEA_CONFIG.stages)
}

/* ------------------------------------------------------------------ */
/* Pups: the pilea's baby plants beside the main one                   */
/* ------------------------------------------------------------------ */

/** How the pups are generated. Their own random streams, so they never shift the main plant. */
export const PILEA_PUPS = {
  /** First stage at which pups show (they appear as the plant establishes). */
  fromStage: 2,
  /** Fewest and most pup clusters beside the plant. */
  count: [1, 2] as const,
  /** Coins in one pup cluster. */
  coinsPerPup: [2, 3] as const,
  /** How far a pup sits from the centre, in canvas units at full size. */
  distance: [20, 30] as const,
  /** A pup coin's height, in canvas units at full size. */
  length: [11, 16] as const,
  /** A pup coin's short stalk length, in canvas units at full size. */
  stalk: [4, 9] as const,
  /** A pup coin leans this much outward from its cluster, in degrees. */
  spread: [6, 30] as const,
  /** Random streams, kept apart from the main plant's leaf stream. */
  streams: { cluster: 311, coin: 317 },
}

/** One coin of a pup, at full size. Positions are relative to the soil point. */
export interface PileaPupCoin {
  spec: PileaLeafSpec
  /** Coin height in canvas units at full size. */
  length: number
  /** Coin direction in degrees from straight up. */
  angle: number
  /** Where the stalk starts, as an x offset from the soil point. */
  rootDX: number
  /** Short stalk length in canvas units at full size. */
  stalk: number
}

/**
 * The pilea's baby plants: 1 to 2 small clusters of coins beside the main
 * plant, at the soil. They are built once at full size from their own seed
 * streams and scaled with each stage in the component, so they grow with the
 * plant and never move the main coins.
 */
export function pileaPups(seed: number): PileaPupCoin[] {
  const P = PILEA_PUPS
  const rng = mulberry32(subSeed(seed, 0, P.streams.cluster))
  const clusters = int(rng, P.count[0], P.count[1])
  const coins: PileaPupCoin[] = []
  for (let p = 0; p < clusters; p++) {
    const side = p % 2 === 0 ? 1 : -1
    const distance = range(rng, P.distance[0], P.distance[1])
    const perPup = int(rng, P.coinsPerPup[0], P.coinsPerPup[1])
    for (let k = 0; k < perPup; k++) {
      const lr = mulberry32(subSeed(seed, p * 10 + k, P.streams.coin))
      coins.push({
        spec: randomPileaLeaf(lr),
        length: range(lr, P.length[0], P.length[1]),
        angle: side * range(lr, P.spread[0], P.spread[1]) + range(lr, -6, 6),
        rootDX: side * distance + range(lr, -4, 4),
        stalk: range(lr, P.stalk[0], P.stalk[1]),
      })
    }
  }
  return coins
}
