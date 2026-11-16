import { SOIL } from "../../genome"
import { POT_RIM } from "../../pots/shape"
import type { StagedPlantConfig } from "../staged/types"

/*
 * Every number behind the spider plant (Chlorophytum comosum). Its blades use
 * the shared stage engine, so this is a StagedPlantConfig (fields are
 * documented on that type). The spider plant is a full, medium-height
 * fountain: many long, thin blades rise from the crown and every one of them
 * arches outward and droops at the tip. So the dome is wide and only medium
 * tall, the stems are very short, the blades lean little at the base, and the
 * `fan` section arches every blade (outerThreshold 0). It carries the most
 * blades of any plant (`stages.maxLeaves`). There are no flowers.
 */

/** How far a blade may reach past either end of the rim. */
const SIDE_OVERHANG = 8

export const SPIDER_PLANT_CONFIG: StagedPlantConfig = {
  name: "spider-plant",

  // A full fountain: 3, 7, 10, 14 blades over four stages.
  stages: {
    default: 4,
    max: 9,
    minLeaves: 3,
    maxLeaves: 14,
    leafCountCurve: 1,
    growthRatio: 3.6,
  },

  // Medium height and wide, so the arching blades have room to spill outward.
  dome: {
    anchor: { x: SOIL.x, y: SOIL.y },
    halfWidth: 56,
    height: 104,
  },

  limits: {
    left: POT_RIM.left - SIDE_OVERHANG,
    right: POT_RIM.right + SIDE_OVERHANG,
    floor: SOIL.y,
  },

  pot: { rimLeft: POT_RIM.left, rimRight: POT_RIM.right },

  // The blades all start close to the middle of the pot, in a tight crown.
  roots: {
    range: [0.35, 0.65],
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

  // Very short stems: blades come straight out of the crown.
  stems: {
    lengthRange: [0.02, 0.1],
    minLength: 0.015,
    reachMultiplier: 1.2,
    headroomShare: 0.95,
    leafHeadroomShare: 0.95,
    headingSpread: 22,
    headingJitter: [-5, 5],
    bendPoint: 0.5,
    shrinkFloor: 0.55,
    shrinkStep: 0.94,
  },

  // Long blades that rise, then arch over toward the rim.
  leaves: {
    lengthRange: [0.8, 1.5],
    lengthFactor: [0.85, 1.1],
    curl: [0, 6],
    jitter: [-5, 5],
    drawOrderNoise: 0.05,
    shrinkStep: 0.92,
  },

  // Thin blades never fill a canopy densely, so the target is modest.
  coverage: {
    target: 0.4,
    canopyFloor: 0.2,
    gridX: 22,
    gridY: 16,
    maxOverlap: 2.2,
  },

  search: {
    lengthSteps: 14,
    fitSegments: 8,
    measureSegments: 6,
    fitAttempts: 40,
    stemSteps: 40,
  },

  // Every blade arches (outerThreshold 0): it bends away from the middle, and
  // the bend carries the tip down into a droop.
  fan: {
    outerThreshold: 0,
    strength: [0.45, 1],
    turn: [4, 10],
  },

  rngStreams: { leaf: 223 },
}
