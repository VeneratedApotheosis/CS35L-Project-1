import type { ReactNode } from "react"
import type { Rng } from "../../rng"
import type { PotBand, PotPalette } from "../palettes"
import type { PotBody } from "../shape"

/** Everything a finish is given to draw one pot. */
export interface PotFinishInput {
  /**
   * The pot's own pattern stream, the same every time for the same look. A
   * finish that draws a pattern draws it from here.
   */
  rng: Rng
  /** The body outline and its bounding box, from POT_SHAPE. Read measurements from here, never repeat them. */
  body: PotBody
  /** The colors of the pot's palette. */
  colors: PotPalette
  /** The look's band choice. Only the solid finish uses it. */
  band: PotBand
  /** Scales decoration only. The pot keeps its shape. */
  size: number
}

/**
 * A way to fill the pot body. `draw` returns flat SVG shapes. Pot draws them
 * inside the body's clip path, so a finish cannot paint outside the pot.
 */
export interface PotFinish {
  /** Names the finish in the registry and in the weights table. */
  id: string
  draw(input: PotFinishInput): ReactNode
}
