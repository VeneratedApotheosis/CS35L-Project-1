import { mulberry32 } from "@/pottedPlant/rng"
import { CANVAS, pointsText, project, round1, type Point } from "../geometry"
import { sunLanding } from "../placement"
import { COLORS, ROOM, SUN } from "../room"

const { right, eaveY, rings } = ROOM

/**
 * The warm light over everything: a bright wash from the top right, soft shafts
 * slanting from the right wall's glass down to the sunny patches on the floor,
 * and a few specks of dust drifting in them. It sits over the plants and
 * brightens them with the "screen" blend, so they feel lit rather than pasted on.
 */
export function Sunlight() {
  const rng = mulberry32(SUN.dust.seed)
  const dust = Array.from({ length: SUN.dust.count }, (_, i) => ({
    key: i,
    x: round1(300 + rng() * 1200),
    y: round1(100 + rng() * 600),
    r: round1(1.4 + rng() * 2.2),
    opacity: Math.round((0.45 + rng() * 0.4) * 100) / 100,
  }))

  const row = SUN.rows[0]
  const shafts = SUN.panes.flatMap((pane) => {
    const near = rings[pane]
    const far = rings[pane + 1]
    if (near === undefined || far === undefined) return []
    const top = (factor: number): Point => project({ x: right, y: eaveY }, factor)
    const land = sunLanding
    return [{ key: pane, points: [top(near), top(far), land(row.to, far), land(row.from, near)] }]
  })

  return (
    <g style={{ mixBlendMode: "screen" }} pointerEvents="none">
      <defs>
        <radialGradient id="login-wash" cx="0.5" cy="0.5" r="0.5">
          <stop offset="0" stopColor="#ffe98a" stopOpacity="0.85" />
          <stop offset="0.5" stopColor="#ffe98a" stopOpacity="0.38" />
          <stop offset="1" stopColor="#ffe98a" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="login-shaft" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={COLORS.light} stopOpacity="0.5" />
          <stop offset="1" stopColor={COLORS.light} stopOpacity="0.1" />
        </linearGradient>
      </defs>
      <circle cx={CANVAS.width - 260} cy={-40} r={900} fill="url(#login-wash)" />
      {shafts.map((shaft) => (
        <polygon key={shaft.key} points={pointsText(shaft.points)} fill="url(#login-shaft)" />
      ))}
      {dust.map((speck) => (
        <circle key={speck.key} cx={speck.x} cy={speck.y} r={speck.r} fill="#fffbe0" fillOpacity={speck.opacity} />
      ))}
    </g>
  )
}
