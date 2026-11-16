"use client"

import { useMemo } from "react"
import { SOIL } from "../../genome"
import { potLookFromSeed, type PotLook } from "../../pots"
import { PottedPlant } from "../../PottedPlant"
import { StemmedPlant, type StemStyle } from "../staged/StemmedPlant"
import { PileaLeafShape } from "./PileaLeafShape"
import { PILEA_CONFIG } from "./pileaConfig"
import { createPilea, pileaPups, PILEA_PUPS, type PlacedPileaLeaf } from "./pileaStages"

/** How the pilea's thin stalks look. */
const PILEA_STEM: StemStyle = { color: "hsl(92 34% 46%)", width: 2.2 }
/** The thinner stalks of the baby pups. */
const PILEA_PUP_STEM_WIDTH = 1.4

export interface PileaDrawingProps {
  /** Any integer, such as a habit id. Same seed, same plant. */
  seed: number
  /** 1 to the number of stages. Defaults to the last stage. */
  stage?: number
  /** Number of stages the plant is built with. Defaults to the pilea's own setting. */
  stages?: number
}

/** The pilea alone, as shapes in the shared canvas. Put it in a PottedPlant to give it a pot. */
export function PileaDrawing({
  seed,
  stages = PILEA_CONFIG.stages.default,
  stage = stages,
}: PileaDrawingProps) {
  const plant = useMemo(() => createPilea(seed, { stages }), [seed, stages])
  const pups = useMemo(() => pileaPups(seed), [seed])

  const fixed = (n: number) => n.toFixed(1)

  return (
      <StemmedPlant
        plant={plant}
        stage={stage}
        stemStyle={PILEA_STEM}
        renderBehindLeaves={(current, id) => {
        // Pups appear once the plant has established, and scale with each stage.
        if (current.stage < PILEA_PUPS.fromStage) return null
        const s = current.scale
        return (
          <g>
            {pups.map((coin, i) => {
              const rootX = SOIL.x + coin.rootDX * s
              const a = (coin.angle * Math.PI) / 180
              const len = coin.length * s
              const stalk = coin.stalk * s
              const baseX = rootX + Math.sin(a) * stalk
              const baseY = SOIL.y - Math.cos(a) * stalk
              return (
                <g key={i}>
                  <line
                    x1={fixed(rootX)}
                    y1={fixed(SOIL.y)}
                    x2={fixed(baseX)}
                    y2={fixed(baseY)}
                    stroke={PILEA_STEM.color}
                    strokeWidth={PILEA_PUP_STEM_WIDTH}
                    strokeLinecap="round"
                  />
                  <g transform={"translate(" + fixed(baseX) + " " + fixed(baseY) + ") rotate(" + fixed(coin.angle) + ")"}>
                    <PileaLeafShape spec={coin.spec} length={len} clipId={id + "-pup" + i} />
                  </g>
                </g>
              )
            })}
          </g>
        )
      }}
        renderLeaf={(leaf: PlacedPileaLeaf, clipId) => (
          <PileaLeafShape spec={leaf.spec} length={leaf.length} clipId={clipId} />
        )}
      />
  )
}

export interface PileaProps extends PileaDrawingProps {
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

/** A pilea in a pot. */
export function Pilea({
  seed,
  stages,
  stage,
  scale,
  pot,
  className,
  title = "Pilea peperomioides in a pot",
}: PileaProps) {
  return (
    <PottedPlant look={pot ?? potLookFromSeed(seed)} scale={scale} className={className} title={title}>
      <PileaDrawing seed={seed} stages={stages} stage={stage} />
    </PottedPlant>
  )
}
