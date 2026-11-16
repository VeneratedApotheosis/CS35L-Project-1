import type { Pt } from "../../geometry"
import type { StagedPlantConfig } from "./types"

/** A half-ellipse standing on `anchor`. Every leaf of a stage must stay inside it. */
export interface Dome {
  anchor: { x: number; y: number }
  halfWidth: number
  height: number
  /** How far below the anchor a leaf may hang. Missing or 0 for a plant that stays above the soil. */
  depth?: number
}

/** The config's dome scaled about its anchor, which is how a stage grows. */
export function domeAtScale(config: StagedPlantConfig, scale: number): Dome {
  return {
    anchor: config.dome.anchor,
    halfWidth: config.dome.halfWidth * scale,
    height: config.dome.height * scale,
    depth: (config.hang?.depth ?? 0) * scale,
  }
}

/**
 * 0 at the anchor, 1 on the dome's edge, above 1 outside it. Above the anchor
 * the edge is a half-ellipse. Below it, a dome with a depth is a box as wide as
 * the dome (the two meet at the anchor line); one with no depth is the full ellipse.
 */
export function domeValue(dome: Dome, x: number, y: number): number {
  if (dome.depth !== undefined && dome.depth > 0 && y > dome.anchor.y) {
    return Math.max(((x - dome.anchor.x) / dome.halfWidth) ** 2, ((y - dome.anchor.y) / dome.depth) ** 2)
  }
  return ((x - dome.anchor.x) / dome.halfWidth) ** 2 + ((dome.anchor.y - y) / dome.height) ** 2
}

/**
 * Sample points across the canopy: the part of the dome above `canopyFloor`
 * (a share of its height). Used to measure how well leaves fill the space.
 */
export function canopyPoints(dome: Dome, settings: StagedPlantConfig["coverage"]): Pt[] {
  const { gridX, gridY, canopyFloor } = settings
  const pts: Pt[] = []
  for (let iy = 0; iy < gridY; iy++) {
    for (let ix = 0; ix < gridX; ix++) {
      const x = dome.anchor.x - dome.halfWidth + ((ix + 0.5) / gridX) * 2 * dome.halfWidth
      const y = dome.anchor.y - dome.height * (canopyFloor + ((1 - canopyFloor) * (iy + 0.5)) / gridY)
      if (domeValue(dome, x, y) <= 1) pts.push([x, y])
    }
  }
  return pts
}
