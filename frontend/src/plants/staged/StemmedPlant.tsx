"use client"

import { useId, type ReactNode } from "react"
import { VIEWBOX } from "../genome"
import { Pot } from "../pot"
import type { PlacedLeaf, PlantStage, StagedPlant } from "./types"

/** Decimal places kept when writing coordinates into the SVG. */
const COORDINATE_DECIMALS = 1

/** How a plant's stems are drawn. */
export interface StemStyle {
  color: string
  width: number
}

/**
 * Opt-in. Plants a species' blades straight into the soil instead of on visible
 * stems: stems are not drawn, and each leaf's base is seated `bury` (a share of
 * the leaf's length) below `soilY` and clipped away there, so only the part
 * above the soil is drawn. Leave undefined to draw stems the normal way; a
 * plant without it is byte-for-byte unchanged.
 */
export interface SoilPlanting {
  /** Share of each leaf's length seated below the soil line and hidden. */
  bury: number
  /** The soil line in canvas Y; everything below it is clipped away. */
  soilY: number
}

export interface StemmedPlantProps<Spec> {
  plant: StagedPlant<Spec>
  /** 1 to the number of stages. Values outside that range are clamped. */
  stage: number
  /**
   * Size of the whole picture (plant and pot together) as a share of the
   * parent's width. Purely visual: leaf and stem placement never changes.
   */
  scale?: number
  /** Force a pot palette index instead of the plant's own. */
  pot?: number
  stemStyle: StemStyle
  /** Opt-in: plant the blades in the soil (hidden stems, buried bases). Leave undefined for normal stems. */
  planting?: SoilPlanting
  /** Draw one leaf with its stalk end at (0,0) and tip at (0,-length). `clipId` is unique to this leaf. */
  renderLeaf: (leaf: PlacedLeaf<Spec>, clipId: string) => ReactNode
  /** Extra drawing between the stems and the leaves, such as flower stalks. `id` is unique to this plant. */
  renderBehindLeaves?: (stage: PlantStage<Spec>, id: string) => ReactNode
  /** Extra drawing on top of the leaves, such as flower heads. `id` is unique to this plant. */
  renderAboveLeaves?: (stage: PlantStage<Spec>, id: string) => ReactNode
  className?: string
  title: string
}

/** The stage a caller asked for, kept inside the plant's range. */
export function stageOf<Spec>(plant: StagedPlant<Spec>, stage: number): PlantStage<Spec> {
  const index = Math.min(Math.max(Math.round(stage), 1), plant.stages.length) - 1
  return plant.stages[index]
}

const fixed = (n: number) => n.toFixed(COORDINATE_DECIMALS)

/** Draws a staged plant: pot, then every stem, then every leaf on top. */
export function StemmedPlant<Spec>({
  plant,
  stage,
  scale,
  pot,
  stemStyle,
  planting,
  renderLeaf,
  renderBehindLeaves,
  renderAboveLeaves,
  className,
  title,
}: StemmedPlantProps<Spec>) {
  const id = useId().replace(/:/g, "")
  const current = stageOf(plant, stage)
  const soilClipId = id + "-soil"

  return (
    <svg
      viewBox={VIEWBOX}
      overflow="visible"
      role="img"
      aria-label={title}
      className={className}
      style={scale === undefined ? undefined : { width: scale * 100 + "%" }}
    >
      <Pot palette={pot ?? plant.pot} band={plant.band} id={id} />

      {/* A planted species clips its buried bases away at the soil line. */}
      {planting && (
        <clipPath id={soilClipId} clipPathUnits="userSpaceOnUse">
          <rect x={-100} y={-200} width={400} height={planting.soilY + 200} />
        </clipPath>
      )}

      {/* Stems first, so leaves cover where they meet. A planted species hides them. */}
      {planting
        ? null
        : current.leaves.map((leaf) => {
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

      {current.leaves.map((leaf) => {
        const group = (
          <g
            key={"l" + leaf.index}
            transform={
              "translate(" + fixed(leaf.baseX) + " " + fixed(leaf.baseY + (planting ? planting.bury * leaf.length : 0)) +
              ") rotate(" + fixed(leaf.angle) + ")"
            }
          >
            {renderLeaf(leaf, id + "-l" + leaf.index)}
          </g>
        )
        if (!planting) return group
        return (
          <g key={"l" + leaf.index} clipPath={"url(#" + soilClipId + ")"}>
            {group}
          </g>
        )
      })}

      {renderAboveLeaves?.(current, id)}
    </svg>
  )
}
