"use client"

import { useMemo } from "react"
import { potLookFromSeed, type PotLook } from "../../pots"
import { PottedPlant } from "../../PottedPlant"
import { StemmedPlant, type StemStyle } from "../staged/StemmedPlant"
import { KimberlyFrondShape } from "./KimberlyFrondShape"
import { KIMBERLY_QUEEN_CONFIG } from "./kimberlyQueenConfig"
import { createKimberlyQueen, type PlacedKimberlyFrond } from "./kimberlyQueenStages"

/** How the Kimberly Queen's short stems look. */
const KIMBERLY_STEM: StemStyle = { color: "hsl(132 34% 34%)", width: 2.6 }

export interface KimberlyQueenProps {
  /** Any integer, such as a habit id. Same seed, same plant. */
  seed: number
  /** 1 to the number of stages. Defaults to the last stage. */
  stage?: number
  /** Number of stages the plant is built with. Defaults to the fern's own setting. */
  stages?: number
  /**
   * Size of the whole picture (plant and pot together) as a share of the
   * parent's width. Purely visual: frond and stem placement never changes.
   */
  scale?: number
  /** The pot to put the plant in. Defaults to the look the seed gives. */
  pot?: PotLook
  className?: string
  title?: string
}

export function KimberlyQueen({
  seed,
  stages = KIMBERLY_QUEEN_CONFIG.stages.default,
  stage = stages,
  scale,
  pot,
  className,
  title = "Kimberly Queen fern in a pot",
}: KimberlyQueenProps) {
  const plant = useMemo(() => createKimberlyQueen(seed, { stages }), [seed, stages])

  return (
    <PottedPlant look={pot ?? potLookFromSeed(seed)} scale={scale} className={className} title={title}>
      <StemmedPlant
        plant={plant}
        stage={stage}
        stemStyle={KIMBERLY_STEM}
        renderLeaf={(leaf: PlacedKimberlyFrond, clipId) => (
          <KimberlyFrondShape spec={leaf.spec} length={leaf.length} clipId={clipId} fan={leaf.fan} />
        )}
      />
    </PottedPlant>
  )
}
