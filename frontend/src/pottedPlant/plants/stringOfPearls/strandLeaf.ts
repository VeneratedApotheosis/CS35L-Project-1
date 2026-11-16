import { range, int, type Range, type Rng } from "../../rng"
import type { Pt } from "../../geometry"

/*
 * The strand of pearls. The staged engine treats it as a "leaf", but it is a
 * thin drooping curve with a row of round beads along it: it rises from its
 * stalk end, curves over, and hangs straight down. Its outline is a ribbon
 * around that curve, as wide as the beads.
 *
 * The curve is built in the canvas's own directions, so the strand hangs down
 * whichever way the engine turns it: the outline reads the leaf's angle and
 * bends the local curve by the difference. All lengths are shares of the
 * strand's length (the outline is drawn at length 1 and scaled).
 */

/** Everything that defines one strand's look, independent of where it sits. */
export interface StrandSpec {
  /** Number of beads along the strand. */
  beads: number
  /** A bead's radius as a share of the spacing between beads. */
  beadSize: number
  /** Share of the strand that rises straight before it curves over. */
  rise: number
  /** Share of the strand over which it turns from rising to hanging. */
  arc: number
  /** Direction the strand ends in, in degrees from straight up (180 is straight down). */
  hang: number
  /** How far the hanging part sways side to side, in degrees. */
  sway: number
  /** Number of sway waves along the strand. */
  swayWaves: number
  /** Where the sway wave starts, in waves (0 to 1). */
  swayPhase: number
  /** 0 pale green, 1 mid green. */
  shade: number
}

export interface StrandRanges {
  beads: readonly [number, number]
  beadSize: Range
  rise: Range
  arc: Range
  hang: Range
  sway: Range
  swayWaves: Range
  swayPhase: Range
}

export const STRAND_RANGES: StrandRanges = {
  beads: [30, 39],
  beadSize: [0.54, 0.6],
  rise: [0.03, 0.08],
  arc: [0.14, 0.24],
  hang: [168, 186],
  sway: [2, 6],
  swayWaves: [0.8, 1.6],
  swayPhase: [0, 1],
}

/** How the bead size shrinks toward the strand's tip: the last bead is this share of the first. */
export const STRAND_TAPER = 0.8

/** Curve samples per outline point, so a curve has this many times `perSegment` steps. */
export const STRAND_STEPS_PER_SEGMENT = 3

/** Draw one strand's look from the seed. The order of draws is part of identity. */
export function randomStrand(rng: Rng, r: StrandRanges = STRAND_RANGES): StrandSpec {
  return {
    beads: int(rng, r.beads[0], r.beads[1]),
    beadSize: range(rng, ...r.beadSize),
    rise: range(rng, ...r.rise),
    arc: range(rng, ...r.arc),
    hang: range(rng, ...r.hang),
    sway: range(rng, ...r.sway),
    swayWaves: range(rng, ...r.swayWaves),
    swayPhase: rng(),
    shade: rng(),
  }
}

const smoothstep = (t: number) => {
  const c = Math.min(Math.max(t, 0), 1)
  return c * c * (3 - 2 * c)
}

/** A point of the strand's curve and the direction it runs in there. */
export interface StrandPoint {
  x: number
  y: number
  /** Direction of the curve in the leaf's own frame, in radians from straight up, positive to the right. */
  heading: number
}

/**
 * The strand's curve at length 1: stalk end at (0,0), `steps + 1` points. The curve's
 * direction in the canvas runs from the leaf's own `angle` (degrees from straight up) to
 * `hang`, turning outward, so it always ends hanging down. Points are in the leaf's own
 * frame, which the engine turns by `angle`.
 */
