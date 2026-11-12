"use client"

import { useMemo } from "react"
import { potLookFromSeed, type PotLook } from "../../pots"
import { PottedPlant } from "../../PottedPlant"
import { StemmedPlant, type StemStyle } from "../staged/StemmedPlant"
import { FlowerHeads, FlowerStalks } from "./Flower"
import { flowerState } from "./flowers"
import { LilyLeafShape } from "./LilyLeafShape"
import { FLOWER_CONFIG, PEACE_LILY_CONFIG } from "./peaceLilyConfig"
import { createPeaceLily, type PlacedLilyLeaf } from "./peaceLilyStages"

/** How the peace lily's leaf stems look. */
const LILY_STEM: StemStyle = { color: "hsl(120 34% 38%)", width: 2.6 }

export interface PeaceLilyDrawingProps {
  /** Any integer, such as a habit id. Same seed, same plant. */
  seed: number
  /** 1 to the number of stages. Defaults to the last stage. */
  stage?: number
  /** Number of stages the plant is built with. Defaults to the peace lily's own setting. */
  stages?: number
}

/** The peace lily alone, as shapes in the shared canvas. Put it in a PottedPlant to give it a pot. */
export function PeaceLilyDrawing({
  seed,
  stages = PEACE_LILY_CONFIG.stages.default,
  stage = stages,
}: PeaceLilyDrawingProps) {
  const plant = useMemo(() => createPeaceLily(seed, { stages }), [seed, stages])
  const anchor = PEACE_LILY_CONFIG.dome.anchor

  return (
    <StemmedPlant
      plant={plant}
      stage={stage}
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
    />
  )
}

export interface PeaceLilyProps extends PeaceLilyDrawingProps {
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

/** A peace lily in a pot. */
export function PeaceLily({
  seed,
  stages,
  stage,
  scale,
  pot,
  className,
  title = "Peace lily in a pot",
}: PeaceLilyProps) {
  return (
    <PottedPlant look={pot ?? potLookFromSeed(seed)} scale={scale} className={className} title={title}>
      <PeaceLilyDrawing seed={seed} stages={stages} stage={stage} />
    </PottedPlant>
  )
}
