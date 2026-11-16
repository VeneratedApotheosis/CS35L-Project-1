import type { Pt } from "../../geometry"
import { randomStrand, strandPolygon, type StrandSpec } from "./strandLeaf"
import { STRING_OF_PEARLS_CONFIG } from "./stringOfPearlsConfig"
import { createStagedPlant, leafOutline as stagedLeafOutline } from "../staged/generate"
import { leafCountLadder, scaleLadder } from "../staged/ladder"
import type {
  LeafShapeModel,
  PlacedLeaf as StagedPlacedLeaf,
  PlantStage,
  StagedPlant,
  StagedPlantOptions,
  StagedPlantSpecies,
} from "../staged/types"

/*
 * The string of pearls: a staged plant (see ./staged) whose "leaves" are
 * hanging strands of beads. Plant-specific choices live here, in strandLeaf.ts
 * and in stringOfPearlsConfig.ts.
 */

/**
 * A strand rises, curves over and hangs. Its outline reads the leaf's angle so
 * it ends hanging straight down, and wilting leaves its direction alone.
 */
const STRAND_LEAF: LeafShapeModel<StrandSpec> = {
  randomSpec: randomStrand,
  outline: (spec, length, perSegment, _fan, angle) => strandPolygon(spec, length, perSegment, angle),
  middle: 0.25,
  droops: false,
}

export const STRING_OF_PEARLS_SPECIES: StagedPlantSpecies<StrandSpec> = {
  config: STRING_OF_PEARLS_CONFIG,
  leaf: STRAND_LEAF,
}

export type PlacedStrand = StagedPlacedLeaf<StrandSpec>
export type StringOfPearlsStage = PlantStage<StrandSpec>
export type StringOfPearlsPlant = StagedPlant<StrandSpec>
export type StringOfPearlsOptions = StagedPlantOptions

/** Build (or fetch the cached) string of pearls for a seed. Treat the result as read-only. */
export function createStringOfPearls(seed: number, options: StringOfPearlsOptions = {}): StringOfPearlsPlant {
  return createStagedPlant(seed, STRING_OF_PEARLS_SPECIES, options)
}

/** A placed strand's outline in canvas coordinates. Used by tests and debug views. */
export function strandOutline(strand: PlacedStrand, perSegment?: number): Pt[] {
  return stagedLeafOutline(strand, STRING_OF_PEARLS_SPECIES, perSegment)
}

/** Strands at each stage for a plant with the given number of stages. */
export function stageStrandCounts(stages: number): number[] {
  return leafCountLadder(stages, STRING_OF_PEARLS_CONFIG.stages)
}

/** Envelope scale at each stage for a plant with the given number of stages. */
export function stageScales(stages: number): number[] {
  return scaleLadder(stages, STRING_OF_PEARLS_CONFIG.stages)
}
