import { SOIL } from "../../genome"
import { POT_RIM } from "../../pots/shape"
import type { StagedPlantConfig } from "../staged/types"

/*
 * Every number behind the calathea (a prayer plant). Its leaves use the shared
 * stage engine, so this is a StagedPlantConfig (fields are documented on that
 * type). It is a medium-height, full, lush clump of broad oval leaves on stems:
 * lower and wider than the pilea's mound, with the leaves held fairly upright and
 * overlapping a little. There are no flowers and no fan. validateConfig checks
 * these fit together.
 */

/** How far a leaf may reach past either end of the rim. */
const SIDE_OVERHANG = 8

export const CALATHEA_CONFIG: StagedPlantConfig = {
  name: "calathea",

  // Several broad leaves per plant, to fill out a lush clump.
  stages: {
    default: 4,
    max: 9,
    minLeaves: 2,
    maxLeaves: 7,
    leafCountCurve: 1.1,
    growthRatio: 3.6,
  },

  // Medium height and wide: a full, low-ish clump.
  dome: {
    anchor: { x: SOIL.x, y: SOIL.y },
    halfWidth: 56,
    height: 88,
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

  // Fairly short stems that lean out a little, so the leaves sit close and full.
  stems: {
    lengthRange: [0.16, 0.5],
    minLength: 0.12,
    reachMultiplier: 1.4,
    headroomShare: 0.94,
    leafHeadroomShare: 0.92,
    headingSpread: 30,
    headingJitter: [-8, 8],
    bendPoint: 0.6,
    shrinkFloor: 0.55,
    shrinkStep: 0.94,
  },

  // Broad ovals, held fairly upright with a gentle outward turn.
  leaves: {
    lengthRange: [0.34, 0.62],
    lengthFactor: [0.88, 1.1],
    curl: [6, 20],
    jitter: [-8, 8],
    drawOrderNoise: 0.05,
    shrinkStep: 0.9,
  },

  // Lush: aim high and allow the broad leaves to overlap.
  coverage: {
    target: 0.7,
    canopyFloor: 0.2,
    gridX: 22,
    gridY: 16,
    maxOverlap: 1.8,
  },

  search: {
    lengthSteps: 14,
    fitSegments: 8,
    measureSegments: 6,
    fitAttempts: 40,
    stemSteps: 40,
  },

  rngStreams: { leaf: 227 }, // must be unique across plants
}
