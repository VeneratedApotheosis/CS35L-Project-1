"use client"

import { useId, useMemo, type ReactNode } from "react"
import type { PlacedLeaf, PlantStage, StagedPlant } from "./types"
import { useWilt } from "./WiltContext"
import { BROWNING, wiltPlant } from "./wilt"

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
  /** Wilt amount, 0 (healthy) to 1 (fully wilted). Defaults to the nearest WiltProvider's, or 0. */
  wilt?: number
  stemStyle: StemStyle
  /** Opt-in: plant the blades in the soil (hidden stems, buried bases). Leave undefined for normal stems. */
  planting?: SoilPlanting
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

/** Luminance weights: a brown leaf keeps the light and dark of the leaf it replaces. */
const LUMA = [0.2126, 0.7152, 0.0722] as const

/** A color matrix that paints `amount` of the leaf's brightness in a brown, and keeps the rest. */
function brownMatrix(tone: keyof typeof BROWNING, amount: number): string {
  const { strength, tint } = BROWNING[tone]
  const t = strength * amount
  const rows = tint.map((multiplier, channel) =>
    LUMA.map((weight, source) => (source === channel ? 1 - t : 0) + t * multiplier * weight).concat([0, 0]),
  )
  return [...rows, [0, 0, 0, 1, 0]].map((row) => row.map((n) => n.toFixed(4)).join(" ")).join(" ")
}

/**
 * Draws a staged plant, without its pot: every stem, then every leaf on top.
 * It is a group of shapes for the shared canvas. PottedPlant supplies the
 * picture and the pot.
 */
export function StemmedPlant<Spec>({
  plant: healthy,
  stage,
  wilt,
  stemStyle,
  planting,
  renderLeaf,
  renderBehindLeaves,
  renderAboveLeaves,
}: StemmedPlantProps<Spec>) {
  const id = useId().replace(/:/g, "")
  const contextWilt = useWilt()
  const amount = wilt ?? contextWilt
  const plant = useMemo(() => wiltPlant(healthy, amount), [healthy, amount])
  const current = stageOf(plant, stage)
  const soilClipId = id + "-soil"

  return (
    <g>
      {/* A planted species clips its buried bases away at the soil line. */}
      {planting && (
        <clipPath id={soilClipId} clipPathUnits="userSpaceOnUse">
          <rect x={-100} y={-200} width={400} height={planting.soilY + 200} />
        </clipPath>
      )}

      {/* A wilted plant's browned leaves are drawn through one of these two filters. */}
      {amount > 0 && (
        <defs>
          {(Object.keys(BROWNING) as (keyof typeof BROWNING)[]).map((tone) => (
            <filter key={tone} id={id + "-" + tone} colorInterpolationFilters="sRGB">
              <feColorMatrix type="matrix" values={brownMatrix(tone, amount)} />
            </filter>
          ))}
        </defs>
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
            filter={leaf.browning ? "url(#" + id + "-" + leaf.browning.tone + ")" : undefined}
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
    </g>
  )
}
