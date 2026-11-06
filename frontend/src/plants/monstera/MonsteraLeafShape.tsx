import {
  fenestrations,
  leafHalfPath,
  leafMidribX,
  leafPath,
  monsteraLeafColors,
  type MonsteraLeafSpec,
} from "./monsteraLeaf"

/**
 * How a Monstera leaf is drawn on top of its outer blade. Positions and sizes
 * are shares of the leaf's width or length (noted per field); opacities are
 * 0..1. Flat fills only: a deep green blade, a lighter right half, a midrib with
 * lateral veins, and one soft white highlight. The fenestrations (holes near the
 * midrib and splits cut in from the margin) are punched out with a mask, so the
 * background shows through them.
 */
export const MONSTERA_LEAF_STYLE = {
  /** The lighter half, to the right of the midrib. Overhang is a share of leaf length past the base. */
  lightHalf: { opacity: 0.5, overhang: 1.3 },
  /** The soft white highlight: center and radii (shares of width x, length y), tilt in degrees. */
  highlight: { x: 0.22, y: 0.6, rx: 0.12, ry: 0.2, tilt: -12, opacity: 0.2, color: "#fff" },
  /** The midrib: start and end heights (shares of length) and thickness. */
  midrib: { start: 0.04, end: 0.9, minWidth: 0.7, widthShare: 0.05, opacity: 0.5 },
  /** The lateral veins that run from the midrib toward each split's inner end. */
  lateralVein: { minWidth: 0.4, widthShare: 0.028, opacity: 0.35 },
}

/**
 * One leaf in local coordinates: base at (0,0), tip at (0,-length). The whole
 * leaf is masked so the fenestrations read as real gaps: white keeps the leaf,
 * black cuts the holes and splits away. An outer leaf (fan != 0) bends outward
 * and shows its inner face, so its lighter half is the side toward the middle.
 */
export function MonsteraLeafShape({
  spec,
  length,
  clipId,
  fan = 0,
}: {
  spec: MonsteraLeafSpec
  length: number
  clipId: string
  fan?: number
}) {
  const S = MONSTERA_LEAF_STYLE
  const d = leafPath(length, spec, fan)
  const width = length * spec.aspect
  const c = monsteraLeafColors(spec)
  const { holes, splits } = fenestrations(spec, length, fan)

  const maskId = clipId + "-m"
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
    <g>
      <clipPath id={clipId}>
        <path d={d} />
      </clipPath>
      <mask id={maskId} maskUnits="userSpaceOnUse" x={-length} y={-length * 1.25} width={2 * length} height={length * 1.6}>
        <rect x={-length} y={-length * 1.25} width={2 * length} height={length * 1.6} fill="#fff" />
        {holes.map((h, i) => (
          <ellipse key={"h" + i} cx={h.cx} cy={h.cy} rx={h.rx} ry={h.ry} fill="#000" />
        ))}
        {splits.map((s, i) => (
          <path
            key={"s" + i}
            d={"M" + s.x1 + " " + s.y1 + " L" + s.x2 + " " + s.y2}
            stroke="#000"
            strokeWidth={s.width}
            strokeLinecap="round"
            fill="none"
          />
        ))}
      </mask>

      <g mask={"url(#" + maskId + ")"}>
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
        {splits.map((s, i) => (
          <path
            key={"v" + i}
            d={"M" + leafMidribX(s.innerY, length, fan) + " " + s.innerY + " L" + s.innerX + " " + s.innerY}
            stroke={c.vein}
            strokeWidth={Math.max(S.lateralVein.minWidth, length * S.lateralVein.widthShare)}
            strokeLinecap="round"
            opacity={S.lateralVein.opacity}
            fill="none"
          />
        ))}
        <path
          d={midribD}
          stroke={c.vein}
          strokeWidth={Math.max(S.midrib.minWidth, length * S.midrib.widthShare)}
          strokeLinecap="round"
          opacity={S.midrib.opacity}
          fill="none"
        />
      </g>
    </g>
  )
}
