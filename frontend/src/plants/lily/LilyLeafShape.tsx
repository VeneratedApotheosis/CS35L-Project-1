import { bladePath, leftHalfPath, midribPath, rightHalfPath } from "../peaceLily/shape"
import { LILY_LEAF_DRAW_STEPS, fannedShape, lilyLeafColors, type LilyLeafSpec } from "./leaf"

/** How a lily leaf is drawn on top of its outline. Shares of length/width; opacities 0..1. */
export const LILY_LEAF_STYLE = {
  lightHalf: { opacity: 0.5 },
  highlight: { y: 0.6, x: 0.22, rx: 0.07, ry: 0.18, tilt: -8, opacity: 0.2, color: "#fff" },
  midrib: { start: 0.04, end: 0.9, minWidth: 0.6, widthShare: 0.028, opacity: 0.55 },
}

/**
 * One leaf in local coordinates: base at (0,0), tip near (0,-length). An outer
 * leaf (fan != 0) shows its inner face, so its lighter half is the side toward
 * the middle of the plant.
 */
export function LilyLeafShape({
  spec,
  length,
  clipId,
  fan = 0,
}: {
  spec: LilyLeafSpec
  length: number
  clipId: string
  fan?: number
}) {
  const S = LILY_LEAF_STYLE
  const steps = LILY_LEAF_DRAW_STEPS
  const shape = fannedShape(spec, fan)
  const c = lilyLeafColors(spec)
  const width = spec.aspect * length

  const litOnLeft = fan > 0
  const highlightX = (litOnLeft ? 1 : -1) * S.highlight.x * width
  const highlightY = -S.highlight.y * length

  return (
    <g>
      <clipPath id={clipId}>
        <path d={bladePath(shape, length, steps)} />
      </clipPath>
      <path d={bladePath(shape, length, steps)} fill={c.base} />
      <g clipPath={"url(#" + clipId + ")"}>
        <path
          d={(litOnLeft ? leftHalfPath : rightHalfPath)(shape, length, steps)}
          fill={c.light}
          opacity={S.lightHalf.opacity}
        />
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
        d={midribPath(shape, length, steps, S.midrib.start, S.midrib.end)}
        stroke={c.vein}
        strokeWidth={Math.max(S.midrib.minWidth, length * S.midrib.widthShare)}
        strokeLinecap="round"
        opacity={S.midrib.opacity}
        fill="none"
      />
    </g>
  )
}
