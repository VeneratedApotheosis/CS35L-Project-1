import type { FlowerState, PlacedFlower } from "../peaceLily/flowers"
import { bladePath, leftHalfPath, type BladeShape } from "../peaceLily/shape"
import { BUD_SHAPE } from "./lilyConfig"

/*
 * How the lily's flowers are drawn. An open bloom is a six-petalled star: each
 * petal is a white-edged pink tepal radiating from the centre, with pale
 * stamens tipped by dark anthers. A bud is a slim green-and-pink teardrop.
 * Flat fills only. Positions and sizes are shares of the head's length unless
 * noted; opacities are 0..1.
 */
export const LILY_FLOWER_STYLE = {
  stalk: { color: "hsl(118 34% 42%)", width: 2.4 },
  /** Points per side when a petal or bud is drawn. */
  steps: 20,
  bloom: {
    /** Six tepals, drawn from the centre outward. */
    petals: 6,
    /** Petal reach from the centre, as a share of head length. */
    reach: 0.52,
    /** The tepal outline. */
    shape: { aspect: 0.52, peak: 0.44, baseTaper: 0.68, tipTaper: 1.45, bow: 0, asym: 0 } as BladeShape,
    /** White rim, pink body laid inside it, and the magenta throat line. */
    rim: "#fdf4f6",
    body: "hsl(338 72% 66%)",
    bodyLight: "hsl(336 78% 75%)",
    throat: "hsl(330 68% 50%)",
    /** How much narrower the pink body is than the white petal (leaves the rim). */
    bodyInset: 0.78,
    /** The magenta throat line, from the centre out along the petal. */
    throatLine: { from: 0.05, to: 0.52, width: 0.02, opacity: 0.8 },
  },
  stamen: {
    count: 6,
    /** Offset from the petals, in degrees. */
    offset: 30,
    reach: 0.34,
    filament: { color: "#f2e7d8", width: 0.022 },
    anther: { color: "hsl(16 62% 42%)", rx: 0.05, ry: 0.025 },
  },
  bud: {
    base: "hsl(120 32% 46%)",
    /** The pink blush over the upper part of the bud. */
    blush: { color: "hsl(338 60% 70%)", from: 0.42 },
    shade: { color: "hsl(120 30% 36%)", opacity: 0.3 },
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
            stroke={LILY_FLOWER_STYLE.stalk.color}
            strokeWidth={LILY_FLOWER_STYLE.stalk.width}
            strokeLinecap="round"
          />
        )
      })}
    </>
  )
}

/** The heads of every visible flower, as buds or open stars. */
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

/** One white-edged pink tepal, drawn from the centre pointing up (before it is rotated into place). */
function Petal({ reach, clipId }: { reach: number; clipId: string }) {
  const B = LILY_FLOWER_STYLE.bloom
  const steps = LILY_FLOWER_STYLE.steps
  const white = bladePath(B.shape, reach, steps)
  const bodyShape = { ...B.shape, aspect: B.shape.aspect * B.bodyInset }
  const throatW = Math.max(0.5, B.throatLine.width * reach)

  return (
    <g>
      <path d={white} fill={B.rim} />
      <clipPath id={clipId}>
        <path d={bladePath(bodyShape, reach, steps)} />
      </clipPath>
      <path d={bladePath(bodyShape, reach, steps)} fill={B.body} />
      <g clipPath={"url(#" + clipId + ")"}>
        <path d={leftHalfPath(bodyShape, reach, steps)} fill={B.bodyLight} opacity={0.55} />
      </g>
      <path
        d={"M0 " + (-B.throatLine.from * reach).toFixed(1) + " L0 " + (-B.throatLine.to * reach).toFixed(1)}
        stroke={B.throat}
        strokeWidth={throatW}
        strokeLinecap="round"
        opacity={B.throatLine.opacity}
        fill="none"
      />
    </g>
  )
}

/** An open flower: a six-petalled star with stamens at its centre. */
function Bloom({ flower, clipId }: { flower: PlacedFlower; clipId: string }) {
  const S = LILY_FLOWER_STYLE
  const L = flower.length
  const reach = S.bloom.reach * L * flower.widthFactor
  const cy = -L * 0.5
  const petalStep = 360 / S.bloom.petals
  const stamenStep = 360 / S.stamen.count

  return (
    <g>
      {/* Petals radiate from the centre of the head. */}
      <g transform={"translate(0 " + cy.toFixed(1) + ")"}>
        {Array.from({ length: S.bloom.petals }, (_, i) => (
          <g key={i} transform={"rotate(" + (i * petalStep).toFixed(1) + ")"}>
            <Petal reach={reach} clipId={clipId + "-p" + i} />
          </g>
        ))}

        {/* Stamens, offset between the petals. */}
        {Array.from({ length: S.stamen.count }, (_, i) => {
          const a = ((i * stamenStep + S.stamen.offset) * Math.PI) / 180
          const r = S.stamen.reach * L
          const tipX = Math.sin(a) * r
          const tipY = -Math.cos(a) * r
          return (
            <g key={"st" + i}>
              <path
                d={"M0 0 L" + tipX.toFixed(1) + " " + tipY.toFixed(1)}
                stroke={S.stamen.filament.color}
                strokeWidth={Math.max(0.4, S.stamen.filament.width * L)}
                strokeLinecap="round"
                fill="none"
              />
              <ellipse
                cx={tipX}
                cy={tipY}
                rx={S.stamen.anther.rx * L}
                ry={S.stamen.anther.ry * L}
                transform={"rotate(" + (i * stamenStep + S.stamen.offset).toFixed(1) + " " + tipX.toFixed(1) + " " + tipY.toFixed(1) + ")"}
                fill={S.stamen.anther.color}
              />
            </g>
          )
        })}
      </g>
    </g>
  )
}

/** A closed bud: a slim green teardrop with a pink blush near its tip. */
function Bud({ flower, clipId }: { flower: PlacedFlower; clipId: string }) {
  const S = LILY_FLOWER_STYLE
  const L = flower.length
  const shape = { ...BUD_SHAPE, aspect: BUD_SHAPE.aspect * flower.widthFactor }
  const hood = bladePath(shape, L, S.steps)
  const blushBottom = -S.bud.blush.from * L
  const blushTop = -L * 1.05

  return (
    <g>
      <clipPath id={clipId}>
        <path d={hood} />
      </clipPath>
      <path d={hood} fill={S.bud.base} />
      <g clipPath={"url(#" + clipId + ")"}>
        <rect x={-L} y={blushTop} width={2 * L} height={blushBottom - blushTop} fill={S.bud.blush.color} />
        <path d={leftHalfPath(shape, L, S.steps)} fill={S.bud.shade.color} opacity={S.bud.shade.opacity} />
      </g>
    </g>
  )
}
