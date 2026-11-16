export type Rng = () => number

/** A low and a high value. */
export type Range = readonly [number, number]

/** Small, fast seeded PRNG. Same seed, same sequence. */
export function mulberry32(seed: number): Rng {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

export const range = (rng: Rng, min: number, max: number) =>
  min + rng() * (max - min)

export const int = (rng: Rng, min: number, max: number) =>
  Math.floor(range(rng, min, max + 1))

export const pick = <T,>(rng: Rng, items: readonly T[]): T =>
  items[Math.floor(rng() * items.length)]

export const chance = (rng: Rng, p: number) => rng() < p

export const clamp = (v: number, min = 0, max = 1) =>
  Math.min(max, Math.max(min, v))

export const lerp = (a: number, b: number, t: number) => a + (b - a) * t

export const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3)
