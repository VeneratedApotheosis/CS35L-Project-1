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

/**
 * The water in the pot, with a lighter top and a faint ripple. It is drawn a
 * little wider and higher than the pot's soil oval so no brown soil shows behind
 * it (the pot's soil oval is rx 40, ry 6, centered on the soil point).
 */
function Water() {
  return (
    <g>
      <ellipse cx={100} cy={WATER_Y - 2} rx={41} ry={7} fill={WATER_DEEP} />
      <ellipse cx={98} cy={WATER_Y - 2.5} rx={33} ry={4.5} fill={WATER_TOP} opacity={0.8} />
      <ellipse cx={108} cy={WATER_Y - 0.5} rx={15} ry={1.8} fill={WATER_RIPPLE} opacity={0.4} />
    </g>
  )
}

/** A lily pad lying flat on the water: a thin oval disc with a wedge notch. */
function Pad({ pad, g }: { pad: LotusPad; g: number }) {
  const r = pad.r * lerp(0.55, 1, g)
  if (r < 2) return null
  // Flat on the water: the disc is seen at a shallow angle, so it is a thin oval.
  const ry = r * 0.2
  const c = padColors(pad.shade)
  const a = (pad.notch * Math.PI) / 180
  const w = 0.22
  const n1x = Math.cos(a - w) * r
  const n1y = Math.sin(a - w) * ry
  const n2x = Math.cos(a + w) * r
  const n2y = Math.sin(a + w) * ry

  return (
    <g transform={`translate(${f(pad.x)} ${f(pad.y)}) rotate(${f(pad.rot * 0.4)})`}>
      {/* A faint darker rim below gives the flat plate a little thickness. */}
      <ellipse cx={0} cy={ry * 0.5} rx={r} ry={ry} fill={WATER_DEEP} opacity={0.35} />
      <ellipse cx={0} cy={0} rx={r} ry={ry} fill={c.base} />
      {Array.from({ length: 6 }, (_, k) => {
        const ang = (k / 6) * Math.PI * 2
        return (
          <line
            key={k}
            x1={0}
            y1={0}
            x2={f(Math.cos(ang) * r * 0.88)}
            y2={f(Math.sin(ang) * ry * 0.88)}
            stroke={c.vein}
            strokeWidth={0.4}
            opacity={0.45}
          />
        )
      })}
      <ellipse cx={-r * 0.3} cy={-ry * 0.35} rx={r * 0.32} ry={ry * 0.4} fill={c.light} opacity={0.5} />
      <path d={`M0 0 L${f(n1x)} ${f(n1y)} L${f(n2x)} ${f(n2y)} Z`} fill={WATER_DEEP} />
    </g>
  )
}

/**
 * A round coin leaf held above the water on a stem, after the water-pennywort
 * reference. It is a full disc seen at an angle, dished like a shallow bowl: the
 * stem joins at a central navel, veins radiate out, and a rounded highlight gives
 * it volume so it does not read as a flat plate.
 */
function Leaf({ leaf, g }: { leaf: LotusLeaf; g: number }) {
  if (g < leaf.birth) return null
  const h = leaf.height * lerp(0.3, 1, g)
  const topX = leaf.baseX + leaf.tilt * (h / leaf.height)
  const topY = WATER_Y - h
  const r = leaf.r * lerp(0.4, 1, g)
  // An elliptical pad seen at an angle: oval, wider than it is tall.
  const ry = r * 0.46
  const c = leafColors(leaf.shade)

  return (
    <g>
      <line x1={f(leaf.baseX)} y1={WATER_Y} x2={f(topX)} y2={f(topY)} stroke={STEM} strokeWidth={2.4} strokeLinecap="round" />
      <g transform={`translate(${f(topX)} ${f(topY)}) rotate(${f(leaf.tilt)})`}>
        {/* The disc. */}
        <ellipse cx={0} cy={0} rx={r} ry={ry} fill={c.base} />
        {/* The lower-front half is shaded, so the disc looks dished toward us. */}
        <path d={`M${f(-r)} 0 A ${f(r)} ${f(ry)} 0 0 0 ${f(r)} 0 Z`} fill={c.shadow} opacity={0.55} />
        {/* Veins radiating from the central navel. */}
        {Array.from({ length: 11 }, (_, k) => {
          const ang = (k / 11) * Math.PI * 2
          return (
            <line
              key={k}
              x1={0}
              y1={0}
              x2={f(Math.cos(ang) * r * 0.9)}
              y2={f(Math.sin(ang) * ry * 0.9)}
              stroke={c.vein}
              strokeWidth={0.5}
              opacity={0.38}
            />
          )
        })}
        {/* A rounded highlight on the upper-left gives the disc its volume. */}
        <ellipse cx={-r * 0.34} cy={-ry * 0.34} rx={r * 0.42} ry={ry * 0.42} fill={c.light} opacity={0.6} />
        {/* The central navel where the stem joins the leaf. */}
        <ellipse cx={0} cy={0} rx={r * 0.12} ry={ry * 0.12} fill={c.shadow} opacity={0.7} />
      </g>
    </g>
  )
}

/**
 * One lotus petal, growing from the flower center (0,0) up to a soft point. The
 * `bend` curves it sideways: the tip and body sweep toward +x, so a fanned petal
 * arcs outward from the root instead of being a straight teardrop.
 */
