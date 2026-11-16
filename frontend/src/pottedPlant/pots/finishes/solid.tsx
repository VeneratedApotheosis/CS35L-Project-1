import { POT_SHAPE } from "../shape"
import type { PotFinish } from "./types"

/**
 * The first finish: the body color with the look's stripe, if it has one.
 */
export const solidFinish = {
  id: "solid",
  draw: ({ colors, band, size }) => {
    if (band !== "stripe") return null
    const S = POT_SHAPE
    return (
      <rect
        x={S.stripe.x}
        y={S.stripe.centerY - (S.stripe.thickness * size) / 2}
        width={S.stripe.width}
        height={S.stripe.thickness * size}
        fill={colors.band}
      />
    )
  },
} as const satisfies PotFinish
