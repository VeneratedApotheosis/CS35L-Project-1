import { SOIL } from "../../genome"
import { POT_RIM } from "../../pots/shape"
import type { StagedPlantConfig } from "../staged/types"

/*
 * Every number behind the Kimberly Queen fern (Nephrolepis obliterata). Its
 * fronds use the shared stage engine, so this is a StagedPlantConfig (fields
 * are documented on that type). The fern is an upright crown of tall, gently
 * arching sword fronds, so the dome is tall and slim like the snake plant's,
 * the stems are short (fronds rise from a crown), the fronds barely lean, and
 * they arch outward through their curl. It carries a full crown of fronds
 * (`stages.maxLeaves`), and its outer fronds fan outward (the `fan` section)
 * so the crown spreads wider. There are no flowers.
 */

/** How far a frond may reach past either end of the rim. */
const SIDE_OVERHANG = 8

export const KIMBERLY_QUEEN_CONFIG: StagedPlantConfig = {
  name: "kimberly-queen",

  // A full crown: 3, 6, 9, 12 fronds over four stages (a straight ramp).
  stages: {
    default: 4,
    max: 9,
    minLeaves: 3,
    maxLeaves: 12,
    leafCountCurve: 1,
    growthRatio: 3.6,
  },

  // Tall and slim, but a little wider so the doubled crown and the fanned
  // outer fronds have room to spread (still inside the side limits).
  dome: {
    anchor: { x: SOIL.x, y: SOIL.y },
    halfWidth: 52,
    height: 118,
  },

  limits: {
    left: POT_RIM.left - SIDE_OVERHANG,
    right: POT_RIM.right + SIDE_OVERHANG,
    floor: SOIL.y,
  },

  pot: { rimLeft: POT_RIM.left, rimRight: POT_RIM.right },

  // The fronds spread across the middle of the pot and rise as an upright crown.
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

  // Short stems: fronds emerge almost straight from the crown and stand up.
  stems: {
    lengthRange: [0.03, 0.14],
    minLength: 0.02,
    reachMultiplier: 1.2,
    headroomShare: 0.95,
    leafHeadroomShare: 0.95,
    headingSpread: 18,
    headingJitter: [-4, 4],
    bendPoint: 0.5,
    shrinkFloor: 0.55,
    shrinkStep: 0.94,
  },

  // Long fronds that reach most of the way up the tall dome and arch outward.
  leaves: {
    lengthRange: [0.5, 0.95],
    lengthFactor: [0.9, 1.1],
    curl: [4, 14],
    jitter: [-5, 5],
    drawOrderNoise: 0.05,
    shrinkStep: 0.9,
  },

  // Feathery fronds never fill a canopy densely, so the target is modest.
  coverage: {
    target: 0.45,
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

  // The outer fronds fan outward: they bend away from the middle and turn a few
  // extra degrees, so the crown fans wider. Inner fronds stay upright.
  fan: {
    outerThreshold: 0.5,
    strength: [0.7, 1],
    turn: [6, 14],
  },

  rngStreams: { leaf: 181 },
}
