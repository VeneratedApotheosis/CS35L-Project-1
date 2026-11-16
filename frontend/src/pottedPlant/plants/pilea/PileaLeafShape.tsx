import { pileaLeafColors, pileaLeafPath, type PileaLeafSpec } from "./pileaLeaf"

/**
 * How a pilea coin is drawn on top of its outline. Positions and sizes are
 * shares of the coin's radius (noted per field); opacities are 0..1. Flat fills
 * only, in the Animal Crossing style: a round green coin with a lighter half,
 * fine veins radiating from a central dimple, and one soft white highlight.
 */
export const PILEA_LEAF_STYLE = {
  /** The lighter half, to the right of the midline. */
  lightHalf: { opacity: 0.45 },
  /** Fine veins from the dimple to near the edge. */
  veins: { reach: 0.82, minWidth: 0.5, widthShare: 0.02, opacity: 0.32, startAngle: 20 },
  /** The central dimple where the stalk meets the coin. */
  dimple: { radiusShare: 0.09, opacity: 0.7 },
  /** The soft white highlight (center and radii as shares of radius, tilt in degrees). */
  highlight: { cx: -0.34, cy: -0.34, rx: 0.3, ry: 0.15, tilt: -30, opacity: 0.22, color: "#fff" },
}

/**
 * One coin in local coordinates: stalk end at (0,0), far edge at (0,-length).
 * Flat fills only: base green, a lighter right half, radiating veins, a central
 * dimple, and a soft highlight.
 */
export function PileaLeafShape({
  spec,
  length,
  clipId,
}: {
  spec: PileaLeafSpec
  length: number
  clipId: string
}) {
  const S = PILEA_LEAF_STYLE
  const d = pileaLeafPath(spec, length)
  const c = pileaLeafColors(spec)

  const radiusY = length / 2
  const radiusX = radiusY * spec.aspect
  const centerY = -length / 2

  return (
    <g>
      <clipPath id={clipId}>
        <path d={d} />
      </clipPath>
      <path d={d} fill={c.base} />
      <g clipPath={"url(#" + clipId + ")"}>
        {/* The lighter half, to the right of the midline. */}
        <rect x={0} y={-length} width={radiusX} height={length} fill={c.light} opacity={S.lightHalf.opacity} />

        {/* Veins radiating from the dimple. */}
        {Array.from({ length: spec.veins }, (_, k) => {
          const a = (S.veins.startAngle * Math.PI) / 180 + (k / spec.veins) * Math.PI * 2
          const x2 = Math.cos(a) * radiusX * S.veins.reach
          const y2 = centerY + Math.sin(a) * radiusY * S.veins.reach
          return (
            <line
              key={k}
              x1={0}
              y1={centerY}
              x2={x2.toFixed(2)}
              y2={y2.toFixed(2)}
              stroke={c.vein}
              strokeWidth={Math.max(S.veins.minWidth, length * S.veins.widthShare)}
              strokeLinecap="round"
              opacity={S.veins.opacity}
            />
          )
        })}

        {/* The soft highlight in the upper left. */}
        <ellipse
          cx={S.highlight.cx * radiusX}
          cy={centerY + S.highlight.cy * radiusY}
          rx={S.highlight.rx * radiusX}
          ry={S.highlight.ry * radiusY}
          transform={
            "rotate(" + S.highlight.tilt + " " + (S.highlight.cx * radiusX).toFixed(2) +
            " " + (centerY + S.highlight.cy * radiusY).toFixed(2) + ")"
          }
          fill={S.highlight.color}
          opacity={S.highlight.opacity}
        />
      </g>

      {/* The central dimple, over everything. */}
      <circle cx={0} cy={centerY} r={Math.max(0.8, S.dimple.radiusShare * length)} fill={c.dimple} opacity={S.dimple.opacity} />
    </g>
  )
}
