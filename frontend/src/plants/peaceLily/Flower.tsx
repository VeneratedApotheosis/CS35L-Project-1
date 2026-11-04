import type { PlacedFlower, FlowerState } from "./flowers"
import { BLOOM_SHAPE, BUD_SHAPE } from "./peaceLilyConfig"
import { bladePath, leftHalfPath, midribPath } from "./shape"

/**
 * How the flowers are drawn. Positions and sizes are shares of the head's
 * length unless noted; opacities are 0..1. Flat fills only.
 */
export const FLOWER_STYLE = {
  stalk: { color: "hsl(112 36% 44%)", width: 2.4 },
  /** Points per side when a hood is drawn. */
  steps: 24,
  bloom: {
    hood: "#fcfaf1",
    /** The shaded left half. */
    shade: { color: "#ebe5d1", opacity: 0.85 },
    /** The green flush at the hood's base. */
    flush: { color: "#bfdca4", opacity: 0.7, y: 0.1, rx: 0.14, ry: 0.17 },
    midrib: { color: "#d8d0b8", from: 0.06, to: 0.72, width: 0.014, opacity: 0.8 },
  },
  spadix: {
    color: "#f3dd88",
    shade: { color: "#e2c566", opacity: 0.55 },
    dots: { color: "#dcbe58", count: 5, radius: 0.012, opacity: 0.8 },
    /** Where the spike starts and ends along the hood, and how wide it is. */
    from: 0.1,
    to: 0.54,
    width: 0.1,
  },
  bud: {
    base: "#bddca6",
    /** The creamy tip, from this share of the length up. */
    cap: { color: "#f8f5e8", from: 0.5 },
    /** The shaded left half. */
    shade: { color: "#8fbf86", opacity: 0.3 },
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
            stroke={FLOWER_STYLE.stalk.color}
            strokeWidth={FLOWER_STYLE.stalk.width}
            strokeLinecap="round"
          />
        )
      })}
    </>
  )
}

/** The heads of every visible flower, as buds or open hoods. */
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

/** An open flower: white hood with a green flush at its base and a spike in front. */
function Bloom({ flower, clipId }: { flower: PlacedFlower; clipId: string }) {
  const S = FLOWER_STYLE
  const L = flower.length
  const shape = { ...BLOOM_SHAPE, aspect: BLOOM_SHAPE.aspect * flower.widthFactor }
  const hood = bladePath(shape, L, S.steps)
  const spadixWidth = S.spadix.width * L
  const spadixTop = -S.spadix.to * L
  const spadixHeight = (S.spadix.to - S.spadix.from) * L
  const pivotY = -S.spadix.from * L

  return (
    <g>
      <clipPath id={clipId}>
        <path d={hood} />
      </clipPath>
      <path d={hood} fill={S.bloom.hood} />
      <g clipPath={"url(#" + clipId + ")"}>
        <path d={leftHalfPath(shape, L, S.steps)} fill={S.bloom.shade.color} opacity={S.bloom.shade.opacity} />
        <ellipse
          cx={0}
          cy={-S.bloom.flush.y * L}
          rx={S.bloom.flush.rx * L}
          ry={S.bloom.flush.ry * L}
          fill={S.bloom.flush.color}
          opacity={S.bloom.flush.opacity}
        />
      </g>
      <path
        d={midribPath(shape, L, S.steps, S.bloom.midrib.from, S.bloom.midrib.to)}
        stroke={S.bloom.midrib.color}
        strokeWidth={Math.max(0.5, S.bloom.midrib.width * L)}
        strokeLinecap="round"
        opacity={S.bloom.midrib.opacity}
        fill="none"
      />
      <g transform={"rotate(" + fixed(flower.spadixTilt) + " 0 " + fixed(pivotY) + ")"}>
        <rect
          x={-spadixWidth / 2}
          y={spadixTop}
          width={spadixWidth}
          height={spadixHeight}
          rx={spadixWidth / 2}
          fill={S.spadix.color}
        />
        <rect
          x={0}
          y={spadixTop}
          width={spadixWidth / 2}
          height={spadixHeight}
          rx={spadixWidth / 2}
          fill={S.spadix.shade.color}
          opacity={S.spadix.shade.opacity}
        />
        {Array.from({ length: S.spadix.dots.count }, (_, i) => (
          <circle
            key={i}
            cx={(i % 2 === 0 ? -0.2 : 0.2) * spadixWidth}
            cy={spadixTop + ((i + 0.7) / (S.spadix.dots.count + 0.4)) * spadixHeight}
            r={S.spadix.dots.radius * L}
            fill={S.spadix.dots.color}
            opacity={S.spadix.dots.opacity}
          />
        ))}
      </g>
    </g>
  )
}

/** A closed flower: a slim green hood with a creamy tip. */
function Bud({ flower, clipId }: { flower: PlacedFlower; clipId: string }) {
  const S = FLOWER_STYLE
  const L = flower.length
  const shape = { ...BUD_SHAPE, aspect: BUD_SHAPE.aspect * flower.widthFactor }
  const hood = bladePath(shape, L, S.steps)
  const capTop = -L * 1.05
  const capBottom = -S.bud.cap.from * L

  return (
    <g>
      <clipPath id={clipId}>
        <path d={hood} />
      </clipPath>
      <path d={hood} fill={S.bud.base} />
      <g clipPath={"url(#" + clipId + ")"}>
        <rect x={-L} y={capTop} width={2 * L} height={capBottom - capTop} fill={S.bud.cap.color} />
        <path d={leftHalfPath(shape, L, S.steps)} fill={S.bud.shade.color} opacity={S.bud.shade.opacity} />
      </g>
    </g>
  )
}
