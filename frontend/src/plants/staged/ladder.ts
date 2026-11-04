import { lerp } from "../rng"
import type { StagedPlantConfig } from "./types"

type StageSettings = StagedPlantConfig["stages"]

/** Leaves at each stage, rising from `minLeaves` to `maxLeaves`. */
export function leafCountLadder(stageCount: number, settings: StageSettings): number[] {
  if (stageCount === 1) return [settings.maxLeaves]
  return Array.from({ length: stageCount }, (_, k) => {
    const t = Math.pow(k / (stageCount - 1), settings.leafCountCurve)
    return Math.min(settings.maxLeaves, Math.round(lerp(settings.minLeaves, settings.maxLeaves, t)))
  })
}

/**
 * Envelope scale at each stage: a geometric ladder ending at 1, so each stage
 * is the same multiple bigger than the one before.
 */
export function scaleLadder(stageCount: number, settings: StageSettings): number[] {
  if (stageCount === 1) return [1]
  return Array.from({ length: stageCount }, (_, k) =>
    Math.pow(settings.growthRatio, -(stageCount - 1 - k) / (stageCount - 1)),
  )
}
