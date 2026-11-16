import { rad, type Pt } from "../../geometry"
import { clamp, lerp, range, type Range, type Rng } from "../../rng"

/*
 * The spider plant's leaf (Chlorophytum comosum 'Vittatum'): a long, very thin
 * grass-like blade that rises from the crown, arches outward and droops at the
 * tip, with a cream stripe down its middle. The blade is built from one
 * curved midrib: its heading turns a little more with every step, so the tip
 * ends up pointing out and down. How long a blade is, and how far it arches,
 * follows the way it points: blades near the middle are a little shorter and
 * arch gently so they fill the centre of the mound, blades about 35 degrees out
 * are the longest, and the outermost blades are short and droop low. The same
 * midrib gives the silhouette the stage engine measures and the stripe that is
 * drawn, so they always agree.
 * Flat, two-tone, Animal Crossing: New Horizons style. Every number lives in a
 * named object below.
 */

/** Everything that defines one spider-plant blade's look, independent of where it sits. */
export interface SpiderLeafSpec {
  /** Width divided by length. Spider-plant blades are very thin. */
  aspect: number
  /** Where the blade starts to narrow toward its tip, as a share of its length. */
  taperStart: number
  /** How much this blade droops, as a multiplier on the plant's tip bend. */
  droop: number
  /** 0 darker green, 1 lighter green. */
  shade: number
  /**
   * A blade pointing nearly straight up may arch back across the middle of the
   * plant instead of away from it, which fills the gap between the two sides.
   */
  inward: boolean
}

export interface SpiderLeafRanges {
  aspect: Range
  taperStart: Range
  droop: Range
  /** Chance that a blade is an inward one (0 to 1). */
  inwardChance: number
}

export const SPIDER_LEAF_RANGES: SpiderLeafRanges = {
  aspect: [0.06, 0.1],
  taperStart: [0.45, 0.65],
  droop: [0.85, 1.1],
  inwardChance: 0.5,
}

export function randomSpiderLeaf(rng: Rng, ranges: SpiderLeafRanges = SPIDER_LEAF_RANGES): SpiderLeafSpec {
  return {
    aspect: range(rng, ...ranges.aspect),
    taperStart: range(rng, ...ranges.taperStart),
    droop: range(rng, ...ranges.droop),
    shade: rng(),
    inward: rng() < ranges.inwardChance,
  }
}

/** How a blade bends and how its width runs from base to tip. */
export const SPIDER_BLADE = {
  /** Degrees the blade has turned by its tip at full fan and droop 1. */
  bend: 135,
  /** The turn grows as t to this power, so the base stays upright and the tip curls over. */
  bendPower: 2,
  /** The blade reaches its full width this share of the way up. */
  baseRise: 0.14,
  /** Width at the very base, as a share of full width. */
  baseWidth: 0.45,
  /** The taper to the tip follows this power: 1 is a straight point, above 1 stays fuller. */
  tipPower: 0.9,
  /**
   * How the blade changes with the way it points (`angle`, degrees from straight
   * up, either side). Between two stops the values are blended; past the last
   * stop the last values hold.
   *  - length: share of the engine's blade length the blade is drawn at.
   *  - arch: share of the full bend the blade turns through.
   */
  byAngle: [
    { angle: 0, length: 0.6, arch: 0.5 },
    { angle: 20, length: 0.82, arch: 0.55 },
    { angle: 40, length: 0.95, arch: 0.7 },
    { angle: 58, length: 0.62, arch: 0.82 },
    { angle: 85, length: 0.4, arch: 0.7 },
  ],
  /** Blades pointing this far out or more count as outer (0 share at `from`, 1 at `to`). */
  outer: { from: 45, to: 65 },
  /**
   * An inward blade (see SpiderLeafSpec.inward) pointing less than this many
   * degrees from straight up turns toward the middle: fully inward within half
   * this angle of straight up, then easing through straight to its usual
   * outward turn at this angle.
   */
  inwardUntil: 28,
  /** An outer blade starts turning sooner: its bend power falls from bendPower to this, so it hangs. */
  outerBendPower: 1.1,
  /** The width of a blade is this share of the way from its drawn length to its full length, so short blades stay a little broader. */
  widthFromFull: 0.5,
  /** An outer blade's arch is pulled toward full strength by this share, so every outer blade droops. */
  outerSteady: 0.8,
}

export interface SpiderBladeSides {
  /** Left edge, base to tip. */
  left: Pt[]
  /** Right edge, base to tip. */
  right: Pt[]
  /** Midrib, base to tip. */
  mid: Pt[]
  /** Half the blade's width at each point. */
  half: number[]
  /** Heading of the midrib at each point, in degrees from straight up (positive turns right). */
  heading: number[]
  /** Degrees the blade has turned by its tip: positive arches right, negative left, 0 is straight. */
  turn: number
}

