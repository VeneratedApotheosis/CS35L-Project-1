import { pointInPolygon, rad, type Pt } from "../geometry"

/** What coverage needs to know about a leaf already placed in the canvas. */
export interface MeasuredLeaf {
  /** Outline drawn at length 1: stalk end at (0,0), tip at (0,-1). */
  unitOutline: Pt[]
  length: number
  baseX: number
  baseY: number
  /** Degrees clockwise from straight up. */
  angle: number
}

export interface CoverageResult {
  /** Share of sample points inside at least one leaf, 0..1. */
  coverage: number
  /** Average number of leaves covering a covered point. 1 means no overlap. */
  overlap: number
}

/** How well `leaves` fill the sample points, and how deeply they stack. */
export function measureCoverage(leaves: MeasuredLeaf[], points: Pt[]): CoverageResult {
  if (points.length === 0) return { coverage: 0, overlap: 1 }

  const prepared = leaves.map((leaf) => {
    const a = rad(leaf.angle)
    return { leaf, cos: Math.cos(a), sin: Math.sin(a) }
  })

  let covered = 0
  let stacked = 0
  for (const [x, y] of points) {
    let here = 0
    for (const { leaf, cos, sin } of prepared) {
      // Bring the point into the leaf's own frame, at length 1.
      const dx = x - leaf.baseX
      const dy = y - leaf.baseY
      const lx = (dx * cos + dy * sin) / leaf.length
      const ly = (-dx * sin + dy * cos) / leaf.length
      if (pointInPolygon(leaf.unitOutline, lx, ly)) here++
    }
    if (here > 0) covered++
    stacked += here
  }
  return { coverage: covered / points.length, overlap: covered > 0 ? stacked / covered : 1 }
}
