"use client"

import { useMemo } from "react"
import { potLookFromSeed, type PotLook } from "../../pots"
import { PottedPlant } from "../../PottedPlant"
import { StemmedPlant, type StemStyle } from "../staged/StemmedPlant"
import { STRAND_PALETTE } from "./strandLeaf"
import { StrandShape } from "./StrandShape"
import { STRING_OF_PEARLS_CONFIG } from "./stringOfPearlsConfig"
import { createStringOfPearls, type PlacedStrand } from "./stringOfPearlsStages"

/** The short stems the strands rise on: the same thread the beads hang on. */
const STRING_OF_PEARLS_STEM: StemStyle = { color: STRAND_PALETTE.thread, width: 0.8 }

export interface StringOfPearlsDrawingProps {
  /** Any integer, such as a habit id. Same seed, same plant. */
  seed: number
  /** 1 to the number of stages. Defaults to the last stage. */
  stage?: number
  /** Number of stages the plant is built with. Defaults to the string of pearls's own setting. */
  stages?: number
}

/** The string of pearls alone, as shapes in the shared canvas. Put it in a PottedPlant to give it a pot. */
export function StringOfPearlsDrawing({
  seed,
  stages = STRING_OF_PEARLS_CONFIG.stages.default,
  stage = stages,
}: StringOfPearlsDrawingProps) {
  const plant = useMemo(() => createStringOfPearls(seed, { stages }), [seed, stages])

  return (
    <StemmedPlant
      plant={plant}
      stage={stage}
      stemStyle={STRING_OF_PEARLS_STEM}
      renderLeaf={(strand: PlacedStrand) => <StrandShape spec={strand.spec} length={strand.length} angle={strand.angle} />}
    />
  )
}

export interface StringOfPearlsProps extends StringOfPearlsDrawingProps {
  /**
   * Size of the whole picture (plant and pot together) as a share of the
   * parent's width. Purely visual: strand and stem placement never changes.
   */
  scale?: number
  /** The pot to put the plant in. Defaults to the look the seed gives. */
  pot?: PotLook
  className?: string
  title?: string
}

/** A string of pearls in a pot. */
export function StringOfPearls({
  seed,
  stages,
  stage,
  scale,
  pot,
  className,
  title = "String of pearls plant in a pot",
}: StringOfPearlsProps) {
  return (
    <PottedPlant look={pot ?? potLookFromSeed(seed)} scale={scale} className={className} title={title}>
      <StringOfPearlsDrawing seed={seed} stages={stages} stage={stage} />
    </PottedPlant>
  )
}
