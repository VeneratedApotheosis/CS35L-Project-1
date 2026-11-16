import type { Pt } from "../../geometry"
import type { PlantStage } from "../staged/types"

/*
 * The fiddle-leaf fig's trunk. The stage engine hangs each leaf from its own
 * stem that starts at the soil, but a fiddle-leaf fig has one slim trunk with
 * bare wood below its leaves and a short branch under each leaf. So the engine's
 * stems are not drawn. This works out one trunk from the soil up to the top
 * leaf, and a branch from the trunk to each leaf's base, from whatever stage is
 * being drawn (so it follows growth and wilting). Every number is named here.
 */
export const FIDDLE_TRUNK = {
  /** Trunk width at the soil and at its tip. Constant at every stage, like the engine's stems. */
  baseWidth: 4.4,
  tipWidth: 2.4,
  /** Points along each side of the trunk. */
  samples: 16,
  /** How much of the way the trunk's tip leans toward the middle of the leaf bases (0 straight up, 1 all the way). */
  leanShare: 0.55,
  /** The trunk leans more toward its tip: lean grows with height to this power. */
  leanCurve: 1.6,
  /** The trunk's tip sits this far below the highest leaf base, as a share of the stage's height. */
  tipBelowTopLeaf: 0.05,
  /** Each branch leaves the trunk this far below its leaf base, as a share of the stage's height. */
  branchDrop: 0.08,
  /** Where along a branch it bends from the trunk's direction to the leaf's base (0 trunk end, 1 leaf end). */
  branchBend: 0.45,
  /** Branch width. */
  branchWidth: 2.2,
  /** A trunk shorter than this (growing from nothing) is not drawn. */
  minHeight: 1,
}

export interface FiddleTrunk {
  /** The trunk as one closed SVG path. */
  outline: string
  /** The right half of the trunk, drawn in a lighter tone. */
  lightHalf: string
  /** One branch per leaf, from the trunk to the leaf's base. */
  branches: { index: number; d: string }[]
}

const PATH_PRECISION = 100
const round = (n: number) => Math.round(n * PATH_PRECISION) / PATH_PRECISION
const points = (pts: Pt[]) => pts.map(([x, y]) => round(x) + " " + round(y)).join(" L")

/**
 * The trunk and branches for one stage, or null while the stage has no leaf up
 * from the soil yet. `soil` is where the trunk starts.
 */
export function fiddleTrunk<Spec>(stage: PlantStage<Spec>, soil: { x: number; y: number }): FiddleTrunk | null {
  const T = FIDDLE_TRUNK
  if (stage.leaves.length === 0) return null

  const topBase = Math.min(...stage.leaves.map((leaf) => leaf.baseY))
  const tipY = topBase + T.tipBelowTopLeaf * stage.height
  const rise = soil.y - tipY
  if (rise < T.minHeight) return null

  const meanBaseX = stage.leaves.reduce((sum, leaf) => sum + leaf.baseX, 0) / stage.leaves.length
  const lean = (meanBaseX - soil.x) * T.leanShare
  /** The trunk's middle at height `y`. */
  const middleAt = (y: number): Pt => {
    const along = Math.min(Math.max((soil.y - y) / rise, 0), 1)
    return [soil.x + lean * along ** T.leanCurve, y]
  }

  const left: Pt[] = []
  const right: Pt[] = []
  const middle: Pt[] = []
  for (let i = 0; i <= T.samples; i++) {
    const along = i / T.samples
    const [x, y] = middleAt(soil.y - rise * along)
    const half = (T.baseWidth + (T.tipWidth - T.baseWidth) * along) / 2
    left.push([x - half, y])
    right.push([x + half, y])
    middle.push([x, y])
  }

  const branches = stage.leaves.map((leaf) => {
    const dropY = Math.min(Math.max(leaf.baseY + T.branchDrop * stage.height, tipY), soil.y)
    const [ax, ay] = middleAt(dropY)
    const cx = ax + (leaf.baseX - ax) * T.branchBend
    const cy = ay - (ay - leaf.baseY) * (1 - T.branchBend)
    return {
      index: leaf.index,
      d: "M" + round(ax) + " " + round(ay) + " Q" + round(cx) + " " + round(cy) + " " + round(leaf.baseX) + " " + round(leaf.baseY),
    }
  })

  return {
    outline: "M" + points([...left, ...[...right].reverse()]) + "Z",
    lightHalf: "M" + points([...middle, ...[...right].reverse()]) + "Z",
    branches,
  }
}