const petalPath = (len: number, w: number, bend = 0) =>
  `M0 0 ` +
  `C ${f(w)} ${f(-len * 0.3)} ${f(w * 0.5 + bend)} ${f(-len * 0.74)} ${f(bend)} ${f(-len)} ` +
  `C ${f(-w * 0.5 + bend)} ${f(-len * 0.74)} ${f(-w)} ${f(-len * 0.3)} 0 0 Z`

/**
 * A single curved, cupped petal in two tones: a darker rim around a lighter body.
 * The rim showing at the edges and tip reads as a concave surface, so the petal
 * keeps its depth with only two colors.
 */
function Petal({
  len,
  w,
  bend,
  body,
  shade,
}: {
  len: number
  w: number
  bend: number
  body: string
  shade: string
}) {
  return (
    <g>
      <path d={petalPath(len, w, bend)} fill={shade} />
      <path d={petalPath(len * 0.84, w * 0.58, bend * 0.9)} fill={body} />
    </g>
  )
}

/**
 * A side-view lotus. It rises on a stem as a pointed bud (a tight cup of petals
 * with a green calyx) and opens into a wide cup of layered pink petals around a
 * flat-topped yellow-green seed pod (the lotus receptacle).
 */
function Flower({ flower, g }: { flower: LotusFlower; g: number }) {
  if (g < flower.birth) return null
  // Stay a bud until growth passes the bloom point, then open fully by g = 1.
  const bloomStart = Math.min(0.9, flower.birth + 0.35)
  const open = clamp((g - bloomStart) / (1 - bloomStart))
  const h = flower.height * lerp(0.35, 1, g)
  const cx = flower.baseX
  const cy = WATER_Y - h
  const s = flower.size * lerp(0.5, 1, g)

  // Two pink tones for every petal: a lighter body and one darker shade (reused
  // for the cup's interior). Buds add a single green.
  const petalBody = `hsl(${f(flower.hue)} 66% 80%)`
  const petalShade = `hsl(${f(flower.hue + 4)} 52% 64%)`
  const throat = petalShade
  const calyx = "hsl(130 34% 48%)"
  const calyxShade = "hsl(130 32% 38%)"

  const backN = 5
  const frontN = 4
  // Capped so the outermost petal, with its width and curve, stays above the
  // flower's horizontal line.
  const backSpread = lerp(9, 68, open)
  const frontSpread = lerp(4, 38, open)
  const podR = s * 0.52 * open

  return (
    <g>
      <line x1={f(flower.baseX)} y1={WATER_Y} x2={f(cx)} y2={f(cy)} stroke={STEM} strokeWidth={2.4} strokeLinecap="round" />
      <g transform={`translate(${f(cx)} ${f(cy)})`}>
        {/* Green calyx hugging the base of the bud, fading as the flower opens. */}
        {open < 0.6 && (
          <g opacity={f(1 - open / 0.6)}>
            {[-1, 1].map((d) => (
              <g key={d} transform={`rotate(${f(d * 18)})`}>
                <Petal len={s * 1.1} w={s * 0.42} bend={d * s * 0.22} body={calyx} shade={calyxShade} />
              </g>
            ))}
          </g>
        )}

        {/* Back row of petals: longer, a touch deeper, behind the pod. Each one
            curves outward from the root, so the fan reads as a rounded cup. */}
        {Array.from({ length: backN }, (_, i) => {
          const frac = (i / (backN - 1)) * 2 - 1
          return (
            <g key={`b${i}`} transform={`rotate(${f(frac * backSpread)})`}>
              <Petal len={s * 2} w={s * 0.6} bend={frac * s * 0.5} body={petalBody} shade={petalShade} />
            </g>
          )
        })}

        {/* The cup's interior, in shadow behind the front petals, for depth.
            Held back until the flower is clearly opening so buds stay clean. */}
        {open > 0.3 && (
          <ellipse cx={0} cy={-s * 0.55} rx={s * 0.95} ry={s * 0.78} fill={throat} opacity={f((open - 0.3) * 0.9)} />
        )}

        {/* The receptacle: a flat-topped yellow-green pod that appears as it opens. */}
        {podR > 0.6 && (
          <g>
            <path
              d={`M${f(-podR)} 0 Q ${f(-podR)} ${f(-podR * 1.1)} 0 ${f(-podR * 1.1)} ` +
                `Q ${f(podR)} ${f(-podR * 1.1)} ${f(podR)} 0 Z`}
              fill="hsl(74 48% 60%)"
            />
            <ellipse cx={0} cy={-podR * 1.1} rx={podR} ry={podR * 0.32} fill="hsl(70 42% 52%)" />
            {Array.from({ length: 5 }, (_, k) => {
              const t = (k / 4) * 2 - 1
              return (
                <circle
                  key={`seed${k}`}
                  cx={f(t * podR * 0.6)}
                  cy={f(-podR * 1.1)}
                  r={0.9}
                  fill="hsl(66 38% 40%)"
                />
              )
            })}
          </g>
        )}

        {/* Front row of petals: shorter, lighter, closing the cup over the pod,
            each curved outward like the back row. */}
        {Array.from({ length: frontN }, (_, i) => {
          const frac = (i / (frontN - 1)) * 2 - 1
          return (
            <g key={`fr${i}`} transform={`rotate(${f(frac * frontSpread)})`}>
              <Petal len={s * 1.5} w={s * 0.52} bend={frac * s * 0.42} body={petalBody} shade={petalShade} />
            </g>
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
