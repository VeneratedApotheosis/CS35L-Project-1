import { SOIL } from "../../genome"
import { POT_RIM } from "../../pots/shape"
import type { StagedPlantConfig } from "../staged/types"

/*
 * Every number behind the calathea (a prayer plant). Its leaves use the shared
 * stage engine, so this is a StagedPlantConfig (fields are documented on that
 * type). It is a medium-height, full, lush clump of broad oval leaves on stems,
 * laid out in vertical tiers like a peace lily: tall leaves in the back and
 * middle, mid-height leaves around them, and smaller drooping leaves low on the
 * sides (the outer leaves fan outward). There are no flowers. validateConfig
 * checks these fit together.
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
    maxLeaves: 10,
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

  // Three tiers, used by leaf 0, 1, 2, 0, ...: tall (high stems), mid, then low
  // leaves that sit near the rim. The stems below turn the layer into height.
  layers: {
    bands: [
      { start: 0.7, width: 0.3 },
      { start: 0.35, width: 0.3 },
      { start: 0, width: 0.25 },
    ],
    spreadStep: 0.7549,
  },

  // Stems from short (low leaves by the rim) to tall (the leaves in the back and middle).
  stems: {
    lengthRange: [0.08, 0.5],
    minLength: 0.06,
    reachMultiplier: 1.5,
    headroomShare: 0.94,
    leafHeadroomShare: 0.92,
    headingSpread: 30,
    headingJitter: [-8, 8],
    bendPoint: 0.6,
    shrinkFloor: 0.55,
    shrinkStep: 0.94,
  },

  // Broad ovals. Leaf sizes vary more than before, so the tall ones tower over the rest.
  leaves: {
    lengthRange: [0.26, 0.66],
    lengthFactor: [0.86, 1.12],
    curl: [4, 16],
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

  // The outer leaves fan outward like a peace lily's: they bend away from the middle and droop.
  fan: {
    outerThreshold: 0.5,
    strength: [0.75, 1],
    turn: [4, 12],
  },

  rngStreams: { leaf: 227 }, // must be unique across plants
}
