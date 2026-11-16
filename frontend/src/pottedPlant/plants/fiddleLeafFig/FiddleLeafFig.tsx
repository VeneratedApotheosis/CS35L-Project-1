"use client"

import { useMemo } from "react"
import { SOIL } from "../../genome"
import { potLookFromSeed, type PotLook } from "../../pots"
import { PottedPlant } from "../../PottedPlant"
import { StemmedPlant, type SoilPlanting, type StemStyle } from "../staged/StemmedPlant"
import { FIDDLE_LEAF_FIG_CONFIG } from "./fiddleLeafFigConfig"
import { fiddleTrunk, FIDDLE_TRUNK } from "./fiddleLeafFigTrunk"
import { createFiddleLeafFig, type PlacedFiddleLeaf } from "./fiddleLeafFigStages"
import { FiddleLeafFigLeafShape } from "./FiddleLeafFigLeafShape"

/** The trunk and its branches: a woody brown, with a lighter right half. */
export const FIDDLE_WOOD = {
  trunk: "hsl(27 30% 31%)",
  trunkLight: "hsl(31 34% 41%)",
  branch: "hsl(34 28% 34%)",
}

/** The engine's own stems are hidden (the trunk is drawn instead), but it still needs a style. */
const HIDDEN_STEM: StemStyle = { color: FIDDLE_WOOD.branch, width: FIDDLE_TRUNK.branchWidth }

/**
 * Hides the engine's stems. No part of a leaf is buried, so nothing is cut at
 * the soil line.
 */
const NO_STEMS: SoilPlanting = { bury: 0, soilY: SOIL.y }

export interface FiddleLeafFigProps {
  /** Any integer, such as a habit id. Same seed, same plant. */
  seed: number
  /** 1 to the number of stages. Defaults to the last stage. */
  stage?: number
  /** Number of stages the plant is built with. Defaults to the fiddle-leaf fig's own setting. */
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

/** The bare plant, with no pot: a trunk with its branches behind the leaves. */
export function FiddleLeafFigDrawing({ seed, stage, stages = FIDDLE_LEAF_FIG_CONFIG.stages.default }: { seed: number; stage?: number; stages?: number }) {
  const plant = useMemo(() => createFiddleLeafFig(seed, { stages }), [seed, stages])
  return (
    <StemmedPlant
      plant={plant}
      stage={stage ?? stages}
      stemStyle={HIDDEN_STEM}
      planting={NO_STEMS}
      renderBehindLeaves={(current) => {
        const trunk = fiddleTrunk(current, FIDDLE_LEAF_FIG_CONFIG.dome.anchor)
        if (!trunk) return null
        return (
          <g data-trunk="true">
            {trunk.branches.map((branch) => (
              <path
                key={"b" + branch.index}
                d={branch.d}
                fill="none"
                stroke={FIDDLE_WOOD.branch}
                strokeWidth={FIDDLE_TRUNK.branchWidth}
                strokeLinecap="round"
              />
            ))}
            <path d={trunk.outline} fill={FIDDLE_WOOD.trunk} />
            <path d={trunk.lightHalf} fill={FIDDLE_WOOD.trunkLight} opacity={0.6} />
          </g>
        )
      }}
      renderLeaf={(leaf: PlacedFiddleLeaf, clipId) => (
        <FiddleLeafFigLeafShape spec={leaf.spec} length={leaf.length} clipId={clipId} />
      )}
    />
  )
}

export function FiddleLeafFig({
  seed,
  stages = FIDDLE_LEAF_FIG_CONFIG.stages.default,
  stage = stages,
  scale,
  pot,
  className,
  title = "Fiddle-leaf fig in a pot",
}: FiddleLeafFigProps) {
  return (
    <PottedPlant look={pot ?? potLookFromSeed(seed)} scale={scale} className={className} title={title}>
      <FiddleLeafFigDrawing seed={seed} stage={stage} stages={stages} />
    </PottedPlant>
  )
}
