import { SOIL } from "../../genome"
import { POT_RIM } from "../../pots/shape"
import type { StagedPlantConfig } from "../staged/types"

/*
 * Every number behind the Philodendron 'Sun Red' / Rojo Congo. Its leaves use
 * the shared stage engine, so this is a StagedPlantConfig (fields are documented
 * on that type). It has a few broad paddle leaves in an upright crown that fans
 * outward: the inner leaves stand up and the outer half arches away. There are
 * no flowers. validateConfig checks these fit together.
 */

/** How far a leaf may reach past either end of the rim. */
const SIDE_OVERHANG = 8

export const PHILODENDRON_CONFIG: StagedPlantConfig = {
  name: "philodendron",

  // A few broad leaves: the cap is low so each paddle reads clearly.
  stages: {
    default: 4,
    max: 9,
    minLeaves: 2,
    maxLeaves: 5,
    leafCountCurve: 1.15,
    growthRatio: 3.6,
  },

  // Tall and upright, for a standing crown of paddle leaves.
  dome: {
    anchor: { x: SOIL.x, y: SOIL.y },
    halfWidth: 54,
    height: 100,
  },

  limits: {
    left: POT_RIM.left - SIDE_OVERHANG,
    right: POT_RIM.right + SIDE_OVERHANG,
    floor: SOIL.y,
  },

  pot: { rimLeft: POT_RIM.left, rimRight: POT_RIM.right },

  roots: {
    range: [0.3, 0.7],
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

  // Thick, tall petioles that stand the leaves up in a crown. headroomShare is
  // opened to 1 so the highest leaves reach up under the dome; the fitter still
  // keeps every leaf inside it.
  stems: {
    lengthRange: [0.14, 0.62],
    minLength: 0.11,
    reachMultiplier: 1.4,
    headroomShare: 1,
    leafHeadroomShare: 0.9,
    headingSpread: 26,
    headingJitter: [-6, 6],
    bendPoint: 0.62,
    shrinkFloor: 0.55,
    shrinkStep: 0.94,
  },

  // Broad paddle blades: long, standing fairly upright with a gentle turn.
  leaves: {
    lengthRange: [0.34, 0.68],
    lengthFactor: [0.9, 1.1],
    curl: [4, 16],
    jitter: [-5, 5],
    drawOrderNoise: 0.05,
    shrinkStep: 0.9,
  },

  // A few big blades pack the canopy loosely; aim as high as the pothos so even
  // the two-leaf first stage reads as filled.
  coverage: {
    target: 0.66,
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

  // Fan the outer half of the leaves outward, so the crown splays while the
  // inner leaves - the newest, reddest ones - stand upright in the middle.
  fan: {
    outerThreshold: 0.45,
    strength: [0.5, 0.85],
    turn: [6, 14],
  },

  rngStreams: { leaf: 73 },
}
