import { int, range, type Range, type Rng } from "../rng"

/*
 * The Monstera deliciosa leaf: a large, broad, round-shouldered heart with a
 * drip tip and the signature fenestrations - rounded holes near the midrib and
 * splits that cut in from the margin. The outer blade outline is what the stage
 * engine measures for containment and coverage; the fenestrations are a drawing
 * detail punched out of the drawn leaf and never widen the measured silhouette.
 * Flat, two-tone, Animal Crossing: New Horizons style. Every number lives in a
 * named object below.
 */

/* ------------------------------------------------------------------ */
/* One fenestration row                                                */
/* ------------------------------------------------------------------ */

/**
 * One row of fenestrations, drawn on both sides of the midrib (roughly
 * symmetric). All positions and sizes are shares, so the pattern scales with
 * the leaf length.
 */
export interface FenRow {
  /** Height up the leaf, as a share of leaf length from the base (0) to tip (1). */
  y: number
  /** Center of the midrib hole, as a share of the half-width from the midrib. */
  holeOffset: number
  /** Hole radius, as a share of the half-width. */
  holeRadius: number
  /** Where a split's inner (sinus) end sits, as a share of the half-width from the midrib. */
  splitInner: number
  /** Split slot thickness, as a share of leaf length. */
  splitWidth: number
  /** Small up-the-leaf nudge of the row, as a share of leaf length, to break perfect symmetry. */
  yJitter: number
}

/** Everything that defines one Monstera leaf's look, independent of where it sits. */
export interface MonsteraLeafSpec {
  /** Width divided by length. */
  aspect: number
  /** 0 round tip, 1 pointed drip tip. */
  tip: number
  /** 0 flat base, 1+ deep rounded cordate lobes. */
  lobe: number
  /** Extra width on the right side, as a share of the left side's width. */
  asym: number
  /** 0 darker green, 1 lighter green. */
  shade: number
  /** The fenestration rows, from near the base to near the tip. */
  fenestration: FenRow[]
}

/* ------------------------------------------------------------------ */
/* Random leaves                                                       */
/* ------------------------------------------------------------------ */

export interface MonsteraLeafRanges {
  aspect: Range
  tip: Range
  lobe: Range
  asym: Range
  fenestration: {
    /** Fewest and most fenestration rows, inclusive. */
    rowCount: Range
    /** Height of the lowest and highest row, as shares of leaf length. */
    from: number
    to: number
    /** Center of the midrib hole, as a share of the half-width. */
    holeOffset: Range
    /** Hole radius, as a share of the half-width. */
    holeRadius: Range
    /** Where a split's inner end sits, as a share of the half-width. */
    splitInner: Range
    /** Split slot thickness, as a share of leaf length. */
    splitWidth: Range
    /** Per-side up-the-leaf jitter, as a share of leaf length. */
    yJitter: Range
    /** How much the fenestrations shrink from the base row (0) to the tip row (1). */
    taper: number
  }
}

export const MONSTERA_LEAF_RANGES: MonsteraLeafRanges = {
  aspect: [0.82, 1.02],
  tip: [0.55, 0.82],
  lobe: [0.9, 1.35],
  asym: [-0.1, 0.1],
  fenestration: {
    rowCount: [3, 5],
    from: 0.3,
    to: 0.82,
    holeOffset: [0.18, 0.3],
    holeRadius: [0.1, 0.17],
    splitInner: [0.42, 0.6],
    splitWidth: [0.05, 0.08],
    yJitter: [-0.03, 0.03],
    taper: 0.5,
  },
}

/** Draw one leaf's look. The order of draws is part of a seed's identity. */
export function randomMonsteraLeaf(
  rng: Rng,
  ranges: MonsteraLeafRanges = MONSTERA_LEAF_RANGES,
): MonsteraLeafSpec {
  const aspect = range(rng, ...ranges.aspect)
  const tip = range(rng, ...ranges.tip)
  const lobe = range(rng, ...ranges.lobe)
  const asym = range(rng, ...ranges.asym)
  const shade = rng()

  const f = ranges.fenestration
  const rowCount = int(rng, f.rowCount[0], f.rowCount[1])
  const fenestration: FenRow[] = Array.from({ length: rowCount }, (_, i) => {
    const t = rowCount === 1 ? 0 : i / (rowCount - 1)
    const shrink = 1 - f.taper * t
    return {
      y: f.from + (f.to - f.from) * t,
      holeOffset: range(rng, ...f.holeOffset),
      holeRadius: range(rng, ...f.holeRadius) * shrink,
      splitInner: range(rng, ...f.splitInner),
      splitWidth: range(rng, ...f.splitWidth) * shrink,
      yJitter: range(rng, ...f.yJitter),
    }
  })

  return { aspect, tip, lobe, asym, shade, fenestration }
}

