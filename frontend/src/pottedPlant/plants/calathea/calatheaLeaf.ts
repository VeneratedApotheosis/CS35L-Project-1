import type { Pt } from "../../geometry"
import { int, range, type Range, type Rng } from "../../rng"
import { bladeOutline, bladePath, bladeSides, type BladeShape } from "../peaceLily/shape"

/*
 * The calathea's leaf (a prayer plant): a broad oval blade, dark green with
 * lighter stripes running outward from a pale midrib to the edge (a
 * herringbone), and a muted purple rim at the edge. It is drawn from the shared
 * blade outline (../peaceLily/shape), so the stage engine measures exactly what
 * is drawn. The stripes are built from the same blade sides, so they follow the
 * outline. Flat fills only, in the Animal Crossing: New Horizons style.
 */

/** Everything that defines one calathea leaf's look, independent of where it sits. */
export interface CalatheaLeafSpec extends BladeShape {
  /** 0 darker green, 1 lighter green. */
  shade: number
  /** Stripes down each side of the midrib. */
  stripes: number
  /** How far toward the tip a stripe runs from the midrib to the edge, as a share of leaf length. */
  slant: number
}

export interface CalatheaLeafRanges {
  aspect: Range
  peak: Range
  baseTaper: Range
  tipTaper: Range
  bow: Range
  asym: Range
  stripes: readonly [number, number]
  slant: Range
}

export const CALATHEA_LEAF_RANGES: CalatheaLeafRanges = {
  aspect: [0.52, 0.64],
  peak: [0.44, 0.54],
  baseTaper: [0.55, 0.75],
  tipTaper: [0.95, 1.25],
  bow: [-0.03, 0.03],
  asym: [-0.05, 0.05],
  stripes: [6, 8],
  slant: [0.12, 0.18],
}

/** Draw one leaf's look. The order of draws is part of a seed's identity. */
export function randomCalatheaLeaf(rng: Rng, ranges: CalatheaLeafRanges = CALATHEA_LEAF_RANGES): CalatheaLeafSpec {
  return {
    aspect: range(rng, ...ranges.aspect),
    peak: range(rng, ...ranges.peak),
    baseTaper: range(rng, ...ranges.baseTaper),
    tipTaper: range(rng, ...ranges.tipTaper),
    bow: range(rng, ...ranges.bow),
    asym: range(rng, ...ranges.asym),
    shade: rng(),
    stripes: int(rng, ranges.stripes[0], ranges.stripes[1]),
    slant: range(rng, ...ranges.slant),
  }
}

/** How an outer leaf's bend is drawn. */
export const CALATHEA_LEAF_FAN = {
  /** Sideways swing of the tip, as a share of length, at full fan. */
  sweep: 0.4,
}

/**
 * The leaf's blade shape with its outward bend applied. `fan` is -1 to 1:
 * positive bends right, negative left, 0 leaves the leaf as it is. The blade's
 * own random bow is eased off as it bends, so the curve reads as one clean arc.
 * Every drawn part (rim, body, stripes, midrib) is built from this shape.
 */
export function fannedCalatheaShape(spec: CalatheaLeafSpec, fan: number): CalatheaLeafSpec {
  if (fan === 0) return spec
  return { ...spec, bow: spec.bow * (1 - Math.abs(fan)), sweep: fan * CALATHEA_LEAF_FAN.sweep }
}

/** The leaf as a closed polygon: base at (0,0), tip near (0,-length). `fan` is how far it bends outward, -1 to 1. */
export function calatheaLeafOutline(spec: CalatheaLeafSpec, length: number, perSegment: number, fan = 0): Pt[] {
  return bladeOutline(fannedCalatheaShape(spec, fan), length, perSegment * 2)
}

/* ------------------------------------------------------------------ */
/* Drawing geometry                                                    */
/* ------------------------------------------------------------------ */

/** Points per side when the leaf is drawn. */
export const CALATHEA_LEAF_DRAW_STEPS = 32

/** The stripes and the purple rim, as shares of the leaf. */
export const CALATHEA_LEAF_PATTERN = {
  /** Where along the midrib (share of length) the first and last stripe start. */
  stripeStart: 0.1,
  stripeEnd: 0.86,
  /** Stripe width where it leaves the midrib and where it meets the edge, as shares of leaf length. */
  stripeWidth: { midrib: 0.05, edge: 0.034 },
  /** The dark green body is the blade narrowed to this share of its width; the rest shows as the purple rim. */
  bodyWidth: 0.88,
  /** Stripes end on the body's edge; the blade stops this share of its length short of the tip so the point stays purple. */
  tipReserve: 0.03,
}

const fixed = (n: number) => n.toFixed(2)

