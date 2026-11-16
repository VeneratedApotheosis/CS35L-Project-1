import { SOIL } from "../../genome"
import { int, mulberry32, range } from "../../rng"

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
  pads: LotusPad[]
  leaves: LotusLeaf[]
  flowers: LotusFlower[]
}

/** Build a lotus from a seed. Same seed, same plant. */
export function createLotus(seed: number): LotusGenome {
  const rng = mulberry32((seed >>> 0) ^ 0x10795)

  const padCount = int(rng, 3, 4)
  const pads: LotusPad[] = Array.from({ length: padCount }, () => ({
    x: 100 + range(rng, -28, 28),
    y: WATER_Y + range(rng, -2, 3),
    r: range(rng, 8, 13),
    rot: range(rng, -22, 22),
    shade: rng(),
    notch: range(rng, -40, 40),
  }))

  // Large, flat plates held at a modest height so the big discs stay in canvas.
  // Two or three at full growth; the later ones arrive at later stages. Births
  // are spread so the final stage shows every leaf.
  const leafCount = int(rng, 2, 3)
  const leafBirths = leafCount === 3 ? [0.1, 0.4, 0.72] : [0.1, 0.5]
  const leaves: LotusLeaf[] = Array.from({ length: leafCount }, (_, i) => ({
    baseX: 100 + range(rng, -16, 16),
    height: range(rng, 28, 44) - i * 2,
    r: range(rng, 16, 22),
    tilt: range(rng, -8, 8),
    shade: rng(),
    birth: leafBirths[i],
  }))

  // Flowers are spread across the pot and staggered in height so their wide
  // heads never overlap by more than about half. The first (central, tallest)
  // appears earliest; a second sits off to one side, shorter and later.
  const flowerCount = int(rng, 1, 2)
  const flowers: LotusFlower[] = Array.from({ length: flowerCount }, (_, i) => {
    const slot = flowerCount === 1 ? 0 : i === 0 ? -0.35 : 1
    return {
      baseX: 100 + slot * 22 + range(rng, -3, 3),
      height: i === 0 ? range(rng, 64, 74) : range(rng, 48, 56),
      size: range(rng, 10, 13),
      hue: 338 + range(rng, -6, 9),
      birth: i === 0 ? 0.3 : 0.62,
    }
  })

  return { pads, leaves, flowers }
}
