import { int, type Rng } from "../rng"
import { POT_BANDS, POT_BAND_ODDS, POT_PALETTES, type PotBand } from "./palettes"

export interface PotStyle {
  /** Index into POT_PALETTES. */
  pot: number
  band: PotBand
}

/** Pick a band from a random stream with one draw, weighted by POT_BAND_ODDS. */
export function pickPotBand(rng: Rng): PotBand {
  const total = POT_BANDS.reduce((sum, band) => sum + POT_BAND_ODDS[band], 0)
  let draw = rng() * total
  for (const band of POT_BANDS) {
    draw -= POT_BAND_ODDS[band]
    if (draw < 0) return band
  }
  return POT_BANDS[POT_BANDS.length - 1]
}

/**
 * Pick a pot palette and band from a random stream. Every plant starts its
 * stream this way, so the same seed always gets the same pot. The order of
 * the two draws is part of that guarantee.
 */
export function pickPotStyle(rng: Rng): PotStyle {
  const pot = int(rng, 0, POT_PALETTES.length - 1)
  const band = pickPotBand(rng)
  return { pot, band }
}
