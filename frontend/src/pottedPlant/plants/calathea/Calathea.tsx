"use client"

import { useMemo } from "react"
import { potLookFromSeed, type PotLook } from "../../pots"
import { PottedPlant } from "../../PottedPlant"
import { StemmedPlant, type StemStyle } from "../staged/StemmedPlant"
import { CalatheaLeafShape } from "./CalatheaLeafShape"
import { CALATHEA_CONFIG } from "./calatheaConfig"
import { createCalathea, type PlacedCalatheaLeaf } from "./calatheaStages"

/** How the calathea's stems look: green, a touch dusky. */
export const CALATHEA_STEM: StemStyle = { color: "hsl(120 24% 34%)", width: 2.6 }

export interface CalatheaProps {
  /** Any integer, such as a habit id. Same seed, same plant. */
  seed: number
  /** 1 to the number of stages. Defaults to the last stage. */
  stage?: number
  /** Number of stages the plant is built with. Defaults to the calathea's own setting. */
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

/** A calathea in a pot. */
export function Calathea({
  seed,
  stages = CALATHEA_CONFIG.stages.default,
  stage = stages,
  scale,
  pot,
  className,
  title = "Calathea plant in a pot",
}: CalatheaProps) {
  const plant = useMemo(() => createCalathea(seed, { stages }), [seed, stages])

  return (
    <PottedPlant look={pot ?? potLookFromSeed(seed)} scale={scale} className={className} title={title}>
      <StemmedPlant
        plant={plant}
        stage={stage}
        stemStyle={CALATHEA_STEM}
        renderLeaf={(leaf: PlacedCalatheaLeaf, clipId) => (
          <CalatheaLeafShape spec={leaf.spec} length={leaf.length} clipId={clipId} />
        )}
      />
    </PottedPlant>
  )
}
