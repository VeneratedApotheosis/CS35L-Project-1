import { LILY_LEAF_DRAW_STEPS, lilyLeafColors, type LilyLeafSpec } from "./leaf"
import { bladePath, midribPath, rightHalfPath } from "./shape"

/**
 * How a peace lily leaf is drawn on top of its outline. Positions and sizes
 * are shares of the leaf's length or width (noted per field); opacities are 0..1.
 */
export const LILY_LEAF_STYLE = {
  /** The lighter right half. */
  lightHalf: { opacity: 0.55 },
  /** The soft white highlight: height along the leaf, how far left of the midrib (share of width), radii, tilt in degrees. */
  highlight: { y: 0.6, x: 0.22, rx: 0.07, ry: 0.17, tilt: -8, opacity: 0.2, color: "#fff" },
  /** The midrib: start and end heights and thickness. */
  midrib: { start: 0.04, end: 0.9, minWidth: 0.6, widthShare: 0.03, opacity: 0.6 },
}

/** One leaf in local coordinates: base at (0,0), tip at (0,-length). */
export function LilyLeafShape({
  spec,
  length,
  clipId,
}: {
  spec: LilyLeafSpec
  length: number
  clipId: string
}) {
  const S = LILY_LEAF_STYLE
  const steps = LILY_LEAF_DRAW_STEPS
  const c = lilyLeafColors(spec)
  const width = spec.aspect * length
  const highlightX = -S.highlight.x * width
  const highlightY = -S.highlight.y * length

  return (
    <g>
      <clipPath id={clipId}>
        <path d={bladePath(spec, length, steps)} />
      </clipPath>
      <path d={bladePath(spec, length, steps)} fill={c.base} />
      <g clipPath={"url(#" + clipId + ")"}>
        <path d={rightHalfPath(spec, length, steps)} fill={c.light} opacity={S.lightHalf.opacity} />
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
        d={midribPath(spec, length, steps, S.midrib.start, S.midrib.end)}
        stroke={c.vein}
        strokeWidth={Math.max(S.midrib.minWidth, length * S.midrib.widthShare)}
        strokeLinecap="round"
        opacity={S.midrib.opacity}
        fill="none"
      />
    </g>
  )
}
