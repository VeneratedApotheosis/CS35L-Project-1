import { bladePath, midribPath } from "../peaceLily/shape"
import { SNAKE_LEAF_DRAW_STEPS, snakeLeafColors, type SnakeLeafSpec } from "./snakeLeaf"

/**
 * How a snake plant leaf is drawn on top of its outline. Positions and sizes
 * are shares of the leaf's length or width (noted per field); opacities are
 * 0..1. Flat fills only, in the Animal Crossing style: a dark green sword with
 * a pale-yellow margin and soft cross-banding.
 */
export const SNAKE_LEAF_STYLE = {
  /** The green interior as a share of the full blade's width. The rest is the yellow margin. */
  interior: 0.74,
  /** Faint cross-banding over the interior. */
  bands: { count: 7, from: 0.08, to: 0.9, thickness: 0.035, tilt: 8, opacity: 0.4 },
  /** The lighter half, over the interior. */
  lightHalf: { opacity: 0.4 },
  /** The soft white highlight. */
  highlight: { y: 0.66, x: 0.18, rx: 0.1, ry: 0.22, tilt: -6, opacity: 0.16, color: "#fff" },
  /** The midrib. */
  midrib: { start: 0.05, end: 0.92, minWidth: 0.5, widthShare: 0.018, opacity: 0.4 },
}

/**
 * One leaf in local coordinates: base at (0,0), tip near (0,-length). A
 * variegated leaf gets a yellow margin by filling the whole blade yellow and
 * laying a narrower green blade on top; the cross-banding is clipped to that
 * green interior.
 */
export function SnakeLeafShape({
  spec,
  length,
  clipId,
}: {
  spec: SnakeLeafSpec
  length: number
  clipId: string
}) {
  const S = SNAKE_LEAF_STYLE
  const steps = SNAKE_LEAF_DRAW_STEPS
  const c = snakeLeafColors(spec)
  const width = spec.aspect * length

  const full = bladePath(spec, length, steps)
  const innerShape = { ...spec, aspect: spec.aspect * S.interior }
  const inner = bladePath(innerShape, length, steps)
  const interiorClip = clipId + "-in"

  const highlightX = -S.highlight.x * width
  const highlightY = -S.highlight.y * length

  return (
    <g>
      {/* The whole blade: yellow margin for a variegated leaf, plain green otherwise. */}
      <path d={full} fill={spec.variegated ? c.edge : c.base} />

      {/* The green interior, and everything drawn on it, clipped to its shape. */}
      <clipPath id={interiorClip}>
        <path d={inner} />
      </clipPath>
      <path d={inner} fill={c.base} />
      <g clipPath={"url(#" + interiorClip + ")"}>
        {Array.from({ length: S.bands.count }, (_, i) => {
          const t = S.bands.from + ((S.bands.to - S.bands.from) * (i + 0.5)) / S.bands.count
          const y = -t * length
          const h = Math.max(1.2, S.bands.thickness * length)
          const tilt = i % 2 === 0 ? S.bands.tilt : -S.bands.tilt
          return (
            <rect
              key={i}
              x={-width}
              y={y - h / 2}
              width={2 * width}
              height={h}
              transform={"rotate(" + tilt + " 0 " + y.toFixed(2) + ")"}
              fill={c.band}
              opacity={S.bands.opacity}
            />
          )
        })}
        <ellipse
          cx={highlightX}
          cy={highlightY}
          rx={S.highlight.rx * width * 2}
          ry={S.highlight.ry * length}
          transform={"rotate(" + S.highlight.tilt + " " + highlightX + " " + highlightY + ")"}
          fill={S.highlight.color}
          opacity={S.highlight.opacity}
        />
      </g>

      <path
        d={midribPath(innerShape, length, steps, S.midrib.start, S.midrib.end)}
        stroke={c.vein}
        strokeWidth={Math.max(S.midrib.minWidth, length * S.midrib.widthShare)}
        strokeLinecap="round"
        opacity={S.midrib.opacity}
        fill="none"
      />
    </g>
  )
}
