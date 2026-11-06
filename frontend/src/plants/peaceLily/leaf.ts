import { range, type Range, type Rng } from "../rng"
import { bladeOutline, type BladeShape } from "./shape"
import type { Pt } from "../geometry"

/*
 * The peace lily's leaf: long, glossy and pointed. How one is drawn at random,
 * how its outline is built and what colors it gets. Every number lives in a
 * named object below.
 */

/** Everything that defines one leaf's look, independent of where it sits. */
export interface LilyLeafSpec extends BladeShape {
  /** 0 dark green, 1 lighter green. */
  shade: number
}

export interface LilyLeafRanges {
  aspect: Range
  peak: Range
  baseTaper: Range
  tipTaper: Range
  bow: Range
  asym: Range
}

export const LILY_LEAF_RANGES: LilyLeafRanges = {
  aspect: [0.46, 0.6],
  peak: [0.34, 0.46],
  baseTaper: [0.75, 0.95],
  tipTaper: [1.1, 1.6],
  bow: [-0.09, 0.09],
  asym: [-0.1, 0.1],
}

export function randomLilyLeaf(rng: Rng, ranges: LilyLeafRanges = LILY_LEAF_RANGES): LilyLeafSpec {
  return {
    aspect: range(rng, ...ranges.aspect),
    peak: range(rng, ...ranges.peak),
    baseTaper: range(rng, ...ranges.baseTaper),
    tipTaper: range(rng, ...ranges.tipTaper),
    bow: range(rng, ...ranges.bow),
    asym: range(rng, ...ranges.asym),
    shade: rng(),
  }
}

/** How an outer leaf's bend is drawn. */
export const LILY_LEAF_FAN = {
  /** Sideways swing of the tip, as a share of length, at full fan. */
  sweep: 0.5,
}

/**
 * The leaf's blade shape with its outward bend applied. `fan` is -1 to 1:
 * positive bends right, negative left, 0 leaves the leaf as it is. The blade's
 * own random bow is eased off as it bends, so the curve reads as one clean arc.
 */
export function fannedShape(spec: LilyLeafSpec, fan: number): LilyLeafSpec {
  if (fan === 0) return spec
  return { ...spec, bow: spec.bow * (1 - Math.abs(fan)), sweep: fan * LILY_LEAF_FAN.sweep }
}

/** The leaf as a closed polygon: base at (0,0), tip near (0,-length). `fan` is how far it bends outward, -1 to 1. */
export function lilyLeafOutline(spec: LilyLeafSpec, length: number, perSegment: number, fan = 0): Pt[] {
  return bladeOutline(fannedShape(spec, fan), length, perSegment * 2)
}

/** Points per side when the leaf is drawn. */
export const LILY_LEAF_DRAW_STEPS = 24

/** Leaf colors. Hue, saturation and lightness are in the HSL ranges below. */
export const LILY_LEAF_PALETTE = {
  hue: [136, 148] as Range,
  saturation: 38,
  /** Lightness of the base green, from `shade` 0 to 1. */
  lightness: [24, 33] as Range,
  /** Added to the base lightness for the lighter half. */
  lightHalfBoost: 9,
  /** Midrib lightness and saturation. */
  vein: { saturation: 34, lightness: 58 },
}

export function lilyLeafColors(spec: LilyLeafSpec) {
  const P = LILY_LEAF_PALETTE
  const hue = P.hue[0] + (P.hue[1] - P.hue[0]) * spec.shade
  const l = P.lightness[0] + (P.lightness[1] - P.lightness[0]) * spec.shade
  return {
    base: "hsl(" + hue.toFixed(0) + " " + P.saturation + "% " + l.toFixed(1) + "%)",
    light: "hsl(" + (hue + 4).toFixed(0) + " " + (P.saturation + 4) + "% " + (l + P.lightHalfBoost).toFixed(1) + "%)",
    vein: "hsl(" + hue.toFixed(0) + " " + P.vein.saturation + "% " + P.vein.lightness + "%)",
  }
}
