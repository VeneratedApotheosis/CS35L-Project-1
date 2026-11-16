import { SOIL } from "../../genome"
import { POT_RIM } from "../../pots/shape"
import type { StagedPlantConfig } from "../staged/types"

/*
 * Every number behind the string of pearls. To retune the plant, change it
 * here; the engine in ./staged never hard-codes a value. Field meanings are
 * documented on StagedPlantConfig. validateConfig checks these fit together.
 *
 * A strand is long compared with the dome: the dome is only as tall as the
 * strands rise, and the hang setting lets them fall past the soil line over the pot rim.
 */

/** How far a strand may reach past either end of the rim. */
const SIDE_OVERHANG = 8

/** How far below the soil a strand may hang at the last stage. The pot body ends at about 52 below the soil. */
const HANG_DEPTH = 56

export const STRING_OF_PEARLS_CONFIG: StagedPlantConfig = {
  name: "string_of_pearls",

  stages: {
    default: 4,
    max: 9,
    minLeaves: 2,
    maxLeaves: 8,
    leafCountCurve: 1.15,
    growthRatio: 3.6,
  },

  dome: {
    anchor: { x: SOIL.x, y: SOIL.y },
    halfWidth: 56,
    height: 18,
  },

  hang: { depth: HANG_DEPTH },

  limits: {
    left: POT_RIM.left - SIDE_OVERHANG,
    right: POT_RIM.right + SIDE_OVERHANG,
    floor: SOIL.y + HANG_DEPTH,
  },

  pot: { rimLeft: POT_RIM.left, rimRight: POT_RIM.right },

  roots: {
    range: [0.04, 0.96],
    middle: 0.5,
    spreadStep: 0.618,
  },

  layers: {
    bands: [
      { start: 0, width: 0.5 },
      { start: 0.5, width: 0.5 },
    ],
    spreadStep: 0.7549,
  },

  stems: {
    lengthRange: [0.06, 0.25],
    minLength: 0.05,
    reachMultiplier: 1.5,
    headroomShare: 0.9,
    leafHeadroomShare: 0,
    headingSpread: 30,
    headingJitter: [-8, 8],
    bendPoint: 0.62,
    shrinkFloor: 0.55,
    shrinkStep: 0.94,
  },

  leaves: {
    lengthRange: [4.2, 4.2],
    lengthFactor: [0.85, 1.1],
    curl: [5, 14],
    jitter: [-3, 3],
    drawOrderNoise: 0.05,
    shrinkStep: 0.92,
  },

  coverage: {
    target: 0,
    canopyFloor: 0,
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

  rngStreams: { leaf: 229 },
}
