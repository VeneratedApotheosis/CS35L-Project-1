"use client"

import { useMemo } from "react"
import { StemmedPlant, type StemStyle } from "../staged/StemmedPlant"
import { FlowerHeads, FlowerStalks } from "./Flower"
import { flowerState } from "./flowers"
import { LilyLeafShape } from "./LilyLeafShape"
import { FLOWER_CONFIG, PEACE_LILY_CONFIG } from "./peaceLilyConfig"
import { createPeaceLily, type PlacedLilyLeaf } from "./peaceLilyStages"

/** How the peace lily's leaf stems look. */
const LILY_STEM: StemStyle = { color: "hsl(120 34% 38%)", width: 2.6 }

export interface PeaceLilyProps {
  /** Any integer, such as a habit id. Same seed, same plant. */
  seed: number
  /** 1 to the number of stages. Defaults to the last stage. */
  stage?: number
  /** Number of stages the plant is built with. Defaults to the peace lily's own setting. */
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

export function PeaceLily({
  seed,
  stages = PEACE_LILY_CONFIG.stages.default,
  stage = stages,
  scale,
  pot,
  className,
  title = "Peace lily in a pot",
}: PeaceLilyProps) {
  const plant = useMemo(() => createPeaceLily(seed, { stages }), [seed, stages])
  const anchor = PEACE_LILY_CONFIG.dome.anchor

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
        <LilyLeafShape spec={leaf.spec} length={leaf.length} clipId={clipId} />
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
