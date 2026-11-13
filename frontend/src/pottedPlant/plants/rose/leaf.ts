import type { Pt } from "../../geometry"
import { bladeOutline, type BladeShape } from "../peaceLily/shape"
import { range, type Range, type Rng } from "../../rng"

/*
 * The rose's leaf: a rounded, pointed oval with a herringbone of veins, a touch
 * bluer and darker than the other plants' foliage. Built from the shared blade
 * outline so the stage engine measures what is drawn. Flat, two-tone, Animal
 * Crossing style.
 */

/** Everything that defines one rose leaf's look, independent of where it sits. */
export interface RoseLeafSpec extends BladeShape {
  /** 0 darker green, 1 lighter green. */
  shade: number
}

export interface RoseLeafRanges {
  aspect: Range
  peak: Range
  baseTaper: Range
  tipTaper: Range
  bow: Range
  asym: Range
}

export const ROSE_LEAF_RANGES: RoseLeafRanges = {
  aspect: [0.5, 0.64],
  peak: [0.44, 0.54],
  baseTaper: [0.6, 0.8],
  tipTaper: [0.95, 1.25],
  bow: [-0.07, 0.07],
  asym: [-0.1, 0.1],
}

export function randomRoseLeaf(rng: Rng, ranges: RoseLeafRanges = ROSE_LEAF_RANGES): RoseLeafSpec {
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

/** The leaf as a closed polygon: base at (0,0), tip near (0,-length). The rose does not fan. */
export function roseLeafOutline(spec: RoseLeafSpec, length: number, perSegment: number): Pt[] {
  return bladeOutline(spec, length, perSegment * 2)
}

/** Points per side when the leaf is drawn. */
export const ROSE_LEAF_DRAW_STEPS = 22

/** Leaf colors in HSL. */
export const ROSE_LEAF_PALETTE = {
  hue: [146, 158] as Range,
  saturation: 32,
  lightness: [22, 30] as Range,
  lightHalfBoost: 8,
  vein: { saturation: 28, lightness: 50 },
}

export function roseLeafColors(spec: RoseLeafSpec) {
  const P = ROSE_LEAF_PALETTE
  const hue = P.hue[0] + (P.hue[1] - P.hue[0]) * spec.shade
  const l = P.lightness[0] + (P.lightness[1] - P.lightness[0]) * spec.shade
  return {
    base: "hsl(" + hue.toFixed(0) + " " + P.saturation + "% " + l.toFixed(1) + "%)",
    light: "hsl(" + (hue + 4).toFixed(0) + " " + (P.saturation + 4) + "% " + (l + P.lightHalfBoost).toFixed(1) + "%)",
    vein: "hsl(" + hue.toFixed(0) + " " + P.vein.saturation + "% " + P.vein.lightness + "%)",
  }
}
