"use client"

import { useId, useMemo } from "react"
import { Pot } from "./pot"
import { STAGES, VIEWBOX, pointAt, type VinePoint } from "./genome"
import {
  createPeaceLily,
  flowerOpenness,
  flowerProgress,
  lilyLeafAngle,
  lilyLeafColors,
  lilyLeafPath,
  lilyLeafSize,
  lilyLeafProgress,
  spathePath,
  stemFraction,
  type LilyFlower,
  type LilyStem,
} from "./lily"
import { lerp } from "./rng"

const STEM = "hsl(125 34% 36%)"
const SCAPE = "hsl(105 38% 52%)"

function partialPath(pts: VinePoint[], frac: number) {
  const whole = Math.floor(frac * (pts.length - 1))
  const list = pts.slice(0, whole + 1).map((p) => [p.x, p.y])
  const end = pointAt(pts, frac)
  list.push([end.x, end.y])
  return list.map(([x, y], k) => `${k ? "L" : "M"}${x.toFixed(1)} ${y.toFixed(1)}`).join(" ")
}

function Leaf({ stem, g, id }: { stem: LilyStem; g: number; id: string }) {
  const size = lilyLeafSize(stem, g)
  if (size < 1.5) return null

  const tip = pointAt(stem.pts, stemFraction(stem, g))
  const angle = lilyLeafAngle(stem, g)
  const p = lilyLeafProgress(stem, g)
  const spec = stem.leaf
  const d = lilyLeafPath(size, spec)
  const w = size * spec.aspect
  const c = lilyLeafColors(spec)
  const clip = `${id}-c`

  return (
    <g
      transform={`translate(${tip.x.toFixed(1)} ${tip.y.toFixed(1)}) rotate(${angle.toFixed(1)}) scale(${(0.4 + 0.6 * p).toFixed(2)} 1)`}
    >
      <clipPath id={clip}>
        <path d={d} />
      </clipPath>
      <path d={d} fill={c.base} />
      <g clipPath={`url(#${clip})`}>
        <rect x={0} y={-size} width={w} height={size * 1.1} fill={c.light} opacity={0.5} />
        <ellipse
          cx={-0.18 * w}
          cy={-0.55 * size}
          rx={0.09 * w}
          ry={0.2 * size}
          transform={`rotate(-8 ${-0.18 * w} ${-0.55 * size})`}
          fill="#fff"
          opacity={0.2}
        />
      </g>
      <path
        d={`M0 ${-0.04 * size} L0 ${-0.9 * size}`}
        stroke={c.vein}
        strokeWidth={Math.max(0.6, size * 0.035)}
        strokeLinecap="round"
        opacity={0.6}
        fill="none"
      />
    </g>
  )
}

function Spathe({ flower, g, id }: { flower: LilyFlower; g: number; id: string }) {
  const fp = flowerProgress(flower, g)
  if (fp <= 0) return null

  const open = flowerOpenness(flower, g)
  const stalkEnd = pointAt(flower.pts, 1)
  const length = flower.length * (0.3 + 0.7 * Math.min(1, fp * 1.6))
  const halfWidth = length * flower.aspect * (0.45 + 0.55 * open)
  const d = spathePath(length, halfWidth)
  const clip = `${id}-s`

  // Green bud turning white as it opens.
  const hue = lerp(100, 52, open)
  const sat = lerp(34, 55, open)
  const light = lerp(76, 97, open)

  return (
    <g
      transform={`translate(${stalkEnd.x.toFixed(1)} ${stalkEnd.y.toFixed(1)}) rotate(${(stalkEnd.theta + flower.lean).toFixed(1)})`}
    >
      <clipPath id={clip}>
        <path d={d} />
      </clipPath>
      <path d={d} fill={`hsl(${hue} ${sat}% ${light}%)`} />
      <g clipPath={`url(#${clip})`}>
        <rect
          x={0}
          y={-length}
          width={halfWidth * 1.2}
          height={length}
          fill={`hsl(${hue} ${sat}% ${light - 9}%)`}
          opacity={0.55}
        />
        <ellipse
          cx={-0.4 * halfWidth}
          cy={-0.45 * length}
          rx={0.14 * halfWidth}
          ry={0.2 * length}
          transform={`rotate(-8 ${-0.4 * halfWidth} ${-0.45 * length})`}
          fill="#fff"
          opacity={0.45}
        />
      </g>
      {open > 0.25 && (
        <rect
          x={-0.13 * halfWidth}
          y={-0.5 * length}
          width={0.26 * halfWidth}
          height={0.44 * length}
          rx={0.13 * halfWidth}
          fill="hsl(46 70% 72%)"
          opacity={Math.min(1, (open - 0.25) * 3)}
        />
      )}
    </g>
  )
}

export interface PeaceLilyProps {
  /** Any integer, such as a habit id. Same seed, same plant. */
  seed: number
  /** Continuous growth 0..1. Overrides `stage`. */
  growth?: number
  /** 1-4. Flowers show as buds at 3 and open at 4. */
  stage?: 1 | 2 | 3 | 4
  /** 0.6-1.6. Bigger means larger and fewer elements. Default 1. */
  size?: number
  /** Force a pot palette index instead of the seed's choice. */
  pot?: number
  className?: string
  title?: string
}

export function PeaceLily({
  seed,
  growth,
  stage = 4,
  size = 1,
  pot,
  className,
  title = "Peace lily in a pot",
}: PeaceLilyProps) {
  const id = useId().replace(/:/g, "")
  const genome = useMemo(() => createPeaceLily(seed, size), [seed, size])
  const g = growth ?? STAGES[stage - 1].g
  const sw = Math.sqrt(genome.size)

  return (
    <svg viewBox={VIEWBOX} overflow="visible" role="img" aria-label={title} className={className}>
      <Pot palette={pot ?? genome.pot} band={genome.band} size={genome.size} id={id} />

      {/* Flower stalks sit behind the leaves so they rise out of the clump. */}
      {genome.flowers.map((fl, j) => {
        const frac = stemFraction(fl, g)
        if (frac <= 0) return null
        return (
          <path
            key={j}
            d={partialPath(fl.pts, frac)}
            fill="none"
            stroke={SCAPE}
            strokeWidth={1.8 * sw}
            strokeLinecap="round"
          />
        )
      })}

      {genome.stems.map((stem, i) => {
        const frac = stemFraction(stem, g)
        if (frac <= 0) return null
        return (
          <path
            key={i}
            d={partialPath(stem.pts, frac)}
            fill="none"
            stroke={STEM}
            strokeWidth={2.2 * sw}
            strokeLinecap="round"
          />
        )
      })}

      {genome.stems.map((stem, i) => (
        <Leaf key={i} stem={stem} g={g} id={`${id}-l${i}`} />
      ))}

      {genome.flowers.map((fl, j) => (
        <Spathe key={j} flower={fl} g={g} id={`${id}-f${j}`} />
      ))}
    </svg>
  )
}
