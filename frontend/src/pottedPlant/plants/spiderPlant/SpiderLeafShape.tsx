import type { Pt } from "../../geometry"
import { spiderBladeSides, spiderLeafColors, SPIDER_LEAF_DRAW_STEPS, type SpiderLeafSpec } from "./spiderLeaf"

/**
 * How a spider-plant blade is drawn on top of its outline. Positions and sizes
 * are shares of the blade's length or width (noted per field); opacities are
 * 0..1. Flat fills only, in the Animal Crossing style: a green blade with a
 * lighter half, a cream stripe down its middle, and one soft white highlight.
 */
export const SPIDER_LEAF_STYLE = {
  /** The cream stripe: its share of the blade's width, and where along the length it starts and ends. */
  stripe: { width: 0.3, start: 0.03, end: 0.95 },
  /** The lighter half, over the green. */
  lightHalf: { opacity: 0.4 },
  /** The soft white highlight, a long thin ellipse on the lighter half. */
  highlight: { t: 0.3, offset: 0.55, rx: 0.16, ry: 0.12, opacity: 0.16, color: "#fff" },
}

/**
 * Drawn numbers are rounded to three decimals. Math.sin and Math.cos can differ
 * in their last digits between the server and the browser, and React then
 * reports a hydration mismatch on every attribute that was not rounded.
 */
const px = (n: number) => Math.round(n * 1000) / 1000

const pathOf = (pts: Pt[]) => pts.map(([x, y], i) => (i === 0 ? "M" : "L") + px(x).toFixed(2) + " " + px(y).toFixed(2)).join(" ") + " Z"

/**
 * One blade in local coordinates: base at (0,0), the blade rising and arching
 * to its tip. fan is how far it arches, -1 to 1 (positive arches right), and
 * angle is the way it points, the same two the outline is given. An
 * arching blade shows its inner face, so its lighter half is on the side
 * toward the middle of the plant.
 */
export function SpiderLeafShape({
  spec,
  length,
  clipId,
  fan = 0,
  angle,
}: {
  spec: SpiderLeafSpec
  length: number
  clipId: string
  fan?: number
  /** The way the blade points, in degrees from straight up. It sets the blade's length and arch, as in the outline. */
  angle?: number
}) {
  const S = SPIDER_LEAF_STYLE
  const steps = SPIDER_LEAF_DRAW_STEPS
  const c = spiderLeafColors(spec)
  const { left, right, mid, half, heading, turn } = spiderBladeSides(spec, length, steps, fan, angle)
  const blade = pathOf([...left, ...[...right].reverse()])

  // A blade that arches right shows its inner (left) face, so the lighter half is the left one.
  const lightSide = turn > 0 ? left : right
  const lightHalf = pathOf([...mid, ...[...lightSide].reverse()])

  // The cream stripe follows the midrib, narrowing with the blade toward its tip.
  const from = Math.round(S.stripe.start * steps)
  const to = Math.round(S.stripe.end * steps)
  const stripeEdge = (sign: 1 | -1) =>
    mid.slice(from, to + 1).map(([x, y], k): Pt => {
      const i = from + k
      const a = (heading[i] * Math.PI) / 180
      const w = half[i] * S.stripe.width * sign
      return [x + Math.cos(a) * w, y + Math.sin(a) * w]
    })
  const stripe = pathOf([...stripeEdge(-1), ...stripeEdge(1).reverse()])

  const H = S.highlight
  const hi = Math.round(H.t * steps)
  const side = turn > 0 ? -1 : 1
  const ha = (heading[hi] * Math.PI) / 180
  const hx = mid[hi][0] + Math.cos(ha) * half[hi] * H.offset * side * 2
  const hy = mid[hi][1] + Math.sin(ha) * half[hi] * H.offset * side * 2

  return (
    <g>
      <clipPath id={clipId}>
        <path d={blade} />
      </clipPath>
      <path d={blade} fill={c.base} />
      <g clipPath={"url(#" + clipId + ")"}>
        <path d={lightHalf} fill={c.light} opacity={S.lightHalf.opacity} />
        <path d={stripe} fill={c.stripe} />
        <ellipse
          cx={px(hx)}
          cy={px(hy)}
          rx={px(H.rx * half[hi] * 2)}
          ry={px(H.ry * length)}
          transform={"rotate(" + heading[hi].toFixed(2) + " " + px(hx) + " " + px(hy) + ")"}
          fill={H.color}
          opacity={H.opacity}
        />
      </g>
    </g>
  )
}
