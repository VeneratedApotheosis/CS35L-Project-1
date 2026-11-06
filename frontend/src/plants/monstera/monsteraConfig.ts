import { SOIL } from "../genome"
import { POT_RIM } from "../pot/shape"
import type { StagedPlantConfig } from "../staged/types"

/*
 * Every number behind the Monstera deliciosa. Its leaves use the shared stage
 * engine, so this is a StagedPlantConfig (fields are documented on that type).
 * The monstera has a few large, broad leaves, so the leaf cap is low, the
 * leaves are long and the leaf-length search aims for a modest coverage so each
 * big leaf stays readable. There are no flowers. Its outer leaves fan out so the
 * plant splays at its sides instead of standing bunched. validateConfig checks
 * these fit together.
 */

/** How far a leaf may reach past either end of the rim. */
const SIDE_OVERHANG = 8

export const MONSTERA_CONFIG: StagedPlantConfig = {
  name: "monstera",

  // Few, large leaves: the cap is low so each broad blade reads clearly.
  stages: {
    default: 4,
    max: 9,
    minLeaves: 2,
    maxLeaves: 5,
    leafCountCurve: 1.15,
    growthRatio: 3.6,
  },

  // Broad and a touch shorter than the pothos, to suit wide leaves.
  dome: {
    anchor: { x: SOIL.x, y: SOIL.y },
    halfWidth: 56,
    height: 96,
  },

  limits: {
    left: POT_RIM.left - SIDE_OVERHANG,
    right: POT_RIM.right + SIDE_OVERHANG,
    floor: SOIL.y,
  },

  pot: { rimLeft: POT_RIM.left, rimRight: POT_RIM.right },

  roots: {
    range: [0.28, 0.72],
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

  // The tall end of the stem range is ~30% longer than before (0.5 -> 0.65), so
  // the highest leaves stand taller; the low layers (lengthRange[0]) are
  // unchanged. headroomShare is opened to 1 so those taller stems actually reach
  // up under the dome instead of being capped early, while the fitter still
  // keeps every leaf inside the dome.
  stems: {
    lengthRange: [0.12, 0.65],
    minLength: 0.1,
    reachMultiplier: 1.4,
    headroomShare: 1,
    leafHeadroomShare: 0.9,
    headingSpread: 30,
    headingJitter: [-7, 7],
    bendPoint: 0.6,
    shrinkFloor: 0.55,
    shrinkStep: 0.94,
  },

  // Large blades: long, with a gentle outward turn.
  leaves: {
    lengthRange: [0.3, 0.72],
    lengthFactor: [0.9, 1.1],
    curl: [8, 22],
    jitter: [-6, 6],
    drawOrderNoise: 0.05,
    shrinkStep: 0.9,
  },

  // A few big leaves pack the canopy loosely; aim as high as the pothos so even
  // the two-leaf first stage reads as filled.
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

  // Fan the outer half of the leaves outward, so the plant splays at its sides.
  // Outer leaves bend away from the middle and turn a few extra degrees; the
  // fitter shortens any that would cross the side limits.
  fan: {
    outerThreshold: 0.5,
    strength: [0.5, 0.8],
    turn: [6, 12],
  },

  rngStreams: { leaf: 97 },
}
