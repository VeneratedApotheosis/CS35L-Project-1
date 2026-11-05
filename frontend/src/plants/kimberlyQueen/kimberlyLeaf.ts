import { rad, type Pt } from "../geometry"
import { bladeSides, bladeOutline, type BladeShape, type BladeSides } from "../peaceLily/shape"
import { clamp, int, lerp, range, type Range, type Rng } from "../rng"

/*
 * The Kimberly Queen fern's frond: not a single blade but a long, slim lance
 * made of a central rachis lined with many small rounded pinnae (leaflets)
 * alternating up both sides and getting shorter toward the tip. The lance
 * ENVELOPE is drawn from the shared blade outline (../peaceLily/shape), so the
 * stage engine measures the whole frond's silhouette for containment, while
 * the rachis and pinnae are drawn as detail inside it. Fresh medium-green,
 * flat two-tone, in the Animal Crossing: New Horizons style. Every number
 * lives in a named object below.
 */

/** Everything that defines one frond's look, independent of where it sits. */
export interface KimberlyFrondSpec extends BladeShape {
  /** 0 darker green, 1 lighter green. */
  shade: number
  /** How many pinna pairs run up the rachis. More on a longer frond. */
  pinnae: number
}

export interface KimberlyFrondRanges {
  aspect: Range
  peak: Range
  baseTaper: Range
  tipTaper: Range
  bow: Range
  asym: Range
  /** Fewest and most pinna pairs along the rachis. */
  pinnae: Range
}

export const KIMBERLY_FROND_RANGES: KimberlyFrondRanges = {
  aspect: [0.2, 0.28],
  peak: [0.42, 0.52],
  baseTaper: [0.78, 1.0],
  tipTaper: [1.35, 1.8],
  bow: [-0.04, 0.04],
  asym: [-0.05, 0.05],
  pinnae: [9, 14],
}

export function randomKimberlyFrond(rng: Rng, ranges: KimberlyFrondRanges = KIMBERLY_FROND_RANGES): KimberlyFrondSpec {
  return {
    aspect: range(rng, ...ranges.aspect),
    peak: range(rng, ...ranges.peak),
    baseTaper: range(rng, ...ranges.baseTaper),
    tipTaper: range(rng, ...ranges.tipTaper),
    bow: range(rng, ...ranges.bow),
    asym: range(rng, ...ranges.asym),
    shade: rng(),
    pinnae: int(rng, ranges.pinnae[0], ranges.pinnae[1]),
  }
}

/** How an outer frond's bend is drawn. */
export const KIMBERLY_FROND_FAN = {
  /** Sideways swing of the tip, as a share of length, at full fan. */
  sweep: 0.32,
}

/**
 * The frond's lance shape with its outward bend applied. `fan` is -1 to 1:
 * positive bends right, negative left, 0 leaves the frond as it is. The lance's
 * own random bow is eased off as it bends, so the arc reads as one clean curve.
 */
export function fannedFrond(spec: KimberlyFrondSpec, fan: number): KimberlyFrondSpec {
  if (fan === 0) return spec
  return { ...spec, bow: spec.bow * (1 - Math.abs(fan)), sweep: fan * KIMBERLY_FROND_FAN.sweep }
}

/**
 * The frond's silhouette as a closed polygon: a long slim lance envelope, base
 * at (0,0) and tip near (0,-length). The pinnae are drawn inside this, so
 * returning the envelope keeps the engine's containment correct. `fan` is how
 * far the frond bends outward, -1 to 1; 0 leaves it upright, exactly as before.
 */
export function kimberlyFrondOutline(spec: KimberlyFrondSpec, length: number, perSegment: number, fan = 0): Pt[] {
  return bladeOutline(fannedFrond(spec, fan), length, perSegment * 2)
}

/** Points per side when the frond is drawn. */
export const KIMBERLY_FROND_DRAW_STEPS = 30

/** One rounded pinna (leaflet), as an ellipse to draw. */
export interface Pinna {
  cx: number
  cy: number
  rx: number
  ry: number
  /** Rotation of the ellipse in degrees, so its long axis points out and up. */
  rotation: number
  /** -1 left of the rachis, 1 right of it. */
  side: 1 | -1
}

