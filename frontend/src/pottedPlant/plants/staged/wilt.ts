import type { Pt } from "../../geometry"
import { placeOutline } from "../../geometry"
import { lerp, mulberry32 } from "../../rng"
import type { PlacedLeaf, StagedPlant } from "./types"

/**
 * The wilted look. A plant is wilted by an amount from 0 (healthy) to 1 (fully
 * wilted). It changes three things, and never the pot:
 *
 * - Stems bend: each tilts outward from the middle, curving more as the wilt grows.
 * - Leaves droop: each one turns about its stalk end, away from the middle,
 *   toward horizontal. At full wilt the average leaf is almost horizontal.
 *   Longer leaves also curve along their length, bending further toward the ground.
 * - About half of the leaves turn brown, and half of those a darker brown. Which
 *   leaves is fixed by the seed, so a plant always browns the same leaves, and
 *   more of the color shows as the amount rises.
 */
export const WILT = {
  /** The angle from straight up that a fully wilted leaf droops to, in degrees. */
  droopAngle: 80,
  /** Each leaf droops up to this many degrees more or less than that, fixed per leaf. */
  droopJitter: 8,
  /** How far a fully wilted stem tilts its tip outward, in degrees. The bend along it is a share of this. */
  stemBend: 32,
  stemCurveShare: 0.3,
  /** The tip of a stem never tilts past this angle from vertical, so it never dips below its root. */
  stemMaxHeading: 70,
  /**
   * The most a fully wilted leaf curves along its length, in degrees of turn
   * from its stalk to its tip. A leaf shorter than `curveFrom` doesn't curve,
   * and one longer than `curveFrom + curveSpan` curves the most.
   */
  leafCurve: 80,
  curveFrom: 25,
  curveSpan: 45,
  /** Share of leaves that are browned, and the share of all leaves that are dark brown. */
  brownShare: 0.5,
  darkShare: 0.25,
  /** A leaf that would cross a limit is shortened by this factor, and tried again. */
  shrinkStep: 0.96,
  /**
   * A leaf is shortened to at most this share of its length to fit. If it
   * still doesn't fit, the wilt is eased on that leaf instead of shrinking it further.
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

/** How many steps the wilt is eased back in, when a shortened leaf still doesn't fit. */
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
const rad = (degrees: number) => (degrees * Math.PI) / 180

/* ------------------------------------------------------------------ */
/* Curving a leaf                                                      */
/* ------------------------------------------------------------------ */

/**
 * A point of a leaf drawn straight (stalk at (0,0), tip at (0,-length)) after the
 * leaf is curved. The leaf's middle line becomes an arc that turns `bend` degrees
 * from stalk to tip, positive turning toward the right. Every point keeps its
 * distance along the leaf and its distance from the middle line.
 */
export function bendPoint([x, y]: Pt, length: number, bend: number): Pt {
  const total = rad(bend)
  if (Math.abs(total) < 1e-6) return [x, y]
  const along = Math.min(Math.max(-y, 0), length)
  const k = total / length
  const turn = k * along
  // The middle line is the integral of the heading (sin turn, -cos turn) over the distance.
  const lineX = (1 - Math.cos(turn)) / k
  const lineY = -Math.sin(turn) / k
  return [lineX + x * Math.cos(turn), lineY + x * Math.sin(turn)]
}

/** A straight leaf outline, curved. */
export const bendOutline = (outline: Pt[], length: number, bend: number): Pt[] =>
  outline.map((point) => bendPoint(point, length, bend))

/** How many straight slices a curved leaf is drawn in. */
export const BEND_SLICES = 6

/**
 * Where to draw each slice of a curved leaf. Each slice is the straight leaf,
 * cut across its length, then turned and moved to sit on the arc. `top` and
 * `bottom` are the slice's cut in the straight leaf's own coordinates (the leaf
 * grows toward negative y), `transform` places the slice.
 */
export function bendSlices(length: number, bend: number): { top: number; bottom: number; transform: string }[] {
  const total = rad(bend)
  const k = total / length
  const step = length / BEND_SLICES
  return Array.from({ length: BEND_SLICES }, (_, i) => {
    const start = i * step
    const middleTurn = k * (start + step / 2)
    const [x, y] = bendPoint([0, -start], length, bend)
    return {
      top: -(start + step),
      bottom: -start,
      // Bring the slice's start to the origin, turn it, then move it onto the arc.
      transform:
        "translate(" + x.toFixed(2) + " " + y.toFixed(2) + ") rotate(" + ((middleTurn * 180) / Math.PI).toFixed(2) +
        ") translate(0 " + start.toFixed(2) + ")",
    }
  })
}

/* ------------------------------------------------------------------ */
/* Wilting a plant                                                     */
/* ------------------------------------------------------------------ */

/**
 * The plant with its leaves and stems wilted by `amount`. Returns the same plant
 * when the amount is 0. The plant must have been made by createStagedPlant,
 * which records the species the limits and leaf outlines come from; without one
 * it is returned unchanged. A wilted leaf that would cross the side limits or
 * the soil is shortened a little, and if that is not enough the wilt is eased on
 * that leaf, so wilting never moves a leaf out.
 */
export function wiltPlant<Spec, P extends StagedPlant<Spec>>(plant: P, amount: number): P {
  const wilt = clamp01(amount)
  const { species } = plant
  if (wilt === 0 || !species) return plant

  const { limits, dome, search, stems } = species.config
  const stages = plant.stages.map((stage) => {
    const leaves = stage.leaves.map((leaf): PlacedLeaf<Spec> => {
      const side = leaf.angle !== 0 ? Math.sign(leaf.angle) : leaf.baseX >= dome.anchor.x ? 1 : -1
      const jitter = (mulberry32(plant.seed * 31 + leaf.index * 7919)() - 0.5) * 2 * WILT.droopJitter
      const droopTo = Math.max(Math.abs(leaf.angle), WILT.droopAngle + jitter)
      const droopAngle = side * lerp(Math.abs(leaf.angle), droopTo, wilt)

      // The stem and leaf as they stand when `ease` of the wilt shows (1 is all of it).
      const arrange = (length: number, ease: number) => {
        const stem = bentStem(leaf.stem, side, WILT.stemBend * wilt * ease, stems.bendPoint, dome.anchor.y)
        const angle = lerp(leaf.angle, droopAngle, ease)
        const share = clamp01((length - WILT.curveFrom) / WILT.curveSpan)
        const bend = side * WILT.leafCurve * wilt * ease * share
        return { stem, angle, bend }
      }
      const fits = (length: number, ease: number) => {
        const { stem, angle, bend } = arrange(length, ease)
        const straight = species.leaf.outline(leaf.spec, length, search.fitSegments, leaf.fan)
        return placeOutline(bendOutline(straight, length, bend), { x: stem.x1, y: stem.y1 }, angle).every(
          ([x, y]) => x >= limits.left && x <= limits.right && y <= limits.floor,
        )
      }

      // First shorten the leaf a little. If it still doesn't fit, ease the wilt on it,
      // which always works in the end because the unwilted leaf fit.
      let length = leaf.length
      let ease = 1
      const shortest = leaf.length * WILT.minLength
      while (!fits(length, ease) && length > shortest) length = Math.max(shortest, length * WILT.shrinkStep)
      for (let step = 1; !fits(length, ease) && step <= EASE_STEPS; step++) ease = 1 - step / EASE_STEPS

      const { stem, angle, bend } = arrange(length, ease)
      const middle = bendPoint([0, -species.leaf.middle * length], length, bend)
      const [centerX, centerY] = placeOutline([middle], { x: stem.x1, y: stem.y1 }, angle)[0]
      const tone = browningOf(plant.seed, leaf.index)
      return {
        ...leaf,
        angle,
        length,
        bend,
        centerX,
        centerY,
        baseX: stem.x1,
        baseY: stem.y1,
        stem,
        browning: tone ? { tone, amount: wilt } : undefined,
      }
    })
    const leafLength = leaves.reduce((sum, leaf) => sum + leaf.length, 0) / leaves.length
    return { ...stage, leaves, leafLength }
  })
  return { ...plant, stages }
}

/**
 * A stem tilted `degrees` further outward at its tip, on the side it already
 * leans to. The root stays put and the length is kept. The curve starts more
 * upright than it ends, so it bows outward, and more so as `degrees` grows.
 */
function bentStem(
  stem: PlacedLeaf<unknown>["stem"],
  side: number,
  degrees: number,
  bendPoint: number,
  soilY: number,
): PlacedLeaf<unknown>["stem"] {
  const dx = stem.x1 - stem.x0
  const dy = stem.y1 - stem.y0
  const length = Math.hypot(dx, dy)
  const heading = Math.atan2(dx, -dy)
  const limit = rad(WILT.stemMaxHeading)
  const tilt = (turn: number) => Math.min(Math.max(heading + side * rad(turn), -limit), limit)
  const tip = tilt(degrees)
  const bow = tilt(degrees * WILT.stemCurveShare)
  return {
    x0: stem.x0,
    y0: stem.y0,
    cx: stem.x0 + Math.sin(bow) * length * bendPoint,
    cy: Math.min(soilY, stem.y0 - Math.cos(bow) * length * bendPoint),
    x1: stem.x0 + Math.sin(tip) * length,
    y1: stem.y0 - Math.cos(tip) * length,
  }
}
