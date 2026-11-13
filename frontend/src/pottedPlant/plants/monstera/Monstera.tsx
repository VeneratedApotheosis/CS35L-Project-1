"use client"

import { useMemo } from "react"
import { potLookFromSeed, type PotLook } from "../../pots"
import { PottedPlant } from "../../PottedPlant"
import { StemmedPlant, type StemStyle } from "../staged/StemmedPlant"
import { MonsteraLeafShape } from "./MonsteraLeafShape"
import { MONSTERA_CONFIG } from "./monsteraConfig"
import { createMonstera, type PlacedMonsteraLeaf } from "./monsteraStages"

/** How the monstera's thick stems (petioles) look. */
const MONSTERA_STEM: StemStyle = { color: "hsl(128 34% 34%)", width: 3 }

export interface MonsteraProps {
  /** Any integer, such as a habit id. Same seed, same plant. */
  seed: number
  /** 1 to the number of stages. Defaults to the last stage. */
  stage?: number
  /** Number of stages the plant is built with. Defaults to the monstera's own setting. */
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

export function Monstera({
  seed,
  stages = MONSTERA_CONFIG.stages.default,
  stage = stages,
  scale,
  pot,
  className,
  title = "Monstera plant in a pot",
}: MonsteraProps) {
  const plant = useMemo(() => createMonstera(seed, { stages }), [seed, stages])

  return (
    <PottedPlant look={pot ?? potLookFromSeed(seed)} scale={scale} className={className} title={title}>
      <StemmedPlant
        plant={plant}
        stage={stage}
        stemStyle={MONSTERA_STEM}
        renderLeaf={(leaf: PlacedMonsteraLeaf, clipId) => (
          <MonsteraLeafShape spec={leaf.spec} length={leaf.length} clipId={clipId} fan={leaf.fan} />
        )}
      />
    </PottedPlant>
  )
}