/** The whole leaf, as an SVG path. This is the same blade the outline is sampled from. */
export function calatheaLeafPath(spec: CalatheaLeafSpec, length: number): string {
  return bladePath(spec, length, CALATHEA_LEAF_DRAW_STEPS)
}

/** The dark green body inside the purple rim, as an SVG path. */
export function calatheaBodyPath(spec: CalatheaLeafSpec, length: number): string {
  return bladePath({ ...spec, aspect: spec.aspect * CALATHEA_LEAF_PATTERN.bodyWidth }, length, CALATHEA_LEAF_DRAW_STEPS)
}

/**
 * The light stripes as one SVG path of tapered quads. Each leaves the midrib at
 * one height and meets the body's edge a little nearer the tip, so they sweep
 * outward and up like a herringbone. The left and right stripes are staggered by
 * half a gap. Their ends sit on the body's edge points, so they follow the outline.
 */
export function calatheaStripesPath(spec: CalatheaLeafSpec, length: number): string {
  const P = CALATHEA_LEAF_PATTERN
  const steps = CALATHEA_LEAF_DRAW_STEPS
  const body = bladeSides({ ...spec, aspect: spec.aspect * P.bodyWidth }, length, steps)
  const last = Math.floor(steps * (1 - P.tipReserve))
  const at = (t: number) => Math.min(last, Math.max(0, Math.round(t * steps)))
  const gap = (P.stripeEnd - P.stripeStart) / Math.max(1, spec.stripes - 1)
  const midWidth = P.stripeWidth.midrib * steps
  const edgeWidth = P.stripeWidth.edge * steps
  const pt = ([x, y]: Pt) => fixed(x) + " " + fixed(y)

  let d = ""
  for (const side of [body.left, body.right] as const) {
    const stagger = side === body.right ? gap / 2 : 0
    for (let k = 0; k < spec.stripes; k++) {
      const a = at(P.stripeStart + k * gap + stagger)
      const e = at(P.stripeStart + k * gap + stagger + spec.slant)
      const m = Math.max(1, Math.round(midWidth))
      const w = Math.max(1, Math.round(edgeWidth))
      if (e <= a || e + w > last || a + m > last) continue
      d += "M" + pt(body.mid[a]) + " L" + pt(side[e]) + " L" + pt(side[e + w]) + " L" + pt(body.mid[a + m]) + " Z "
    }
  }
  return d.trim()
}

/** The pale midrib, as a polyline path from the base to near the tip. */
export function calatheaMidribPath(spec: CalatheaLeafSpec, length: number, from: number, to: number): string {
  const steps = CALATHEA_LEAF_DRAW_STEPS
  const { mid } = bladeSides(spec, length, steps)
  const a = Math.round(from * steps)
  const b = Math.round(to * steps)
  return mid
    .slice(a, b + 1)
    .map(([x, y], i) => (i === 0 ? "M" : "L") + fixed(x) + " " + fixed(y))
    .join(" ")
}

/* ------------------------------------------------------------------ */
/* Color                                                               */
/* ------------------------------------------------------------------ */

/** Leaf colors in HSL: dark and light green with a muted purple accent. */
export const CALATHEA_LEAF_PALETTE = {
  /** The dark green body, from shade 0 to 1. */
  body: { hue: [138, 150] as Range, saturation: 36, lightness: [20, 27] as Range },
  /** The light green stripes, relative to the body. */
  stripe: { hueShift: -28, saturation: 42, lightnessBoost: 26 },
  /** The muted purple rim, from shade 0 to 1. */
  purple: { hue: [292, 308] as Range, saturation: 22, lightness: [34, 42] as Range },
  /** The pale midrib. */
  midrib: { hue: 88, saturation: 46, lightness: 82 },
}

export function calatheaLeafColors(spec: CalatheaLeafSpec) {
  const P = CALATHEA_LEAF_PALETTE
  const mix = (r: Range) => r[0] + (r[1] - r[0]) * spec.shade
  const hue = mix(P.body.hue)
  const l = mix(P.body.lightness)
  return {
    body: "hsl(" + hue.toFixed(0) + " " + P.body.saturation + "% " + l.toFixed(1) + "%)",
    stripe:
      "hsl(" + (hue + P.stripe.hueShift).toFixed(0) + " " + P.stripe.saturation + "% " + (l + P.stripe.lightnessBoost).toFixed(1) + "%)",
    purple: "hsl(" + mix(P.purple.hue).toFixed(0) + " " + P.purple.saturation + "% " + mix(P.purple.lightness).toFixed(1) + "%)",
    midrib: "hsl(" + P.midrib.hue + " " + P.midrib.saturation + "% " + P.midrib.lightness + "%)",
  }
}
