import { SOIL } from "../../genome"
import { POT_RIM } from "../../pots/shape"
import type { StagedPlantConfig } from "../staged/types"

/*
 * Every number behind the fiddle-leaf fig. Its leaves use the shared stage
 * engine, so this is a StagedPlantConfig (fields are documented on that type).
 * It is the tallest plant: a slim trunk rises from the soil and carries a
 * layered crown of up to 14 large leaves (the lower ones spread out, the higher
 * ones more upright; see `layerAngle` below). The engine's stems are not
 * drawn. Instead
 * FiddleLeafFig draws one trunk with short branches, between the leaf bases the
 * engine places, so the stems here only decide how high each leaf sits.
 * validateConfig checks these fit together.
 */

/** How far a leaf may reach past either end of the rim. */
const SIDE_OVERHANG = 8

export const FIDDLE_LEAF_FIG_CONFIG: StagedPlantConfig = {
  name: "fiddleLeafFig",

  // Up to 14 leaves (4, 6, 10, 14 over four stages): a full, layered crown.
  stages: {
    default: 4,
    max: 9,
    minLeaves: 4,
    maxLeaves: 14,
    leafCountCurve: 1.45,
    growthRatio: 3.6,
  },

  // As tall as the frame allows: the shared canvas starts 30 units above the
  // top of the soil's frame, so the soil (y 148) minus 118 reaches the top edge.
  // Slim, since the trunk is thin.
  dome: {
    anchor: { x: SOIL.x, y: SOIL.y },
    halfWidth: 50,
    height: 118,
  },

  limits: {
    left: POT_RIM.left - SIDE_OVERHANG,
    right: POT_RIM.right + SIDE_OVERHANG,
    floor: SOIL.y,
  },

  pot: { rimLeft: POT_RIM.left, rimRight: POT_RIM.right },

  // One trunk: every leaf starts close to the middle of the pot.
  roots: {
    range: [0.4, 0.6],
    middle: 0.5,
    spreadStep: 0.618,
  },

  layers: {
    bands: [
      { start: 0, width: 0.35 },
      { start: 0.3, width: 0.35 },
      { start: 0.6, width: 0.4 },
    ],
    spreadStep: 0.7549,
  },

  // The stems set the height of each leaf up the trunk. The lowest leaf sits a
  // little above the soil, so only a short stretch of trunk is bare.
  stems: {
    lengthRange: [0.15, 0.6],
    minLength: 0.12,
    reachMultiplier: 1.5,
    headroomShare: 1,
    leafHeadroomShare: 0.85,
    headingSpread: 18,
    headingJitter: [-4, 4],
    bendPoint: 0.62,
    shrinkFloor: 0.55,
    shrinkStep: 0.94,
  },

  // Layered crown: the lowest leaves point out and a little down, the highest stand nearly upright.
  layerAngle: { outward: 100, upright: 12, curve: 1.2 },

  // Large leaves. Their direction is set from their layer by `layerAngle`
  // (jitter still varies each one a little), so the curl below is replaced.
  leaves: {
    lengthRange: [0.24, 0.4],
    lengthFactor: [0.9, 1.1],
    curl: [8, 24],
    jitter: [-6, 6],
    drawOrderNoise: 0.05,
    shrinkStep: 0.9,
  },

  // The canopy is the dome above its lowest 15%, and the leaves cover about half of it.
  coverage: {
    target: 0.5,
    canopyFloor: 0.15,
    gridX: 22,
    gridY: 16,
    maxOverlap: 1.6,
  },

  search: {
    lengthSteps: 14,
    fitSegments: 8,
    measureSegments: 6,
    fitAttempts: 40,
    stemSteps: 40,
  },

  rngStreams: { leaf: 233 },
}