export function strandCurve(spec: StrandSpec, angle: number, steps: number): StrandPoint[] {
  const side = angle < 0 ? -1 : 1
  const start = Math.abs(angle)
  const turn = Math.max(spec.hang - start, 0)
  // The leaf's own direction at t: the canvas direction minus the turn the engine already applies.
  const heading = (t: number) => {
    const s = smoothstep((t - spec.rise) / spec.arc)
    const sway = spec.sway * Math.sin(2 * Math.PI * (spec.swayWaves * t + spec.swayPhase)) * s
    return (side * (turn * s + sway) * Math.PI) / 180
  }
  const points: StrandPoint[] = [{ x: 0, y: 0, heading: heading(0) }]
  let x = 0
  let y = 0
  for (let i = 0; i < steps; i++) {
    const mid = heading((i + 0.5) / steps)
    x += Math.sin(mid) / steps
    y -= Math.cos(mid) / steps
    points.push({ x, y, heading: heading((i + 1) / steps) })
  }
  return points
}

/** Radius of the beads at `t` (0 stalk end, 1 tip), at length 1. */
export function strandRadius(spec: StrandSpec, t: number): number {
  return (spec.beadSize / spec.beads) * (1 - (1 - STRAND_TAPER) * t)
}

export interface Bead {
  x: number
  y: number
  r: number
  /** Direction of the strand at the bead, in radians from straight up. */
  heading: number
}

/** The beads at length 1: bead k sits in the middle of the k-th of `beads` equal runs of the strand. */
export function strandBeads(spec: StrandSpec, angle: number): Bead[] {
  const steps = spec.beads * 8
  const curve = strandCurve(spec, angle, steps)
  return Array.from({ length: spec.beads }, (_, k) => {
    const t = (k + 0.5) / spec.beads
    const p = curve[Math.round(t * steps)]
    return { x: p.x, y: p.y, r: strandRadius(spec, t), heading: p.heading }
  })
}

/**
 * The strand's outline as a closed polygon: a ribbon as wide as the beads around
 * the curve, `perSegment` points per curve segment on each side. Stalk end at (0,0).
 */
export function strandPolygon(spec: StrandSpec, length: number, perSegment: number, angle = 0): Pt[] {
  const steps = perSegment * STRAND_STEPS_PER_SEGMENT
  const curve = strandCurve(spec, angle, steps)
  const left: Pt[] = []
  const right: Pt[] = []
  curve.forEach((p, i) => {
    const r = strandRadius(spec, i / steps)
    const nx = Math.cos(p.heading)
    const ny = Math.sin(p.heading)
    left.push([(p.x - nx * r) * length, (p.y - ny * r) * length])
    right.push([(p.x + nx * r) * length, (p.y + ny * r) * length])
  })
  return [...left, ...right.reverse()]
}

/** Green of the beads, in HSL. Hue and lightness slide with `spec.shade`, so a plant's strands are related but not identical. */
export const STRAND_PALETTE = {
  hue: { middle: 104, swing: 14 },
  lightness: { pale: 58, swing: 10 },
  base: { saturation: 38 },
  /** The lighter patch on each bead, relative to the base. */
  light: { hueShift: 6, saturation: 46, lightnessBoost: 14 },
  /** The tiny pale window line on each bead, relative to the base. */
  window: { hueShift: 10, saturation: 60, lightnessBoost: 28 },
  /** The thread the beads hang on (also the stems), a little darker than the beads. */
  thread: "hsl(100 30% 42%)",
}

const round = (n: number) => String(Math.round(n * 10) / 10)

export function strandColors(spec: StrandSpec) {
  const P = STRAND_PALETTE
  const hue = P.hue.middle + (spec.shade - 0.5) * P.hue.swing
  const l = P.lightness.pale + spec.shade * P.lightness.swing
  return {
    base: "hsl(" + round(hue) + " " + P.base.saturation + "% " + round(l) + "%)",
    light: "hsl(" + round(hue + P.light.hueShift) + " " + P.light.saturation + "% " + round(l + P.light.lightnessBoost) + "%)",
    window: "hsl(" + round(hue + P.window.hueShift) + " " + P.window.saturation + "% " + round(l + P.window.lightnessBoost) + "%)",
    thread: P.thread,
  }
}
