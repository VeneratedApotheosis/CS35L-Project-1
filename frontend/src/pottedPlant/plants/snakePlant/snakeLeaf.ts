import type { Pt } from "../../geometry"
import { bladeOutline, type BladeShape } from "../peaceLily/shape"
import { range, type Range, type Rng } from "../../rng"

/*
 * The snake plant's leaf (Dracaena trifasciata): a tall, stiff sword that is
 * widest a little above its middle and tapers to a sharp point. It is drawn
 * from the shared blade outline (../peaceLily/shape), so the stage engine
 * measures exactly what is drawn. Every number lives in a named object below.
 * Reference: a variegated snake plant with pale-yellow margins and faint
 * cross-banding (artifacts/clu7ayo6e03eyfrrazuwcfyyj-...jpg), in the flat,
 * two-tone Animal Crossing: New Horizons style.
 */

/** Everything that defines one snake leaf's look, independent of where it sits. */
export interface SnakeLeafSpec extends BladeShape {
  /** 0 darker green, 1 lighter green. */
  shade: number
  /** Whether this leaf has a pale-yellow margin (variegated) or a plain edge. */
  variegated: boolean
}

export interface SnakeLeafRanges {
  aspect: Range
  peak: Range
  baseTaper: Range
  tipTaper: Range
  bow: Range
  asym: Range
  /** Chance a leaf is variegated (pale-yellow margins). */
  variegatedChance: number
}

export const SNAKE_LEAF_RANGES: SnakeLeafRanges = {
  aspect: [0.19, 0.28],
  peak: [0.5, 0.64],
  baseTaper: [0.72, 0.95],
  tipTaper: [1.25, 1.75],
  bow: [-0.05, 0.05],
  asym: [-0.06, 0.06],
  variegatedChance: 0.78,
}

export function randomSnakeLeaf(rng: Rng, ranges: SnakeLeafRanges = SNAKE_LEAF_RANGES): SnakeLeafSpec {
  return {
    aspect: range(rng, ...ranges.aspect),
    peak: range(rng, ...ranges.peak),
    baseTaper: range(rng, ...ranges.baseTaper),
    tipTaper: range(rng, ...ranges.tipTaper),
    bow: range(rng, ...ranges.bow),
    asym: range(rng, ...ranges.asym),
    shade: rng(),
    variegated: rng() < ranges.variegatedChance,
  }
}

/** The leaf as a closed polygon: base at (0,0), tip near (0,-length). The snake plant does not fan. */
export function snakeLeafOutline(spec: SnakeLeafSpec, length: number, perSegment: number): Pt[] {
  return bladeOutline(spec, length, perSegment * 2)
}

/** Points per side when the leaf is drawn. */
export const SNAKE_LEAF_DRAW_STEPS = 28

/** Leaf colors in HSL. */
export const SNAKE_LEAF_PALETTE = {
  hue: [138, 150] as Range,
  saturation: 34,
  /** Lightness of the dark green interior, from `shade` 0 to 1. */
  lightness: [24, 31] as Range,
  /** The pale-yellow variegated margin. */
  edge: "hsl(54 66% 66%)",
  /** The cross-banding across the interior. */
  band: { color: "hsl(96 24% 52%)", lightness: 48 },
  /** The midrib. */
  vein: { saturation: 30, lightness: 44 },
}

export function snakeLeafColors(spec: SnakeLeafSpec) {
  const P = SNAKE_LEAF_PALETTE
  const hue = P.hue[0] + (P.hue[1] - P.hue[0]) * spec.shade
  const l = P.lightness[0] + (P.lightness[1] - P.lightness[0]) * spec.shade
  return {
    base: "hsl(" + hue.toFixed(0) + " " + P.saturation + "% " + l.toFixed(1) + "%)",
    light: "hsl(" + (hue + 4).toFixed(0) + " " + (P.saturation + 4) + "% " + (l + 7).toFixed(1) + "%)",
    edge: P.edge,
    band: "hsl(96 22% " + P.band.lightness + "%)",
    vein: "hsl(" + hue.toFixed(0) + " " + P.vein.saturation + "% " + P.vein.lightness + "%)",
  }
}
