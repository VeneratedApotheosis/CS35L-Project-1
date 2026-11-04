import { int, pick, type Rng } from "../rng"
import { POT_BANDS, POT_PALETTES, type PotBand } from "./palettes"

export interface PotStyle {
  /** Index into POT_PALETTES. */
  pot: number
  band: PotBand
}

/**
 * Pick a pot palette and band from a random stream. Every plant starts its
 * stream this way, so the same seed always gets the same pot. The order of
 * the two draws is part of that guarantee.
 */
export function pickPotStyle(rng: Rng): PotStyle {
  const pot = int(rng, 0, POT_PALETTES.length - 1)
  const band = pick(rng, POT_BANDS)
  return { pot, band }
}