/** How the pinnae are laid out along the rachis. */
export const KIMBERLY_PINNA_SHAPE = {
  /** The pinna pairs span this share of the frond length, base to tip. */
  span: [0.07, 0.96] as Range,
  /** A pinna reaches this share of the frond's half-width at its root. */
  reach: 0.96,
  /** A pinna's thickness as a share of its own length. */
  thickness: 0.5,
  /** Degrees a pinna tilts up toward the tip. */
  tilt: 46,
  /** Resolution used to sample the frond envelope for pinna roots. */
  samples: 64,
  /** Pinnae shorter than this (in canvas units) are skipped near the tip. */
  minLength: 0.6,
}

/** The midrib point and the envelope half-width at a share `t` of the frond length, on one side. */
function sampleEnvelope(sides: BladeSides, t: number, side: 1 | -1) {
  const steps = sides.mid.length - 1
  const f = clamp(t) * steps
  const i = Math.min(Math.floor(f), steps - 1)
  const frac = f - i
  const mx = lerp(sides.mid[i][0], sides.mid[i + 1][0], frac)
  const my = lerp(sides.mid[i][1], sides.mid[i + 1][1], frac)
  const edge = side > 0 ? sides.right : sides.left
  const ex = lerp(edge[i][0], edge[i + 1][0], frac)
  return { mx, my, half: Math.abs(ex - mx) }
}

/**
 * The pinnae of one frond, rooted on the rachis and reaching out to the lance
 * envelope. Pairs march up the frond; the left pinna of each pair is offset
 * half a step so the two sides alternate. Pinnae shorten toward the tip as the
 * envelope narrows, so the count and size scale with the frond length.
 */
export function frondPinnae(spec: KimberlyFrondSpec, length: number): Pinna[] {
  const K = KIMBERLY_PINNA_SHAPE
  const sides = bladeSides(spec, length, K.samples)
  const pairs = spec.pinnae
  const [lo, hi] = K.span
  const tiltRad = rad(K.tilt)
  const halfStep = pairs <= 1 ? 0 : (hi - lo) / (pairs - 1) / 2
  const out: Pinna[] = []

  for (let i = 0; i < pairs; i++) {
    const baseT = pairs <= 1 ? (lo + hi) / 2 : lerp(lo, hi, i / (pairs - 1))
    for (const side of [1, -1] as const) {
      const t = clamp(baseT + (side > 0 ? 0 : halfStep), 0, hi)
      const { mx, my, half } = sampleEnvelope(sides, t, side)
      const len = half * K.reach
      if (len < K.minLength) continue
      const dx = side * Math.cos(tiltRad)
      const dy = -Math.sin(tiltRad)
      out.push({
        cx: mx + (dx * len) / 2,
        cy: my + (dy * len) / 2,
        rx: len / 2,
        ry: (len * K.thickness) / 2,
        rotation: (Math.atan2(dy, dx) * 180) / Math.PI,
        side,
      })
    }
  }
  return out
}

/** Frond colors in HSL. Fresh medium-green, with a slightly lighter half. */
export const KIMBERLY_FROND_PALETTE = {
  hue: [128, 140] as Range,
  saturation: 44,
  /** Lightness of the medium green, from `shade` 0 to 1. */
  lightness: [34, 42] as Range,
  /** The lighter pinnae on one side of the rachis. */
  light: { hue: 4, saturation: 5, lightness: 9 },
  /** The central rachis (stem). */
  rachis: { saturation: 34, lightness: 52 },
}

export function kimberlyFrondColors(spec: KimberlyFrondSpec) {
  const P = KIMBERLY_FROND_PALETTE
  const hue = lerp(P.hue[0], P.hue[1], spec.shade)
  const l = lerp(P.lightness[0], P.lightness[1], spec.shade)
  return {
    base: "hsl(" + hue.toFixed(0) + " " + P.saturation + "% " + l.toFixed(1) + "%)",
    light:
      "hsl(" + (hue + P.light.hue).toFixed(0) + " " + (P.saturation + P.light.saturation) + "% " +
      (l + P.light.lightness).toFixed(1) + "%)",
    rachis: "hsl(" + hue.toFixed(0) + " " + P.rachis.saturation + "% " + P.rachis.lightness + "%)",
  }
}
