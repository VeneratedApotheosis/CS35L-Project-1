"use client"

import { useId, useMemo } from "react"
import { STAGES, VIEWBOX } from "../genome"
import { Pot } from "../pot"
import { clamp, lerp } from "../rng"
import {
  createLotus,
  WATER_Y,
  type LotusFlower,
  type LotusLeaf,
  type LotusPad,
} from "./lotusGenome"

const STEM = "hsl(136 32% 46%)"
const WATER_DEEP = "hsl(202 48% 60%)"
const WATER_TOP = "hsl(196 58% 74%)"
const WATER_RIPPLE = "hsl(200 62% 84%)"

const f = (n: number) => Math.round(n * 10) / 10

function padColors(shade: number) {
  const hue = 134 + (shade - 0.5) * 16
  const l = 42 + shade * 8
  return {
    base: `hsl(${f(hue)} 42% ${f(l)}%)`,
    light: `hsl(${f(hue + 6)} 48% ${f(l + 12)}%)`,
    vein: `hsl(${f(hue + 8)} 40% ${f(l + 18)}%)`,
  }
}

function leafColors(shade: number) {
  const hue = 150 + (shade - 0.5) * 18
  const l = 44 + shade * 8
  return {
    base: `hsl(${f(hue)} 36% ${f(l)}%)`,
    light: `hsl(${f(hue + 8)} 42% ${f(l + 12)}%)`,
    shadow: `hsl(${f(hue - 6)} 34% ${f(l - 12)}%)`,
    vein: `hsl(${f(hue + 6)} 36% ${f(l + 20)}%)`,
  }
}

/** The water in the pot, with a lighter top and a faint ripple. */
function Water() {
  return (
    <g>
      <ellipse cx={100} cy={WATER_Y} rx={37} ry={6.5} fill={WATER_DEEP} />
      <ellipse cx={98} cy={WATER_Y - 1} rx={30} ry={4} fill={WATER_TOP} opacity={0.75} />
      <ellipse cx={108} cy={WATER_Y + 1.5} rx={15} ry={1.8} fill={WATER_RIPPLE} opacity={0.4} />
    </g>
  )
}

/** A lily pad: a flattened disc with a wedge notch cut toward its center. */
function Pad({ pad, g }: { pad: LotusPad; g: number }) {
  const r = pad.r * lerp(0.55, 1, g)
  if (r < 2) return null
  const ry = r * 0.42
  const c = padColors(pad.shade)
  const a = (pad.notch * Math.PI) / 180
  const w = 0.24
  const n1x = Math.cos(a - w) * r
  const n1y = Math.sin(a - w) * ry
  const n2x = Math.cos(a + w) * r
  const n2y = Math.sin(a + w) * ry

  return (
    <g transform={`translate(${f(pad.x)} ${f(pad.y)}) rotate(${f(pad.rot)})`}>
      <ellipse cx={0} cy={0} rx={r} ry={ry} fill={c.base} />
      {Array.from({ length: 7 }, (_, k) => {
        const ang = (k / 7) * Math.PI * 2
        return (
          <line
            key={k}
            x1={0}
            y1={0}
            x2={f(Math.cos(ang) * r * 0.9)}
            y2={f(Math.sin(ang) * ry * 0.9)}
            stroke={c.vein}
            strokeWidth={0.5}
            opacity={0.5}
          />
        )
      })}
      <ellipse cx={-r * 0.3} cy={-ry * 0.3} rx={r * 0.3} ry={ry * 0.3} fill={c.light} opacity={0.5} />
      <path d={`M0 0 L${f(n1x)} ${f(n1y)} L${f(n2x)} ${f(n2y)} Z`} fill={WATER_DEEP} />
    </g>
  )
}

/** A round leaf on a stem, cupped by a darker lower crescent. */
function Leaf({ leaf, g }: { leaf: LotusLeaf; g: number }) {
  if (g < leaf.birth) return null
  const h = leaf.height * lerp(0.3, 1, g)
  const topX = leaf.baseX + leaf.tilt * (h / leaf.height)
  const topY = WATER_Y - h
  const r = leaf.r * lerp(0.4, 1, g)
  const ry = r * 0.82
  const c = leafColors(leaf.shade)

  return (
    <g>
      <line x1={f(leaf.baseX)} y1={WATER_Y} x2={f(topX)} y2={f(topY)} stroke={STEM} strokeWidth={2.2} strokeLinecap="round" />
      <g transform={`translate(${f(topX)} ${f(topY)}) rotate(${f(leaf.tilt)})`}>
        <ellipse cx={0} cy={0} rx={r} ry={ry} fill={c.base} />
        <path d={`M${-r} 0 A ${r} ${ry} 0 0 0 ${r} 0 Z`} fill={c.shadow} opacity={0.32} />
        {Array.from({ length: 9 }, (_, k) => {
          const ang = (k / 9) * Math.PI * 2
          return (
            <line
              key={k}
              x1={0}
              y1={0}
              x2={f(Math.cos(ang) * r * 0.85)}
              y2={f(Math.sin(ang) * ry * 0.85)}
              stroke={c.vein}
              strokeWidth={0.5}
              opacity={0.4}
            />
          )
        })}
        <ellipse cx={-r * 0.3} cy={-ry * 0.35} rx={r * 0.32} ry={ry * 0.3} fill={c.light} opacity={0.5} />
        <circle cx={0} cy={0} r={1.4} fill={c.shadow} opacity={0.7} />
      </g>
    </g>
  )
}

