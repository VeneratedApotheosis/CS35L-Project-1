import { SOIL } from "../genome"
import { POT_PALETTES, pickPotBand, type PotBand } from "../pot"
import { int, mulberry32, range } from "../rng"

/*
 * The lotus is a water plant. Unlike the pothos or pilea, it does not grow from
 * soil: the pot holds water, a few lily pads float on the surface, and a small
 * number of round leaves and pink flowers are held above on thin stems. It uses
 * the older continuous-growth idea (a single growth number 0..1) rather than the
 * stage engine, so it can share the lab's four-stage view.
 */

/** The water surface in the shared canvas, just above the pot soil. */
export const WATER_Y = SOIL.y + 2

/** A flat pad resting on the water. */
export interface LotusPad {
  x: number
  y: number
  r: number
  rot: number
  shade: number
  /** Direction of the pad's notch, in degrees. */
  notch: number
}

/** A round leaf held above the water on a stem. */
export interface LotusLeaf {
  baseX: number
  height: number
  r: number
  tilt: number
  shade: number
  /** Growth at which the leaf first appears. */
  birth: number
}

/** A pink flower on a stem. It starts as a tight bud and opens as it grows. */
export interface LotusFlower {
  baseX: number
  height: number
  size: number
  hue: number
  /** Growth at which the bud first appears. */
  birth: number
}

export interface LotusGenome {
  pot: number
  band: PotBand
  pads: LotusPad[]
  leaves: LotusLeaf[]
  flowers: LotusFlower[]
}

/** Build a lotus from a seed. Same seed, same plant. */
export function createLotus(seed: number): LotusGenome {
  const rng = mulberry32((seed >>> 0) ^ 0x10795)

  const pot = int(rng, 0, POT_PALETTES.length - 1)
  const band = pickPotBand(rng)

  const padCount = int(rng, 3, 4)
  const pads: LotusPad[] = Array.from({ length: padCount }, () => ({
    x: 100 + range(rng, -28, 28),
    y: WATER_Y + range(rng, -2, 3),
    r: range(rng, 8, 13),
    rot: range(rng, -22, 22),
    shade: rng(),
    notch: range(rng, -40, 40),
  }))

  // Very few leaves above the pot: one or two.
  const leafCount = int(rng, 1, 2)
  const leaves: LotusLeaf[] = Array.from({ length: leafCount }, (_, i) => ({
    baseX: 100 + range(rng, -16, 16),
    height: range(rng, 38, 56),
    r: range(rng, 11, 15),
    tilt: range(rng, -12, 12),
    shade: rng(),
    birth: i === 0 ? 0.1 : 0.5,
  }))

  const flowerCount = int(rng, 1, 2)
  const flowers: LotusFlower[] = Array.from({ length: flowerCount }, (_, i) => ({
    baseX: 100 + range(rng, -18, 18),
    height: range(rng, 52, 72),
    size: range(rng, 10, 14),
    hue: 338 + range(rng, -6, 9),
    birth: i === 0 ? 0.3 : 0.62,
  }))

  return { pot, band, pads, leaves, flowers }
}
