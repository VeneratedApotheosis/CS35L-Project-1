"use client"

import { useMemo } from "react"
import { LeafShape } from "./LeafShape"
import { POTHOS_CONFIG } from "./pothosConfig"
import { createPothos, type PlacedLeaf } from "./pothosStages"
import { StemmedPlant, type StemStyle } from "./staged/StemmedPlant"

/** How the pothos's stems look. */
const POTHOS_STEM: StemStyle = { color: "hsl(104 40% 40%)", width: 2.6 }

export interface PothosProps {
  /** Any integer, such as a habit id. Same seed, same plant. */
  seed: number
  /** 1 to the number of stages. Defaults to the last stage. */
  stage?: number
  /** Number of stages the plant is built with. Defaults to the pothos's own setting. */
  stages?: number
  /**
   * Size of the whole picture (plant and pot together) as a share of the
   * parent's width. Purely visual: leaf and stem placement never changes.
   */
  scale?: number
  /** Force a pot palette index instead of the seed's choice. */
  pot?: number
  className?: string
  title?: string
}

export function Pothos({
  seed,
  stages = POTHOS_CONFIG.stages.default,
  stage = stages,
  scale,
  pot,
  className,
  title = "Pothos plant in a pot",
}: PothosProps) {
  const plant = useMemo(() => createPothos(seed, { stages }), [seed, stages])

  return (
    <StemmedPlant
      plant={plant}
      stage={stage}
      scale={scale}
      pot={pot}
      stemStyle={POTHOS_STEM}
      renderLeaf={(leaf: PlacedLeaf, clipId) => (
        <LeafShape spec={leaf.spec} length={leaf.length} clipId={clipId} />
      )}
      className={className}
      title={title}
    />
  )
}
