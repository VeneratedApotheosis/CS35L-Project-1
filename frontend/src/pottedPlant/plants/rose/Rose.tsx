"use client"

import { useMemo } from "react"
import { flowerState } from "../peaceLily/flowers"
import { potLookFromSeed, type PotLook } from "../../pots"
import { PottedPlant } from "../../PottedPlant"
import { StemmedPlant, type StemStyle } from "../staged/StemmedPlant"
import { FlowerHeads, FlowerStalks } from "./Flower"
import { RoseLeafShape } from "./RoseLeafShape"
import { FLOWER_CONFIG, ROSE_CONFIG } from "./roseConfig"
import { createRose, type PlacedRoseLeaf } from "./roseStages"

/** How the rose's leaf stems (canes) look. */
const ROSE_STEM: StemStyle = { color: "hsl(130 30% 34%)", width: 2.6 }

export interface RoseProps {
  /** Any integer, such as a habit id. Same seed, same plant. */
  seed: number
  /** 1 to the number of stages. Defaults to the last stage. */
  stage?: number
  /** Number of stages the plant is built with. Defaults to the rose's own setting. */
  stages?: number
  /**
   * Size of the whole picture (plant and pot together) as a share of the
   * parent's width. Purely visual: leaf, stem and flower placement never changes.
   */
  scale?: number
  /** The pot to put the plant in. Defaults to the look the seed gives. */
  pot?: PotLook
  className?: string
  title?: string
}

export function Rose({
  seed,
  stages = ROSE_CONFIG.stages.default,
  stage = stages,
  scale,
  pot,
  className,
  title = "Rose in a pot",
}: RoseProps) {
  const plant = useMemo(() => createRose(seed, { stages }), [seed, stages])
  const anchor = ROSE_CONFIG.dome.anchor

  return (
    <PottedPlant look={pot ?? potLookFromSeed(seed)} scale={scale} className={className} title={title}>
      <StemmedPlant
        plant={plant}
        stage={stage}
        stemStyle={ROSE_STEM}
        renderBehindLeaves={(current) =>
          flowerState(current.stage, FLOWER_CONFIG) === "none" ? null : (
            <FlowerStalks flowers={plant.flowers} scale={current.scale} anchor={anchor} />
          )
        }
        renderLeaf={(leaf: PlacedRoseLeaf, clipId) => (
          <RoseLeafShape spec={leaf.spec} length={leaf.length} clipId={clipId} />
        )}
        renderAboveLeaves={(current, id) => {
          const state = flowerState(current.stage, FLOWER_CONFIG)
          return state === "none" ? null : (
            <FlowerHeads flowers={plant.flowers} state={state} scale={current.scale} anchor={anchor} id={id} />
          )
        }}
      />
    </PottedPlant>
  )
}
