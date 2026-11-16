import { SOIL } from "../../genome"
import type { FlowerConfig } from "../peaceLily/flowers"
import type { BladeShape } from "../peaceLily/shape"
import { POT_RIM } from "../../pots/shape"
import type { StagedPlantConfig } from "../staged/types"

/*
 * Every number behind the rose. The leaves use the shared stage engine
 * (ROSE_CONFIG); the flowers reuse the peace lily's placement engine
 * (../peaceLily/flowers) with the rose's own shapes and a custom drawing
 * (./Flower) that stacks rings of petals. BLOOM_SHAPE is the bounding blade the
 * placer fits inside the dome; the layered bloom is drawn within it.
 */

/** How far a leaf may reach past either end of the rim. */
const SIDE_OVERHANG = 8

export const ROSE_CONFIG: StagedPlantConfig = {
  name: "rose",

  stages: {
    default: 4,
    max: 9,
    minLeaves: 2,
    maxLeaves: 8,
    leafCountCurve: 1.15,
    growthRatio: 3.6,
  },

  // Broad and bushy, a little shorter than the tall plants.
  dome: {
    anchor: { x: SOIL.x, y: SOIL.y },
    halfWidth: 54,
    height: 86,
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
    lengthRange: [0.1, 0.5],
    minLength: 0.08,
    reachMultiplier: 1.5,
    headroomShare: 0.9,
    leafHeadroomShare: 0.9,
    headingSpread: 36,
    headingJitter: [-8, 8],
    bendPoint: 0.6,
    shrinkFloor: 0.55,
    shrinkStep: 0.94,
  },

  leaves: {
    lengthRange: [0.2, 0.5],
    lengthFactor: [0.9, 1.1],
    curl: [8, 24],
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

  rngStreams: { leaf: 53 },
}

/** The bounding blade for an open bloom: a wide, rounded disk the rings fit inside. */
export const BLOOM_SHAPE: BladeShape = {
  aspect: 1.04,
  peak: 0.5,
  baseTaper: 0.9,
  tipTaper: 0.92,
  bow: 0,
  asym: 0,
}

/** A closed bud: a plump teardrop. */
export const BUD_SHAPE: BladeShape = {
  aspect: 0.52,
  peak: 0.5,
  baseTaper: 0.7,
  tipTaper: 1.1,
  bow: 0.02,
  asym: 0,
}

export const FLOWER_CONFIG: FlowerConfig = {
  budStage: 3,
  bloomStage: 4,
  count: [1, 3],
  reach: { width: 1, height: 1.55 },
  headLength: 0.42,
  lengthFactor: [0.92, 1.08],
  widthFactor: [0.95, 1.05],
  height: [0.55, 1.0],
  maxSpread: 24,
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
  rngStream: 89,
}
