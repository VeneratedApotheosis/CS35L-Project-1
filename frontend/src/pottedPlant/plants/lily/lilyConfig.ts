import { SOIL } from "../../genome"
import type { FlowerConfig } from "../peaceLily/flowers"
import type { BladeShape } from "../peaceLily/shape"
import { POT_RIM } from "../../pots/shape"
import type { StagedPlantConfig } from "../staged/types"

/*
 * Every number behind the lily. The leaves use the shared stage engine
 * (LILY_CONFIG); the flowers reuse the peace lily's placement engine
 * (../peaceLily/flowers) with the lily's own shapes and a custom drawing
 * (./Flower). BLOOM_SHAPE is the bounding blade the placer fits inside the
 * dome; the open star of petals is drawn within it.
 */

/** How far a leaf may reach past either end of the rim. */
const SIDE_OVERHANG = 8

export const LILY_CONFIG: StagedPlantConfig = {
  name: "lily",

  stages: {
    default: 4,
    max: 9,
    minLeaves: 2,
    maxLeaves: 7,
    leafCountCurve: 1.15,
    growthRatio: 3.6,
  },

  dome: {
    anchor: { x: SOIL.x, y: SOIL.y },
    halfWidth: 52,
    height: 90,
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
    lengthRange: [0.06, 0.34],
    minLength: 0.05,
    reachMultiplier: 1.5,
    headroomShare: 0.9,
    leafHeadroomShare: 0.9,
    headingSpread: 28,
    headingJitter: [-8, 8],
    bendPoint: 0.6,
    shrinkFloor: 0.55,
    shrinkStep: 0.94,
  },

  leaves: {
    lengthRange: [0.26, 0.62],
    lengthFactor: [0.9, 1.1],
    curl: [4, 14],
    jitter: [-6, 6],
    drawOrderNoise: 0.05,
    shrinkStep: 0.9,
  },

  coverage: {
    target: 0.58,
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

  fan: {
    outerThreshold: 0.5,
    strength: [0.7, 1],
    turn: [8, 16],
  },

  rngStreams: { leaf: 67 },
}

/** The bounding blade for an open bloom: a wide, rounded disk the star fits inside. */
export const BLOOM_SHAPE: BladeShape = {
  aspect: 1.02,
  peak: 0.5,
  baseTaper: 0.85,
  tipTaper: 0.9,
  bow: 0,
  asym: 0,
}

/** A closed bud: a slim, pointed teardrop. */
export const BUD_SHAPE: BladeShape = {
  aspect: 0.3,
  peak: 0.52,
  baseTaper: 0.85,
  tipTaper: 1.4,
  bow: 0.02,
  asym: 0,
}

export const FLOWER_CONFIG: FlowerConfig = {
  budStage: 3,
  bloomStage: 4,
  count: [1, 3],
  reach: { width: 1, height: 1.7 },
  headLength: 0.46,
  lengthFactor: [0.92, 1.08],
  widthFactor: [0.95, 1.05],
  height: [0.6, 1.1],
  maxSpread: 26,
  slotJitter: 3,
  rootFollow: 0.5,
  stalkBend: 0.72,
  maxLean: 28,
  headTilt: [-8, 8],
  spadixTilt: [-6, 6],
  fitAttempts: 40,
  pullIn: 0.96,
  lowerStep: 0.02,
  shrinkStep: 0.985,
  rngStream: 83,
}
