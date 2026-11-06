import { placeOutline } from "../geometry"
import type { Pt } from "../geometry"
import { clamp, lerp, mulberry32 } from "../rng"
import { validateConfig } from "./config"
import { measureCoverage, type CoverageResult } from "./coverage"
import { canopyPoints, domeAtScale } from "./dome"
import { makeGene, type Gene } from "./genes"
import { leafCountLadder, scaleLadder } from "./ladder"
import { placeLeaf } from "./stemLayout"
import type {
  PlacedLeaf,
  PlantStage,
  StagedPlant,
  StagedPlantOptions,
  StagedPlantSpecies,
} from "./types"

/* ------------------------------------------------------------------ */
/* One stage                                                           */
/* ------------------------------------------------------------------ */

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

/**
 * Choose how long the plant's leaves are, as a share of the dome height.
 *
 * This is solved once, on the full-size plant, and every stage then uses the
 * same share. That keeps leaves growing exactly as fast as the dome, so each
 * stage is a scaled copy of the full plant with fewer leaves.
 *
 * The solver tries a run of lengths from small to large and keeps the first
 * that is lush enough without stacking too deep. If none is, it keeps the best
 * that stays within the overlap limit, and if none does, the best coverage.
 */
function solveLeafShare<Spec>(
  genes: Gene<Spec>[],
  fullScale: number,
  species: StagedPlantSpecies<Spec>,
): number {
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

/** Lay out one stage: its first `leafCount` leaves, at its scale, at the plant's leaf share. */
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

/* ------------------------------------------------------------------ */
/* A whole plant                                                       */
/* ------------------------------------------------------------------ */

const cache = new Map<string, StagedPlant<unknown>>()

/**
 * Build a plant for a seed: every stage from sprout to full size, without its pot.
 * Every stage is the full plant scaled about the soil point, showing only the
 * leaves that stage has. The same seed, species and stage count always give
 * the same plant. Results are cached, so treat them as read-only.
 */
export function createStagedPlant<Spec>(
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

  // The plant's own random stream starts with the two sequence phases. The pot has its own stream.
  const rng = mulberry32(seed)
  const phases = { roots: rng(), layers: rng() }

  const counts = leafCountLadder(stageCount, config.stages)
  const scales = scaleLadder(stageCount, config.stages)
  const genes = Array.from({ length: Math.max(...counts) }, (_, i) => makeGene(seed, i, phases, species))

  const leafShare = solveLeafShare(genes, scales[scales.length - 1], species)
  const stages = counts.map((leafCount, k) =>
    buildStage(genes, k + 1, leafCount, scales[k], leafShare, species),
  )

  const plant: StagedPlant<Spec> = { seed, stages }
  cache.set(key, plant)
  return plant
}

/** A placed leaf's outline in canvas coordinates. Used by tests and debug views. */
export function leafOutline<Spec>(
  leaf: PlacedLeaf<Spec>,
  species: StagedPlantSpecies<Spec>,
  perSegment: number = species.config.search.fitSegments,
): Pt[] {
  return placeOutline(species.leaf.outline(leaf.spec, leaf.length, perSegment, leaf.fan), { x: leaf.baseX, y: leaf.baseY }, leaf.angle)
}
