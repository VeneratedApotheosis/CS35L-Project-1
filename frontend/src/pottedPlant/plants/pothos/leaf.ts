import { chance, range, type Range, type Rng } from "../../rng"

/*
 * The heart-shaped leaf: how one is drawn at random, how its outline is built,
 * and what colors it gets. Every number lives in a named object below, so a
 * different leaf look is a change to those objects and nothing else.
 */

export interface Blob {
  /** Center as a fraction of leaf width, -0.5..0.5 from the midrib. */
  x: number
  /** Center as a fraction of leaf length, 0 (notch) to 1 (tip). */
  y: number
  rx: number
  ry: number
  rot: number
}

/** Everything that defines one leaf's look, independent of where it sits. */
export interface LeafSpec {
  /** Width divided by length. */
  aspect: number
  /** 0 round tip, 1 pointed tip. */
  tip: number
  /** 0 flat base, 1+ deep rounded lobes. */
  lobe: number
  /** Extra width on the right side, as a share of the left side's width. */
  asym: number
  /** 0 dark green, 1 bright green. */
  shade: number
  blobs: Blob[]
}

/* ------------------------------------------------------------------ */
/* Random leaves                                                       */
/* ------------------------------------------------------------------ */

export interface HeartLeafRanges {
  /** Chance a leaf has no golden splashes at all. */
  noBlobChance: number
  /** Fewest and most splashes on a leaf that has any. */
  blobCount: Range
  /** Ranges for each splash. Position is a share of leaf width / length. */
  blob: { x: Range; y: Range; rx: Range; ry: Range; rot: Range }
  aspect: Range
  tip: Range
  lobe: Range
  asym: Range
}

export const HEART_LEAF_RANGES: HeartLeafRanges = {
  noBlobChance: 0.2,
  blobCount: [1, 3],
  blob: {
    x: [-0.4, 0.4],
    y: [0.25, 0.8],
    rx: [0.1, 0.24],
    ry: [0.07, 0.16],
    rot: [-60, 60],
  },
  aspect: [0.86, 1.04],
  tip: [0.45, 0.85],
  lobe: [0.8, 1.4],
  asym: [-0.12, 0.12],
}

/** Draw one leaf's look. The order of draws is part of a seed's identity. */
export function randomLeafSpec(rng: Rng, ranges: HeartLeafRanges = HEART_LEAF_RANGES): LeafSpec {
  const [fewest, most] = ranges.blobCount
  const blobCount = chance(rng, ranges.noBlobChance)
    ? 0
    : fewest + Math.floor(rng() * (most - fewest + 1))
  const blobs: Blob[] = Array.from({ length: blobCount }, () => ({
    x: range(rng, ...ranges.blob.x),
    y: range(rng, ...ranges.blob.y),
    rx: range(rng, ...ranges.blob.rx),
    ry: range(rng, ...ranges.blob.ry),
    rot: range(rng, ...ranges.blob.rot),
  }))

  return {
    aspect: range(rng, ...ranges.aspect),
    tip: range(rng, ...ranges.tip),
    lobe: range(rng, ...ranges.lobe),
    asym: range(rng, ...ranges.asym),
    shade: rng(),
    blobs,
  }
}

/* ------------------------------------------------------------------ */
/* Outline                                                             */
/* ------------------------------------------------------------------ */

/**
 * Proportions of the heart outline. Lengths are shares of leaf length unless
 * a field says it is a share of half the leaf's width. Heights are measured
 * from the notch (0) toward the tip (negative y).
 */
export const HEART_OUTLINE = {
  /** How far the lobes dip below the notch, per unit of `lobe`. */
  lobeDepth: 0.13,
  /** Control point height of the curve under each lobe, as multiples of the lobe dip. */
  lobeUnderside: { inner: 1.6, outer: 1.4 },
  /** Control point sideways pull near the notch and under the lobe, as shares of half-width. */
  notchSpread: 0.2,
  lobeSpread: 0.95,
  /** The widest point of the leaf. */
  shoulderHeight: 0.18,
  /** Outward bulge of the side curves, as a share of half-width. */
  sideBulge: 1.08,
  /** Height where the side curves are pulled out. */
  sideHeight: 0.52,
  /** Height of the control points that shape the tip. */
  tipControlHeight: 0.8,
  /** Control point sideways pull near the tip: this much plus up to `tipPinchRange` for a round tip. */
  tipPinchMin: 0.15,
  tipPinchRange: 0.4,
}

