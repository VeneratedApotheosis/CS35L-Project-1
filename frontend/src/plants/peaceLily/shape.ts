import type { Pt } from "../geometry"

/*
 * A pointed blade: the outline shared by the peace lily's leaf and its flower
 * hood (the spathe). It starts narrow at the base, swells to its widest point,
 * then narrows to a tip. The base is at (0,0) and the tip at (0,-length).
 */

export interface BladeShape {
  /** Width divided by length. */
  aspect: number
  /** Where the blade is widest, as a share of its length from the base. */
  peak: number
  /** Fullness between the base and the widest point. Below 1 is rounder, above 1 is more tapered. */
  baseTaper: number
  /** Fullness between the widest point and the tip. Above 1 draws the tip out to a longer point. */
  tipTaper: number
  /** Sideways bow of the midrib as a share of length. Positive bows right. The tip stays on x = 0. */
  bow: number
  /** How much wider the right half is than the left, as a share of the average width. */
  asym: number
}

export interface BladeSides {
  /** Left edge, base to tip. */
  left: Pt[]
  /** Right edge, base to tip. */
  right: Pt[]
  /** Midrib, base to tip. */
  mid: Pt[]
}

/** The blade's left edge, right edge and midrib, each as `steps + 1` points from base to tip. */
export function bladeSides(shape: BladeShape, length: number, steps: number): BladeSides {
  const widestAt = Math.log(0.5) / Math.log(shape.peak)
  const left: Pt[] = []
  const right: Pt[] = []
  const mid: Pt[] = []

  for (let i = 0; i <= steps; i++) {
    const t = i / steps
    // u runs 0..1 along the blade but reaches 0.5 exactly at the widest point.
    const u = Math.pow(t, widestAt)
    const swell = Math.sin(Math.PI * u)
    const fullness = Math.pow(swell, u <= 0.5 ? shape.baseTaper : shape.tipTaper)
    const half = (shape.aspect * length * fullness) / 2
    const x = shape.bow * length * Math.sin(Math.PI * t)
    const y = -t * length
    left.push([x - half * (1 - shape.asym / 2), y])
    right.push([x + half * (1 + shape.asym / 2), y])
    mid.push([x, y])
  }
  return { left, right, mid }
}

/** The blade as one closed polygon, going up the left edge and back down the right. */
export function bladeOutline(shape: BladeShape, length: number, steps: number): Pt[] {
  const { left, right } = bladeSides(shape, length, steps)
  return [...left, ...right.slice(1, -1).reverse()]
}

const fixed = (n: number) => n.toFixed(2)
const pathOf = (pts: Pt[]) => pts.map(([x, y], i) => (i === 0 ? "M" : "L") + fixed(x) + " " + fixed(y)).join(" ")

/** An SVG path for the whole blade. */
export function bladePath(shape: BladeShape, length: number, steps: number): string {
  return pathOf(bladeOutline(shape, length, steps)) + " Z"
}

/** An SVG path for the blade's right half, between the midrib and the right edge. */
export function rightHalfPath(shape: BladeShape, length: number, steps: number): string {
  const { right, mid } = bladeSides(shape, length, steps)
  return pathOf([...mid, ...[...right].reverse()]) + " Z"
}

/** An SVG path for the blade's left half, between the midrib and the left edge. */
export function leftHalfPath(shape: BladeShape, length: number, steps: number): string {
  const { left, mid } = bladeSides(shape, length, steps)
  return pathOf([...mid, ...[...left].reverse()]) + " Z"
}

/** An SVG path along the midrib between two shares of the blade's length. */
export function midribPath(shape: BladeShape, length: number, steps: number, from: number, to: number): string {
  const { mid } = bladeSides(shape, length, steps)
  const a = Math.round(from * steps)
  const b = Math.round(to * steps)
  return pathOf(mid.slice(a, b + 1))
}
