import { ACCENTS, accentFrame, accentRing, type Accent, type AccentArea } from "./accents"

const fixed = (n: number) => n.toFixed(2)

/** A four-pointed sparkle of radius r: the sides curve in toward the middle. */
const starPath = (r: number) =>
  "M0 " + fixed(-r) + " Q0 0 " + fixed(r) + " 0 Q0 0 0 " + fixed(r) + " Q0 0 " + fixed(-r) + " 0 Q0 0 0 " + fixed(-r) + "Z"

/**
 * The stage-up accents at one moment: lines bursting out of the plant, pops
 * swelling around it, and stars on the last stage. `time` is how far through
 * the animation it is, in seconds. Nothing here is hidden from the picture's
 * own drawing, so the picture treats it as decoration.
 */
export function GrowthAccents({ accents, area, time }: { accents: Accent[]; area: AccentArea; time: number }) {
  const ring = accentRing(area)
  return (
    <g aria-hidden="true" pointerEvents="none">
      {accents.map((accent, index) => {
        const frame = accentFrame(accent, area, time)
        if (!frame) return null
        if (accent.kind === "line") {
          // Out from the plant along the oval's normal, so every line points away from the middle.
          const nx = (frame.x - ring.x) / ring.across ** 2
          const ny = (frame.y - ring.y) / ring.up ** 2
          const norm = Math.hypot(nx, ny) || 1
          const dx = nx / norm
          const dy = ny / norm
          const start = frame.travel
          const end = start + frame.grown * accent.size
          return (
            <line
              key={index}
              x1={fixed(frame.x + dx * start)}
              y1={fixed(frame.y + dy * start)}
              x2={fixed(frame.x + dx * end)}
              y2={fixed(frame.y + dy * end)}
              stroke={accent.color}
              strokeWidth={fixed(Math.max(1, area.halfWidth * 2 * ACCENTS.line.width))}
              strokeLinecap="round"
              opacity={fixed(frame.opacity)}
            />
          )
        }
        if (accent.kind === "pop") {
          return (
            <circle
              key={index}
              cx={fixed(frame.x)}
              cy={fixed(frame.y)}
              r={fixed(Math.max(0.01, accent.size * frame.grown))}
              fill={accent.color}
              opacity={fixed(frame.opacity * 0.85)}
            />
          )
        }
        return (
          <path
            key={index}
            d={starPath(Math.max(0.01, accent.size * frame.grown))}
            transform={"translate(" + fixed(frame.x) + " " + fixed(frame.y) + ") rotate(" + fixed(frame.rotation) + ")"}
            fill={accent.color}
            opacity={fixed(frame.opacity)}
          />
        )
      })}
    </g>
  )
}
