import { SOIL } from "../genome"
import { POT_RIM } from "../pot/shape"
import type { StagedPlantConfig } from "../staged/types"

/*
 * Every number behind the pilea (Pilea peperomioides). Its coins use the shared
 * stage engine, so this is a StagedPlantConfig (fields are documented on that
 * type). The pilea is a rounded mound of round, flat coins on thin stalks that
 * radiate from the base, so the dome is broad, the stems lean out a lot, and
 * the coins (short, near-circular blades) are modest in length. There are no
 * flowers and no fan: the coins are held face-on. validateConfig checks these
 * fit together.
 */

/** How far a coin may reach past either end of the rim. */
const SIDE_OVERHANG = 8

export const PILEA_CONFIG: StagedPlantConfig = {
  name: "pilea",

  // Several small coins per plant, filling out a rounded cluster.
  stages: {
    default: 4,
    max: 9,
    minLeaves: 2,
    maxLeaves: 6,
    leafCountCurve: 1,
    growthRatio: 3.6,
  },

  // A broad, rounded mound: a touch wider in feel than the pothos, not as tall.
  dome: {
    anchor: { x: SOIL.x, y: SOIL.y },
    halfWidth: 52,
    height: 80,
  },

  limits: {
    left: POT_RIM.left - SIDE_OVERHANG,
    right: POT_RIM.right + SIDE_OVERHANG,
    floor: SOIL.y,
  },

  pot: { rimLeft: POT_RIM.left, rimRight: POT_RIM.right },

  // Stalks spread across the pot and fan outward, so the coins radiate.
  roots: {
    range: [0.25, 0.75],
    middle: 0.5,
    spreadStep: 0.618,
  },

  layers: {
    bands: [
      { start: 0, width: 0.4 },
      { start: 0.6, width: 0.4 },
    ],
    spreadStep: 0.7549,
  },

  // Thin stalks of different lengths that lean well outward from the middle.
  stems: {
    lengthRange: [0.24, 0.52],
    minLength: 0.18,
    reachMultiplier: 1.3,
    headroomShare: 0.92,
    leafHeadroomShare: 0.92,
    headingSpread: 30,
    headingJitter: [-8, 8],
    bendPoint: 0.5,
    shrinkFloor: 0.55,
    shrinkStep: 0.94,
  },

  // Round coins: short, near-circular blades with a little size and tilt variety.
  leaves: {
    lengthRange: [0.32, 0.58],
    lengthFactor: [0.85, 1.12],
    curl: [0, 12],
    jitter: [-14, 14],
    drawOrderNoise: 0.05,
    shrinkStep: 0.9,
  },

  // Solid coins fill the canopy readily, so aim high but allow some stacking.
  coverage: {
    target: 0.65,
    canopyFloor: 0.2,
    gridX: 22,
    gridY: 16,
    maxOverlap: 1.7,
  },

  search: {
    lengthSteps: 14,
    fitSegments: 8,
    measureSegments: 6,
    fitAttempts: 40,
    stemSteps: 40,
  },

  rngStreams: { leaf: 211 },
}
