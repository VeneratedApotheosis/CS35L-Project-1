"use client"

import { useId, useMemo } from "react"
import { Pot } from "./pot"
import { SOIL, STAGES, VIEWBOX } from "./genome"
import {
  createPilea,
  pileaColors,
  pileaLeafPath,
  pileaPlacement,
  type PileaLeaf,
} from "./pileaGenome"

const STALK = "hsl(92 36% 54%)"
const TRUNK = "hsl(82 28% 42%)"

function PileaLeafView({ leaf, g, id, sw }: { leaf: PileaLeaf; g: number; id: string; sw: number }) {
  const pl = pileaPlacement(leaf, g)
  if (pl.radius < 1.2) return null

  const r = pl.radius
  const d = pileaLeafPath(r, leaf.squash, leaf.wob)
  const c = pileaColors(leaf.shade, leaf.back)
  const clip = `${id}-c`

  return (
    <g>
      <line
        x1={pl.x0.toFixed(1)}
        y1={pl.y0.toFixed(1)}
        x2={pl.x1.toFixed(1)}
        y2={pl.y1.toFixed(1)}
        stroke={STALK}
        strokeWidth={(leaf.pup ? 1.2 : 1.9) * sw}
        strokeLinecap="round"
      />
      <g transform={`translate(${pl.x1.toFixed(1)} ${pl.y1.toFixed(1)}) rotate(${pl.angle.toFixed(1)})`}>
        <clipPath id={clip}>
          <path d={d} />
        </clipPath>
        <path d={d} fill={c.base} />
        <g clipPath={`url(#${clip})`}>
          <rect x={0} y={-r} width={r * 1.2} height={r * 2} fill={c.light} opacity={0.5} />
          {Array.from({ length: leaf.veins }, (_, k) => {
            const a = (k / leaf.veins) * Math.PI * 2 + 0.4
            return (
              <line
                key={k}
                x1={0}
                y1={0}
                x2={Math.cos(a) * r * 0.8}
                y2={Math.sin(a) * r * leaf.squash * 0.8}
                stroke={c.vein}
                strokeWidth={Math.max(0.5, r * 0.04)}
                strokeLinecap="round"
                opacity={0.4}
              />
            )
          })}
          <ellipse
            cx={-0.34 * r}
            cy={-0.36 * r * leaf.squash}
            rx={0.24 * r}
            ry={0.11 * r}
            transform={`rotate(-32 ${-0.34 * r} ${-0.36 * r * leaf.squash})`}
            fill="#fff"
            opacity={0.26}
          />
        </g>
        <circle cx={0} cy={0} r={Math.max(0.8, r * 0.1)} fill={c.dimple} opacity={0.7} />
      </g>
    </g>
  )
}

export interface PileaProps {
  /** Any integer, such as a habit id. Same seed, same plant. */
  seed: number
  /** Continuous growth 0..1. Overrides `stage`. */
  growth?: number
  /** 1-4. */
  stage?: 1 | 2 | 3 | 4
  /** 0.6-1.6. Bigger means larger and fewer leaves. Default 1. */
  size?: number
  /** Force a pot palette index instead of the seed's choice. */
  pot?: number
  className?: string
  title?: string
}

export function Pilea({
  seed,
  growth,
  stage = 4,
  size = 1,
  pot,
  className,
  title = "Pilea peperomioides in a pot",
}: PileaProps) {
  const id = useId().replace(/:/g, "")
  const genome = useMemo(() => createPilea(seed, size), [seed, size])
  const g = growth ?? STAGES[stage - 1].g
  const sw = Math.sqrt(genome.size)

  // The stem reaches as high as its newest leaf.
  let top = 0
  for (const l of genome.leaves) {
    if (!l.pup && g >= l.birth) top = Math.max(top, l.baseH)
  }
  const showTrunk = genome.leaves.some((l) => !l.pup && g >= l.birth)
  const trunkTopX = SOIL.x + genome.lean * (top / genome.hMax)

  const back = genome.leaves.map((l, i) => ({ l, i })).filter(({ l }) => l.back)
  const front = genome.leaves.map((l, i) => ({ l, i })).filter(({ l }) => !l.back)

  return (
    <svg viewBox={VIEWBOX} overflow="visible" role="img" aria-label={title} className={className}>
      <Pot palette={pot ?? genome.pot} band={genome.band} size={genome.size} id={id} />
      {back.map(({ l, i }) => (
        <PileaLeafView key={i} leaf={l} g={g} id={`${id}-b${i}`} sw={sw} />
      ))}
      {showTrunk && (
        <line
          x1={SOIL.x}
          y1={SOIL.y}
          x2={trunkTopX.toFixed(1)}
          y2={SOIL.y - top - 3}
          stroke={TRUNK}
          strokeWidth={3.2 * sw}
          strokeLinecap="round"
        />
      )}
      {front.map(({ l, i }) => (
        <PileaLeafView key={i} leaf={l} g={g} id={`${id}-f${i}`} sw={sw} />
      ))}
    </svg>
  )
}
