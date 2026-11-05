"use client"

import { useMemo } from "react"
import { LeafShape } from "./LeafShape"
import { POTHOS_CONFIG } from "./pothosConfig"
import { createPothos, type PlacedLeaf } from "./pothosStages"
import { potLookFromSeed, type PotLook } from "../pot"
import { PottedPlant } from "../PottedPlant"
import { StemmedPlant, type StemStyle } from "../staged/StemmedPlant"

/** How the pothos's stems look. */
const POTHOS_STEM: StemStyle = { color: "hsl(104 40% 40%)", width: 2.6 }

export interface PothosDrawingProps {
  /** Any integer, such as a habit id. Same seed, same plant. */
  seed: number
  /** 1 to the number of stages. Defaults to the last stage. */
  stage?: number
  /** Number of stages the plant is built with. Defaults to the pothos's own setting. */
  stages?: number
}

/** The pothos alone, as shapes in the shared canvas. Put it in a PottedPlant to give it a pot. */
export function PothosDrawing({
  seed,
  stages = POTHOS_CONFIG.stages.default,
  stage = stages,
}: PothosDrawingProps) {
  const plant = useMemo(() => createPothos(seed, { stages }), [seed, stages])

  return (
    <StemmedPlant
      plant={plant}
      stage={stage}
      stemStyle={POTHOS_STEM}
      renderLeaf={(leaf: PlacedLeaf, clipId) => (
        <LeafShape spec={leaf.spec} length={leaf.length} clipId={clipId} />
      )}
    />
  )
}

export interface PothosProps extends PothosDrawingProps {
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

/** A pothos in a pot. */
export function Pothos({
  seed,
  stages,
  stage,
  scale,
  pot,
  className,
  title = "Pothos plant in a pot",
}: PothosProps) {
  return (
    <PottedPlant look={pot ?? potLookFromSeed(seed)} scale={scale} className={className} title={title}>
      <PothosDrawing seed={seed} stages={stages} stage={stage} />
    </PottedPlant>
  )
}
