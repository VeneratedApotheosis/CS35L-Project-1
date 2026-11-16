import { mulberry32 } from "@/pottedPlant/rng"
import { convexHull, pointsText, round1 } from "../geometry"
import { sunPatches } from "../placement"
import { COLORS, SUN } from "../room"

/**
 * The warm light over everything, kept gentle. Sunlight is made of parallel beams,
 * so each beam is the whole pane of glass it comes through joined to the patch it
 * lands on: it starts from a region of the window or roof, never from a point.
 * Over that there are two wide soft glows high in the room, and a few specks of
 * dust. It sits over the plants and brightens them with the "screen" blend, so
 * they feel lit rather than pasted on.
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

  const beams = sunPatches().map((patch) => ({ key: patch.key, points: convexHull([...patch.glass, ...patch.outer]) }))
  const wash = SUN.strength.wash

  return (
    <g style={{ mixBlendMode: "screen" }} pointerEvents="none">
      <defs>
        <radialGradient id="login-wash" cx="0.5" cy="0.5" r="0.5">
          <stop offset="0" stopColor="#ffe98a" stopOpacity={wash} />
          <stop offset="0.55" stopColor="#ffe98a" stopOpacity={Math.round(wash * 0.4 * 100) / 100} />
          <stop offset="1" stopColor="#ffe98a" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="login-beam" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={COLORS.light} stopOpacity={SUN.strength.shaft} />
          <stop offset="1" stopColor={COLORS.light} stopOpacity={Math.round(SUN.strength.shaft * 0.25 * 100) / 100} />
        </linearGradient>
      </defs>
      {/* Wide soft glows across the roof, so no single spot is the brightest. */}
      <ellipse cx={1250} cy={-40} rx={1050} ry={430} fill="url(#login-wash)" />
      <ellipse cx={480} cy={-60} rx={980} ry={400} fill="url(#login-wash)" fillOpacity="0.7" />
      {beams.map((beam) => (
        <polygon key={beam.key} points={pointsText(beam.points)} fill="url(#login-beam)" />
      ))}
      {dust.map((speck) => (
        <circle key={speck.key} cx={speck.x} cy={speck.y} r={speck.r} fill="#fffbe0" fillOpacity={speck.opacity} />
      ))}
    </g>
  )
}
