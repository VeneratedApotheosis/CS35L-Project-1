/**
 * One-point perspective for the login scene. Every line of the room runs toward
 * one vanishing point, so a point is moved "toward the viewer" by scaling it
 * away from that point: a factor of 1 is the back wall, and a larger factor is
 * nearer. All numbers are in scene units (the canvas is SCENE.width by SCENE.height).
 */

export interface Point {
  x: number
  y: number
}

export const CANVAS = { width: 1600, height: 900 } as const

/** Where every receding line meets, at about eye level, in the middle. */
export const VANISH: Point = { x: 800, y: 400 }

/** Move a point toward (factor above 1) or away from the viewer. */
export function project(point: Point, factor: number): Point {
  return {
    x: VANISH.x + (point.x - VANISH.x) * factor,
    y: VANISH.y + (point.y - VANISH.y) * factor,
  }
}

/**
 * The point where the line from the vanishing point through `through` leaves the
 * canvas. Used for the rafters and floor boards, which run off the picture.
 */
export function exitPoint(through: Point): Point {
  const dx = through.x - VANISH.x
  const dy = through.y - VANISH.y
  const tx = dx > 0 ? (CANVAS.width - VANISH.x) / dx : dx < 0 ? (0 - VANISH.x) / dx : Infinity
  const ty = dy > 0 ? (CANVAS.height - VANISH.y) / dy : dy < 0 ? (0 - VANISH.y) / dy : Infinity
  const t = Math.min(tx, ty)
  return { x: VANISH.x + dx * t, y: VANISH.y + dy * t }
}

/** A point a share of the way from a to b. */
export function lerp(a: Point, b: Point, share: number): Point {
  return { x: a.x + (b.x - a.x) * share, y: a.y + (b.y - a.y) * share }
}

/** The smallest convex polygon around a set of points (monotone chain), in order around the edge. */
export function convexHull(points: readonly Point[]): Point[] {
  const sorted = [...points].sort((a, b) => a.x - b.x || a.y - b.y)
  if (sorted.length < 3) return sorted
  const cross = (o: Point, a: Point, b: Point) => (a.x - o.x) * (b.y - o.y) - (a.y - o.y) * (b.x - o.x)
  const build = (list: readonly Point[]) => {
    const half: Point[] = []
    for (const point of list) {
      while (half.length >= 2 && cross(half[half.length - 2], half[half.length - 1], point) <= 0) half.pop()
      half.push(point)
    }
    half.pop()
    return half
  }
  return [...build(sorted), ...build([...sorted].reverse())]
}

/** One decimal place. Drawn numbers are rounded so the server and the browser print the same text. */
export const round1 = (n: number) => Math.round(n * 10) / 10

/** The "x,y x,y ..." text of an SVG polygon or polyline. */
export function pointsText(points: readonly Point[]): string {
  return points.map((p) => round1(p.x) + "," + round1(p.y)).join(" ")
}
