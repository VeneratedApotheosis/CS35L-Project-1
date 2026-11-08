import { POT_SOIL } from "./pot/shape"

/*
 * Shared pieces used by every plant: the canvas, the soil point, and small
 * helpers. The pot lives in ./pot. The stage-engine plants live in their own
 * folders. The lotus and the pothos labels still read the stage names from
 * STAGES below.
 */

/* ------------------------------------------------------------------ */
/* Canvas                                                              */
/* ------------------------------------------------------------------ */

/** Where plants meet the soil, in the shared canvas. It is the center of the pot's soil. */
export const SOIL = { x: POT_SOIL.x, y: POT_SOIL.y }
/**
 * Shared canvas for every plant. One frame for all of them, so every pot is
 * drawn at the same size and place. It starts 30 units down (the canvas was
 * "0 0 200 235"), trimming the empty space above the plants: the tallest plant
 * still reaches to y 30, the new top edge.
 */
export const VIEWBOX = "0 30 200 205"

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
/* Stage names (used by the lotus and the plant labels)                */
/* ------------------------------------------------------------------ */

export const STAGES = [
  { name: "Sprout", g: 0.12 },
  { name: "Young", g: 0.4 },
  { name: "Full", g: 0.7 },
  { name: "Lush", g: 1 },
] as const
