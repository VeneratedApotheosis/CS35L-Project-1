import { bladePath, midribPath } from "../peaceLily/shape"
import {
  fannedFrond,
  frondPinnae,
  kimberlyFrondColors,
  KIMBERLY_FROND_DRAW_STEPS,
  type KimberlyFrondSpec,
} from "./kimberlyLeaf"

/**
 * How a Kimberly Queen frond is drawn on top of its silhouette. Positions and
 * sizes are shares of the frond's length or width (noted per field); opacities
 * are 0..1. Flat fills only, in the Animal Crossing style: a central rachis
 * lined with many small rounded pinnae, lighter on one side of the rachis.
 */
export const KIMBERLY_FROND_STYLE = {
  /** The rachis (central stem), between two shares of the frond's length. */
  rachis: { start: 0.02, end: 0.99, minWidth: 0.9, widthShare: 0.012, opacity: 1 },
  /** The soft white highlight, clipped to the frond's silhouette. */
  highlight: { y: 0.6, x: 0.12, rx: 0.5, ry: 0.26, tilt: -6, opacity: 0.14, color: "#fff" },
}

/**
 * One frond in local coordinates: base at (0,0), tip near (0,-length). Pinnae
 * are drawn first (lighter on the inner side of the rachis, base tone on the
 * other), then the rachis over them, then one soft highlight clipped to the
 * frond.
 *
 * `fan` is how far the frond bends outward, -1 to 1 (positive bends right). The
 * rachis, pinnae and highlight all follow the bent lance, so the whole frond
 * arcs as one. An outer frond shows its inner face, so its lighter pinnae are
 * on the side toward the middle. `fan` 0 draws the frond exactly as before.
 */
export function KimberlyFrondShape({
  spec,
  length,
  clipId,
  fan = 0,
}: {
  spec: KimberlyFrondSpec
  length: number
  clipId: string
  fan?: number
}) {
  const S = KIMBERLY_FROND_STYLE
  const steps = KIMBERLY_FROND_DRAW_STEPS
  const shape = fannedFrond(spec, fan)
  const c = kimberlyFrondColors(spec)
  const width = spec.aspect * length
  const pinnae = frondPinnae(shape, length)

  // A frond that bends right shows its inner (left) face, so its lighter pinnae
  // and its highlight move to that side. Upright fronds keep the original side.
  const lightSide = fan > 0 ? -1 : 1
  const highlightX = lightSide * S.highlight.x * width
  const highlightY = -S.highlight.y * length

  return (
    <g>
      {/* The pinnae: lighter on the inner side of the rachis, base tone on the other. */}
      {pinnae.map((p, i) => (
        <ellipse
          key={i}
          cx={p.cx}
          cy={p.cy}
          rx={p.rx}
          ry={p.ry}
          transform={"rotate(" + p.rotation.toFixed(2) + " " + p.cx.toFixed(2) + " " + p.cy.toFixed(2) + ")"}
          fill={p.side === lightSide ? c.light : c.base}
        />
      ))}

      {/* The rachis over the pinnae, so the central shaft reads clearly. */}
      <path
        d={midribPath(shape, length, steps, S.rachis.start, S.rachis.end)}
        stroke={c.rachis}
        strokeWidth={Math.max(S.rachis.minWidth, length * S.rachis.widthShare)}
        strokeLinecap="round"
        opacity={S.rachis.opacity}
        fill="none"
      />

      {/* One soft highlight, kept inside the frond's silhouette. */}
      <clipPath id={clipId}>
        <path d={bladePath(shape, length, steps)} />
      </clipPath>
      <g clipPath={"url(#" + clipId + ")"}>
        <ellipse
          cx={highlightX}
          cy={highlightY}
          rx={S.highlight.rx * width}
          ry={S.highlight.ry * length}
          transform={"rotate(" + S.highlight.tilt + " " + highlightX + " " + highlightY + ")"}
          fill={S.highlight.color}
          opacity={S.highlight.opacity}
        />
      </g>
    </g>
  )
}
