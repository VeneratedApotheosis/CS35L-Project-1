"use client"

import { useId, type ReactNode } from "react"
import type { PlacedLeaf, PlantStage, StagedPlant } from "./types"

/** Decimal places kept when writing coordinates into the SVG. */
const COORDINATE_DECIMALS = 1

/** How a plant's stems are drawn. */
export interface StemStyle {
  color: string
  width: number
}

export interface StemmedPlantProps<Spec> {
  plant: StagedPlant<Spec>
  /** 1 to the number of stages. Values outside that range are clamped. */
  stage: number
  stemStyle: StemStyle
  /** Draw one leaf with its stalk end at (0,0) and tip at (0,-length). `clipId` is unique to this leaf. */
  renderLeaf: (leaf: PlacedLeaf<Spec>, clipId: string) => ReactNode
  /** Extra drawing between the stems and the leaves, such as flower stalks. `id` is unique to this plant. */
  renderBehindLeaves?: (stage: PlantStage<Spec>, id: string) => ReactNode
  /** Extra drawing on top of the leaves, such as flower heads. `id` is unique to this plant. */
  renderAboveLeaves?: (stage: PlantStage<Spec>, id: string) => ReactNode
}

/** The stage a caller asked for, kept inside the plant's range. */
export function stageOf<Spec>(plant: StagedPlant<Spec>, stage: number): PlantStage<Spec> {
  const index = Math.min(Math.max(Math.round(stage), 1), plant.stages.length) - 1
  return plant.stages[index]
}

const fixed = (n: number) => n.toFixed(COORDINATE_DECIMALS)

/**
 * Draws a staged plant, without its pot: every stem, then every leaf on top.
 * It is a group of shapes for the shared canvas. PottedPlant supplies the
 * picture and the pot.
 */
export function StemmedPlant<Spec>({
  plant,
  stage,
  stemStyle,
  renderLeaf,
  renderBehindLeaves,
  renderAboveLeaves,
}: StemmedPlantProps<Spec>) {
  const id = useId().replace(/:/g, "")
  const current = stageOf(plant, stage)

  return (
    <g>
      {/* Stems first, so leaves cover where they meet. */}
      {current.leaves.map((leaf) => {
        const s = leaf.stem
        return (
          <path
            key={"s" + leaf.index}
            d={
              "M" + fixed(s.x0) + " " + fixed(s.y0) +
              " Q" + fixed(s.cx) + " " + fixed(s.cy) +
              " " + fixed(s.x1) + " " + fixed(s.y1)
            }
            fill="none"
            stroke={stemStyle.color}
            strokeWidth={stemStyle.width}
            strokeLinecap="round"
          />
        )
      })}

      {renderBehindLeaves?.(current, id)}

      {current.leaves.map((leaf) => (
        <g
          key={"l" + leaf.index}
          transform={
            "translate(" + fixed(leaf.baseX) + " " + fixed(leaf.baseY) +
            ") rotate(" + fixed(leaf.angle) + ")"
          }
        >
          {renderLeaf(leaf, id + "-l" + leaf.index)}
        </g>
      ))}

      {renderAboveLeaves?.(current, id)}
    </g>
  )
}
