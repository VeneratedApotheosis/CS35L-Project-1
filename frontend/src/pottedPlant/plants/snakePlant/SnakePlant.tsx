"use client"

import { useMemo } from "react"
import { SOIL } from "../../genome"
import { potLookFromSeed, type PotLook } from "../../pots"
import { PottedPlant } from "../../PottedPlant"
import { StemmedPlant, type SoilPlanting, type StemStyle } from "../staged/StemmedPlant"
import { SnakeLeafShape } from "./SnakeLeafShape"
import { SNAKE_PLANT_CONFIG, SNAKE_PLANTING } from "./snakePlantConfig"
import { createSnakePlant, type PlacedSnakeLeaf } from "./snakePlantStages"

/** The stems are hidden (the blades are planted in the soil), but the engine still needs a style. */
const SNAKE_STEM: StemStyle = { color: "hsl(140 32% 30%)", width: 2.8 }

/** Plant the blades straight into the soil: hide stems and bury each base below the soil line. */
const SNAKE_PLANTING_STYLE: SoilPlanting = { bury: SNAKE_PLANTING.bury, soilY: SOIL.y }

export interface SnakePlantProps {
  /** Any integer, such as a habit id. Same seed, same plant. */
  seed: number
  /** 1 to the number of stages. Defaults to the last stage. */
  stage?: number
  /** Number of stages the plant is built with. Defaults to the snake plant's own setting. */
  stages?: number
  /**
   * Size of the whole picture (plant and pot together) as a share of the
   * parent's width. Purely visual: leaf and stem placement never changes.
   */
  scale?: number
  /** The pot to put the plant in. Defaults to the look the seed gives. */
  pot?: PotLook
  className?: string
  title?: string
}

export function SnakePlant({
  seed,
  stages = SNAKE_PLANT_CONFIG.stages.default,
  stage = stages,
  scale,
  pot,
  className,
  title = "Snake plant in a pot",
}: SnakePlantProps) {
  const plant = useMemo(() => createSnakePlant(seed, { stages }), [seed, stages])

  return (
    <PottedPlant look={pot ?? potLookFromSeed(seed)} scale={scale} className={className} title={title}>
      <StemmedPlant
        plant={plant}
        stage={stage}
        stemStyle={SNAKE_STEM}
        planting={SNAKE_PLANTING_STYLE}
        renderLeaf={(leaf: PlacedSnakeLeaf, clipId) => (
          <SnakeLeafShape spec={leaf.spec} length={leaf.length} clipId={clipId} />
        )}
      />
    </PottedPlant>
  )
}
