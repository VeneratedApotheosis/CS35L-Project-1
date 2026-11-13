import { SOIL } from "../../genome"
import { POT_RIM } from "../../pots/shape"
import type { StagedPlantConfig } from "../staged/types"

/*
 * Every number behind the snake plant. Its leaves use the shared stage engine,
 * so this is a StagedPlantConfig (fields are documented on that type). The
 * snake plant is tall and narrow with stiff, upright swords, so the dome is
 * tall and slim, the stems are short (leaves rise straight from the soil), and
 * the leaves barely lean. There are no flowers and no fan.
 */

/** How far a leaf may reach past either end of the rim. */
const SIDE_OVERHANG = 8

/**
 * The snake plant's blades are planted straight into the soil rather than
 * sitting on visible stems. Each blade's base is seated this share of its
 * length below the soil line and clipped away, so it reads as planted into the
 * dirt. This drives the engine's opt-in `planting` drawing; plants without it
 * are unaffected.
 */
export const SNAKE_PLANTING = { bury: 0.1 }

export const SNAKE_PLANT_CONFIG: StagedPlantConfig = {
  name: "snake-plant",

  stages: {
    default: 4,
    max: 9,
    minLeaves: 2,
    maxLeaves: 5,
    leafCountCurve: 1.1,
    growthRatio: 3.6,
  },

  // Tall and slim: snake plants stand well above the pot and stay narrow.
  dome: {
    anchor: { x: SOIL.x, y: SOIL.y },
    halfWidth: 42,
    height: 116,
  },

  limits: {
    left: POT_RIM.left - SIDE_OVERHANG,
    right: POT_RIM.right + SIDE_OVERHANG,
    floor: SOIL.y,
  },

  pot: { rimLeft: POT_RIM.left, rimRight: POT_RIM.right },

  // The leaves cluster near the middle and rise as a fan of blades.
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

  // Near-zero stems: snake leaves emerge straight from the soil, so their bases
  // sit on the soil line and are then planted into it (see SNAKE_PLANTING). No
  // stem is drawn; these lengths only seat the base on the soil.
  stems: {
    lengthRange: [0.005, 0.02],
    minLength: 0.005,
    reachMultiplier: 1.2,
    headroomShare: 0.95,
    leafHeadroomShare: 0.95,
    headingSpread: 16,
    headingJitter: [-4, 4],
    bendPoint: 0.5,
    shrinkFloor: 0.55,
    shrinkStep: 0.94,
  },

  // Long swords that reach most of the way up the tall dome.
  leaves: {
    lengthRange: [0.5, 0.95],
    lengthFactor: [0.9, 1.1],
    curl: [0, 6],
    jitter: [-5, 5],
    drawOrderNoise: 0.05,
    shrinkStep: 0.9,
  },

  // Upright blades never fill a canopy densely, so the target is modest.
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

  rngStreams: { leaf: 131 },
}