const petalPath = (len: number, w: number) =>
  `M0 0 Q ${f(w)} ${f(-len * 0.55)} 0 ${f(-len)} Q ${f(-w)} ${f(-len * 0.55)} 0 0 Z`

/** A pink flower: two fans of petals around a yellow pod. Spreads open with g. */
function Flower({ flower, g }: { flower: LotusFlower; g: number }) {
  if (g < flower.birth) return null
  const open = clamp((g - flower.birth) / (0.95 - flower.birth))
  const h = flower.height * lerp(0.35, 1, g)
  const cx = flower.baseX
  const cy = WATER_Y - h
  const s = flower.size * lerp(0.5, 1, g)

  const petalOuter = `hsl(${f(flower.hue)} 70% 82%)`
  const petalInner = `hsl(${f(flower.hue + 2)} 72% 74%)`
  const petalTip = `hsl(${f(flower.hue - 4)} 62% 68%)`
  const outerN = 7
  const innerN = 5
  const outerSpread = lerp(8, 74, open)
  const innerSpread = lerp(4, 42, open)

  return (
    <g>
      <line x1={f(flower.baseX)} y1={WATER_Y} x2={f(cx)} y2={f(cy)} stroke={STEM} strokeWidth={2.2} strokeLinecap="round" />
      <g transform={`translate(${f(cx)} ${f(cy)})`}>
        {Array.from({ length: outerN }, (_, i) => {
          const frac = (i / (outerN - 1)) * 2 - 1
          return (
            <path
              key={`o${i}`}
              d={petalPath(s * 1.9, s * 0.62)}
              transform={`rotate(${f(frac * outerSpread)})`}
              fill={petalOuter}
              stroke={petalTip}
              strokeWidth={0.4}
            />
          )
        })}
        {Array.from({ length: innerN }, (_, i) => {
          const frac = (i / (innerN - 1)) * 2 - 1
          return (
            <path
              key={`i${i}`}
              d={petalPath(s * 1.25, s * 0.5)}
              transform={`rotate(${f(frac * innerSpread)})`}
              fill={petalInner}
            />
          )
        })}
        <ellipse cx={0} cy={-s * 0.3} rx={s * 0.4} ry={s * 0.3} fill="hsl(48 78% 60%)" />
        {Array.from({ length: 6 }, (_, k) => {
          const a = (k / 6) * Math.PI * 2
          return (
            <circle
              key={`s${k}`}
              cx={f(Math.cos(a) * s * 0.28)}
              cy={f(-s * 0.3 + Math.sin(a) * s * 0.2)}
              r={0.9}
              fill="hsl(45 70% 48%)"
            />
          )
        })}
      </g>
    </g>
  )
}

export interface LotusProps {
  /** Any integer, such as a habit id. Same seed, same plant. */
  seed: number
  /** Continuous growth 0..1. Overrides `stage`. */
  growth?: number
  /** 1-4. */
  stage?: 1 | 2 | 3 | 4
  /** Scales pot decoration only. Default 1. */
  size?: number
  /** Force a pot palette index instead of the seed's choice. */
  pot?: number
  className?: string
  title?: string
}

export function Lotus({
  seed,
  growth,
  stage = 4,
  size = 1,
  pot,
  className,
  title = "Lotus growing in water",
}: LotusProps) {
  const id = useId().replace(/:/g, "")
  const genome = useMemo(() => createLotus(seed), [seed])
  const g = growth ?? STAGES[stage - 1].g

  return (
    <svg viewBox={VIEWBOX} overflow="visible" role="img" aria-label={title} className={className}>
      <Pot palette={pot ?? genome.pot} band={genome.band} size={size} id={id} />
      <Water />
      {genome.pads.map((pad, i) => (
        <Pad key={`pad${i}`} pad={pad} g={g} />
      ))}
      {genome.leaves.map((leaf, i) => (
        <Leaf key={`leaf${i}`} leaf={leaf} g={g} />
      ))}
      {genome.flowers.map((flower, i) => (
        <Flower key={`flower${i}`} flower={flower} g={g} />
      ))}
    </svg>
  )
}
