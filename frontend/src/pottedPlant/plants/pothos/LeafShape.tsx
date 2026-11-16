import { leafColors, leafPath, type LeafSpec } from "./leaf"

/**
 * How a heart leaf is drawn on top of its outline. Positions and sizes are
 * shares of the leaf's width or length (noted per field); opacities are 0..1.
 */
export const LEAF_STYLE = {
  /** The lighter half, to the right of the midrib. Overhang is a share of leaf length past the base. */
  lightHalf: { opacity: 0.5, overhang: 1.3 },
  /** Golden splashes. */
  splash: { opacity: 0.88 },
  /** The soft white highlight: center and radii (shares of width x, length y), tilt in degrees. */
  highlight: { x: 0.2, y: 0.58, rx: 0.1, ry: 0.18, tilt: -14, opacity: 0.22, color: "#fff" },
  /** The midrib: start and end heights (shares of length) and thickness. */
  midrib: { start: 0.05, end: 0.86, minWidth: 0.6, widthShare: 0.045, opacity: 0.55 },
}

/**
 * One leaf in local coordinates: notch at (0,0), tip at (0,-length).
 * Flat fills only: base green, a lighter right half, golden splashes,
 * a midrib and a soft highlight.
 */
export function LeafShape({
  spec,
  length,
  clipId,
}: {
  spec: LeafSpec
  length: number
  clipId: string
}) {
  const S = LEAF_STYLE
  const d = leafPath(length, spec)
  const width = length * spec.aspect
  const c = leafColors(spec)

  return (
    <g>
      <clipPath id={clipId}>
        <path d={d} />
      </clipPath>
      <path d={d} fill={c.base} />
      <g clipPath={"url(#" + clipId + ")"}>
        <rect
          x={0}
          y={-length}
          width={width}
          height={length * S.lightHalf.overhang}
          fill={c.light}
          opacity={S.lightHalf.opacity}
        />
        {spec.blobs.map((b, i) => {
          const cx = b.x * width
          const cy = -b.y * length
          return (
            <ellipse
              key={i}
              cx={cx}
              cy={cy}
              rx={b.rx * width}
              ry={b.ry * length}
              transform={"rotate(" + b.rot + " " + cx + " " + cy + ")"}
              fill={c.gold}
              opacity={S.splash.opacity}
            />
          )
        })}
        <ellipse
          cx={-S.highlight.x * width}
          cy={-S.highlight.y * length}
          rx={S.highlight.rx * width}
          ry={S.highlight.ry * length}
          transform={
            "rotate(" + S.highlight.tilt + " " + -S.highlight.x * width + " " + -S.highlight.y * length + ")"
          }
          fill={S.highlight.color}
          opacity={S.highlight.opacity}
        />
      </g>
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
