import { edgeX, fiddleLeafColors, fiddleLeafPath, type FiddleLeafSpec } from "./fiddleLeafFigLeaf"

/**
 * How a fiddle-leaf fig leaf is drawn on top of its outline. Positions and
 * sizes are shares of the leaf's width or length (noted per field); opacities
 * are 0..1. Flat fills only: a base green, a lighter right half, one soft white
 * highlight, a pale midrib and a few pale side veins.
 */
export const FIDDLE_LEAF_STYLE = {
  /** The lighter half, to the right of the midrib. Overhang is a share of leaf length past the base. */
  lightHalf: { opacity: 0.5, overhang: 1.3 },
  /** The soft white highlight: center and radii (shares of width x, length y), tilt in degrees. */
  highlight: { x: 0.22, y: 0.7, rx: 0.12, ry: 0.17, tilt: -14, opacity: 0.2, color: "#fff" },
  /** The pale midrib: start and end heights (shares of length) and thickness. */
  midrib: { start: 0.03, end: 0.93, minWidth: 0.8, widthShare: 0.032, opacity: 0.9 },
  /** The side veins: where each leaves the midrib (shares of length), how far up the edge it runs, and how thick. */
  veins: { starts: [0.2, 0.34, 0.48, 0.62, 0.76], rise: 0.13, reach: 0.6, minWidth: 0.5, widthShare: 0.014, opacity: 0.55 },
}

/** One leaf in local coordinates: stalk end at (0,0), tip at (0,-length). */
export function FiddleLeafFigLeafShape({
  spec,
  length,
  clipId,
}: {
  spec: FiddleLeafSpec
  length: number
  clipId: string
}) {
  const S = FIDDLE_LEAF_STYLE
  const d = fiddleLeafPath(spec, length)
  const width = length * spec.aspect
  const c = fiddleLeafColors(spec)
  const highlightX = -S.highlight.x * width
  const highlightY = -S.highlight.y * length

  const veinD = S.veins.starts
    .flatMap((start) =>
      ([-1, 1] as const).map((side) => {
        const end = start + S.veins.rise
        const x = edgeX(spec, length, end, side) * S.veins.reach
        return "M0 " + -start * length + " L" + x.toFixed(2) + " " + (-end * length).toFixed(2)
      }),
    )
    .join(" ")

  return (
    <g>
      <clipPath id={clipId}>
        <path d={d} />
      </clipPath>
      <path d={d} fill={c.base} />
      <g clipPath={"url(#" + clipId + ")"}>
        <rect x={0} y={-length} width={width} height={length * S.lightHalf.overhang} fill={c.light} opacity={S.lightHalf.opacity} />
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
        d={veinD}
        stroke={c.vein}
        strokeWidth={Math.max(S.veins.minWidth, length * S.veins.widthShare)}
        strokeLinecap="round"
        opacity={S.veins.opacity}
        fill="none"
      />
      <path
        d={"M0 " + -S.midrib.start * length + " L0 " + -S.midrib.end * length}
        stroke={c.vein}
        strokeWidth={Math.max(S.midrib.minWidth, length * S.midrib.widthShare)}
        strokeLinecap="round"
        opacity={S.midrib.opacity}
        fill="none"
      />
    </g>
  )
}
