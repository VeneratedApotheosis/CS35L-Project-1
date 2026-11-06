"use client"

import { useMemo } from "react"
import { potLookFromSeed, type PotLook } from "../pot"
import { PottedPlant } from "../PottedPlant"
import { StemmedPlant, type StemStyle } from "../staged/StemmedPlant"
import { PhilodendronLeafShape } from "./PhilodendronLeafShape"
import { PHILODENDRON_CONFIG } from "./philodendronConfig"
import { createPhilodendron, redLeafIndices, type PlacedPhilodendronLeaf } from "./philodendronStages"

/**
 * The philodendron's signature: thick, prominent reddish-maroon petioles. Unlike
 * most plants' thin green stems, this one keeps bold colored stems.
 */
export const PHILODENDRON_STEM: StemStyle = { color: "hsl(354 52% 34%)", width: 3.6 }

export interface PhilodendronProps {
  /** Any integer, such as a habit id. Same seed, same plant. */
  seed: number
  /** 1 to the number of stages. Defaults to the last stage. */
  stage?: number
  /** Number of stages the plant is built with. Defaults to the philodendron's own setting. */
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

export function Philodendron({
  seed,
  stages = PHILODENDRON_CONFIG.stages.default,
  stage = stages,
  scale,
  pot,
  className,
  title = "Philodendron plant in a pot",
}: PhilodendronProps) {
  const plant = useMemo(() => createPhilodendron(seed, { stages }), [seed, stages])
  // The newest, most upright leaves are burgundy. Decided once from the full
  // plant and keyed by index, so a leaf's color never changes with stage or scale.
  const red = useMemo(() => redLeafIndices(plant), [plant])

  return (
    <PottedPlant look={pot ?? potLookFromSeed(seed)} scale={scale} className={className} title={title}>
      <StemmedPlant
        plant={plant}
        stage={stage}
        stemStyle={PHILODENDRON_STEM}
        renderLeaf={(leaf: PlacedPhilodendronLeaf, clipId) => (
          <PhilodendronLeafShape
            spec={leaf.spec}
            length={leaf.length}
            clipId={clipId}
            fan={leaf.fan}
            red={red.has(leaf.index)}
          />
        )}
      />
    </PottedPlant>
  )
}
