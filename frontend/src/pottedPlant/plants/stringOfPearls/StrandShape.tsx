import { STRAND_STEPS_PER_SEGMENT, strandBeads, strandColors, strandCurve, type StrandSpec } from "./strandLeaf"

/**
 * How a strand is drawn on top of its curve. Sizes are in canvas units unless a
 * field says it is a share of a bead's radius; opacities are 0..1.
 */
export const STRAND_STYLE = {
  /** The thread the beads hang on. */
  thread: { width: 0.6 },
  /** Points in the thread's polyline. */
  threadSteps: 24,
  /** The darker rim of each bead: the base circle is this share of the radius and sits this far up and left (as a share of the radius), so a thin darker crescent shows at the lower right. */
  rim: { size: 0.84, shift: 0.1 },
  /** The lighter patch on each bead: offset from its center and size, as shares of the radius. */
  light: { dx: -0.28, dy: -0.3, size: 0.55, opacity: 0.7 },
  /** The tiny pale window line along each bead: length and thickness as shares of the radius, and how far it sits off center. It is left out of beads smaller than minRadius, where it would be too thin to see. */
  window: { length: 0.9, thickness: 0.16, offset: 0.3, opacity: 0.85, minRadius: 2 },
  /** A bead is never drawn smaller than this radius, so the first stage still shows beads. */
  minRadius: 0.5,
}

const fixed = (n: number) => n.toFixed(2)

/**
 * One strand in local coordinates, stalk end at (0,0): a thread along the
 * curve and a flat round bead at every bead position, each with a soft light
 * patch and a tiny pale window line. `angle` is the leaf's direction, which the
 * curve needs to hang straight down.
 */
export function StrandShape({ spec, length, angle }: { spec: StrandSpec; length: number; angle: number }) {
  const S = STRAND_STYLE
  const c = strandColors(spec)
  const thread = strandCurve(spec, angle, S.threadSteps * STRAND_STEPS_PER_SEGMENT)
  const d = thread.map((p, i) => (i === 0 ? "M" : "L") + fixed(p.x * length) + " " + fixed(p.y * length)).join(" ")

  return (
    <g>
      <path d={d} fill="none" stroke={c.thread} strokeWidth={S.thread.width} strokeLinecap="round" strokeLinejoin="round" />
      {strandBeads(spec, angle).map((bead, i) => {
        const r = Math.max(S.minRadius, bead.r * length)
        const x = bead.x * length
        const y = bead.y * length
        const turn = (bead.heading * 180) / Math.PI
        return (
          <g key={i}>
            <circle cx={fixed(x)} cy={fixed(y)} r={fixed(r)} fill={c.shade} />
            <circle cx={fixed(x - S.rim.shift * r)} cy={fixed(y - S.rim.shift * r)} r={fixed(S.rim.size * r)} fill={c.base} />
            <circle cx={fixed(x + S.light.dx * r)} cy={fixed(y + S.light.dy * r)} r={fixed(S.light.size * r)} fill={c.light} opacity={S.light.opacity} />
            {r >= S.window.minRadius && (
              <rect
                x={fixed(-S.window.length * r / 2)}
                y={fixed(-S.window.thickness * r / 2)}
                width={fixed(S.window.length * r)}
                height={fixed(S.window.thickness * r)}
                rx={fixed(S.window.thickness * r / 2)}
                fill={c.window}
                opacity={S.window.opacity}
                transform={"translate(" + fixed(x) + " " + fixed(y) + ") rotate(" + fixed(turn - 90) + ") translate(0 " + fixed(S.window.offset * r) + ")"}
              />
            )}
          </g>
        )
      })}
    </g>
  )
}
