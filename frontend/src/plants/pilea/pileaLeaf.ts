import type { Pt } from "../geometry"
import { int, range, type Range, type Rng } from "../rng"

/*
 * The pilea's leaf (Pilea peperomioides): a round, flat "coin" blade held
 * face-on at the end of a thin stalk. It is drawn as a near-circular closed
 * curve, so the stage engine measures exactly what is drawn. Every number lives
 * in a named object below, in the flat, two-tone Animal Crossing: New Horizons
 * style (a lighter half, radiating veins, a central dimple, one soft highlight).
 *
 * The blade is drawn with the stalk end at (0,0) and the far edge at (0,-length),
 * so `length` is the coin's full height and the stalk meets the bottom of the
 * coin, with the dimple marking the peltate attachment at its centre.
 */

/** Edge control points around one coin. Fixed, so a coin keeps its shape at every stage. */
export const PILEA_EDGE_POINTS = 14

/** Everything that defines one coin's look, independent of where it sits. */
export interface PileaLeafSpec {
  /** Width divided by height. 1 is a circle; just under or over makes an oval coin. */
  aspect: number
  /** Small per-edge wobble, so no coin is a perfect circle. */
  wob: number[]
  /** 0 darker green, 1 lighter green. */
  shade: number
  /** Veins radiating from the central dimple. */
  veins: number
}

export interface PileaLeafRanges {
  aspect: Range
  wobble: Range
  veins: readonly [number, number]
}

export const PILEA_LEAF_RANGES: PileaLeafRanges = {
  aspect: [0.9, 1.08],
  wobble: [-0.05, 0.05],
  veins: [5, 8],
}

/** Draw one coin's look. The order of draws is part of a seed's identity. */
export function randomPileaLeaf(rng: Rng, ranges: PileaLeafRanges = PILEA_LEAF_RANGES): PileaLeafSpec {
  return {
    aspect: range(rng, ...ranges.aspect),
    wob: Array.from({ length: PILEA_EDGE_POINTS }, () => range(rng, ...ranges.wobble)),
    shade: rng(),
    veins: int(rng, ranges.veins[0], ranges.veins[1]),
  }
}

/* ------------------------------------------------------------------ */
/* Outline                                                             */
/* ------------------------------------------------------------------ */

/** Decimal precision of path coordinates, as a power of ten. */
const PATH_PRECISION = 100
const round = (n: number) => Math.round(n * PATH_PRECISION) / PATH_PRECISION

/** Cubic Bezier segment: two control points and an end point. */
type Seg = [Pt, Pt, Pt]

/**
 * The coin's edge control points: an ellipse centred at (0,-length/2), so the
 * bottom point lands on the stalk end (0,0) and the top on (0,-length). The
 * per-edge wobble pushes each point in or out a few percent.
 */
function coinControlPoints(spec: PileaLeafSpec, length: number): Pt[] {
  const radiusY = length / 2
  const radiusX = radiusY * spec.aspect
  const centerY = -length / 2
  const n = spec.wob.length
  return spec.wob.map((w, k) => {
    const a = Math.PI / 2 + (k / n) * Math.PI * 2
    return [radiusX * Math.cos(a) * (1 + w), centerY + radiusY * Math.sin(a) * (1 + w)]
  })
}

/** Closed smooth curve through the control points (Catmull-Rom as cubic Beziers). */
function coinSegments(pts: Pt[]): Seg[] {
  const n = pts.length
  const segs: Seg[] = []
  for (let i = 0; i < n; i++) {
    const p0 = pts[(i - 1 + n) % n]
    const p1 = pts[i]
    const p2 = pts[(i + 1) % n]
    const p3 = pts[(i + 2) % n]
    const c1: Pt = [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6]
    const c2: Pt = [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6]
    segs.push([c1, c2, p2])
  }
  return segs
}

/** The coin as an SVG path: stalk end at (0,0), far edge at (0,-length). */
export function pileaLeafPath(spec: PileaLeafSpec, length: number): string {
  const pts = coinControlPoints(spec, length)
  const segs = coinSegments(pts)
  const pt = (p: Pt) => round(p[0]) + " " + round(p[1])
  let d = "M" + pt(pts[0])
  for (const [c1, c2, end] of segs) d += " C" + pt(c1) + " " + pt(c2) + " " + pt(end)
  return d + "Z"
}

/** The coin outline as a closed polygon, with `perSegment` points per curve. The pilea does not fan. */
export function pileaLeafPolygon(spec: PileaLeafSpec, length: number, perSegment = 6): Pt[] {
  const pts = coinControlPoints(spec, length)
  const segs = coinSegments(pts)
  const out: Pt[] = []
  for (let i = 0; i < segs.length; i++) {
    const p0 = pts[i]
    const [c1, c2, p1] = segs[i]
    for (let s = 0; s < perSegment; s++) {
      const t = s / perSegment
      const u = 1 - t
      out.push([
        u * u * u * p0[0] + 3 * u * u * t * c1[0] + 3 * u * t * t * c2[0] + t * t * t * p1[0],
        u * u * u * p0[1] + 3 * u * u * t * c1[1] + 3 * u * t * t * c2[1] + t * t * t * p1[1],
      ])
    }
  }
  return out
}

/* ------------------------------------------------------------------ */
/* Color                                                               */
/* ------------------------------------------------------------------ */

/**
 * Coin colors in HSL. Hue and lightness slide with `spec.shade` (0 to 1) around
 * the middle of the scale, so a plant's coins are related but not identical.
 */
export const PILEA_LEAF_PALETTE = {
  /** Hue at shade 0.5, and how far the full shade scale moves it. */
  hue: { middle: 98, swing: 14 },
  base: { saturation: 48 },
  /** Lightness at shade 0, and how much the full shade scale adds. */
  lightness: { dark: 40, swing: 12 },
  /** The lighter half of the coin, relative to the base. */
  light: { hueShift: 6, saturation: 54, lightnessBoost: 13 },
  /** The radiating veins, relative to the base. */
  vein: { hueShift: 8, saturation: 46, lightnessBoost: 20 },
  /** The darker central dimple, relative to the base. */
  dimple: { hueShift: -4, saturation: 44, lightnessDrop: 11 },
}

export function pileaLeafColors(spec: PileaLeafSpec) {
  const P = PILEA_LEAF_PALETTE
  const hue = P.hue.middle + (spec.shade - 0.5) * P.hue.swing
  const l = P.lightness.dark + spec.shade * P.lightness.swing
  return {
    base: "hsl(" + round(hue) + " " + P.base.saturation + "% " + round(l) + "%)",
    light: "hsl(" + round(hue + P.light.hueShift) + " " + P.light.saturation + "% " + round(l + P.light.lightnessBoost) + "%)",
    vein: "hsl(" + round(hue + P.vein.hueShift) + " " + P.vein.saturation + "% " + round(l + P.vein.lightnessBoost) + "%)",
    dimple: "hsl(" + round(hue + P.dimple.hueShift) + " " + P.dimple.saturation + "% " + round(l - P.dimple.lightnessDrop) + "%)",
  }
}
