import { SOIL } from "../../genome"
import { POT_RIM } from "../../pots/shape"
import type { StagedPlantConfig } from "../staged/types"

/*
 * Every number behind the pothos. To retune the plant, change it here; the
 * engine in ./staged never hard-codes a value. Field meanings are documented
 * on StagedPlantConfig. validateConfig checks these fit together.
 */

/** How far a leaf may reach past either end of the rim. */
const SIDE_OVERHANG = 8

export const POTHOS_CONFIG: StagedPlantConfig = {
  name: "pothos",

  stages: {
    default: 4,
    max: 9,
    minLeaves: 2,
    maxLeaves: 6,
    leafCountCurve: 1.15,
    growthRatio: 3.6,
  },

  dome: {
    anchor: { x: SOIL.x, y: SOIL.y },
    halfWidth: 56,
    height: 101.4, // 30% taller than the original 78
  },

  limits: {
    left: POT_RIM.left - SIDE_OVERHANG,
    right: POT_RIM.right + SIDE_OVERHANG,
    floor: SOIL.y,
  },

  pot: { rimLeft: POT_RIM.left, rimRight: POT_RIM.right },

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

  stems: {
    lengthRange: [0.16, 0.62],
    minLength: 0.12,
    reachMultiplier: 1.5,
    headroomShare: 0.9,
    leafHeadroomShare: 0.9,
    headingSpread: 34,
    headingJitter: [-8, 8],
    bendPoint: 0.62,
    shrinkFloor: 0.55,
    shrinkStep: 0.94,
  },

  leaves: {
    lengthRange: [0.16, 0.55],
    lengthFactor: [0.92, 1.08],
    curl: [10, 28],
    jitter: [-6, 6],
    drawOrderNoise: 0.05,
    shrinkStep: 0.9,
  },

  coverage: {
    target: 0.6,
    canopyFloor: 0.2,
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

  rngStreams: { leaf: 51 },
}
