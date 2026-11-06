import {
  leafHalfPath,
  leafMidribX,
  leafPath,
  philodendronLeafColors,
  type PhilodendronLeafSpec,
} from "./philodendronLeaf"

/**
 * How a philodendron leaf is drawn on top of its paddle outline. Positions and
 * sizes are shares of the leaf's width or length (noted per field); opacities
 * are 0..1. Flat fills only: a base tone, a lighter half, a prominent red
 * central midrib, and one soft white highlight. No strokes act as outlines.
 */
export const PHILODENDRON_LEAF_STYLE = {
  /** The lighter half, to the right of the midrib. Overhang is a share of leaf length past the base. */
  lightHalf: { opacity: 0.5, overhang: 1.3 },
  /** The soft white highlight: center and radii (shares of width x, length y), tilt in degrees. */
  highlight: { x: 0.2, y: 0.58, rx: 0.11, ry: 0.19, tilt: -12, opacity: 0.2, color: "#fff" },
  /** The red central midrib: start and end heights (shares of length) and thickness. */
  midrib: { start: 0.02, end: 0.92, minWidth: 0.9, widthShare: 0.06, opacity: 0.85 },
}

/**
 * One leaf in local coordinates: base at (0,0), tip at (0,-length). An outer
 * leaf (fan != 0) bends outward and shows its inner face, so its lighter half
 * is the side toward the middle. `red` draws the leaf in the burgundy palette
 * (the newest upright leaves); otherwise it is glossy green. Red leaves carry a
 * `data-red` marker so the look is easy to check.
 */
export function PhilodendronLeafShape({
  spec,
  length,
  clipId,
  fan = 0,
  red = false,
}: {
  spec: PhilodendronLeafSpec
  length: number
  clipId: string
  fan?: number
  red?: boolean
}) {
  const S = PHILODENDRON_LEAF_STYLE
  const d = leafPath(length, spec, fan)
  const width = length * spec.aspect
  const c = philodendronLeafColors(spec, red)

  const highlightY = -S.highlight.y * length
  // The lighter half is on the side the leaf bends toward the middle from.
  const litSide: 1 | -1 = fan > 0 ? -1 : 1
  const highlightX = leafMidribX(highlightY, length, fan) + (fan < 0 ? 1 : -1) * S.highlight.x * width
  const midribD =
    fan === 0
      ? "M0 " + -S.midrib.start * length + " L0 " + -S.midrib.end * length
      : Array.from({ length: 11 }, (_, i) => {
          const y = -S.midrib.start * length + (-S.midrib.end + S.midrib.start) * length * (i / 10)
          return (i === 0 ? "M" : "L") + leafMidribX(y, length, fan) + " " + y
        }).join(" ")

  return (
    <g data-red={red ? "true" : undefined}>
      <clipPath id={clipId}>
        <path d={d} />
      </clipPath>
      <path d={d} fill={c.base} />
      <g clipPath={"url(#" + clipId + ")"}>
        {fan === 0 ? (
          <rect
            x={0}
            y={-length}
            width={width}
            height={length * S.lightHalf.overhang}
            fill={c.light}
            opacity={S.lightHalf.opacity}
          />
        ) : (
          <path d={leafHalfPath(length, spec, litSide, fan)} fill={c.light} opacity={S.lightHalf.opacity} />
        )}
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
      <path
        d={midribD}
        stroke={c.vein}
        strokeWidth={Math.max(S.midrib.minWidth, length * S.midrib.widthShare)}
        strokeLinecap="round"
        opacity={S.midrib.opacity}
        fill="none"
      />
    </g>
  )
}
