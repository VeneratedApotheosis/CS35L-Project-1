import { range, type Range, type Rng } from "../../rng"

/*
 * The Philodendron 'Sun Red' / Rojo Congo leaf: a broad, rounded-oblong paddle
 * with smooth margins and no fenestration, so it reads clearly apart from the
 * monstera. The outer blade outline is what the stage engine measures for
 * containment and coverage. Each leaf is flat, two-tone, Animal Crossing: New
 * Horizons style, with a prominent red central midrib. A leaf is drawn in one
 * of two palettes - glossy green for the older outer leaves, deep burgundy for
 * the newest upright ones - chosen by the plant from the leaf's position, not
 * here. Every number lives in a named object below.
 */

/* ------------------------------------------------------------------ */
/* Random leaves                                                       */
/* ------------------------------------------------------------------ */

/** Everything that defines one leaf's look, independent of where it sits or its color. */
export interface PhilodendronLeafSpec {
  /** Width divided by length. */
  aspect: number
  /** 0 round blunt tip, 1 gently pointed tip. */
  tip: number
  /** 0 flat base, 1+ softly rounded base. */
  base: number
  /** Extra width on the right side, as a share of the left side's width. */
  asym: number
  /** 0 darker, 1 lighter, within whichever palette the leaf is drawn in. */
  shade: number
}

export interface PhilodendronLeafRanges {
  aspect: Range
  tip: Range
  base: Range
  asym: Range
}

export const PHILODENDRON_LEAF_RANGES: PhilodendronLeafRanges = {
  aspect: [0.56, 0.7],
  tip: [0.18, 0.4],
  base: [0.6, 1.1],
  asym: [-0.09, 0.09],
}

/** Draw one leaf's look. The order of draws is part of a seed's identity. */
export function randomPhilodendronLeaf(
  rng: Rng,
  ranges: PhilodendronLeafRanges = PHILODENDRON_LEAF_RANGES,
): PhilodendronLeafSpec {
  return {
    aspect: range(rng, ...ranges.aspect),
    tip: range(rng, ...ranges.tip),
    base: range(rng, ...ranges.base),
    asym: range(rng, ...ranges.asym),
    shade: rng(),
  }
}

/* ------------------------------------------------------------------ */
/* Outline                                                             */
/* ------------------------------------------------------------------ */

/**
 * Proportions of the paddle outline. Lengths are shares of leaf length unless a
 * field says it is a share of half the leaf's width. Heights are measured from
 * the base (0) toward the tip (negative y).
 */
export const PHILODENDRON_OUTLINE = {
  /** How far the softly rounded base dips below the stalk, per unit of `base`. */
  baseDepth: 0.06,
  /** Control-point height under the base, as multiples of the base dip. */
  baseUnderside: { inner: 1.5, outer: 1.3 },
  /** Control-point sideways pull near the stalk and under the base, as shares of half-width. */
  baseSpread: 0.28,
  shoulderSpread: 0.98,
  /** The widest point of the leaf, high enough for a long oblong paddle. */
  shoulderHeight: 0.5,
  /** Outward bulge of the side curves, as a share of half-width (near 1 keeps the sides straight). */
  sideBulge: 1.02,
  /** Height where the side curves are pulled out. */
  sideHeight: 0.66,
  /** Height of the control points that shape the tip. */
  tipControlHeight: 0.9,
  /** Control-point sideways pull near the tip: this much plus up to `tipPinchRange` for a round tip. */
  tipPinchMin: 0.14,
  tipPinchRange: 0.34,
}

/** Decimal precision of path coordinates, as a power of ten. */
const PATH_PRECISION = 100
const round = (n: number) => Math.round(n * PATH_PRECISION) / PATH_PRECISION

type P = [number, number]
/** Cubic Bezier segment: two control points and an end point. */
type Seg = [P, P, P]

/**
 * How an outer leaf's bend is drawn: its tip swings sideways by this share of
 * the leaf length at full fan, so the older leaves arch outward from the crown.
 * The bend is part of the outline the stage engine fits inside the dome.
 */
export const PHILODENDRON_LEAF_FAN = {
  sweep: 0.34,
}

/**
 * The sideways offset of a point at height `y` (0 at the base, negative toward
 * the tip) for a given `sweep`. The blade stays upright at its base and curves
 * more toward the tip, so the offset grows with the square of the height.
 * Positive sweep bends right.
 */
function sweepOffset(y: number, length: number, sweep: number): number {
  if (sweep === 0 || length === 0) return 0
  return (sweep * y * y) / length
}

/** The x of the midrib at height `y` for a leaf bent by `fan` (-1 to 1; 0 is straight). */
export function leafMidribX(y: number, length: number, fan = 0): number {
  return sweepOffset(y, length, fan * PHILODENDRON_LEAF_FAN.sweep)
}

/**
 * The paddle as four cubic Beziers, in local coordinates: base at (0,0), tip at
 * (0,-length). Shared by the SVG path and the polygon sampler so what is
 * measured is exactly what is drawn. `fan` (-1 to 1) bends the blade outward; 0
 * leaves it upright and unchanged.
 */
