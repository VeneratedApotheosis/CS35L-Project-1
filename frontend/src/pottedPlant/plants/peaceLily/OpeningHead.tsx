import type { ReactNode } from "react"

const clamp01 = (x: number) => Math.min(Math.max(x, 0), 1)
const smooth = (x: number) => x * x * (3 - 2 * x)

/**
 * A flower head that is opening. At 0 it is the closed bud and at 1 the full bloom. In
 * between the bud swells and fades away while the bloom unfurls from its middle,
 * turning a little as it goes. Both are drawn from the base of the head, pointing up,
 * so the pivot (a negative number: the middle of the head) is what they scale and turn about.
 * Closed or open, only one of the two is drawn, exactly as before.
 */
export function OpeningHead({ open, pivotY, bud, bloom }: { open: number; pivotY: number; bud: ReactNode; bloom: ReactNode }) {
  if (open <= 0) return <>{bud}</>
  if (open >= 1) return <>{bloom}</>
  const about = (transform: string) => "translate(0 " + pivotY.toFixed(1) + ") " + transform + " translate(0 " + (-pivotY).toFixed(1) + ")"
  return (
    <>
      <g opacity={1 - smooth(clamp01(open / 0.6))} transform={about("scale(" + (1 + 0.15 * open).toFixed(3) + ")")}>
        {bud}
      </g>
      <g
        opacity={smooth(clamp01((open - 0.15) / 0.5))}
        transform={about("rotate(" + (-35 * (1 - open)).toFixed(1) + ") scale(" + (0.3 + 0.7 * open).toFixed(3) + ")")}
      >
        {bloom}
      </g>
    </>
  )
}
