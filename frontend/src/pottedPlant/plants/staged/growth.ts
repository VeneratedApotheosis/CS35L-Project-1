import type { PlacedLeaf, PlantStage } from "./types"

/**
 * The stage-up animation. When a plant moves up a stage, each leaf it already
 * had moves from its old place to its new one, and each new leaf grows out of
 * the soil. Only leaves and stems move. The pot and the soil are not part of
 * this, so they stay put.
 */
export const GROWTH = {
  /** How long the animation runs, in seconds. */
  duration: 1.1,
  /** Spring: how quickly it oscillates (radians per second) and how quickly the swings die out (0 to 1). */
  stiffness: 11,
  damping: 0.42,
  /** A growing leaf is never drawn shorter than this, so shapes never collapse to nothing. */
  minLength: 0.5,
} as const

/**
 * How far along the move is after `seconds`, from 0 to 1, with a spring: it
 * overshoots 1 a little, swings back and settles. Past the duration it is 1.
 */
export function springProgress(seconds: number): number {
  if (seconds <= 0) return 0
  if (seconds >= GROWTH.duration) return 1
  const { stiffness: w, damping: z } = GROWTH
  const damped = w * Math.sqrt(1 - z * z)
  const decay = Math.exp(-z * w * seconds)
  return 1 - decay * (Math.cos(damped * seconds) + ((z * w) / damped) * Math.sin(damped * seconds))
}

const mix = (from: number, to: number, t: number) => from + (to - from) * t

/** What a leaf of the new stage looks like before it has grown: a bud at the foot of its stem. */
function bud<Spec>(leaf: PlacedLeaf<Spec>): PlacedLeaf<Spec> {
  const { x0, y0 } = leaf.stem
  return {
    ...leaf,
    length: GROWTH.minLength,
    baseX: x0,
    baseY: y0,
    centerX: x0,
    centerY: y0,
    bend: 0,
    stem: { x0, y0, cx: x0, cy: y0, x1: x0, y1: y0 },
  }
}

function blendLeaf<Spec>(from: PlacedLeaf<Spec>, to: PlacedLeaf<Spec>, t: number): PlacedLeaf<Spec> {
  return {
    ...to,
    angle: mix(from.angle, to.angle, t),
    length: Math.max(GROWTH.minLength, mix(from.length, to.length, t)),
    fan: mix(from.fan, to.fan, t),
    bend: mix(from.bend ?? 0, to.bend ?? 0, t),
    baseX: mix(from.baseX, to.baseX, t),
    baseY: mix(from.baseY, to.baseY, t),
    centerX: mix(from.centerX, to.centerX, t),
    centerY: mix(from.centerY, to.centerY, t),
    stem: {
      x0: to.stem.x0,
      y0: to.stem.y0,
      cx: mix(from.stem.cx, to.stem.cx, t),
      cy: mix(from.stem.cy, to.stem.cy, t),
      x1: mix(from.stem.x1, to.stem.x1, t),
      y1: mix(from.stem.y1, to.stem.y1, t),
    },
  }
}

/**
 * The plant part-way from stage `from` to stage `to`. `t` is 0 at the old stage
 * and 1 at the new one, and may go a little past 1 for the spring. A leaf in
 * both stages moves from its old place to its new one. A leaf only the new stage
 * has grows out of the soil. Leaves the new stage drops are not drawn.
 */
export function blendStage<Spec>(from: PlantStage<Spec>, to: PlantStage<Spec>, t: number): PlantStage<Spec> {
  const before = new Map(from.leaves.map((leaf) => [leaf.index, leaf]))
  return {
    ...to,
    scale: mix(from.scale, to.scale, t),
    halfWidth: mix(from.halfWidth, to.halfWidth, t),
    height: mix(from.height, to.height, t),
    leaves: to.leaves.map((leaf) => blendLeaf(before.get(leaf.index) ?? bud(leaf), leaf, t)),
  }
}