function leafSegments(length: number, spec: PhilodendronLeafSpec, fan = 0): Seg[] {
  const O = PHILODENDRON_OUTLINE
  const L = length
  const wl = (L * spec.aspect) / 2
  const wr = wl * (1 + spec.asym)
  const b = O.baseDepth * L * spec.base
  const tipX = (side: number) => side * (O.tipPinchMin + O.tipPinchRange * (1 - spec.tip))

  const segs: Seg[] = [
    [[-O.baseSpread * wl, b * O.baseUnderside.inner], [-wl * O.shoulderSpread, b * O.baseUnderside.outer], [-wl, -O.shoulderHeight * L]],
    [[-wl * O.sideBulge, -O.sideHeight * L], [tipX(-wl), -O.tipControlHeight * L], [0, -L]],
    [[tipX(wr), -O.tipControlHeight * L], [wr * O.sideBulge, -O.sideHeight * L], [wr, -O.shoulderHeight * L]],
    [[wr * O.shoulderSpread, b * O.baseUnderside.outer], [O.baseSpread * wr, b * O.baseUnderside.inner], [0, 0]],
  ]
  if (fan === 0) return segs
  const sweep = fan * PHILODENDRON_LEAF_FAN.sweep
  const bend = ([x, y]: P): P => [x + sweepOffset(y, L, sweep), y]
  return segs.map(([c1, c2, p]) => [bend(c1), bend(c2), bend(p)])
}

export function leafPath(length: number, spec: PhilodendronLeafSpec, fan = 0): string {
  const pt = (p: P) => round(p[0]) + " " + round(p[1])
  const curves = leafSegments(length, spec, fan).map(
    ([c1, c2, p]) => "C" + pt(c1) + " " + pt(c2) + " " + pt(p),
  )
  return "M0 0 " + curves.join(" ") + "Z"
}

/** The outer blade outline as a closed polygon, with `perSegment` points per curve. `fan` bends it, -1 to 1. */
export function leafPolygon(length: number, spec: PhilodendronLeafSpec, perSegment = 6, fan = 0): P[] {
  const out: P[] = []
  let p0: P = [0, 0]
  for (const [c1, c2, p1] of leafSegments(length, spec, fan)) {
    for (let i = 0; i < perSegment; i++) {
      const t = i / perSegment
      const u = 1 - t
      out.push([
        u * u * u * p0[0] + 3 * u * u * t * c1[0] + 3 * u * t * t * c2[0] + t * t * t * p1[0],
        u * u * u * p0[1] + 3 * u * u * t * c1[1] + 3 * u * t * t * c2[1] + t * t * t * p1[1],
      ])
    }
    p0 = p1
  }
  return out
}

/**
 * One lengthwise half of the blade, between the bent midrib and one edge, as an
 * SVG path. `side` is 1 for the right half, -1 for the left. Used to shade the
 * lighter half of a fanned leaf so the tone follows the bend.
 */
export function leafHalfPath(
  length: number,
  spec: PhilodendronLeafSpec,
  side: 1 | -1,
  fan = 0,
  perSegment = 10,
): string {
  const poly = leafPolygon(length, spec, perSegment, fan)
  const tip = 2 * perSegment
  const edge = side === 1 ? poly.slice(tip) : poly.slice(0, tip + 1).reverse()
  const steps = perSegment * 2
  const midrib: P[] = Array.from({ length: steps + 1 }, (_, i) => {
    const y = -(i / steps) * length
    return [leafMidribX(y, length, fan), y]
  })
  const pt = (p: P) => round(p[0]) + " " + round(p[1])
  return "M" + [...midrib, ...edge].map(pt).join(" L") + "Z"
}

/* ------------------------------------------------------------------ */
/* Color                                                               */
/* ------------------------------------------------------------------ */

/**
 * One two-tone palette: a base, a lighter half over it, and the central midrib.
 * Hue and lightness slide with `spec.shade` (0 to 1) around the middle of the
 * scale, so a plant's leaves are related but not identical.
 */
export interface LeafTone {
  hue: { middle: number; swing: number }
  lightness: { dark: number; swing: number }
  light: { hueShift: number; saturation: number; lightnessBoost: number }
  vein: { hue: number; saturation: number; lightness: number }
  base: { saturation: number }
}

/**
 * The two palettes. Green is the glossy, deep green of the older outer leaves,
 * each with a prominent reddish-maroon midrib. Burgundy is the deep red of the
 * newest upright leaves, with a brighter red midrib. Which one a leaf uses is
 * decided by the plant, not here.
 */
export const PHILODENDRON_LEAF_PALETTE: { green: LeafTone; burgundy: LeafTone } = {
  green: {
    hue: { middle: 146, swing: 8 },
    lightness: { dark: 27, swing: 9 },
    light: { hueShift: 6, saturation: 46, lightnessBoost: 13 },
    vein: { hue: 353, saturation: 58, lightness: 40 },
    base: { saturation: 46 },
  },
  burgundy: {
    hue: { middle: 354, swing: 10 },
    lightness: { dark: 22, swing: 8 },
    light: { hueShift: 8, saturation: 56, lightnessBoost: 14 },
    vein: { hue: 2, saturation: 66, lightness: 46 },
    base: { saturation: 54 },
  },
}

export interface LeafColors {
  base: string
  light: string
  vein: string
}

/** Resolve one leaf's colors in its palette. `red` picks the burgundy palette. */
export function philodendronLeafColors(spec: PhilodendronLeafSpec, red: boolean): LeafColors {
  const P = red ? PHILODENDRON_LEAF_PALETTE.burgundy : PHILODENDRON_LEAF_PALETTE.green
  const hue = P.hue.middle + (spec.shade - 0.5) * P.hue.swing
  const l = P.lightness.dark + spec.shade * P.lightness.swing
  return {
    base: "hsl(" + round(hue) + " " + P.base.saturation + "% " + round(l) + "%)",
    light: "hsl(" + round(hue + P.light.hueShift) + " " + P.light.saturation + "% " + round(l + P.light.lightnessBoost) + "%)",
    vein: "hsl(" + P.vein.hue + " " + P.vein.saturation + "% " + P.vein.lightness + "%)",
  }
}
