import { placeOutline } from "../../geometry"
import { lerp, mulberry32 } from "../../rng"
import type { PlacedLeaf, StagedPlant } from "./types"

/**
 * The wilted look. A plant is wilted by an amount from 0 (healthy) to 1 (fully
 * wilted). It does two things, and neither touches the pot:
 *
 * - Leaves droop: each one turns about its stalk end, away from the middle,
 *   toward horizontal. At full wilt the average leaf is almost horizontal.
 * - About half of the leaves turn brown, and half of those a darker brown. Which
 *   leaves is fixed by the seed, so a plant always browns the same leaves, and
 *   more of the color shows as the amount rises.
 */
export const WILT = {
  /** The angle from straight up that a fully wilted leaf droops to, in degrees. */
  droopAngle: 80,
  /** Each leaf droops up to this many degrees more or less than that, fixed per leaf. */
  droopJitter: 8,
  /** Share of leaves that are browned, and the share of all leaves that are dark brown. */
  brownShare: 0.5,
  darkShare: 0.25,
  /** A leaf that would cross a limit is shortened by this factor, and tried again. */
  shrinkStep: 0.96,
  /**
   * A leaf is shortened to at most this share of its length to fit. If it
   * still doesn't fit, it droops less instead of shrinking further.
   */
  minLength: 0.75,
  /** How a health state maps to an amount of wilt. */
  forHealth: { healthy: 0, slightly_wilted: 0.5, wilted: 1 },
} as const

export type WiltHealth = keyof typeof WILT.forHealth

/** The wilt amount for one of the backend's three health states. */
export const wiltForHealth = (health: WiltHealth): number => WILT.forHealth[health]

/**
 * The two browns. At full wilt a leaf's color is replaced by `strength` of its
 * own brightness painted in `tint` (red, green and blue multipliers).
 */
export const BROWNING = {
  brown: { strength: 0.8, tint: [1.3, 0.86, 0.44] },
  dark: { strength: 0.92, tint: [0.78, 0.5, 0.26] },
} as const

/** How many steps the droop is eased back in, when a shortened leaf still doesn't fit. */
const EASE_STEPS = 24

const GOLDEN = 0.6180339887498949

/**
 * Which leaves brown. Leaf number i takes the value (i + 1) * 0.618 + phase, kept
 * to its fraction part. That sequence spreads evenly however many leaves a stage
 * shows, so every stage browns close to half of its leaves, a quarter of them dark.
 */
export function browningOf(seed: number, index: number): "dark" | "brown" | null {
  const phase = mulberry32(seed ^ 0x5bd1e995)()
  const value = ((index + 1) * GOLDEN + phase) % 1
  if (value < WILT.darkShare) return "dark"
  if (value < WILT.brownShare) return "brown"
  return null
}

const clamp01 = (n: number) => Math.min(Math.max(n, 0), 1)

/**
 * The plant with its leaves wilted by `amount`. Returns the same plant when
 * the amount is 0. The plant must have been made by createStagedPlant, which
 * records the species the limits and leaf outlines come from; without one it
 * is returned unchanged. A drooped leaf that would cross the side limits or
 * the soil is shortened until it fits, so wilting never moves a leaf out.
 */
export function wiltPlant<Spec, P extends StagedPlant<Spec>>(plant: P, amount: number): P {
  const wilt = clamp01(amount)
  const { species } = plant
  if (wilt === 0 || !species) return plant

  const { limits, dome, search } = species.config
  const stages = plant.stages.map((stage) => {
    const leaves = stage.leaves.map((leaf): PlacedLeaf<Spec> => {
      const side = leaf.angle !== 0 ? Math.sign(leaf.angle) : leaf.baseX >= dome.anchor.x ? 1 : -1
      const jitter = (mulberry32(plant.seed * 31 + leaf.index * 7919)() - 0.5) * 2 * WILT.droopJitter
      const droopTo = Math.max(Math.abs(leaf.angle), WILT.droopAngle + jitter)
      const droopAngle = side * lerp(Math.abs(leaf.angle), droopTo, wilt)

      // Fit the leaf inside the side limits and above the soil. First shorten it a
      // little. If it still doesn't fit, ease the droop, which always works in the
      // end because the leaf's own angle fit before it wilted.
      const fits = (length: number, turn: number) =>
        placeOutline(
          species.leaf.outline(leaf.spec, length, search.fitSegments, leaf.fan),
          { x: leaf.baseX, y: leaf.baseY },
          turn,
        ).every(([x, y]) => x >= limits.left && x <= limits.right && y <= limits.floor)

      let length = leaf.length
      let angle = droopAngle
      const shortest = leaf.length * WILT.minLength
      while (!fits(length, angle) && length > shortest) length = Math.max(shortest, length * WILT.shrinkStep)
      for (let step = 1; !fits(length, angle) && step <= EASE_STEPS; step++) {
        angle = lerp(droopAngle, leaf.angle, step / EASE_STEPS)
      }

      const radians = (angle * Math.PI) / 180
      const tone = browningOf(plant.seed, leaf.index)
      return {
        ...leaf,
        angle,
        length,
        centerX: leaf.baseX + Math.sin(radians) * species.leaf.middle * length,
        centerY: leaf.baseY - Math.cos(radians) * species.leaf.middle * length,
        browning: tone ? { tone, amount: wilt } : undefined,
      }
    })
    const leafLength = leaves.reduce((sum, leaf) => sum + leaf.length, 0) / leaves.length
    return { ...stage, leaves, leafLength }
  })
  return { ...plant, stages }
}
