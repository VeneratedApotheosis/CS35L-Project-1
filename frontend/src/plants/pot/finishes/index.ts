/*
 * The pot finish registry. Every finish a pot can be drawn with is listed here.
 *
 * To add a finish:
 *   1. Write one new file in this folder that exports a PotFinish.
 *   2. Add it to FINISHES below.
 *   3. Add its weight to POT_FINISH_WEIGHTS in ../style.ts.
 * Nothing else changes. A weight of 0 keeps the finish out of the seeds' picks.
 */
import { solidFinish } from "./solid"
import type { PotFinish } from "./types"

const FINISHES = [solidFinish] as const

/** "solid" and every other registered id, derived from the list above. */
export type PotFinishId = (typeof FINISHES)[number]["id"]

/** Every registered finish id, in registry order. */
export const POT_FINISH_IDS: readonly PotFinishId[] = FINISHES.map((finish) => finish.id)

const byId = new Map<string, PotFinish>(FINISHES.map((finish) => [finish.id, finish]))

/** The finish with this id. Throws a RangeError for an id that is not registered. */
export function getFinish(id: string): PotFinish {
  const finish = byId.get(id)
  if (!finish) throw new RangeError(`Unknown pot finish: ${id}`)
  return finish
}

export type { PotFinish, PotFinishInput } from "./types"
