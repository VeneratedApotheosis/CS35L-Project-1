/**
 * Test helper: every point along an absolute M, L, C, Z path, with each curve
 * sampled finely (`samples` points per curve). Lets a test measure a path that
 * has curves, where the control points are not on the outline.
 */
export function pathPoints(path: string, samples = 200): [number, number][] {
  const points: [number, number][] = []
  let current: [number, number] = [0, 0]
  for (const [, command, args] of path.matchAll(/([MLCZ])([^MLCZ]*)/g)) {
    const n = args.trim() === "" ? [] : args.trim().split(/[\s,]+/).map(Number)
    if (command === "M" || command === "L") {
      current = [n[0], n[1]]
      points.push(current)
    } else if (command === "C") {
      const [x0, y0] = current
      const [x1, y1, x2, y2, x3, y3] = n
      for (let i = 1; i <= samples; i++) {
        const t = i / samples
        const u = 1 - t
        points.push([
          u * u * u * x0 + 3 * u * u * t * x1 + 3 * u * t * t * x2 + t * t * t * x3,
          u * u * u * y0 + 3 * u * u * t * y1 + 3 * u * t * t * y2 + t * t * t * y3,
        ])
      }
      current = [x3, y3]
    }
  }
  return points
}
