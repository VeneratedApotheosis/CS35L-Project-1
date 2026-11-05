"use client"

import { useMemo } from "react"
import { flowerState } from "../peaceLily/flowers"
import { StemmedPlant, type StemStyle } from "../staged/StemmedPlant"
import { FlowerHeads, FlowerStalks } from "./Flower"
import { LilyLeafShape } from "./LilyLeafShape"
import { FLOWER_CONFIG, LILY_CONFIG } from "./lilyConfig"
import { createLily, type PlacedLilyLeaf } from "./lilyStages"

/** How the lily's leaf stems look. */
const LILY_STEM: StemStyle = { color: "hsl(126 34% 36%)", width: 2.6 }

export interface LilyProps {
  /** Any integer, such as a habit id. Same seed, same plant. */
  seed: number
  /** 1 to the number of stages. Defaults to the last stage. */
  stage?: number
  /** Number of stages the plant is built with. Defaults to the lily's own setting. */
  stages?: number
  /**
   * Size of the whole picture (plant and pot together) as a share of the
   * parent's width. Purely visual: leaf, stem and flower placement never changes.
   */
  scale?: number
  /** Force a pot palette index instead of the seed's choice. */
  pot?: number
  className?: string
  title?: string
}

export function Lily({
  seed,
  stages = LILY_CONFIG.stages.default,
  stage = stages,
  scale,
  pot,
  className,
  title = "Lily in a pot",
}: LilyProps) {
  const plant = useMemo(() => createLily(seed, { stages }), [seed, stages])
  const anchor = LILY_CONFIG.dome.anchor

  return (
    <StemmedPlant
      plant={plant}
      stage={stage}
      scale={scale}
      pot={pot}
      stemStyle={LILY_STEM}
      renderBehindLeaves={(current) =>
        flowerState(current.stage, FLOWER_CONFIG) === "none" ? null : (
          <FlowerStalks flowers={plant.flowers} scale={current.scale} anchor={anchor} />
        )
      }
      renderLeaf={(leaf: PlacedLilyLeaf, clipId) => (
        <LilyLeafShape spec={leaf.spec} length={leaf.length} clipId={clipId} fan={leaf.fan} />
      )}
      renderAboveLeaves={(current, id) => {
        const state = flowerState(current.stage, FLOWER_CONFIG)
        return state === "none" ? null : (
          <FlowerHeads flowers={plant.flowers} state={state} scale={current.scale} anchor={anchor} id={id} />
        )
      }}
      className={className}
      title={title}
    />
  )
}
