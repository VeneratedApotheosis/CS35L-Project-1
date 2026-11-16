import {
  calatheaBodyPath,
  calatheaLeafColors,
  calatheaLeafPath,
  calatheaMidribPath,
  calatheaStripesPath,
  type CalatheaLeafSpec,
} from "./calatheaLeaf"

/**
 * How a calathea leaf is drawn on top of its outline. Positions are shares of
 * the leaf's length; opacities are 0..1. Flat fills only: a muted purple leaf,
 * a dark green body inset from its edge (leaving a purple rim), light herringbone
 * stripes clipped to the leaf, a pale midrib, and one soft white highlight.
 */
export const CALATHEA_LEAF_STYLE = {
  stripes: { opacity: 0.92 },
  /** The pale midrib: start and end heights and thickness. */
  midrib: { start: 0.02, end: 0.9, minWidth: 0.8, widthShare: 0.028, opacity: 0.95 },
  /** The soft white highlight: center and radii (shares of width x, length y), tilt in degrees. */
  highlight: { x: -0.18, y: 0.66, rx: 0.1, ry: 0.15, tilt: 14, opacity: 0.12, color: "#fff" },
}

/** One leaf in local coordinates: base at (0,0), tip at (0,-length). */
export function CalatheaLeafShape({
  spec,
  length,
  clipId,
}: {
  spec: CalatheaLeafSpec
  length: number
  clipId: string
}) {
  const S = CALATHEA_LEAF_STYLE
  const c = calatheaLeafColors(spec)
  const d = calatheaLeafPath(spec, length)
  const width = length * spec.aspect

  return (
    <g>
      <clipPath id={clipId}>
        <path d={d} />
      </clipPath>
      <path d={d} fill={c.purple} />
      <g clipPath={"url(#" + clipId + ")"}>
        <path d={calatheaBodyPath(spec, length)} fill={c.body} />
        <path d={calatheaStripesPath(spec, length)} fill={c.stripe} opacity={S.stripes.opacity} />
        <ellipse
          cx={S.highlight.x * width}
          cy={-S.highlight.y * length}
          rx={S.highlight.rx * width}
          ry={S.highlight.ry * length}
          transform={
            "rotate(" + S.highlight.tilt + " " + (S.highlight.x * width).toFixed(2) + " " + (-S.highlight.y * length).toFixed(2) + ")"
          }
          fill={S.highlight.color}
          opacity={S.highlight.opacity}
        />
      </g>
      <path
        d={calatheaMidribPath(spec, length, S.midrib.start, S.midrib.end)}
        stroke={c.midrib}
        strokeWidth={Math.max(S.midrib.minWidth, length * S.midrib.widthShare)}
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity={S.midrib.opacity}
        fill="none"
      />
    </g>
  )
}
