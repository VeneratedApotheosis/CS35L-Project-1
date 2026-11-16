import type { Pt } from "../../geometry"
import { range, type Range, type Rng } from "../../rng"

/*
 * The fiddle-leaf fig leaf: a large, glossy, violin-shaped blade. It is broad
 * at the tip, pinches in at a waist and widens again into two lobes near the
 * stalk, with a pale midrib and a few pale side veins. The outline is a polygon
 * sampled from one width profile, and the same polygon is the path that is
 * drawn, so what the stage engine measures is what is shown. Every number is
 * in a named object below.
 */

/* ------------------------------------------------------------------ */
/* Random leaves                                                       */
/* ------------------------------------------------------------------ */

/** Everything that defines one leaf's look, independent of where it sits. */
export interface FiddleLeafSpec {
  /** Width at the broadest point divided by length. */
  aspect: number
  /** Width of the lobes near the stalk, as a share of the broadest width. */
  lobe: number
  /** Width at the waist, as a share of the broadest width. */
  waist: number
  /** Extra width on the right side, as a share of the left side's width. */
  asym: number
  /** 0 darker, 1 lighter. */
  shade: number
}

export interface FiddleLeafRanges {
  aspect: Range
  lobe: Range
  waist: Range
  asym: Range
}

export const FIDDLE_LEAF_RANGES: FiddleLeafRanges = {
  aspect: [0.5, 0.62],
  lobe: [0.62, 0.78],
  waist: [0.4, 0.52],
  asym: [-0.07, 0.07],
}

/** Draw one leaf's look. The order of draws is part of a seed's identity. */
export function randomFiddleLeaf(rng: Rng, ranges: FiddleLeafRanges = FIDDLE_LEAF_RANGES): FiddleLeafSpec {
  return {
    aspect: range(rng, ...ranges.aspect),
    lobe: range(rng, ...ranges.lobe),
    waist: range(rng, ...ranges.waist),
    asym: range(rng, ...ranges.asym),
    shade: rng(),
  }
}

/* ------------------------------------------------------------------ */
/* Outline                                                             */
/* ------------------------------------------------------------------ */

/**
 * Where the blade is widest, narrowest and so on, as shares of leaf length
 * measured from the stalk end (0) to the tip (1).
 */
export const FIDDLE_PROFILE = {
  /** Height of the notch-side lobe's start and its widest point. */
  lobeStart: 0.06,
  lobePeak: 0.15,
  /** A point between the lobe and the waist, to keep the curve smooth. */
  lobeEase: 0.27,
  waist: 0.38,
  /** A point between the waist and the broad tip end. */
  flare: 0.52,
  flareShare: 0.55,
  shoulder: 0.66,
  shoulderWidth: 0.97,
  broadest: 0.76,
  taper: 0.86,
  taperWidth: 0.86,
  roundTip: 0.94,
  roundTipWidth: 0.55,
}

/** Points per side of the polygon, per unit of the engine's `perSegment`. */
const POINTS_PER_SEGMENT = 3
/** The `perSegment` used when drawing, so the drawn polygon matches the fitted one. */
export const FIDDLE_DRAW_SEGMENTS = 8

/** Decimal precision of path coordinates, as a power of ten. */
const PATH_PRECISION = 100
const round = (n: number) => Math.round(n * PATH_PRECISION) / PATH_PRECISION