/* ------------------------------------------------------------------ */
/* Outer blade outline                                                 */
/* ------------------------------------------------------------------ */

/**
 * Proportions of the broad heart outline. Lengths are shares of leaf length
 * unless a field says it is a share of half the leaf's width. Heights are
 * measured from the base notch (0) toward the tip (negative y).
 */
export const MONSTERA_OUTLINE = {
  /** How far the cordate lobes dip below the notch, per unit of `lobe`. */
  lobeDepth: 0.1,
  /** Control-point height under each lobe, as multiples of the lobe dip. */
  lobeUnderside: { inner: 1.5, outer: 1.3 },
  /** Control-point sideways pull near the notch and under the lobe, as shares of half-width. */
  notchSpread: 0.24,
  lobeSpread: 0.95,
  /** The widest point of the leaf: high, for round shoulders. */
  shoulderHeight: 0.28,
  /** Outward bulge of the side curves, as a share of half-width. */
  sideBulge: 1.06,
  /** Height where the side curves are pulled out. */
  sideHeight: 0.56,
  /** Height of the control points that shape the tip. */
  tipControlHeight: 0.84,
  /** Control-point sideways pull near the tip: this much plus up to `tipPinchRange` for a round tip. */
  tipPinchMin: 0.1,
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
 * the leaf length at full fan, matching the lily's fanned arc. The bend is part
 * of the outline the stage engine fits inside the dome and measures.
 */
export const MONSTERA_LEAF_FAN = {
  sweep: 0.36,
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
  return sweepOffset(y, length, fan * MONSTERA_LEAF_FAN.sweep)
}

/**
 * The outer blade as four cubic Beziers, in local coordinates: base notch at
 * (0,0), tip at (0,-length). Shared by the SVG path and the polygon sampler so
 * what is measured is exactly what is drawn, before any fenestrations. `fan`
 * (-1 to 1) bends the blade outward; 0 leaves it upright and unchanged.
 */
function leafSegments(length: number, spec: MonsteraLeafSpec, fan = 0): Seg[] {
  const O = MONSTERA_OUTLINE
  const L = length
  const wl = (L * spec.aspect) / 2
  const wr = wl * (1 + spec.asym)
  const b = O.lobeDepth * L * spec.lobe
  const tipX = (side: number) => side * (O.tipPinchMin + O.tipPinchRange * (1 - spec.tip))

  const segs: Seg[] = [
    [[-O.notchSpread * wl, b * O.lobeUnderside.inner], [-wl * O.lobeSpread, b * O.lobeUnderside.outer], [-wl, -O.shoulderHeight * L]],
    [[-wl * O.sideBulge, -O.sideHeight * L], [tipX(-wl), -O.tipControlHeight * L], [0, -L]],
    [[tipX(wr), -O.tipControlHeight * L], [wr * O.sideBulge, -O.sideHeight * L], [wr, -O.shoulderHeight * L]],
    [[wr * O.lobeSpread, b * O.lobeUnderside.outer], [O.notchSpread * wr, b * O.lobeUnderside.inner], [0, 0]],
  ]
  if (fan === 0) return segs
  const sweep = fan * MONSTERA_LEAF_FAN.sweep
  const bend = ([x, y]: P): P => [x + sweepOffset(y, L, sweep), y]
  return segs.map(([c1, c2, p]) => [bend(c1), bend(c2), bend(p)])
}

export function leafPath(length: number, spec: MonsteraLeafSpec, fan = 0): string {
  const pt = (p: P) => round(p[0]) + " " + round(p[1])
  const curves = leafSegments(length, spec, fan).map(
    ([c1, c2, p]) => "C" + pt(c1) + " " + pt(c2) + " " + pt(p),
  )
  return "M0 0 " + curves.join(" ") + "Z"
}

/** The outer blade outline as a closed polygon, with `perSegment` points per curve. `fan` bends it, -1 to 1. */
export function leafPolygon(length: number, spec: MonsteraLeafSpec, perSegment = 6, fan = 0): P[] {
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
 * lighter half of a fanned leaf so the tone follows the bend, the way the lily
 * shades its fanned leaves.
 */
export function leafHalfPath(
  length: number,
  spec: MonsteraLeafSpec,
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
/* Fenestrations                                                       */
/* ------------------------------------------------------------------ */

/**
 * How far past the true leaf edge a split's outer end is pushed, as a share of
 * the half-width, so every split reliably opens onto the margin. The overshoot
 * falls outside the leaf and is clipped away by the leaf itself.
 */
const SPLIT_OUTER_OVERSHOOT = 1.3
/** A split tilts slightly toward the tip, by this share of leaf length. */
const SPLIT_TILT = 0.05

/** A punched-out hole near the midrib, in local leaf coordinates. */
export interface FenHole {
  cx: number
  cy: number
  rx: number
  ry: number
}

/** A punched-out split slot, in local leaf coordinates: a round-capped line. */
export interface FenSplit {
  x1: number
  y1: number
  x2: number
  y2: number
  width: number
  /** Inner (sinus) end, where a lateral vein points. */
  innerX: number
  innerY: number
}

/**
 * The fenestrations for a leaf at a given length, in local coordinates (base at
 * (0,0), tip at (0,-length)). Holes sit near the midrib; splits open from the
 * margin inward. Both sides mirror each other with a small jitter, so the
 * pattern is roughly symmetric about the midrib. `fan` bends the whole pattern
 * with the blade, so holes and splits follow the midrib's curve.
 */
export function fenestrations(
  spec: MonsteraLeafSpec,
  length: number,
  fan = 0,
): { holes: FenHole[]; splits: FenSplit[] } {
  const wl = (length * spec.aspect) / 2
  const holes: FenHole[] = []
  const splits: FenSplit[] = []

  for (const row of spec.fenestration) {
    const baseY = -row.y * length
    const outer = wl * SPLIT_OUTER_OVERSHOOT
    const tilt = SPLIT_TILT * length

    for (const side of [-1, 1] as const) {
      const jitter = side * row.yJitter * length
      const y = baseY + jitter
      const mid = leafMidribX(y, length, fan)
      const outerY = y - tilt

      holes.push({
        cx: mid + side * row.holeOffset * wl,
        cy: y,
        rx: row.holeRadius * wl,
        ry: row.holeRadius * wl * 0.8,
      })

      const innerX = mid + side * row.splitInner * wl
      splits.push({
        x1: innerX,
        y1: y,
        x2: leafMidribX(outerY, length, fan) + side * outer,
        y2: outerY,
        width: row.splitWidth * length,
        innerX,
        innerY: y,
      })
    }
  }

  return { holes, splits }
}

/* ------------------------------------------------------------------ */
/* Color                                                               */
/* ------------------------------------------------------------------ */

/**
 * Leaf colors in HSL. Hue and lightness slide with `spec.shade` (0 to 1) around
 * the middle of the scale, so a plant's leaves are related but not identical.
 * A deep, glossy green.
 */
export const MONSTERA_LEAF_PALETTE = {
  /** Hue at shade 0.5, and how far the full shade scale moves it. */
  hue: { middle: 145, swing: 10 },
  /** Lightness at shade 0, and how much the full shade scale adds. */
  lightness: { dark: 26, swing: 9 },
  /** The lighter half of the leaf, relative to the base. */
  light: { hueShift: 6, saturation: 44, lightnessBoost: 12 },
  /** The veins, relative to the base. */
  vein: { hueShift: 8, saturation: 36, lightnessBoost: 16 },
  base: { saturation: 42 },
}

export function monsteraLeafColors(spec: MonsteraLeafSpec) {
  const P = MONSTERA_LEAF_PALETTE
  const hue = P.hue.middle + (spec.shade - 0.5) * P.hue.swing
  const l = P.lightness.dark + spec.shade * P.lightness.swing
  return {
    base: "hsl(" + round(hue) + " " + P.base.saturation + "% " + round(l) + "%)",
    light: "hsl(" + round(hue + P.light.hueShift) + " " + P.light.saturation + "% " + round(l + P.light.lightnessBoost) + "%)",
    vein: "hsl(" + round(hue + P.vein.hueShift) + " " + P.vein.saturation + "% " + round(l + P.vein.lightnessBoost) + "%)",
  }
}
