import { bladePath, leftHalfPath, midribPath } from "../peaceLily/shape"
import { ROSE_LEAF_DRAW_STEPS, roseLeafColors, type RoseLeafSpec } from "./leaf"

/** How a rose leaf is drawn on top of its outline. Shares of length/width; opacities 0..1. */
export const ROSE_LEAF_STYLE = {
  lightHalf: { opacity: 0.45 },
  highlight: { y: 0.58, x: 0.24, rx: 0.12, ry: 0.18, tilt: -12, opacity: 0.18, color: "#fff" },
  midrib: { start: 0.04, end: 0.88, minWidth: 0.6, widthShare: 0.03, opacity: 0.5 },
  /** Side veins branching off the midrib. */
  veins: { pairs: 3, from: 0.24, to: 0.76, spread: 0.34, rise: 0.12, width: 0.018, opacity: 0.4 },
}

/** One leaf in local coordinates: base at (0,0), tip near (0,-length). */
export function RoseLeafShape({
  spec,
  length,
  clipId,
}: {
  spec: RoseLeafSpec
  length: number
  clipId: string
}) {
  const S = ROSE_LEAF_STYLE
  const steps = ROSE_LEAF_DRAW_STEPS
  const c = roseLeafColors(spec)
  const width = spec.aspect * length
  const d = bladePath(spec, length, steps)

  const highlightX = -S.highlight.x * width
  const highlightY = -S.highlight.y * length
  const veinWidth = Math.max(0.4, S.veins.width * length)

  return (
    <g>
      <clipPath id={clipId}>
        <path d={d} />
      </clipPath>
      <path d={d} fill={c.base} />
      <g clipPath={"url(#" + clipId + ")"}>
        <path d={leftHalfPath(spec, length, steps)} fill={c.light} opacity={S.lightHalf.opacity} />
        <ellipse
          cx={highlightX}
          cy={highlightY}
          rx={S.highlight.rx * width}
          ry={S.highlight.ry * length}
          transform={"rotate(" + S.highlight.tilt + " " + highlightX + " " + highlightY + ")"}
          fill={S.highlight.color}
          opacity={S.highlight.opacity}
        />
        {Array.from({ length: S.veins.pairs }, (_, i) => {
          const t = S.veins.from + ((S.veins.to - S.veins.from) * i) / Math.max(1, S.veins.pairs - 1)
          const y0 = -t * length
          const y1 = -(t + S.veins.rise) * length
          const dx = S.veins.spread * width
          return (
            <g key={i}>
              <path
                d={"M0 " + y0.toFixed(1) + " L" + dx.toFixed(1) + " " + y1.toFixed(1)}
                stroke={c.vein}
                strokeWidth={veinWidth}
                strokeLinecap="round"
                opacity={S.veins.opacity}
                fill="none"
              />
              <path
                d={"M0 " + y0.toFixed(1) + " L" + (-dx).toFixed(1) + " " + y1.toFixed(1)}
                stroke={c.vein}
                strokeWidth={veinWidth}
                strokeLinecap="round"
                opacity={S.veins.opacity}
                fill="none"
              />
            </g>
          )
        })}
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
