import { mulberry32 } from "@/pottedPlant/rng"
import { CANVAS, lerp, pointsText, project, round1, type Point } from "../geometry"
import { sunLanding } from "../placement"
import { COLORS, ROOM, SUN } from "../room"

const { right, eaveY, peak, rings } = ROOM

/**
 * The warm light over everything, kept gentle: two soft glows high in the room,
 * pale shafts slanting from the roof down to the sunny patches on the floor, and
 * a few specks of dust drifting in the air. Each row of patches (SUN.rows) has its
 * own shaft starting at a different point on the roof, so the light is spread
 * across the room instead of pooling in one corner. It sits over the plants and
 * brightens them with the "screen" blend, so they feel lit rather than pasted on.
 */
export function Sunlight() {
  const rng = mulberry32(SUN.dust.seed)
  const dust = Array.from({ length: SUN.dust.count }, (_, i) => ({
    key: i,
    x: round1(300 + rng() * 1200),
    y: round1(100 + rng() * 620),
    r: round1(1.2 + rng() * 1.8),
    opacity: Math.round((0.3 + rng() * 0.35) * 100) / 100,
  }))

  const shafts = SUN.rows.flatMap((row, rowIndex) =>
    SUN.panes.flatMap((pane) => {
      const near = rings[pane]
      const far = rings[pane + 1]
      if (near === undefined || far === undefined) return []
      // Each shaft starts on the right roof slope, higher up for the rows farther from the wall.
      const start = lerp({ x: right, y: eaveY }, peak, row.top)
      const top = (factor: number): Point => project(start, factor)
      return [{ key: rowIndex + "-" + pane, points: [top(near), top(far), sunLanding(row.to, far), sunLanding(row.from, near)] }]
    }),
  )

  const wash = SUN.strength.wash

  return (
    <g style={{ mixBlendMode: "screen" }} pointerEvents="none">
      <defs>
        <radialGradient id="login-wash" cx="0.5" cy="0.5" r="0.5">
          <stop offset="0" stopColor="#ffe98a" stopOpacity={wash} />
          <stop offset="0.5" stopColor="#ffe98a" stopOpacity={round1(wash * 0.45 * 100) / 100} />
          <stop offset="1" stopColor="#ffe98a" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="login-shaft" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={COLORS.light} stopOpacity={SUN.strength.shaft} />
          <stop offset="1" stopColor={COLORS.light} stopOpacity={round1(SUN.strength.shaft * 0.25 * 100) / 100} />
        </linearGradient>
      </defs>
      {/* Two glows, one high on the right and one high in the middle left, so no single corner is brightest. */}
      <circle cx={CANVAS.width - 220} cy={-60} r={820} fill="url(#login-wash)" />
      <circle cx={560} cy={-120} r={760} fill="url(#login-wash)" fillOpacity="0.7" />
      {shafts.map((shaft) => (
        <polygon key={shaft.key} points={pointsText(shaft.points)} fill="url(#login-shaft)" />
      ))}
      {dust.map((speck) => (
        <circle key={speck.key} cx={speck.x} cy={speck.y} r={speck.r} fill="#fffbe0" fillOpacity={speck.opacity} />
      ))}
    </g>
  )
}