/** Decimal precision of path coordinates, as a power of ten. */
const PATH_PRECISION = 100
const round = (n: number) => Math.round(n * PATH_PRECISION) / PATH_PRECISION

type P = [number, number]
/** Cubic Bezier segment: two control points and an end point. */
type Seg = [P, P, P]

/**
 * Heart outline as four cubic Beziers, in local coordinates: notch (stalk end)
 * at (0,0), tip at (0,-length). Shared by the SVG path and the polygon sampler
 * so what is measured is exactly what is drawn.
 */
function leafSegments(length: number, spec: LeafSpec): Seg[] {
  const O = HEART_OUTLINE
  const L = length
  const wl = (L * spec.aspect) / 2
  const wr = wl * (1 + spec.asym)
  const b = O.lobeDepth * L * spec.lobe
  const tipX = (side: number) => side * (O.tipPinchMin + O.tipPinchRange * (1 - spec.tip))

  return [
    [[-O.notchSpread * wl, b * O.lobeUnderside.inner], [-wl * O.lobeSpread, b * O.lobeUnderside.outer], [-wl, -O.shoulderHeight * L]],
    [[-wl * O.sideBulge, -O.sideHeight * L], [tipX(-wl), -O.tipControlHeight * L], [0, -L]],
    [[tipX(wr), -O.tipControlHeight * L], [wr * O.sideBulge, -O.sideHeight * L], [wr, -O.shoulderHeight * L]],
    [[wr * O.lobeSpread, b * O.lobeUnderside.outer], [O.notchSpread * wr, b * O.lobeUnderside.inner], [0, 0]],
  ]
}

export function leafPath(length: number, spec: LeafSpec): string {
  const pt = (p: P) => round(p[0]) + " " + round(p[1])
  const curves = leafSegments(length, spec).map(
    ([c1, c2, p]) => "C" + pt(c1) + " " + pt(c2) + " " + pt(p),
  )
  return "M0 0 " + curves.join(" ") + "Z"
}

/** The leaf outline as a closed polygon, with `perSegment` points per curve. */
export function leafPolygon(length: number, spec: LeafSpec, perSegment = 6): P[] {
  const out: P[] = []
  let p0: P = [0, 0]
  for (const [c1, c2, p1] of leafSegments(length, spec)) {
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

/* ------------------------------------------------------------------ */
/* Color                                                               */
/* ------------------------------------------------------------------ */

/**
 * Leaf colors in HSL. Hue and lightness slide with `spec.shade` (0 to 1) around
 * the middle of the scale, so a plant's leaves are related but not identical.
 */
export const LEAF_PALETTE = {
  /** Hue at shade 0.5, and how far the full shade scale moves it. */
  hue: { middle: 118, swing: 16 },
  /** Lightness at shade 0, and how much the full shade scale adds. */
  lightness: { dark: 36, swing: 10 },
  /** The lighter half of the leaf, relative to the base. */
  light: { hueShift: 8, saturation: 55, lightnessBoost: 14 },
  /** The midrib, relative to the base. */
  vein: { hueShift: 14, saturation: 55, lightnessBoost: 24 },
  base: { saturation: 46 },
  /** Golden splashes. Fixed, not tied to shade. */
  gold: "hsl(52 78% 72%)",
}

export function leafColors(spec: LeafSpec) {
  const P = LEAF_PALETTE
  const hue = P.hue.middle + (spec.shade - 0.5) * P.hue.swing
  const l = P.lightness.dark + spec.shade * P.lightness.swing
  return {
    base: "hsl(" + round(hue) + " " + P.base.saturation + "% " + round(l) + "%)",
    light: "hsl(" + round(hue + P.light.hueShift) + " " + P.light.saturation + "% " + round(l + P.light.lightnessBoost) + "%)",
    vein: "hsl(" + round(hue + P.vein.hueShift) + " " + P.vein.saturation + "% " + round(l + P.vein.lightnessBoost) + "%)",
    gold: P.gold,
  }
}
