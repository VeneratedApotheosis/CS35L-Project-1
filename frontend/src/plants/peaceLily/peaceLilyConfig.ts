import { SOIL } from "../genome"
import { POT_RIM } from "../pot/shape"
import type { StagedPlantConfig } from "../staged/types"
import type { BladeShape } from "./shape"
import type { FlowerConfig } from "./flowers"

/*
 * Every number behind the peace lily. The leaves use the shared stage engine,
 * so LEAF_CONFIG is a StagedPlantConfig (fields are documented on that type).
 * The flowers are the peace lily's own, so FLOWER_CONFIG is documented in
 * ./flowers.ts.
 */

/** How far a leaf may reach past either end of the rim. */
const SIDE_OVERHANG = 8

export const PEACE_LILY_CONFIG: StagedPlantConfig = {
  name: "peace-lily",

  stages: {
    default: 4,
    max: 9,
    minLeaves: 2,
    maxLeaves: 6,
    leafCountCurve: 1.15,
    growthRatio: 3.6,
  },

  // The leaf dome. The flowers use a taller one (FLOWER_CONFIG.reach).
  dome: {
    anchor: { x: SOIL.x, y: SOIL.y },
    halfWidth: 56,
    height: 84,
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
    lengthRange: [0.08, 0.4],
    minLength: 0.06,
    reachMultiplier: 1.5,
    headroomShare: 0.9,
    leafHeadroomShare: 0.9,
    headingSpread: 30,
    headingJitter: [-8, 8],
    bendPoint: 0.62,
    shrinkFloor: 0.55,
    shrinkStep: 0.94,
  },

  leaves: {
    lengthRange: [0.21, 0.68],
    lengthFactor: [0.9, 1.1],
    curl: [4, 16],
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

  rngStreams: { leaf: 61 },
}

/** The hood of an open flower: broad, with a drawn-out tip. */
export const BLOOM_SHAPE: BladeShape = {
  aspect: 0.58,
  peak: 0.4,
  baseTaper: 0.9,
  tipTaper: 1.35,
  bow: 0.04,
  asym: 0,
}

/** The hood of a closed bud: slim and upright. */
export const BUD_SHAPE: BladeShape = {
  aspect: 0.26,
  peak: 0.42,
  baseTaper: 0.8,
  tipTaper: 1.2,
  bow: 0.02,
  asym: 0,
}

export const FLOWER_CONFIG: FlowerConfig = {
  // Counted in stages from 1. A plant with fewer stages never reaches them.
  budStage: 3,
  bloomStage: 4,

  count: [1, 3],

  // The flower dome is the leaf dome stretched upward, so flowers stand above the leaves.
  reach: { width: 1, height: 1.75 },

  // Length of the flower head as a share of the leaf dome height, and each flower's own factor.
  headLength: 0.5,
  lengthFactor: [0.92, 1.08],
  // How much wider or slimmer a flower's hood is than the base shape.
  widthFactor: [0.92, 1.08],

  // Height of the head's base as a share of the flower dome height.
  baseHeight: [0.56, 0.7],
  // How far from the middle the outermost heads sit, as a share of the dome half width.
  slotSpread: 0.52,
  // Random sideways nudge of a head, as a share of the dome half width.
  slotJitter: 0.06,
  // Share of the way to its head that a stalk's root sits from the middle of the pot.
  rootFollow: 0.5,
  // Where a stalk bends, as a share of its rise.
  stalkBend: 0.72,
  // Random tilt added to the stalk's direction at the head, in degrees.
  headTilt: [-10, 10],
  // Tilt of the spadix inside an open hood, in degrees.
  spadixTilt: [-8, 8],

  // Fitting inside the flower dome: how many tries, and what changes between them.
  fitAttempts: 40,
  pullIn: 0.96,
  lowerStep: 0.02,
  shrinkStep: 0.985,

  rngStream: 77,
}
