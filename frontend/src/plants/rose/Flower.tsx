import type { FlowerState, PlacedFlower } from "../peaceLily/flowers"
import { bladePath, leftHalfPath, type BladeShape } from "../peaceLily/shape"
import { BUD_SHAPE } from "./roseConfig"

/*
 * How the rose's flowers are drawn. An open bloom is three rings of rounded
 * petals around a tight centre, each ring smaller, lighter and rotated off the
 * one below it. A bud is a plump red teardrop wrapped in green sepals. Flat
 * fills only. Positions and sizes are shares of the head's length unless noted;
 * opacities are 0..1.
 */
export const ROSE_FLOWER_STYLE = {
  stalk: { color: "hsl(120 30% 40%)", width: 2.4 },
  /** Points per side when a petal or bud is drawn. */
  steps: 18,
  /** A rounded, cupped petal. */
  petal: { aspect: 0.95, peak: 0.55, baseTaper: 0.55, tipTaper: 0.8, bow: 0, asym: 0 } as BladeShape,
  /** Rings from the outside in: how many petals, their reach (share of head length), and their twist. */
  rings: [
    { count: 7, reach: 0.5, rot: 0, fill: "hsl(348 68% 48%)", light: "hsl(350 72% 58%)" },
    { count: 6, reach: 0.37, rot: 26, fill: "hsl(347 70% 53%)", light: "hsl(349 74% 63%)" },
    { count: 5, reach: 0.25, rot: 13, fill: "hsl(346 72% 58%)", light: "hsl(348 76% 68%)" },
  ],
  /** The tight swirl at the centre. */
  centre: { color: "hsl(345 66% 40%)", radius: 0.1, inner: "hsl(346 70% 50%)", innerRadius: 0.055 },
  lightHalfOpacity: 0.5,
  bud: {
    petal: "hsl(348 66% 50%)",
    petalLight: "hsl(350 70% 60%)",
    /** The green sepals wrapping the bud. */
    sepal: { color: "hsl(122 36% 40%)", count: 3, reach: 0.62, spread: 26, width: 0.14 },
  },
}

/** A point scaled about the soil point, which is how a stage grows. */
const grow = (value: number, anchor: number, scale: number) => anchor + (value - anchor) * scale
const fixed = (n: number) => n.toFixed(1)

/** The stalks of every visible flower. Their width does not change with the stage, like the leaf stems. */
export function FlowerStalks({
  flowers,
  scale,
  anchor,
}: {
  flowers: PlacedFlower[]
  scale: number
  anchor: { x: number; y: number }
}) {
  return (
    <>
      {flowers.map((f) => {
        const s = f.stalk
        const x = (v: number) => fixed(grow(v, anchor.x, scale))
        const y = (v: number) => fixed(grow(v, anchor.y, scale))
        return (
          <path
            key={"fs" + f.index}
            d={"M" + x(s.x0) + " " + y(s.y0) + " Q" + x(s.cx) + " " + y(s.cy) + " " + x(s.x1) + " " + y(s.y1)}
            fill="none"
            stroke={ROSE_FLOWER_STYLE.stalk.color}
            strokeWidth={ROSE_FLOWER_STYLE.stalk.width}
            strokeLinecap="round"
          />
        )
      })}
    </>
  )
}

/** The heads of every visible flower, as buds or open blooms. */
export function FlowerHeads({
  flowers,
  state,
  scale,
  anchor,
  id,
}: {
  flowers: PlacedFlower[]
  state: Exclude<FlowerState, "none">
  scale: number
  anchor: { x: number; y: number }
  id: string
}) {
  return (
    <>
      {flowers.map((f) => (
        <g
          key={"fh" + f.index}
          data-flower={state}
          transform={
            "translate(" + fixed(grow(f.baseX, anchor.x, scale)) + " " + fixed(grow(f.baseY, anchor.y, scale)) +
            ") rotate(" + fixed(f.angle) + ") scale(" + scale.toFixed(4) + ")"
          }
        >
          {state === "bloom" ? (
            <Bloom flower={f} clipId={id + "-f" + f.index} />
          ) : (
            <Bud flower={f} clipId={id + "-f" + f.index} />
          )}
        </g>
      ))}
    </>
  )
}

/** One rounded, two-tone petal, drawn from the centre pointing up (before it is rotated). */
function Petal({
  reach,
  fill,
  light,
  clipId,
}: {
  reach: number
  fill: string
  light: string
  clipId: string
}) {
  const S = ROSE_FLOWER_STYLE
  const d = bladePath(S.petal, reach, S.steps)
  return (
    <g>
      <clipPath id={clipId}>
        <path d={d} />
      </clipPath>
      <path d={d} fill={fill} />
      <g clipPath={"url(#" + clipId + ")"}>
        <path d={leftHalfPath(S.petal, reach, S.steps)} fill={light} opacity={S.lightHalfOpacity} />
      </g>
    </g>
  )
}

/** An open rose: rings of petals around a tight swirl. */
function Bloom({ flower, clipId }: { flower: PlacedFlower; clipId: string }) {
  const S = ROSE_FLOWER_STYLE
  const L = flower.length
  const cy = -L * 0.5

  return (
    <g transform={"translate(0 " + cy.toFixed(1) + ")"}>
      {S.rings.map((ring, r) => {
        const step = 360 / ring.count
        const reach = ring.reach * L * flower.widthFactor
        return (
          <g key={"r" + r}>
            {Array.from({ length: ring.count }, (_, i) => (
              <g key={i} transform={"rotate(" + (i * step + ring.rot).toFixed(1) + ")"}>
                <Petal reach={reach} fill={ring.fill} light={ring.light} clipId={clipId + "-r" + r + "p" + i} />
              </g>
            ))}
          </g>
        )
      })}
      <circle cx={0} cy={0} r={S.centre.radius * L} fill={S.centre.color} />
      <circle cx={0} cy={0} r={S.centre.innerRadius * L} fill={S.centre.inner} />
    </g>
  )
}

/** A closed bud: a plump red petal wrapped by a few green sepals. */
function Bud({ flower, clipId }: { flower: PlacedFlower; clipId: string }) {
  const S = ROSE_FLOWER_STYLE
  const L = flower.length
  const shape = { ...BUD_SHAPE, aspect: BUD_SHAPE.aspect * flower.widthFactor }
  const petal = bladePath(shape, L, S.steps)
  const sepalShape: BladeShape = { aspect: S.bud.sepal.width, peak: 0.4, baseTaper: 0.8, tipTaper: 1.5, bow: 0, asym: 0 }
  const sepalReach = S.bud.sepal.reach * L
  const mid = (S.bud.sepal.count - 1) / 2

  return (
    <g>
      {/* Sepals sit behind the petal and peek out past its sides. */}
      {Array.from({ length: S.bud.sepal.count }, (_, i) => {
        const angle = (i - mid) * S.bud.sepal.spread
        return (
          <g key={"se" + i} transform={"rotate(" + angle.toFixed(1) + ")"}>
            <path d={bladePath(sepalShape, sepalReach, S.steps)} fill={S.bud.sepal.color} />
          </g>
        )
      })}
      <clipPath id={clipId}>
        <path d={petal} />
      </clipPath>
      <path d={petal} fill={S.bud.petal} />
      <g clipPath={"url(#" + clipId + ")"}>
        <path d={leftHalfPath(shape, L, S.steps)} fill={S.bud.petalLight} opacity={0.5} />
      </g>
    </g>
  )
}
