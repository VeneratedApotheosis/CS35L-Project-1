import { clamp, lerp, mulberry32 } from "../../rng"
import { validateConfig } from "../staged/config"
import { measureCoverage, type CoverageResult } from "../staged/coverage"
import { canopyPoints, domeAtScale } from "../staged/dome"
import { makeGene, type Gene } from "../staged/genes"
import { leafCountLadder, scaleLadder } from "../staged/ladder"
import { placeLeaf } from "../staged/stemLayout"
import type {
  PlacedLeaf,
  PlantStage,
  StagedPlant,
  StagedPlantOptions,
  StagedPlantSpecies,
} from "../staged/types"

/*
 * The fiddle-leaf fig's crown. The engine turns a leaf outward by a random
 * amount that has nothing to do with how high the leaf sits, so a crown made
 * that way has every leaf pointing up. A fiddle-leaf fig is layered: the lower
 * leaves spread out (the lowest even dip a little) and the higher a leaf sits
 * the more upright it is.
 *
 * This is the engine's createStagedPlant (staged/generate.ts) with one extra
 * step: after the engine draws a leaf's genes, its direction is set from its
 * layer (0 nearest the soil, 1 highest; the layer also sets how high the leaf
 * sits). Everything else is the engine's own code, so the leaves are still
 * fitted inside the dome and above the soil, and each stage is still the full
 * plant scaled about the soil point.
 */
export const FIDDLE_CROWN = {
  /** Direction of the lowest leaf in degrees from straight up; above 90 dips below level. */
  outwardAngle: 100,
  /** Direction of the highest leaf, in degrees from straight up. */
  uprightAngle: 12,
  /** How fast leaves straighten as they rise: above 1 keeps the lower half spread out. */
  uprightCurve: 1.2,
}

/** The direction of a leaf at `layer`, unsigned, in degrees from straight up. */
export function crownAngle(layer: number): number {
  const spread = (1 - clamp(layer, 0, 1)) ** FIDDLE_CROWN.uprightCurve
  return lerp(FIDDLE_CROWN.uprightAngle, FIDDLE_CROWN.outwardAngle, spread)
}

/** The engine's gene, with the leaf turned to the direction its layer gives. It keeps the side the engine chose. */
function withCrownAngle<Spec>(gene: Gene<Spec>): Gene<Spec> {
  const side = gene.heading >= 0 ? 1 : -1
  return { ...gene, curl: side * crownAngle(gene.layer) - gene.heading }
}

/** Hang every leaf of a stage at one leaf length, and measure how well they fill the canopy. */
function layOutLeaves<Spec>(
  genes: Gene<Spec>[],
  scale: number,
  leafLength: number,
  species: StagedPlantSpecies<Spec>,
): { placed: PlacedLeaf<Spec>[] } & CoverageResult {
  const { config } = species
  const canopy = canopyPoints(domeAtScale(config, scale), config.coverage)

  const placed = genes.map((gene) => placeLeaf(gene, scale, leafLength, species))
  const measured = measureCoverage(
    genes.map((gene, i) => ({
      unitOutline: gene.measureOutline,
      length: placed[i].length,
      baseX: placed[i].baseX,
      baseY: placed[i].baseY,
      angle: placed[i].angle,
    })),
    canopy,
  )
  return { placed, ...measured }
}

/** The smallest leaf length (a share of the dome height) that is lush enough without stacking too deep. */
function solveLeafShare<Spec>(genes: Gene<Spec>[], fullScale: number, species: StagedPlantSpecies<Spec>): number {
  const { config } = species
  const { leaves: leafSettings, coverage: coverageSettings, search } = config
  const height = domeAtScale(config, fullScale).height

  let fallback: { share: number; coverage: number; withinOverlap: boolean } | null = null
  for (let step = 0; step < search.lengthSteps; step++) {
    const share = lerp(leafSettings.lengthRange[0], leafSettings.lengthRange[1], step / (search.lengthSteps - 1))
    const result = layOutLeaves(genes, fullScale, height * share, species)
    const withinOverlap = result.overlap <= coverageSettings.maxOverlap

    if (result.coverage >= coverageSettings.target && withinOverlap) return share

    const better =
      !fallback ||
      (withinOverlap && !fallback.withinOverlap) ||
      (withinOverlap === fallback.withinOverlap && result.coverage > fallback.coverage)
    if (better) fallback = { share, coverage: result.coverage, withinOverlap }
  }
  return (fallback as { share: number }).share
}

function buildStage<Spec>(
  genes: Gene<Spec>[],
  stageNumber: number,
  leafCount: number,
  scale: number,
  leafShare: number,
  species: StagedPlantSpecies<Spec>,
): PlantStage<Spec> {
  const dome = domeAtScale(species.config, scale)
  const result = layOutLeaves(genes.slice(0, leafCount), scale, dome.height * leafShare, species)

  const leafLength = result.placed.reduce((sum, p) => sum + p.length, 0) / result.placed.length
  return {
    stage: stageNumber,
    scale,
    halfWidth: dome.halfWidth,
    height: dome.height,
    leafLength,
    coverage: result.coverage,
    layers: result.overlap,
    leaves: [...result.placed].sort((a, b) => a.z - b.z),
  }
}

const cache = new Map<string, StagedPlant<unknown>>()

/**
 * Build a layered crown for a seed: every stage from sprout to full size,
 * without its pot. Same rules and results as the engine's createStagedPlant,
 * but each leaf points in the direction its height gives (see above).
 */
export function createLayeredPlant<Spec>(
  seed: number,
  species: StagedPlantSpecies<Spec>,
  options: StagedPlantOptions = {},
): StagedPlant<Spec> {
  const { config } = species
  validateConfig(config)

  const stageCount = clamp(Math.round(options.stages ?? config.stages.default), 1, config.stages.max)
  const key = config.name + ":" + seed + ":" + stageCount
  const hit = cache.get(key)
  if (hit) return hit as StagedPlant<Spec>

  // The plant's own random stream starts with the two sequence phases, as in the engine.
  const rng = mulberry32(seed)
  const phases = { roots: rng(), layers: rng() }

  const counts = leafCountLadder(stageCount, config.stages)
  const scales = scaleLadder(stageCount, config.stages)
  const genes = Array.from({ length: Math.max(...counts) }, (_, i) => withCrownAngle(makeGene(seed, i, phases, species)))

  const leafShare = solveLeafShare(genes, scales[scales.length - 1], species)
  const stages = counts.map((leafCount, k) => buildStage(genes, k + 1, leafCount, scales[k], leafShare, species))

  const plant: StagedPlant<Spec> = { seed, stages, species }
  cache.set(key, plant)
  return plant
}
