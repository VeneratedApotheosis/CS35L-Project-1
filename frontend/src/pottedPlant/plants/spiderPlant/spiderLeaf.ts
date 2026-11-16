import { rad, type Pt } from "../../geometry"
import { lerp, range, type Range, type Rng } from "../../rng"

/*
 * The spider plant's leaf (Chlorophytum comosum 'Vittatum'): a long, very thin
 * grass-like blade that rises from the crown, arches outward and droops at the
 * tip, with a cream stripe down its middle. The blade is built from one
 * curved midrib: its heading turns a little more with every step, so the tip
 * ends up pointing out and down. The same midrib gives the silhouette the
 * stage engine measures and the stripe that is drawn, so they always agree.
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
}

export interface SpiderLeafRanges {
  aspect: Range
  taperStart: Range
  droop: Range
}

export const SPIDER_LEAF_RANGES: SpiderLeafRanges = {
  aspect: [0.06, 0.1],
  taperStart: [0.45, 0.65],
  droop: [0.85, 1.1],
}

export function randomSpiderLeaf(rng: Rng, ranges: SpiderLeafRanges = SPIDER_LEAF_RANGES): SpiderLeafSpec {
  return {
    aspect: range(rng, ...ranges.aspect),
    taperStart: range(rng, ...ranges.taperStart),
    droop: range(rng, ...ranges.droop),
    shade: rng(),
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
}

/** The blade's half width at t (0 base to 1 tip), as a share of its full half width. */
function widthShare(spec: SpiderLeafSpec, t: number): number {
  const B = SPIDER_BLADE
  const rise = B.baseWidth + (1 - B.baseWidth) * Math.sin((Math.min(1, t / B.baseRise) * Math.PI) / 2)
  const taper = t <= spec.taperStart ? 1 : Math.pow((1 - t) / (1 - spec.taperStart), B.tipPower)
  return rise * taper
}

/**
 * The blade's left edge, right edge and midrib, each as steps + 1 points
 * from base to tip. fan is -1 to 1: positive arches right, negative left, 0
 * leaves the blade straight up.
 */
export function spiderBladeSides(spec: SpiderLeafSpec, length: number, steps: number, fan = 0): SpiderBladeSides {
  const B = SPIDER_BLADE
  const turn = fan * B.bend * spec.droop
  const headingAt = (t: number) => turn * Math.pow(t, B.bendPower)
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
    const w = (spec.aspect * length * widthShare(spec, t)) / 2
    const [x, y] = mid[i]
    left.push([x - Math.cos(a) * w, y - Math.sin(a) * w])
    right.push([x + Math.cos(a) * w, y + Math.sin(a) * w])
    half.push(w)
    heading.push(h)
  }
  return { left, right, mid, half, heading }
}

/** The blade as one closed polygon, going up the left edge and back down the right. */
export function spiderLeafOutline(spec: SpiderLeafSpec, length: number, perSegment: number, fan = 0): Pt[] {
  const { left, right } = spiderBladeSides(spec, length, perSegment * 2, fan)
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