/** The blade's half width at t (0 base to 1 tip), as a share of its full half width. */
function widthShare(spec: SpiderLeafSpec, t: number): number {
  const B = SPIDER_BLADE
  const rise = B.baseWidth + (1 - B.baseWidth) * Math.sin((Math.min(1, t / B.baseRise) * Math.PI) / 2)
  const taper = t <= spec.taperStart ? 1 : Math.pow((1 - t) / (1 - spec.taperStart), B.tipPower)
  return rise * taper
}

/** The blade's drawn-length share and arch share for a blade pointing `angle` degrees from straight up. */
function shapeAtAngle(angle: number | undefined): { length: number; arch: number; outer: number } {
  const B = SPIDER_BLADE
  if (angle === undefined) return { length: 1, arch: 1, outer: 0 }
  const a = Math.abs(angle)
  const stops = B.byAngle
  let from = stops[0]
  let to = stops[0]
  for (let i = 1; i < stops.length && a > stops[i - 1].angle; i++) {
    from = stops[i - 1]
    to = stops[i]
  }
  const t = to.angle === from.angle ? 0 : clamp((a - from.angle) / (to.angle - from.angle))
  return {
    length: lerp(from.length, to.length, t),
    arch: lerp(from.arch, to.arch, t),
    outer: clamp((a - B.outer.from) / (B.outer.to - B.outer.from)),
  }
}

/**
 * The blade's left edge, right edge and midrib, each as steps + 1 points
 * from base to tip. fan is -1 to 1: positive arches right, negative left, 0
 * leaves the blade straight up. angle is the way the blade points, in degrees
 * from straight up: it sets how long the blade is drawn and how far it arches.
 * Left out, the blade is drawn at its full length and full arch.
 */
export function spiderBladeSides(
  spec: SpiderLeafSpec,
  fullLength: number,
  steps: number,
  fan = 0,
  angle?: number,
): SpiderBladeSides {
  const B = SPIDER_BLADE
  const shape = shapeAtAngle(angle)
  const length = fullLength * shape.length
  const strength = lerp(Math.abs(fan), 1, shape.outer * B.outerSteady)
  const inwardShare = spec.inward && angle !== undefined ? clamp((B.inwardUntil - Math.abs(angle)) / (B.inwardUntil / 2)) : 0
  const direction = (fan === 0 ? 0 : Math.sign(fan)) * (1 - 2 * inwardShare)
  const turn = direction * strength * shape.arch * B.bend * spec.droop
  const power = lerp(B.bendPower, B.outerBendPower, shape.outer)
  const headingAt = (t: number) => turn * Math.pow(t, power)
  const widthLength = lerp(length, fullLength, B.widthFromFull)
  const step = length / steps

  const mid: Pt[] = [[0, 0]]
  for (let i = 0; i < steps; i++) {
    const a = rad(headingAt((i + 0.5) / steps))
    mid.push([mid[i][0] + Math.sin(a) * step, mid[i][1] - Math.cos(a) * step])
  }

  const left: Pt[] = []
  const right: Pt[] = []
  const half: number[] = []
  const heading: number[] = []
  for (let i = 0; i <= steps; i++) {
    const t = i / steps
    const h = headingAt(t)
    const a = rad(h)
    const w = (spec.aspect * widthLength * widthShare(spec, t)) / 2
    const [x, y] = mid[i]
    left.push([x - Math.cos(a) * w, y - Math.sin(a) * w])
    right.push([x + Math.cos(a) * w, y + Math.sin(a) * w])
    half.push(w)
    heading.push(h)
  }
  return { left, right, mid, half, heading, turn }
}

/** The blade as one closed polygon, going up the left edge and back down the right. */
export function spiderLeafOutline(spec: SpiderLeafSpec, length: number, perSegment: number, fan = 0, angle?: number): Pt[] {
  const { left, right } = spiderBladeSides(spec, length, perSegment * 2, fan, angle)
  return [...left, ...right.slice(1, -1).reverse()]
}

/** Points per side when the blade is drawn. */
export const SPIDER_LEAF_DRAW_STEPS = 32

/** Leaf colors in HSL. A fresh, yellowish mid-to-bright green with a cream stripe. */
export const SPIDER_LEAF_PALETTE = {
  hue: [96, 112] as Range,
  saturation: 52,
  /** Lightness of the green, from  0 to 1. */
  lightness: [36, 46] as Range,
  /** The lighter half of the blade. */
  light: { hue: 4, saturation: 4, lightness: 8 },
  /** The cream stripe down the middle. */
  stripe: "hsl(52 62% 90%)",
}

export function spiderLeafColors(spec: SpiderLeafSpec) {
  const P = SPIDER_LEAF_PALETTE
  const hue = lerp(P.hue[0], P.hue[1], spec.shade)
  const l = lerp(P.lightness[0], P.lightness[1], spec.shade)
  return {
    base: "hsl(" + hue.toFixed(0) + " " + P.saturation + "% " + l.toFixed(1) + "%)",
    light:
      "hsl(" + (hue + P.light.hue).toFixed(0) + " " + (P.saturation + P.light.saturation) + "% " +
      (l + P.light.lightness).toFixed(1) + "%)",
    stripe: P.stripe,
  }
}
