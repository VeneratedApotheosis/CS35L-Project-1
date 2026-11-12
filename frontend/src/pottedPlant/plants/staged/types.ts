import type { Pt } from "../../geometry"
import type { Range, Rng } from "../../rng"

/* ------------------------------------------------------------------ */
/* Configuration                                                       */
/* ------------------------------------------------------------------ */

/**
 * Every tunable number behind a staged, stemmed plant. Nothing in the engine
 * hard-codes a value: change it here and the plant follows. Lengths and
 * distances are in canvas units unless a field says it is a share.
 */
export interface StagedPlantConfig {
  /** Names the plant and keeps its cached results apart from other plants'. */
  name: string

  /** How many stages a plant has and how each one grows. */
  stages: {
    /** Stage count when the caller does not ask for one. */
    default: number
    /** Largest stage count a caller may ask for. */
    max: number
    /** Leaves at the first stage. */
    minLeaves: number
    /** Leaves at the last stage. No stage ever has more. */
    maxLeaves: number
    /** Shape of the leaf-count ramp. 1 is a straight line; above 1 adds leaves late. */
    leafCountCurve: number
    /** Last stage envelope divided by first stage envelope. */
    growthRatio: number
  }

  /**
   * The envelope: a half-ellipse dome that every leaf must stay inside. It
   * stands on `anchor` (the soil point) and is drawn at its largest for the
   * last stage; earlier stages are scaled copies about `anchor`.
   */
  dome: {
    anchor: { x: number; y: number }
    halfWidth: number
    height: number
  }

  /**
   * Limits no leaf outline may cross, at any stage. `floor` is the soil line.
   * The dome must fit inside these (checked by validateConfig).
   */
  limits: { left: number; right: number; floor: number }

  /** The pot rim, left to right. Stem roots are placed as a share of this width. */
  pot: { rimLeft: number; rimRight: number }

  /** Where stems start on the soil. */
  roots: {
    /** Low and high share across the pot: 0 is the left rim, 1 the right rim. */
    range: Range
    /** The share that counts as the pot's middle. */
    middle: number
    /** Step of the golden-ratio sequence that spreads roots across the range. */
    spreadStep: number
  }

  /** Layers: how far from the origin each leaf hangs. */
  layers: {
    /**
     * Bands of the 0..1 layer scale, used in turn by leaf 0, 1, 2, ... A band
     * is `start` plus up to `width`. Two far-apart bands make even a pair of
     * leaves sit at clearly different distances.
     */
    bands: readonly { start: number; width: number }[]
    /** Step of the golden-ratio sequence that varies the layer inside a band. */
    spreadStep: number
  }

  /** The stems that carry the leaves. */
  stems: {
    /** Length of the lowest and highest layer, as a share of the dome height. */
    lengthRange: Range
    /** A stem is never shorter than this share of the dome height, so it always shows. */
    minLength: number
    /** The highest layer may reach up to `lengthRange[1]` times this, if the leaf still fits. */
    reachMultiplier: number
    /** Share of the dome height the leaf and stem together may use. */
    headroomShare: number
    /** Share of a leaf's length counted against that headroom. */
    leafHeadroomShare: number
    /** Stems lean up to this many degrees from vertical, outward from the middle. */
    headingSpread: number
    /** Random turn added to each stem's heading, in degrees. */
    headingJitter: Range
    /** Where along the stem the curve bends, as a share of its length. */
    bendPoint: number
    /** While fitting, a stem may shrink to this share of its layer length. */
    shrinkFloor: number
    /** Each fitting step multiplies the stem length by this. */
    shrinkStep: number
  }

  /** The leaves themselves. */
  leaves: {
    /**
     * Range searched for leaf length, as a share of the dome height. The solver
     * picks one share at the last stage; every stage then uses that same share,
     * so leaves grow exactly as fast as the dome.
     */
    lengthRange: Range
    /** Each leaf's length is the plant's leaf length times a factor in this range. */
    lengthFactor: Range
    /** Extra outward turn of a leaf past its stem direction, in degrees. */
    curl: Range
    /** Random turn of each leaf, in degrees. */
    jitter: Range
    /** Random nudge added to draw order so equal layers do not tie. */
    drawOrderNoise: number
    /** When a leaf cannot fit, its length is multiplied by this and fitting restarts. */
    shrinkStep: number
  }

