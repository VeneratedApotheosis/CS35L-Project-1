"use client"

import { useMemo } from "react"
import { potLookFromSeed, type PotLook } from "../../pots"
import { PottedPlant } from "../../PottedPlant"
import { StemmedPlant, type StemStyle } from "../staged/StemmedPlant"
import { SpiderLeafShape } from "./SpiderLeafShape"
import { SPIDER_PLANT_CONFIG } from "./spiderPlantConfig"
import { createSpiderPlant, type PlacedSpiderLeaf } from "./spiderPlantStages"

/** How the spider plant's very short stems look. */
const SPIDER_STEM: StemStyle = { color: "hsl(100 40% 36%)", width: 2.2 }

export interface SpiderPlantProps {
  /** Any integer, such as a habit id. Same seed, same plant. */
  seed: number
  /** 1 to the number of stages. Defaults to the last stage. */
  stage?: number
  /** Number of stages the plant is built with. Defaults to the spider plant's own setting. */
  stages?: number
  /**
   * Size of the whole picture (plant and pot together) as a share of the
   * parent's width. Purely visual: blade and stem placement never changes.
   */
  scale?: number
  /** The pot to put the plant in. Defaults to the look the seed gives. */
  pot?: PotLook
  className?: string
  title?: string
}

export function SpiderPlant({
  seed,
  stages = SPIDER_PLANT_CONFIG.stages.default,
  stage = stages,
  scale,
  pot,
  className,
  title = "Spider plant in a pot",
}: SpiderPlantProps) {
  const plant = useMemo(() => createSpiderPlant(seed, { stages }), [seed, stages])

  return (
    <PottedPlant look={pot ?? potLookFromSeed(seed)} scale={scale} className={className} title={title}>
      <StemmedPlant
        plant={plant}
        stage={stage}
        stemStyle={SPIDER_STEM}
        renderLeaf={(leaf: PlacedSpiderLeaf, clipId) => (
          <SpiderLeafShape spec={leaf.spec} length={leaf.length} clipId={clipId} fan={leaf.fan} />
        )}
      />
    </PottedPlant>
  )
}
