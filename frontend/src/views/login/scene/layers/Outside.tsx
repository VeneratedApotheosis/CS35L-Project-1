import { mulberry32 } from "@/pottedPlant/rng"
import { CANVAS, pointsText, round1, type Point } from "../geometry"
import { COLORS } from "../room"

/** Soft clumps of foliage seen through the glass: a center and a radius, in scene units. */
const CLUMPS: readonly { x: number; y: number; r: number }[] = [
  // left of the room
  { x: 50, y: 150, r: 120 }, { x: 230, y: 110, r: 110 }, { x: 60, y: 380, r: 170 }, { x: 210, y: 300, r: 150 },
  { x: 280, y: 470, r: 140 }, { x: 110, y: 570, r: 160 },
  // beyond the back wall
  { x: 430, y: 410, r: 120 }, { x: 570, y: 340, r: 130 }, { x: 710, y: 290, r: 110 }, { x: 570, y: 520, r: 110 },
  { x: 770, y: 470, r: 100 }, { x: 910, y: 330, r: 120 }, { x: 1050, y: 270, r: 130 }, { x: 940, y: 500, r: 100 },
  { x: 1180, y: 380, r: 125 }, { x: 1110, y: 520, r: 115 }, { x: 410, y: 570, r: 100 },
  // right of the room
  { x: 1340, y: 290, r: 150 }, { x: 1460, y: 420, r: 160 }, { x: 1380, y: 570, r: 140 }, { x: 1510, y: 190, r: 130 },
  { x: 1560, y: 610, r: 130 },
  // low and high clumps that fill the gaps behind the shelves and under the roof
  { x: 520, y: 600, r: 90 }, { x: 700, y: 590, r: 100 }, { x: 880, y: 600, r: 90 }, { x: 1040, y: 610, r: 95 },
  { x: 1200, y: 600, r: 90 }, { x: 650, y: 180, r: 90 }, { x: 900, y: 170, r: 100 }, { x: 1120, y: 190, r: 90 },
]

/** Eight directions around a clump, written out so the points never depend on a trig function. */
const DIRECTIONS: readonly Point[] = [
  { x: 1, y: 0 }, { x: 0.707, y: 0.707 }, { x: 0, y: 1 }, { x: -0.707, y: 0.707 },
  { x: -1, y: 0 }, { x: -0.707, y: -0.707 }, { x: 0, y: -1 }, { x: 0.707, y: -0.707 },
]

/** Facets facing up and to the right catch the sun: this is how light each of the eight is, as an index into COLORS.foliage. */
const FACET_TONE = [1, 0, 2, 3, 3, 2, 0, 0] as const

/**
 * What is outside the glass: a pale sky, a glow where the sun is, and clumps of
 * foliage built from flat triangles (a low-poly look), blurred a little as if out
 * of focus. It is the same picture behind every window.
 */
export function Outside() {
  const clumps = CLUMPS.map((clump, index) => {
    const rng = mulberry32(100 + index)
    const rim = DIRECTIONS.map((d) => {
      const radius = clump.r * (0.82 + rng() * 0.3)
      return { x: clump.x + d.x * radius, y: clump.y + d.y * radius }
    })
    const middle = { x: clump.x + (rng() - 0.5) * clump.r * 0.2, y: clump.y + (rng() - 0.5) * clump.r * 0.2 }
    return rim.map((point, facet) => {
      const next = rim[(facet + 1) % rim.length]
      // Nudge a facet's tone now and then, so a clump is not a perfect pinwheel.
      const shift = rng() < 0.22 ? 1 : 0
      const tone = Math.min(COLORS.foliage.length - 1, FACET_TONE[facet] + shift)
      return { key: index + "-" + facet, points: pointsText([middle, point, next]), fill: COLORS.foliage[tone] }
    })
  })

  return (
    <g>
      <defs>
        <linearGradient id="login-sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={COLORS.sky.top} />
          <stop offset="1" stopColor={COLORS.sky.bottom} />
        </linearGradient>
        <radialGradient id="login-sun-glow" cx="0.5" cy="0.5" r="0.5">
          <stop offset="0" stopColor={COLORS.sunGlow} stopOpacity="0.95" />
          <stop offset="0.55" stopColor={COLORS.sunGlow} stopOpacity="0.4" />
          <stop offset="1" stopColor={COLORS.sunGlow} stopOpacity="0" />
        </radialGradient>
        <filter id="login-soft" filterUnits="userSpaceOnUse" x="-100" y="-100" width={CANVAS.width + 200} height={CANVAS.height + 200}>
          <feGaussianBlur stdDeviation="3.5" />
        </filter>
      </defs>
      <rect width={CANVAS.width} height={CANVAS.height} fill="url(#login-sky)" />
      <circle cx={round1(1280)} cy={round1(30)} r={760} fill="url(#login-sun-glow)" />
      <g filter="url(#login-soft)">
        {clumps.flat().map((facet) => (
          <polygon key={facet.key} points={facet.points} fill={facet.fill} />
        ))}
      </g>
    </g>
  )
}