  /** What counts as lush, and how much overlap is too much. */
  coverage: {
    /** Aim to cover this share of the canopy. */
    target: number
    /** The canopy is the dome above this share of its height. */
    canopyFloor: number
    /** Sample points across the canopy. */
    gridX: number
    gridY: number
    /** On average no more than this many leaves overlap at a covered point. */
    maxOverlap: number
  }

  /** How hard the solver works. */
  search: {
    /** Leaf lengths tried per stage. */
    lengthSteps: number
    /** Points per curve when fitting a leaf outline. */
    fitSegments: number
    /** Points per curve when measuring coverage. */
    measureSegments: number
    /** Times a leaf may be shortened before the solver gives up. */
    fitAttempts: number
    /** Times a stem may be shortened per leaf length. */
    stemSteps: number
  }

  /**
   * Optional. Fans the outer leaves outward, so they look as if their face
   * points toward the middle while the blade bends away from it. Leaves in the
   * middle are untouched. Leave this out for a plant that should not fan.
   */
  fan?: {
    /**
     * A leaf is outer when its root is at least this share of the way from the
     * middle of the roots to their outer edge: 0 makes every leaf outer, 1 only
     * a leaf rooted at the very edge.
     */
    outerThreshold: number
    /** How strongly an outer leaf bends, from 0 (not at all) to 1 (fully). Drawn per leaf. */
    strength: Range
    /** Extra outward turn of an outer leaf at full strength, in degrees. Drawn per leaf. */
    turn: Range
  }

  /** Names of the random streams, so two plants never share draws. */
  rngStreams: { leaf: number }
}

/* ------------------------------------------------------------------ */
/* Plant parts                                                         */
/* ------------------------------------------------------------------ */

/** How a species draws its leaves. The engine only needs an outline to measure. */
export interface LeafShapeModel<Spec> {
  /** Draw one leaf's look from a random stream. */
  randomSpec(rng: Rng): Spec
  /**
   * The outline as a closed polygon: stalk end at (0,0), tip at (0,-length),
   * with `perSegment` points per curve.
   *
   * `fan` is how far the leaf bends outward, from -1 (fully, to the left) to 1
   * (fully, to the right). 0 or left out means no bend. A species that does not
   * fan can ignore it.
   */
  outline(spec: Spec, length: number, perSegment: number, fan?: number): Pt[]
  /** Where the leaf's middle sits along its length, as a share measured from the stalk end. */
  middle: number
}

/** A plant species: its numbers and its leaf shape. */
export interface StagedPlantSpecies<Spec> {
  config: StagedPlantConfig
  leaf: LeafShapeModel<Spec>
}

export interface PlacedLeaf<Spec> {
  /** Same index means the same leaf in every stage. */
  index: number
  spec: Spec
  /** Leaf direction in degrees from straight up, positive leans right. */
  angle: number
  /** Leaf length in canvas units. */
  length: number
  /** How far the leaf bends outward, -1 to 1: negative bends left, positive right, 0 is straight. */
  fan: number
  /** Stalk end, where the leaf is drawn from. */
  baseX: number
  baseY: number
  /** Middle of the leaf. */
  centerX: number
  centerY: number
  /** Drawing order, low first. Fixed per leaf. */
  z: number
  stem: { x0: number; y0: number; cx: number; cy: number; x1: number; y1: number }
}

export interface PlantStage<Spec> {
  /** 1-based. */
  stage: number
  /** Envelope scale about the soil point. The last stage is 1. */
  scale: number
  halfWidth: number
  height: number
  /** Average leaf length at this stage. */
  leafLength: number
  /** Share of the canopy covered by leaves, 0..1. */
  coverage: number
  /** Average number of leaves stacked at a covered point. 1 means no overlap. */
  layers: number
  leaves: PlacedLeaf<Spec>[]
}

export interface StagedPlant<Spec> {
  seed: number
  stages: PlantStage<Spec>[]
}

export interface StagedPlantOptions {
  /** Number of stages. Defaults to the species' `stages.default`. */
  stages?: number
}
