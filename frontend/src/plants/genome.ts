import { POT_SOIL } from "./pot/shape"
import { clamp, lerp } from "./rng"

/*
 * Shared pieces used by every plant: the canvas, the soil point, and small
 * helpers. The pot lives in ./pot. The pothos generator lives in pothosStages.ts. The pilea
 * and the benched peace lily still use the older continuous-growth helpers
 * below (STAGES, pointAt).
 */

/* ------------------------------------------------------------------ */
/* Canvas                                                              */
/* ------------------------------------------------------------------ */

/** Where plants meet the soil, in the shared canvas. It is the center of the pot's soil. */
export const SOIL = { x: POT_SOIL.x, y: POT_SOIL.y }
/** Shared canvas for every plant. */
export const VIEWBOX = "0 0 200 235"

export const SIZE_MIN = 0.6
export const SIZE_MAX = 1.6

/** Combine integers into one well-mixed sub-seed. */
export function subSeed(...parts: number[]) {
  let h = 2166136261
  for (const p of parts) {
    h = Math.imul(h ^ (p | 0), 16777619)
    h ^= h >>> 13
  }
  return h >>> 0
}

/* ------------------------------------------------------------------ */
/* Older continuous-growth helpers (pilea, benched peace lily)         */
/* ------------------------------------------------------------------ */

export interface VinePoint {
  x: number
  y: number
  /** Heading in degrees. 0 is straight up, positive leans right. */
  theta: number
}

export const STAGES = [
  { name: "Sprout", g: 0.12 },
  { name: "Young", g: 0.4 },
  { name: "Full", g: 0.7 },
  { name: "Lush", g: 1 },
] as const

export function pointAt(pts: VinePoint[], t: number): VinePoint {
  const n = pts.length - 1
  const f = clamp(t) * n
  const i = Math.min(n - 1, Math.floor(f))
  const u = f - i
  const a = pts[i]
  const b = pts[i + 1]
  return {
    x: lerp(a.x, b.x, u),
    y: lerp(a.y, b.y, u),
    theta: lerp(a.theta, b.theta, u),
  }
}
