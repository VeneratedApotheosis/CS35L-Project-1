import type { Pt } from "../../geometry"
import { bladeOutline, type BladeShape } from "../peaceLily/shape"
import { range, type Range, type Rng } from "../../rng"

/*
 * The lily's leaf: a long, narrow lance that stands up and arches outward at
 * the edges of the plant. Built from the shared blade outline, so the stage
 * engine measures exactly what is drawn. Flat, two-tone, Animal Crossing style.
 */

/** Everything that defines one lily leaf's look, independent of where it sits. */
export interface LilyLeafSpec extends BladeShape {
  /** 0 darker green, 1 lighter green. */
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
  aspect: [0.16, 0.26],
  peak: [0.4, 0.52],
  baseTaper: [0.8, 1.0],
  tipTaper: [1.3, 1.8],
  bow: [-0.08, 0.08],
  asym: [-0.08, 0.08],
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
  sweep: 0.42,
}

/**
 * The leaf's blade shape with its outward bend applied. `fan` is -1 to 1:
 * positive bends right, negative left, 0 leaves the leaf as it is. The blade's
 * own bow eases off as it bends, so the curve reads as one clean arc.
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

/** Leaf colors in HSL. */
export const LILY_LEAF_PALETTE = {
  hue: [126, 140] as Range,
  saturation: 40,
  lightness: [25, 34] as Range,
  lightHalfBoost: 9,
  vein: { saturation: 36, lightness: 56 },
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
