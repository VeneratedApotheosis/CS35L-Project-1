/** A point as [x, y] in the shared canvas (y grows downward). */
export type Pt = [number, number]

/** Degrees to radians. */
export const rad = (deg: number) => (deg * Math.PI) / 180

/** Ray-casting test: is (x, y) inside the closed polygon? */
export function pointInPolygon(poly: Pt[], x: number, y: number): boolean {
  let inside = false
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, yi] = poly[i]
    const [xj, yj] = poly[j]
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside
  }
  return inside
}

/**
 * Move an outline drawn at the origin (base at 0,0, pointing up) into the
 * canvas: rotate it clockwise by `angleDeg` about the origin, then move the
 * origin to `base`. This matches SVG's `translate(base) rotate(angle)`.
 */
export function placeOutline(outline: Pt[], base: { x: number; y: number }, angleDeg: number): Pt[] {
  const a = rad(angleDeg)
  const cos = Math.cos(a)
  const sin = Math.sin(a)
  return outline.map(([x, y]) => [base.x + x * cos - y * sin, base.y + x * sin + y * cos])
}