/** The blade's width at height `t` (0 stalk end to 1 tip), as a share of its broadest width. */
export function bladeWidth(spec: FiddleLeafSpec, t: number): number {
  const P = FIDDLE_PROFILE
  const mix = (a: number, b: number, k: number) => a + (b - a) * k
  const knots: Pt[] = [
    [0, 0],
    [P.lobeStart, spec.lobe * 0.5],
    [P.lobePeak, spec.lobe],
    [P.lobeEase, mix(spec.lobe, spec.waist, 0.6)],
    [P.waist, spec.waist],
    [P.flare, mix(spec.waist, 1, P.flareShare)],
    [P.shoulder, P.shoulderWidth],
    [P.broadest, 1],
    [P.taper, P.taperWidth],
    [P.roundTip, P.roundTipWidth],
    [1, 0],
  ]
  const last = knots.length - 1
  if (t <= 0 || t >= 1) return 0
  let i = 0
  while (i < last - 1 && t > knots[i + 1][0]) i++
  // Cubic Hermite between knots i and i+1, with finite-difference tangents.
  const slope = (k: number) => {
    const a = knots[Math.max(k - 1, 0)]
    const b = knots[Math.min(k + 1, last)]
    return (b[1] - a[1]) / (b[0] - a[0])
  }
  const [t0, w0] = knots[i]
  const [t1, w1] = knots[i + 1]
  const h = t1 - t0
  const u = (t - t0) / h
  const u2 = u * u
  const u3 = u2 * u
  const w =
    (2 * u3 - 3 * u2 + 1) * w0 +
    (u3 - 2 * u2 + u) * h * slope(i) +
    (-2 * u3 + 3 * u2) * w1 +
    (u3 - u2) * h * slope(i + 1)
  return Math.max(0, w)
}

/** Half the blade's broadest width on one side (`side` is 1 for right, -1 for left). */
function sideHalfWidth(spec: FiddleLeafSpec, length: number, side: 1 | -1): number {
  const left = (length * spec.aspect) / 2
  return side === 1 ? left * (1 + spec.asym) : left
}

/** The x of the leaf's edge on one side at height . */
export function edgeX(spec: FiddleLeafSpec, length: number, t: number, side: 1 | -1): number {
  return side * sideHalfWidth(spec, length, side) * bladeWidth(spec, t)
}

/**
 * The blade as a closed polygon, in local coordinates: stalk end at (0,0), tip
 * at (0,-length). It runs up the right edge and back down the left, with
 * `perSegment` times three points per side.
 */
export function fiddleLeafPolygon(spec: FiddleLeafSpec, length: number, perSegment = FIDDLE_DRAW_SEGMENTS): Pt[] {
  const n = Math.max(2, Math.round(perSegment * POINTS_PER_SEGMENT))
  const out: Pt[] = [[0, 0]]
  for (let i = 1; i < n; i++) out.push([edgeX(spec, length, i / n, 1), -(i / n) * length])
  out.push([0, -length])
  for (let i = n - 1; i >= 1; i--) out.push([edgeX(spec, length, i / n, -1), -(i / n) * length])
  return out
}

/** The SVG path of the blade: the same polygon the engine fits. */
export function fiddleLeafPath(spec: FiddleLeafSpec, length: number): string {
  const points = fiddleLeafPolygon(spec, length, FIDDLE_DRAW_SEGMENTS)
  return "M" + points.map(([x, y]) => round(x) + " " + round(y)).join(" L") + "Z"
}

/* ------------------------------------------------------------------ */
/* Color                                                               */
/* ------------------------------------------------------------------ */

/** The glossy deep green and the pale veins. Hue and lightness slide with spec.shade (0 to 1). */
export const FIDDLE_LEAF_PALETTE = {
  hue: { middle: 132, swing: 8 },
  lightness: { dark: 21, swing: 7 },
  base: { saturation: 44 },
  light: { hueShift: 6, saturation: 48, lightnessBoost: 11 },
  vein: { hue: 84, saturation: 55, lightness: 74 },
}

export interface FiddleLeafColors {
  base: string
  light: string
  vein: string
}

/** Resolve one leaf's flat fills: a base green, a lighter half and the vein color. */
export function fiddleLeafColors(spec: FiddleLeafSpec): FiddleLeafColors {
  const P = FIDDLE_LEAF_PALETTE
  const hue = P.hue.middle + (spec.shade - 0.5) * P.hue.swing
  const l = P.lightness.dark + spec.shade * P.lightness.swing
  return {
    base: "hsl(" + round(hue) + " " + P.base.saturation + "% " + round(l) + "%)",
    light: "hsl(" + round(hue + P.light.hueShift) + " " + P.light.saturation + "% " + round(l + P.light.lightnessBoost) + "%)",
    vein: "hsl(" + P.vein.hue + " " + P.vein.saturation + "% " + P.vein.lightness + "%)",
  }
}
