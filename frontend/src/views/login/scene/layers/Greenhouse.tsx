import { lerp, pointsText, project, round1, type Point } from "../geometry"
import { COLORS, ROOM } from "../room"

const { left, right, eaveY, peak, floorY, rings } = ROOM
const FAR = rings[rings.length - 1]

const EAVE_LEFT: Point = { x: left, y: eaveY }
const EAVE_RIGHT: Point = { x: right, y: eaveY }
const FLOOR_LEFT: Point = { x: left, y: floorY }
const FLOOR_RIGHT: Point = { x: right, y: floorY }
const SIDES = [
  { eave: EAVE_LEFT, floor: FLOOR_LEFT },
  { eave: EAVE_RIGHT, floor: FLOOR_RIGHT },
] as const

/** How see-through each pane is. It varies a little from pane to pane so the glass is not one flat sheet. */
const paneOpacity = (index: number, base: number) => Math.round((base + ((index * 37) % 7) * 0.012) * 1000) / 1000

/** A steel bar: a dark base with a thin light edge on top, the two flat tones of the frame. */
function Bar({ a, b, width }: { a: Point; b: Point; width: number }) {
  const shift = round1(width * 0.22)
  return (
    <g strokeLinecap="square">
      <line x1={round1(a.x)} y1={round1(a.y)} x2={round1(b.x)} y2={round1(b.y)} stroke={COLORS.steel} strokeWidth={round1(width)} />
      <line
        x1={round1(a.x - shift)} y1={round1(a.y - shift)} x2={round1(b.x - shift)} y2={round1(b.y - shift)}
        stroke={COLORS.steelLight} strokeWidth={round1(width * 0.28)}
      />
    </g>
  )
}

/** The height of the back wall's roof line at a given x. */
function roofLineY(x: number) {
  const t = x <= peak.x ? (x - left) / (peak.x - left) : (right - x) / (right - peak.x)
  return eaveY + (peak.y - eaveY) * t
}

/**
 * The greenhouse's glass and steel, seen from inside: the back wall and gable
 * ahead, the two side walls and the two roof slopes running toward the viewer.
 * Glass is a faint white tint over the view outside, so the view shows through.
 */
export function Greenhouse() {
  const glass: { key: string; points: Point[]; opacity: number }[] = []

  glass.push({ key: "back", points: [FLOOR_LEFT, EAVE_LEFT, peak, EAVE_RIGHT, FLOOR_RIGHT], opacity: 0.1 })

  SIDES.forEach((side, sideIndex) => {
    for (let i = 0; i < rings.length - 1; i++) {
      const [a, b] = [rings[i], rings[i + 1]]
      glass.push({
        key: "wall-" + sideIndex + "-" + i,
        points: [project(side.eave, a), project(side.eave, b), project(side.floor, b), project(side.floor, a)],
        opacity: paneOpacity(i + sideIndex * 3, 0.1),
      })
      // The roof slope on this side: panes between rafters.
      for (let j = 0; j < ROOM.rafters.length - 1; j++) {
        const u0 = lerp(side.eave, peak, ROOM.rafters[j])
        const u1 = lerp(side.eave, peak, ROOM.rafters[j + 1])
        glass.push({
          key: "roof-" + sideIndex + "-" + i + "-" + j,
          points: [project(u0, a), project(u1, a), project(u1, b), project(u0, b)],
          opacity: paneOpacity(i + j + sideIndex, 0.24),
        })
      }
    }
  })

  const bars: { key: string; a: Point; b: Point; width: number }[] = []

  // Back wall: the outline, the upright bars and the cross bars.
  const outline = [FLOOR_LEFT, EAVE_LEFT, peak, EAVE_RIGHT, FLOOR_RIGHT]
  for (let i = 0; i < outline.length - 1; i++) bars.push({ key: "outline-" + i, a: outline[i], b: outline[i + 1], width: 14 })
  ROOM.backBars.forEach((x) => bars.push({ key: "up-" + x, a: { x, y: floorY }, b: { x, y: roofLineY(x) }, width: x === peak.x ? 11 : 8 }))
  ROOM.backCrossBars.forEach((y) => bars.push({ key: "cross-" + y, a: { x: left, y }, b: { x: right, y }, width: 8 }))

  SIDES.forEach((side, sideIndex) => {
    const name = sideIndex === 0 ? "l" : "r"
    // Eave and floor lines running toward the viewer.
    bars.push({ key: name + "-eave", a: side.eave, b: project(side.eave, FAR), width: 11 })
    bars.push({ key: name + "-floor", a: side.floor, b: project(side.floor, FAR), width: 11 })
    // An upright at each frame, and cross bars along the wall.
    rings.forEach((factor, i) => {
      if (i === 0) return
      bars.push({ key: name + "-post-" + i, a: project(side.floor, factor), b: project(side.eave, factor), width: round1(8 * factor) })
    })
    ROOM.sideCrossBars.forEach((share, i) => {
      const at = lerp(side.floor, side.eave, share)
      bars.push({ key: name + "-cross-" + i, a: at, b: project(at, FAR), width: 7 })
    })
    // The roof: rafters along the slope, and a bar across it at each frame.
    ROOM.rafters.forEach((share, i) => {
      const at = lerp(side.eave, peak, share)
      bars.push({ key: name + "-rafter-" + i, a: at, b: project(at, FAR), width: i === 0 || share === 1 ? 11 : 8 })
    })
    rings.forEach((factor, i) => {
      if (i === 0) return
      bars.push({ key: name + "-purlin-" + i, a: project(side.eave, factor), b: project(peak, factor), width: 7 })
    })
  })

  // Light streaks across the back glass.
  const glints = [
    [{ x: 420, y: 330 }, { x: 470, y: 330 }, { x: 560, y: 600 }, { x: 510, y: 600 }],
    [{ x: 700, y: 250 }, { x: 735, y: 250 }, { x: 800, y: 470 }, { x: 765, y: 470 }],
    [{ x: 1000, y: 300 }, { x: 1060, y: 300 }, { x: 1150, y: 620 }, { x: 1090, y: 620 }],
  ]

  return (
    <g>
      <g fill={COLORS.glass}>
        {glass.map((pane) => (
          <polygon key={pane.key} points={pointsText(pane.points)} fillOpacity={pane.opacity} />
        ))}
      </g>
      <g fill="#ffffff" fillOpacity="0.16">
        {glints.map((points, index) => (
          <polygon key={index} points={pointsText(points)} />
        ))}
      </g>
      {bars.map((bar) => (
        <Bar key={bar.key} a={bar.a} b={bar.b} width={bar.width} />
      ))}
      {/* The low rail along the foot of the back wall. */}
      <rect x={left} y={floorY - 12} width={right - left} height={12} fill={COLORS.steel} />
    </g>
  )
}
