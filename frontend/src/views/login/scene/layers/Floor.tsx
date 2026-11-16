import { mulberry32 } from "@/pottedPlant/rng"
import { pointsText, project, round1, type Point } from "../geometry"
import { sunLanding } from "../placement"
import { COLORS, ROOM, SUN } from "../room"

const { left, right, floorY, rings } = ROOM
const FLOOR_LEFT: Point = { x: left, y: floorY }
const FLOOR_RIGHT: Point = { x: right, y: floorY }

/** Far enough toward the viewer that a floor shape runs off the bottom of the canvas. */
const BEYOND = 4

/** How near the floor boards' joints are, as depth factors. Each strip uses some of them. */
const JOINTS = [1.1, 1.24, 1.41, 1.62, 1.88, 2.2, 2.6]

/** The spacing of the boards where they meet the back wall, and how far the strips reach to each side. */
const BOARD = 55
const FIRST = -600
const LAST = 2200

/**
 * The wooden floor, with boards running toward the viewer, and the patches of
 * sun on it. Boards are flat strips in alternating warm tones, with a joint here
 * and there. The patches are the footprints of the right wall's glass panes:
 * each one runs between two frames, so the frames leave a shadow between them.
 */
export function Floor() {
  const rng = mulberry32(31)
  const strips: { key: number; points: Point[]; fill: string; joints: Point[][] }[] = []
  let index = 0
  let previous = -1
  for (let x = FIRST; x < LAST; x += BOARD) {
    const a: Point = { x, y: floorY }
    const b: Point = { x: x + BOARD, y: floorY }
    // A board never has the same tone as the one before it.
    let pick = Math.floor(rng() * COLORS.floor.length)
    if (pick === previous) pick = (pick + 1 + Math.floor(rng() * (COLORS.floor.length - 1))) % COLORS.floor.length
    previous = pick
    const tone = COLORS.floor[pick]
    const joints = JOINTS.filter(() => rng() > 0.4).map((factor) => [project(a, factor), project(b, factor)])
    strips.push({
      key: index,
      points: [a, b, project(b, BEYOND), project(a, BEYOND)],
      fill: tone,
      joints,
    })
    index++
  }

  const patches: { key: string; outer: Point[]; core: Point[] }[] = []
  SUN.rows.forEach((row, rowIndex) => {
    SUN.panes.forEach((pane) => {
      const near = rings[pane]
      const far = rings[pane + 1]
      if (near === undefined || far === undefined) return
      const margin = (far - near) * (SUN.gap / 2)
      const [a, b] = [near + margin, far - margin]
      const at = sunLanding
      const make = (from: number, to: number, f1: number, f2: number) => [at(from, f1), at(to, f1), at(to, f2), at(from, f2)]
      const grow = (row.to - row.from) * 0.18
      patches.push({
        key: rowIndex + "-" + pane,
        outer: make(row.from, row.to, a, b),
        core: make(row.from + grow, row.to - grow, a + (b - a) * 0.15, b - (b - a) * 0.15),
      })
    })
  })

  return (
    <g>
      <defs>
        <clipPath id="login-floor">
          <polygon points={pointsText([FLOOR_LEFT, FLOOR_RIGHT, project(FLOOR_RIGHT, BEYOND), project(FLOOR_LEFT, BEYOND)])} />
        </clipPath>
      </defs>
      <g clipPath="url(#login-floor)">
        {strips.map((strip) => (
          <polygon key={strip.key} points={pointsText(strip.points)} fill={strip.fill} stroke={COLORS.floorSeam} strokeOpacity="0.3" strokeWidth="1" />
        ))}
        <g stroke={COLORS.floorSeam} strokeWidth="1.4" strokeOpacity="0.55">
          {strips.flatMap((strip) =>
            strip.joints.map(([from, to], i) => (
              <line key={strip.key + "-" + i} x1={round1(from.x)} y1={round1(from.y)} x2={round1(to.x)} y2={round1(to.y)} />
            )),
          )}
        </g>
        {/* Shadow under the shelves along the back, soft and flat. */}
        <polygon points={pointsText([FLOOR_LEFT, FLOOR_RIGHT, project(FLOOR_RIGHT, 1.1), project(FLOOR_LEFT, 1.1)])} fill="#8a5a22" fillOpacity="0.16" />
        {patches.map((patch) => (
          <g key={patch.key}>
            <polygon points={pointsText(patch.outer)} fill="#fff0b0" fillOpacity={SUN.strength.patch} />
            <polygon points={pointsText(patch.core)} fill="#fffbe2" fillOpacity={SUN.strength.core} />
          </g>
        ))}
      </g>
    </g>
  )
}
