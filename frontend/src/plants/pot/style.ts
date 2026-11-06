import { subSeed } from "../genome"
import { int, mulberry32, type Rng } from "../rng"
import type { PotFinishId } from "./finishes"
import { POT_BAND_ODDS, POT_PALETTES, type PotBand } from "./palettes"

/** Everything that makes one pot look the way it does. Any look can go with any plant. */
export interface PotLook {
  /** Index into POT_PALETTES. Values past the end wrap around. */
  palette: number
  band: PotBand
  /** How the body is filled. See finishes/index.ts. */
  finish: PotFinishId
  /** Seeds the pot's pattern stream, the one a finish draws from. */
  seed: number
}

/**
 * The label of the pot's random stream, mixed into the seed. A pot never draws
 * from the plant's stream, so choosing a pot never moves a plant.
 */
// [PLACEHOLDER] An arbitrary label. Changing it changes every pot.
const POT_STREAM = 1

/** The range of a pattern seed: any unsigned 32-bit integer. */
const PATTERN_SEED_RANGE = 2 ** 32

/**
 * How likely each finish is, as parts of the total. Every registered finish
 * needs an entry. Solid is the only one for now, so every pot gets it.
 */
// [PLACEHOLDER] Weights are provisional until the first finish besides solid ships.
export const POT_FINISH_WEIGHTS: Readonly<Record<PotFinishId, number>> = { solid: 1 }

/** Pick a key with one draw, weighted by `weights`. A weight of 0 is never picked. */
function pickWeighted<Id extends string>(rng: Rng, weights: Readonly<Record<Id, number>>): Id {
  const entries = Object.entries<number>(weights).filter(([, weight]) => weight > 0) as [Id, number][]
  if (entries.length === 0) throw new RangeError("Weights need at least one entry above 0")
  const total = entries.reduce((sum, [, weight]) => sum + weight, 0)
  let draw = rng() * total
  for (const [id, weight] of entries) {
    draw -= weight
    if (draw < 0) return id
  }
  return entries[entries.length - 1][0]
}

/** Pick a band with one draw, weighted by POT_BAND_ODDS. */
export function pickPotBand(rng: Rng): PotBand {
  return pickWeighted(rng, POT_BAND_ODDS)
}

/** Pick a finish with one draw, weighted by POT_FINISH_WEIGHTS unless other weights are given. */
export function pickPotFinish(rng: Rng): PotFinishId
export function pickPotFinish<Id extends string>(rng: Rng, weights: Readonly<Record<Id, number>>): Id
export function pickPotFinish(rng: Rng, weights: Readonly<Record<string, number>> = POT_FINISH_WEIGHTS): string {
  return pickWeighted(rng, weights)
}

/**
 * The look of the pot for a seed. The pot has its own stream, made from the
 * seed alone, and every draw is made in a fixed order: palette, band, finish,
 * pattern seed. A draw added at the end never moves the ones before it, and
 * adding a finish only changes the finish pick's weights, not how many draws
 * it takes. The same seed always gives the same look.
 */
export function potLookFromSeed(seed: number): PotLook {
  const rng = mulberry32(subSeed(seed, POT_STREAM))
  const palette = int(rng, 0, POT_PALETTES.length - 1)
  const band = pickPotBand(rng)
  const finish = pickPotFinish(rng)
  return { palette, band, finish, seed: Math.floor(rng() * PATTERN_SEED_RANGE) }
}
