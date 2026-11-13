import type { Pt } from "../../geometry"
import { lerp, mulberry32, range } from "../../rng"
import { subSeed } from "../../genome"
import type { StagedPlantSpecies } from "./types"

/**
 * Everything about one leaf that is decided once per seed and then shared by
 * every stage. Stages only change how big the plant is, never who a leaf is.
 */
export interface Gene<Spec> {
  index: number
  spec: Spec
  /** Small length variation between leaves. */
  lengthFactor: number
  /** Where the stem starts across the pot, inside `roots.range`. */
  rootShare: number
  /** Which layer the leaf hangs in: 0 is nearest the soil, 1 the highest. */
  layer: number
  /** Stem direction in degrees from vertical. */
  heading: number
  /** Extra outward turn of the leaf past the stem direction. */
  curl: number
  /** Small random turn of the leaf. */
  jitter: number
  /** Drawing order, low first. */
  drawOrder: number
  /** How far the leaf bends outward, -1 to 1. 0 for every leaf that is not an outer leaf. */
  fan: number
  /** Outline at length 1, for measuring coverage. */
  measureOutline: Pt[]
  /** Outline at length 1, for fitting the leaf inside the dome. */
  fitOutline: Pt[]
}

/** The two random offsets that start the golden-ratio sequences for a plant. */
export interface SequencePhases {
  roots: number
  layers: number
}

/** Fraction part of a golden-ratio style sequence: even spread for any run of indices. */
const sequence = (index: number, step: number, phase: number) => (index * step + phase) % 1

export function makeGene<Spec>(
  seed: number,
  index: number,
  phases: SequencePhases,
  species: StagedPlantSpecies<Spec>,
): Gene<Spec> {
  const { config, leaf } = species
  const { roots, layers, stems, search } = config

  // Each leaf has its own random stream, so adding or removing leaves never
  // changes the others. Draw order below is part of the plant's identity.
  const lr = mulberry32(subSeed(seed, index, config.rngStreams.leaf))
  const spec = leaf.randomSpec(lr)
  const lengthFactor = range(lr, config.leaves.lengthFactor[0], config.leaves.lengthFactor[1])

  // Roots and layers each follow their own golden-ratio sequence, so any run
  // of leaves is spread across the pot and across the layers at once.
  const rootShare = lerp(roots.range[0], roots.range[1], sequence(index, roots.spreadStep, phases.roots))
  const band = layers.bands[index % layers.bands.length]
  const layer = band.start + band.width * sequence(index, layers.spreadStep, phases.layers)

  // Stems left of the middle lean left, stems right of it lean right.
  const rootHalfWidth = (roots.range[1] - roots.range[0]) / 2
  const heading =
    ((rootShare - roots.middle) / rootHalfWidth) * stems.headingSpread +
    range(lr, stems.headingJitter[0], stems.headingJitter[1])
  const side = heading >= 0 ? 1 : -1
  let curl = side * range(lr, config.leaves.curl[0], config.leaves.curl[1])
  const jitter = range(lr, config.leaves.jitter[0], config.leaves.jitter[1])

  // Lower layers are drawn on top; a little noise stops equal layers tying.
  const drawOrder = 1 - layer + lr() * config.leaves.drawOrderNoise

  // Outer leaves fan outward. These draws come last, and only when the plant
  // fans, so a plant without `fan` is exactly as it was before.
  let fan = 0
  if (config.fan) {
    const strength = range(lr, config.fan.strength[0], config.fan.strength[1])
    const turn = range(lr, config.fan.turn[0], config.fan.turn[1])
    const outward = Math.abs((rootShare - roots.middle) / rootHalfWidth)
    if (outward >= config.fan.outerThreshold) {
      fan = side * strength
      curl += side * turn * strength
    }
  }

  return {
    index,
    spec,
    lengthFactor,
    rootShare,
    layer,
    heading,
    curl,
    jitter,
    drawOrder,
    fan,
    measureOutline: leaf.outline(spec, 1, search.measureSegments, fan),
    fitOutline: leaf.outline(spec, 1, search.fitSegments, fan),
  }
}
